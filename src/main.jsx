import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./firebase.js";

import App from "./app.jsx";
import Admin from "./Admin";
import PatientAppointments from "./PatientAppointments";
import RoleLogin from "./RoleLogin";
import RequireRole from "./RequireRole";
import PatientDetails from "./PatientDetails";
import PatientPayment from "./PatientPayment";

import "./style.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<App />} />
        <Route path="/admin/login" element={<RoleLogin role="admin" />} />
        <Route
          path="/admin"
          element={
            <RequireRole claim="admin" loginPath="/admin/login">
              <Admin />
            </RequireRole>
          }
        />
        <Route path="/doctor/login" element={<RoleLogin role="doctor" />} />
        <Route path="/patient/details" element={<PatientDetails />} />
        <Route path="/patient/payment" element={<PatientPayment />} />
        <Route path="/appointments" element={<PatientAppointments />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.error("Service worker registration failed:", error));
  });
}