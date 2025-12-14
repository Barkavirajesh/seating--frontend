import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const hallOrder = [
  "T1","T2","T3","T4","T6","T7","T8","T9","T10","T11A","T11B",
  "T12","T13","T14","T15","T16","T17","T18","T20","T21",
  "MT1","MT2","MT3","MT4","MT5","MT6","MT7","MT8",
  "MS1","MS2","MS3","MS4","MS5","MS6","MS7","MS8",
  "S2","S3","S4","S5","S6","S7","Phy Lab"
];

const ROWS = 8;
const COLUMNS = 5;
const BENCHES_PER_PAGE = ROWS * COLUMNS;

// Dept mapping for first-year (chars 7-9)
const deptCodeMapFirstYear = {
  "104":"CSE","243":"AIDS","149":"CS","244":"CSBS",
  "160":"VLSI","161":"ACT","106":"ECE","121":"BME",
  "105":"EEE","115":"MCT","114":"MECH","103":"CIVIL",
  "205":"IT","148":"AIML"
};

// Dept mapping for second-year (chars 3-4)
const deptCodeMapSecondYear = {
  "BM":"BME","CE":"CIVIL","CS":"CSE","AM":"AIML",
  "CZ":"CS","EC":"ECE","AC":"ACT","AD":"AIDS",
  "CB":"CSBS","EE":"EEE","IT":"IT","ME":"MECH",
  "MT":"MCT","VL":"VLSI"
};

// (Optional) Dept mapping for third-year if needed
const deptCodeMapThirdYear = {"BM":"BME","CE":"CIVIL","CS":"CSE","AM":"AIML",
  "CZ":"CS","EC":"ECE","AC":"ACT","AD":"AIDS",
  "CB":"CSBS","EE":"EEE","IT":"IT","ME":"MECH",
  "MT":"MCT","VL":"VLSI"
}; // adjust if 3rd year differs

// Detect register number string
function detectRegValue(objOrString) {
  if (typeof objOrString === "string") return objOrString.trim();
  if (typeof objOrString === "object" && objOrString !== null) {
    const keys = Object.keys(objOrString);
    const regKey = keys.find(k => k.toLowerCase().includes("reg")) || keys[0];
    return String(objOrString[regKey] ?? "").trim();
  }
  return "";
}

// Group fetched register numbers by department and year
function groupRegistersByDept(registerNumbers) {
  const deptWise = {};
  for (const item of registerNumbers) {
    const reg = detectRegValue(item);
    if (!reg) continue;

    let deptName = "UNKNOWN";
    if (reg.startsWith("24")) {
      // Second year
      const code = reg.slice(2, 4);
      deptName = deptCodeMapSecondYear[code] || "UNKNOWN";
    } else if (reg.startsWith("25")) {
      // Third year
      const code = reg.slice(2, 4);
      deptName = deptCodeMapThirdYear[code] || "UNKNOWN";
    } else {
      // First year
      const code = reg.length >= 9 ? reg.slice(6, 9) : null;
      deptName = (code && deptCodeMapFirstYear[code]) ? deptCodeMapFirstYear[code] : (code || "UNKNOWN");
    }

    if (!deptWise[deptName]) deptWise[deptName] = [];
    deptWise[deptName].push(reg);
  }
  return deptWise;
}

// Round-robin interleaving
function roundRobin(groups) {
  const result = [];
  const copies = groups.map(g => [...g]);
  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < copies.length; i++) {
      if (copies[i].length > 0) {
        result.push(copies[i].shift());
        added = true;
      }
    }
  }
  return result;
}

// Make benches from a list
function makeBenchesFromList(list, singleDept = false) {
  const benches = [];
  if (singleDept) {
    for (let i = 0; i < list.length; i++) benches.push([list[i] || "", ""]);
  } else {
    for (let i = 0; i < list.length; i += 2) {
      const a = list[i] || "";
      const b = list[i + 1] || "";
      benches.push([a, b]);
    }
  }
  return benches;
}

