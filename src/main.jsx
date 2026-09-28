import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Admin from './Admin.jsx';
import './style.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('KhammamCare app root element was not found.');
} else {
  const root = createRoot(rootElement);

  root.render(
    <React.StrictMode>
      {window.location.pathname === '/admin' ? <Admin /> : <App />}
    </React.StrictMode>
  );
}
