import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged } from "firebase/auth";

import App from "./App";
import Admin from "./Admin";
import PatientAppointments from "./PatientAppointments";
import Auth from "./Auth";
import { auth } from "./firebase";

import "./style.css";

function Root() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const path = window.location.pathname;

  if (loading) {
    return (
      <div className="auth-loading">
        <h2>KhammamCare</h2>
        <p>Checking login...</p>
      </div>
    );
  }

  // Admin page
  if (path === "/admin") {
    if (!user) {
      return <Auth />;
    }

    return <Admin user={user} />;
  }

  // Patient appointments
  if (path === "/appointments") {
    if (!user) {
      return <Auth />;
    }

    return <PatientAppointments user={user} />;
  }

  // Public directory; booking and account pages still require authentication.
  return <App user={user} onLogin={setUser} />;
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