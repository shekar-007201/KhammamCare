import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Admin from './Admin.jsx';
import './style.css';

const root = createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    {window.location.pathname === '/admin' ? <Admin /> : <App />}
  </React.StrictMode>
);
