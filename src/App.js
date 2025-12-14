import React from "react";
import Upload from "./Upload";
import { SeatLookup } from "./qr";

function App() {
  if (window.location.pathname === "/qr-seat") {
    return <SeatLookup />;
  }

  return <Upload />;
}

export default App;
