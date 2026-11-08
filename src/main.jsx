import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./firebase.js";

import App from "./app.jsx";
import AdminDashboard from "./Admin";
import PatientDashboard from "./PatientAppointments";
import DoctorDashboard from "./DoctorDashboard";
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
            <RequireRole role="admin" loginPath="/admin/login">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route path="/doctor/login" element={<RoleLogin role="doctor" />} />
        <Route
          path="/doctor/dashboard"
          element={
            <RequireRole role="doctor" loginPath="/doctor/login">
              {({ claims }) => <DoctorDashboard claims={claims} />}
            </RequireRole>
          }
        />
        <Route
          path="/patient/dashboard"
          element={
            <RequireRole role="patient" loginPath="/home?login=patient">
              <PatientDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/patient/details"
          element={
            <RequireRole
              role="patient"
              loginPath="/home?login=patient&returnTo=%2Fpatient%2Fdetails"
            >
              <PatientDetails />
            </RequireRole>
          }
        />
        <Route
          path="/patient/payment"
          element={
            <RequireRole
              role="patient"
              loginPath="/home?login=patient&returnTo=%2Fpatient%2Fpayment"
            >
              <PatientPayment />
            </RequireRole>
          }
        />
        <Route
          path="/appointments"
          element={
            <RequireRole role="patient" loginPath="/home?login=patient">
              <PatientDashboard />
            </RequireRole>
          }
        />
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