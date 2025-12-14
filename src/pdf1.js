import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const hallOrder = [
  "601","602","603","604","605","606","607","608",
  "502","503","504","508","509",
  "302","303","304","307",
  "202","203",
  "A101","A102","A103",
  "A201","A202","A203",
  "A301",
  "B102","B201","B202",
  "S23","S24","S15","S16","S17","S18","S20","S21","S22","S26","S27"
];

const ROWS = 8;
const COLUMNS = 5;
const BENCHES_PER_PAGE = ROWS * COLUMNS;

// ---------------- Dept Code Maps ----------------
const deptCodeMapFirstYear = {
  "104":"CSE","243":"AIDS","149":"CS","244":"CSBS",
  "160":"VLSI","161":"ACT","106":"ECE","121":"BME",
  "105":"EEE","115":"MCT","114":"MECH","103":"CIVIL",
  "205":"IT","148":"AIML"
};

const deptCodeMapSecondYear = {
  "BM":"BME","CE":"CIVIL","CS":"CSE","AM":"AIML",
  "CZ":"CS","EC":"ECE","AC":"ACT","AD":"AIDS",
  "CB":"CSBS","EE":"EEE","IT":"IT","ME":"MECH",
  "MT":"MCT","VL":"VLSI"
};

const deptCodeMapThirdYear = {
  "BM":"BME","CE":"CIVIL","CS":"CSE","AM":"AIML",
  "CZ":"CS","EC":"ECE","AC":"ACT","AD":"AIDS",
  "CB":"CSBS","EE":"EEE","IT":"IT","ME":"MECH",
  "MT":"MCT","VL":"VLSI"
};

// ---------------- Helpers ----------------
function detectRegValue(objOrString) {
  if (typeof objOrString === "string") return objOrString.trim();
  if (typeof objOrString === "object" && objOrString !== null) {
    const key = Object.keys(objOrString)[0];
    return String(objOrString[key] ?? "").trim();
  }
  return "";
}

function groupRegistersByDept(registerNumbers) {
  const deptWise = {};
  for (const item of registerNumbers) {
    const reg = detectRegValue(item);
    if (!reg) continue;

    let dept = "UNKNOWN";
    if (reg.startsWith("24")) dept = deptCodeMapSecondYear[reg.slice(2,4)] || dept;
    else if (reg.startsWith("25")) dept = deptCodeMapThirdYear[reg.slice(2,4)] || dept;
    else {
      const code = reg.length >= 9 ? reg.slice(6,9) : null;
      dept = deptCodeMapFirstYear[code] || dept;
    }

    if (!deptWise[dept]) deptWise[dept] = [];
    deptWise[dept].push(reg);
  }
  return deptWise;
}

// ✅ Same dept together first, leftovers mixed
function makeBenchesDeptPriority(deptQueues) {
  const benches = [];
  const leftovers = [];

  for (const dept of Object.keys(deptQueues)) {
    const list = [...deptQueues[dept]];

    while (list.length >= 2) {
      benches.push([list.shift(), list.shift()]);
    }

    if (list.length === 1) leftovers.push(list.shift());
  }

  for (let i = 0; i < leftovers.length; i += 2) {
    benches.push([leftovers[i] || "", leftovers[i + 1] || ""]);
  }

  return benches;
}

// ---------------- PDF Generation ----------------
export default function generateSeatingPDF({ jsonData, registerNumbers, fromDate, toDate }) {
  if (!jsonData || !registerNumbers?.length) {
    alert("⚠ Missing data!");
    return;
  }

  const deptWise = groupRegistersByDept(registerNumbers);

  // ✅ GLOBAL POINTER PER DEPARTMENT
  const deptIndex = {};
  Object.keys(deptWise).forEach(d => deptIndex[d] = 0);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let firstPage = true;

  function drawTitle(hall) {
    doc.setFontSize(18);
    doc.text("Seating Arrangement", 297, 40, { align: "center" });
    doc.setFontSize(14);
    doc.text(`Hall: ${hall}`, 297, 60, { align: "center" });
    if (fromDate && toDate) {
      doc.setFontSize(10);
      doc.text(`Date: ${fromDate} to ${toDate}`, 297, 74, { align: "center" });
    }
  }

  for (const hall of hallOrder) {
    const deptList = jsonData[hall];
    if (!deptList?.length) continue;

    const deptQueues = {};

    for (const { department, students_count } of deptList) {
      const src = deptWise[department] || [];
      const start = deptIndex[department] || 0;
      const end = start + students_count;

      // ✅ SAFE SLICE (NO DATA LOSS)
      deptQueues[department] = src.slice(start, end);
      deptIndex[department] = end;

      while (deptQueues[department].length < students_count) {
        deptQueues[department].push("");
      }
    }

    const benches = makeBenchesDeptPriority(deptQueues);

    for (let pageStart = 0; pageStart < benches.length; pageStart += BENCHES_PER_PAGE) {
      const pageBenches = benches.slice(pageStart, pageStart + BENCHES_PER_PAGE);

      const seatOrder = [];
      for (let c = 0; c < COLUMNS; c++) {
        if (c % 2 === 0) for (let r = 0; r < ROWS; r++) seatOrder.push({ r, c });
        else for (let r = ROWS - 1; r >= 0; r--) seatOrder.push({ r, c });
      }

      const grid = Array.from({ length: ROWS }, () =>
        Array(COLUMNS).fill(["",""])
      );

      seatOrder.forEach((p, i) => {
        grid[p.r][p.c] = pageBenches[i] || ["",""];
      });

      const body = grid.map((row, r) =>
        row.flatMap((b, c) => [
          `${b[0]}\n${b[1]}`,
          String((c % 2 === 0) ? c * ROWS + r + 1 : (c + 1) * ROWS - r)
        ])
      );

      const head = Array.from({ length: COLUMNS }, (_, i) =>
        [`Seat ${i + 1}`, "S.No"]
      ).flat();

      if (!firstPage) doc.addPage();
      firstPage = false;
      drawTitle(hall);

      autoTable(doc, {
        startY: 85,
        head: [head],
        body,
        theme: "grid",
        styles: { fontSize: 10, halign: "center", valign: "middle" },
        columnStyles: Object.fromEntries(
          Array.from({ length: COLUMNS * 2 }, (_, i) => [
            i, { cellWidth: i % 2 === 0 ? 85 : 30 }
          ])
        )
      });
    }
  }

  doc.save("hall_seating_arrangement.pdf");
}
