import React, { useState } from "react";
import QRCode from "qrcode";

const FRONTEND_URL = "https://seating-frontend-1.onrender.com";

/* -----------------------------
   QR GENERATOR (Teacher)
   ----------------------------- */
export async function generateHallQR() {
  // QR just points to the student lookup page
  const url = `${FRONTEND_URL}/qr-seat`;
  const qr = await QRCode.toDataURL(url);

  const win = window.open();
  win.document.write(`
    <html>
      <body style="text-align:center;padding:40px">
        <h2>Scan QR to check your seat</h2>
        <img src="${qr}" />
        <p>Enter your Register Number after scanning</p>
      </body>
    </html>
  `);
}

/* -----------------------------
   STUDENT PAGE (After Scan)
   ----------------------------- */
export function SeatLookup({ seatMap }) {
  const [reg, setReg] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = () => {
    const info = seatMap[reg.trim()]; // trim to avoid spaces
    setResult(info ?? "INVALID");
  };

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h2>Seat Information</h2>

      <input
        placeholder="Enter Register Number"
        value={reg}
        onChange={(e) => setReg(e.target.value)}
      />
      <br /><br />

      <button onClick={handleSubmit}>Submit</button>

      {result && (
        <div style={{ marginTop: 20 }}>
          {result === "INVALID" ? (
            <p style={{ color: "red" }}>Invalid Register Number</p>
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
