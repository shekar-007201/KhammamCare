import { useEffect, useMemo, useState } from 'react';
import { getAppointmentStats } from './adminStats.js';
import { subscribeToAllAppointments, updateAppointment } from './appointmentStorage.js';

export default function Admin() {
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return subscribeToAllAppointments(setAppointments);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter(a =>
      (!hospitalFilter || a.hospital === hospitalFilter) &&
      (!q || [
        a.name, a.phone, a.hospital, a.doctor, a.date, a.status, a.paymentMode,
      ].filter(Boolean).join(' ').toLowerCase().includes(q))
    );
  }, [appointments, search, hospitalFilter]);

  const hospitalNames = useMemo(
    () => [...new Set(appointments.map(a => a.hospital).filter(Boolean))].sort(),
    [appointments],
  );

  const changeStatus = async (appointmentId, status) => {
    try {
      await updateAppointment(appointmentId, { status });
    } catch (updateError) {
      setError(`Could not update appointment: ${updateError.message}`);
    }
  };

  const stats = getAppointmentStats(appointments);

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div>
          <div className="eyebrow">KHAMMAMCARE • ADMIN</div>
          <h1>Appointment Dashboard</h1>
          <p>Appointments stored securely in Firebase.</p>
        </div>
        <a className="admin-back" href="/">← Back to website</a>
      </div>

      <div className="admin-stats">
        <div><span>Total</span><strong>{stats.total}</strong></div>
        <div><span>Seen</span><strong>{stats.seen}</strong></div>
        <div><span>Pending</span><strong>{stats.pending}</strong></div>
        <div><span>Confirmed</span><strong>{stats.confirmed}</strong></div>
        <div><span>Completed</span><strong>{stats.completed}</strong></div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <h2>Patient appointments</h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, doctor, hospital..."
          />
          <select value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)}>
            <option value="">All hospitals</option>
            {hospitalNames.map(hospital => <option key={hospital} value={hospital}>{hospital}</option>)}
          </select>
        </div>

        {error && <div className="admin-error" role="alert">{error}</div>}

        {filtered.length === 0 && (
          <div className="admin-empty">
            <h3>No appointments found</h3>
            <p>Book an appointment from the main website. Demo checkout records a demo booking only.</p>
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
                      <select
                        value={a.status || 'confirmed'}
                        onChange={e => changeStatus(a.id, e.target.value)}
                        aria-label={`Change status for ${a.name || 'appointment'}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="Approved">Approved</option>
                        <option value="Seen">Seen</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Completed">Completed</option>
                        <option value="canceled">Canceled</option>
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
