import React, { useState } from "react";
import QRCode from "qrcode";

/* ===============================
   TEMP SEAT DATA (REPLACE LATER)
   =============================== */
const seatMap = {
  T1: {
    "24CE0001": 1,
    "24CE0002": 2,
    "24CE0003": 3
  },
  T2: {
    "24CS0001": 5,
    "24CS0002": 6
  }
};

/* ===============================
   QR GENERATOR (TEACHER)
   =============================== */
export async function generateHallQR(hall) {
  const url = `${window.location.origin}/qr-seat?hall=${hall}`;
  const qr = await QRCode.toDataURL(url);

  const win = window.open();
  win.document.write(`
    <html>
      <body style="text-align:center;padding:40px">
        <h2>Hall ${hall} QR Code</h2>
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
  const params = new URLSearchParams(window.location.search);
  const hall = params.get("hall");

  const [reg, setReg] = useState("");
  const [seat, setSeat] = useState(null);

  const handleSubmit = () => {
    const found = seatMap[hall]?.[reg];
    setSeat(found ?? "INVALID");
  };

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h2>Seat Information</h2>
      <p><b>Hall:</b> {hall}</p>

      <input
        placeholder="Enter Register Number"
        value={reg}
        onChange={(e) => setReg(e.target.value)}
      />
      <br /><br />

      <button onClick={handleSubmit}>Submit</button>

      {seat && (
        <div style={{ marginTop: 20 }}>
          {seat === "INVALID" ? (
            <p style={{ color: "red" }}>Invalid Register Number</p>
          ) : (
            <>
              <p><b>Register Number:</b> {reg}</p>
              <p><b>Hall Number:</b> {hall}</p>
              <p><b>Seat Number:</b> {seat}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