// Main PDF generation
export default function generateSeatingPDF({ jsonData, registerNumbers, fromDate, toDate }) {
  if (!jsonData || Object.keys(jsonData).length === 0) {
    alert("⚠ No hall data found!");
    return;
  }

  if (!registerNumbers || registerNumbers.length === 0) {
    alert("⚠ No register numbers found!");
    return;
  }

  const deptWise = groupRegistersByDept(registerNumbers);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let firstPage = true;

  function drawTitle(hall) {
    doc.setFontSize(18);
    doc.text("Seating Arrangement", doc.internal.pageSize.getWidth() / 2, 40, { align: "center" });
    doc.setFontSize(14);
    doc.text(`Hall: ${hall}`, doc.internal.pageSize.getWidth() / 2, 60, { align: "center" });
    if (fromDate && toDate) {
      doc.setFontSize(10);
      doc.text(`Date: ${fromDate} to ${toDate}`, doc.internal.pageSize.getWidth() / 2, 74, { align: "center" });
    }
  }

  for (const hall of hallOrder) {
    const deptList = jsonData[hall];
    if (!deptList || deptList.length === 0) continue;

    const deptQueues = {};
    for (const { department, students_count } of deptList) {
      const source = deptWise[department] || [];
      const assigned = source.splice(0, students_count); // exact number from fetched
      while (assigned.length < students_count) assigned.push(""); // fill empty if insufficient
      deptQueues[department] = assigned;
    }

    const activeDepts = Object.keys(deptQueues).filter(k => deptQueues[k].length > 0);

    let benches = [];
    if (activeDepts.length === 1) {
      benches = makeBenchesFromList(deptQueues[activeDepts[0]], true);
    } else {
      const groups = activeDepts.map(k => deptQueues[k]);
      const interleaved = roundRobin(groups);
      benches = makeBenchesFromList(interleaved, false);
    }

    for (let pageStart = 0; pageStart < benches.length; pageStart += BENCHES_PER_PAGE) {
      const pageBenches = benches.slice(pageStart, pageStart + BENCHES_PER_PAGE);

      const seatOrder = [];
      for (let c = 0; c < COLUMNS; c++) {
        if (c % 2 === 0) for (let r = 0; r < ROWS; r++) seatOrder.push({ r, c });
        else for (let r = ROWS - 1; r >= 0; r--) seatOrder.push({ r, c });
      }

      const seatBenches = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
      for (let i = 0; i < seatOrder.length; i++) {
        const pos = seatOrder[i];
        seatBenches[pos.r][pos.c] = pageBenches[i] || ["", ""];
      }

      const body = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLUMNS; c++) {
          const [s1, s2] = seatBenches[r][c] || ["", ""];
          const seatText = `${s1 || ""}\n${s2 || ""}`;
          row.push(seatText);
          let serial = (c % 2 === 0) ? c * ROWS + r + 1 : (c + 1) * ROWS - r;
          row.push(String(serial));
        }
        body.push(row);
      }

      const headRow = [];
      for (let i = 0; i < COLUMNS; i++) {
        headRow.push(`Seat ${i + 1}`);
        headRow.push("S.No");
      }

      if (!firstPage) doc.addPage();
      firstPage = false;
      drawTitle(hall);

      const columnStyles = {};
      for (let i = 0; i < COLUMNS * 2; i++) {
        columnStyles[i] = { cellWidth: (i % 2 === 0) ? 85 : 30 };
      }

      autoTable(doc, {
        startY: 85,
        head: [headRow],
        body,
        theme: "grid",
        styles: { fontSize: 10, halign: "center", valign: "middle", cellPadding: 6 },
        headStyles: { fillColor: [230, 230, 230], fontStyle: "bold" },
        columnStyles,
        margin: { left: 20, right: 20, top: 20 }
      });
    }
  }

  doc.save("hall_seating_arrangement.pdf");
}
