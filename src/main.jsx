import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const App = lazy(() => import('./App.jsx'));
const Admin = lazy(() => import('./Admin.jsx'));
const PatientAppointments = lazy(() => import('./PatientAppointments.jsx'));

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('KhammamCare app root element was not found.');
} else {
  const root = createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <Suspense fallback={<div className="admin-empty">Loading KhammamCare...</div>}>
          {window.location.pathname === '/admin' ? <Admin /> : window.location.pathname === '/appointments' ? <PatientAppointments /> : <App />}
        </Suspense>
      </React.StrictMode>
    );
}
