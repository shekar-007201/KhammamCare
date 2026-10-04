import React, { useEffect, useMemo, useState } from 'react';

const storageKey = 'khammamcare-demo-appointments';
const readAppointments = () => {
  try {
    const appointments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(appointments) ? appointments : [];
  } catch {
    return [];
  }
};

export default function Admin() {
  const [appointments, setAppointments] = useState(readAppointments);
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');

  useEffect(() => {
    const syncAppointments = () => setAppointments(readAppointments());
    window.addEventListener('storage', syncAppointments);
    return () => window.removeEventListener('storage', syncAppointments);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter(a =>
      (!hospitalFilter || a.hospital === hospitalFilter) &&
      (!q || [a.name, a.phone, a.hospital, a.doctor, a.date, a.status, a.paymentMode]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    );
  }, [appointments, search, hospitalFilter]);

  const hospitalNames = useMemo(() => [...new Set(appointments.map(appointment => appointment.hospital).filter(Boolean))].sort(), [appointments]);

  const changeStatus = (id, status) => {
    const updated = appointments.map(appointment => appointment.id === id ? { ...appointment, status } : appointment);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setAppointments(updated);
  };

  const pending = appointments.filter(a => (a.status || 'confirmed') === 'Pending').length;
  const confirmed = appointments.filter(a => ['confirmed', 'Approved'].includes(a.status)).length;
  const completed = appointments.filter(a => a.status === 'Completed').length;

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div>
          <div className="eyebrow">KHAMMAMCARE • ADMIN</div>
          <h1>Appointment Dashboard</h1>
          <p>Appointments saved in this browser's local storage.</p>
        </div>
        <a className="admin-back" href="/">← Back to website</a>
      </div>

      <div className="admin-stats">
        <div><span>Total</span><strong>{appointments.length}</strong></div>
        <div><span>Pending</span><strong>{pending}</strong></div>
        <div><span>Confirmed</span><strong>{confirmed}</strong></div>
        <div><span>Completed</span><strong>{completed}</strong></div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <h2>Patient appointments</h2>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, doctor, hospital..." />
          <select value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)}><option value="">All hospitals</option>{hospitalNames.map(hospital => <option key={hospital}>{hospital}</option>)}</select>
        </div>

        {filtered.length === 0 && (
          <div className="admin-empty">
            <h3>No appointments found</h3>
            <p>Book an appointment from the main website. After demo payment, it will appear here automatically.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Patient</th><th>Phone</th><th>Hospital</th><th>Doctor</th>
                  <th>Date</th><th>Time</th><th>Payment</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td><b>{a.name || '-'}</b><small>{a.userEmail || ''}</small></td>
                    <td>{a.phone || '-'}</td>
                    <td>{a.hospital || '-'}</td>
                    <td>{a.doctor || '-'}</td>
                    <td>{a.date || '-'}</td>
                    <td>{a.time || '-'}</td>
                    <td><span className="payment-badge">{a.paymentMode || 'Demo'}</span></td>
                    <td>
                      <select value={a.status || 'confirmed'} onChange={e => changeStatus(a.id, e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
