import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./firebase.js";

import App from "./App";
import Admin from "./Admin";
import PatientAppointments from "./PatientAppointments";

import "./style.css";

function Root() {
  const path = window.location.pathname;

  // Admin page
  if (path === "/admin") {
    return <Admin />;
  }

  // Patient appointments
  if (path === "/appointments") {
    return <PatientAppointments />;
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.error("Service worker registration failed:", error));
  });
}