import React, { useState } from "react";
import axios from "axios";
import generateSeatingPDF from "./pdf1";
import supabase from "./supabaseclient";
import { generateHallQR } from "./qr"; // ✅ Updated QR import

function Upload() {
  const [file, setFile] = useState(null);
  const [json, setJson] = useState(null);
  const [mess, setMess] = useState("");
  const [dbData, setDbData] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [seatMap, setSeatMap] = useState({}); // ✅ For student lookup

  // ---------------- TABLE MAPPING ----------------
  const yearTableMap = {
    "1": "I_year",
    "2": "II_year",
    "3": "III_year",
    "4": "IV_year",
  };

  // ---------------- FILE SELECTION ----------------
  const handleChange = (e) => {
    if (e.target.files?.length > 0) {
      setFile(e.target.files[0]);
      setJson(null);
      setMess("");
    }
  };

  // ---------------- UPLOAD EXCEL ----------------
  const handleClick = async () => {
    if (!file) return setMess("Please select a file first");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext))
      return setMess("Invalid file type. Please upload Excel (.xlsx, .xls)");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("year", selectedYear);

    try {
      const response = await axios.post(
        "http://localhost:5000/upload-excel",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setJson(response.data);
      setMess("✅ Excel uploaded and processed successfully");

      // ---------------- GENERATE SEAT MAP ----------------
      const newSeatMap = {};
      Object.keys(response.data).forEach((hall) => {
        response.data[hall].forEach((regNo, idx) => {
          newSeatMap[regNo] = { hall, seat: idx + 1 }; // hall + seat
        });
      });
      setSeatMap(newSeatMap);
      console.log("Seat Map:", newSeatMap); // Debugging
    } catch (err) {
      console.error(err);
      setMess("❌ Error uploading Excel");
    }
  };

  // ---------------- FETCH REGISTER NUMBERS ----------------
  const fetchDataByYear = async () => {
    if (!selectedYear) return setMess("Please select a year first");
    const table = yearTableMap[selectedYear];

    try {
      let allData = [];
      let lastRegNo = "";
      const batchSize = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const { data, error } = await supabase
          .from(table)
          .select("Reg_No")
          .gt("Reg_No", lastRegNo)
          .order("Reg_No", { ascending: true })
          .limit(batchSize);

        if (error) return setMess(`❌ Error fetching data: ${error.message}`);
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        lastRegNo = data[data.length - 1].Reg_No;
      }

      const mappedData = allData.map((d) => ({ Roll_No: d.Reg_No }));
      setDbData(mappedData);
      setMess(`✅ Fetched ${mappedData.length} register numbers`);
    } catch (err) {
      console.error(err);
      setMess("❌ Unexpected error while fetching data");
    }
  };

  // ---------------- GENERATE PDF ----------------
  const handleGeneratePDF = async () => {
    if (!json || Object.keys(json).length === 0)
      return setMess("⚠ No hall data found. Upload Excel correctly.");
    if (!dbData.length) return setMess("⚠ Fetch register numbers first");

    try {
      await generateSeatingPDF({
        jsonData: json,
        registerNumbers: dbData,
        fromDate,
        toDate,
      });
      setMess("✅ Seating PDF generated successfully");
    } catch (err) {
      console.error(err);
      setMess("❌ Error generating PDF");
    }
  };

  // ---------------- GENERATE QR ----------------
  const handleGenerateQR = () => {
    if (!Object.keys(seatMap).length)
      return setMess("⚠ Upload Excel first to generate QR");
    generateHallQR(); // QR points to student lookup page
  };

  // ---------------- UI ----------------
  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Seating Upload & Register Number Fetch</h2>

      <div>
        <input type="file" accept=".xlsx,.xls" onChange={handleChange} />
        <button onClick={handleClick} style={{ marginLeft: 10 }}>
          Upload Excel
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <label>Select Year: </label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">--Select--</option>
          <option value="1">I</option>
          <option value="2">II</option>
          <option value="3">III</option>
          <option value="4">IV</option>
        </select>

        <button onClick={fetchDataByYear} style={{ marginLeft: 10 }}>
          Fetch Register Numbers
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <label>From: </label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <label style={{ marginLeft: 10 }}>To: </label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      <p style={{ color: "blue", marginTop: 10 }}>{mess}</p>

      {/* ---------------- BACKEND JSON DISPLAY ---------------- */}
      {json && (
        <div style={{ marginTop: 20 }}>
          <h3>📦 Backend JSON Data (for debugging)</h3>
          <pre
            style={{
              maxHeight: "300px",
              overflow: "auto",
              backgroundColor: "#f4f4f4",
              padding: "15px",
              borderRadius: "6px",
              fontSize: "12px",
              border: "1px solid #ccc",
            }}
          >
            {JSON.stringify(json, null, 2)}
          </pre>

          <div style={{ marginTop: 10 }}>
            <strong>🧾 Halls detected:</strong>{" "}
            {Object.keys(json).length > 0
              ? Object.keys(json).join(", ")
              : "❌ None"}
          </div>
        </div>
      )}

      {/* ---------------- REGISTER NUMBERS DISPLAY ---------------- */}
      {dbData.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>📝 Fetched Register Numbers</h3>
          <pre
            style={{
              maxHeight: "300px",
              overflow: "auto",
              backgroundColor: "#f9f9f9",
              padding: "15px",
              borderRadius: "6px",
              fontSize: "12px",
              border: "1px solid #ccc",
            }}
          >
            {JSON.stringify(dbData, null, 2)}
          </pre>

          <div style={{ marginTop: 10 }}>
            <strong>Total fetched:</strong> {dbData.length}
          </div>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <button
          onClick={handleGeneratePDF}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
            marginRight: 15,
          }}
        >
          Generate Seating PDF
        </button>

        <button
          onClick={handleGenerateQR}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          Generate QR
        </button>
      </div>
    </div>
  );
}

export default Upload;
