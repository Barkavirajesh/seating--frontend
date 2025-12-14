import React, { useState } from "react";
import axios from "axios";
import generateSeatingPDF from "./pdf1";
import supabase from "./supabaseclient";
import { generateHallQR } from "./qr";   // ✅ QR IMPORT

function Upload() {
  const [file, setFile] = useState(null);
  const [json, setJson] = useState(null);
  const [mess, setMess] = useState("");
  const [dbData, setDbData] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

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
    if (!file) {
      setMess("Please select a file first");
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      setMess("Invalid file type. Please upload Excel (.xlsx, .xls)");
      return;
    }

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
    } catch (error) {
      console.error("Upload error:", error);
      setMess("❌ Error uploading Excel file");
    }
  };

  // ---------------- FETCH REGISTER NUMBERS ----------------
  const fetchDataByYear = async () => {
    if (!selectedYear) {
      setMess("Please select a year first");
      return;
    }

    const table = yearTableMap[selectedYear];
    if (!table) {
      setMess("Invalid year selected");
      return;
    }

    try {
      setMess(`Fetching register numbers from ${table}...`);

      let allData = [];
      let from = 0;
      const batchSize = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const { data, error } = await supabase
          .from(table)
          .select("Reg_No")
          .range(from, from + batchSize - 1);

        if (error) {
          setMess(`❌ Error fetching data: ${error.message}`);
          return;
        }

        allData = allData.concat(data);
        from += batchSize;
        if (!data || data.length < batchSize) fetchMore = false;
      }

      const mappedData = allData.map((d) => ({
        Roll_No: d.Reg_No,
      }));

      setDbData(mappedData);
      setMess(`✅ Fetched ${mappedData.length} register numbers`);
    } catch (err) {
      console.error("Fetch error:", err);
      setMess("❌ Unexpected error while fetching data");
    }
  };

  // ---------------- GENERATE PDF ----------------
  const handleGeneratePDF = async () => {
    if (!json || dbData.length === 0) {
      setMess("Upload Excel and fetch register numbers first");
      return;
    }

    try {
      await generateSeatingPDF({
        jsonData: json,
        registerNumbers: dbData,
        fromDate,
        toDate,
      });
      setMess("✅ Seating PDF generated successfully");
    } catch (err) {
      console.error("PDF error:", err);
      setMess("❌ Error generating PDF");
    }
  };

  // ---------------- GENERATE QR ----------------
  const handleGenerateQR = () => {
    if (!json) {
      setMess("Upload Excel first to generate QR");
      return;
    }
    generateHallQR(json);   // ✅ PASS FULL SEATING DATA
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
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <label style={{ marginLeft: 10 }}>To: </label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <p style={{ color: "blue", marginTop: 10 }}>{mess}</p>

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
            marginRight: 15
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
