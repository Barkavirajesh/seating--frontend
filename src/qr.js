import React, { useState } from "react";
import QRCode from "qrcode";
import supabase from "./supabaseclient";

/* ===============================
   DEPLOYED FRONTEND URL
   =============================== */
const FRONTEND_URL = "https://seating-frontend-1.onrender.com";

/* ===============================
   QR GENERATOR (TEACHER)
   =============================== */
export async function generateHallQR() {
  const url = `${FRONTEND_URL}/qr-seat`;
  const qr = await QRCode.toDataURL(url);

  const win = window.open();
  win.document.write(`
    <html>
      <body style="text-align:center;padding:40px;font-family:Arial">
        <h2>Student Seat Lookup</h2>
        <img src="${qr}" />
        <p>Scan and enter Register Number</p>
      </body>
    </html>
  `);
}

/* ===============================
   STUDENT PAGE (AFTER SCAN)
   =============================== */
export function SeatLookup() {
  const [reg, setReg] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reg) {
      setResult("INVALID");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // 🔹 seating_map table MUST contain:
      // Reg_No | Hall | Seat
      const { data, error } = await supabase
        .from("seating_map")
        .select("Hall, Seat")
        .eq("Reg_No", reg.trim())
        .single();

      if (error || !data) {
        setResult("INVALID");
      } else {
        setResult({
          hall: data.Hall,
          seat: data.Seat,
        });
      }
    } catch (err) {
      console.error(err);
      setResult("INVALID");
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "40px", fontFamily: "Arial" }}>
      <h2>Seat Information</h2>

      <input
        placeholder="Enter Register Number"
        value={reg}
        onChange={(e) => setReg(e.target.value)}
        style={{
          padding: "10px",
          width: "250px",
          fontSize: "16px",
        }}
      />

      <br /><br />

      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        {loading ? "Checking..." : "Submit"}
      </button>

      {result && (
        <div style={{ marginTop: 25 }}>
          {result === "INVALID" ? (
            <p style={{ color: "red", fontSize: "18px" }}>
              ❌ Invalid Register Number
            </p>
          ) : (
            <>
              <p><b>Register Number:</b> {reg}</p>
              <p><b>Hall Number:</b> {result.hall}</p>
              <p><b>Seat Number:</b> {result.seat}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
