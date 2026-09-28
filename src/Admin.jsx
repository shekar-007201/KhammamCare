import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase.js';
import DirectoryAdmin from './DirectoryAdmin.jsx';

export default function Admin() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [adminUser, setAdminUser] = useState({ loading: true, user: null, isAdmin: false });

  useEffect(() => onAuthStateChanged(auth, async user => {
    if (!user) {
      setAdminUser({ loading: false, user: null, isAdmin: false });
      return;
    }
    try {
      const token = await user.getIdTokenResult();
      setAdminUser({ loading: false, user, isAdmin: token.claims.admin === true });
    } catch (authError) {
      console.error(authError);
      setAdminUser({ loading: false, user, isAdmin: false });
    }
  }), []);

  useEffect(() => {
    if (!adminUser.isAdmin) return undefined;
    const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      setAppointments(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setLoading(false);
      setError('');
    }, err => {
      console.error(err);
      setError('Could not load appointments. Check Firestore rules and database setup.');
      setLoading(false);
    });
    return unsubscribe;
  }, [adminUser.isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter(a =>
      (!hospitalFilter || a.hospital === hospitalFilter) &&
      (!q || [a.name, a.phone, a.hospital, a.doctor, a.date, a.status, a.paymentMode]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    );
  }, [appointments, search, hospitalFilter]);

  const hospitalNames = useMemo(() => [...new Set(appointments.map(appointment => appointment.hospital).filter(Boolean))].sort(), [appointments]);

  const changeStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (err) {
      console.error(err);
      alert('Status update failed. Check Firestore rules.');
    }
  };

  const pending = appointments.filter(a => (a.status || 'confirmed') === 'Pending').length;
  const confirmed = appointments.filter(a => ['confirmed', 'Approved'].includes(a.status)).length;
  const completed = appointments.filter(a => a.status === 'Completed').length;

  if (adminUser.loading) return <main className="admin-page"><div className="admin-empty">Checking admin access...</div></main>;
  if (!adminUser.user) return <main className="admin-page"><div className="admin-topbar"><div><div className="eyebrow">KHAMMAMCARE • ADMIN</div><h1>Admin sign-in required</h1><p>Sign in with your authorized Firebase admin account to manage hospital appointments.</p></div><a className="admin-back" href="/">Back to website</a></div></main>;
  if (!adminUser.isAdmin) return <main className="admin-page"><div className="admin-topbar"><div><div className="eyebrow">KHAMMAMCARE • ADMIN</div><h1>Access denied</h1><p>{adminUser.user.email} does not have the Firebase <b>admin</b> custom claim.</p></div><a className="admin-back" href="/">Back to website</a></div></main>;

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div>
          <div className="eyebrow">KHAMMAMCARE • ADMIN</div>
          <h1>Appointment Dashboard</h1>
          <p>Live data from your Firestore <b>appointments</b> collection.</p>
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

        {loading && <div className="admin-empty">Loading appointments...</div>}
        {error && <div className="admin-error">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="admin-empty">
            <h3>No appointments found</h3>
            <p>Book an appointment from the main website. After demo payment, it will appear here automatically.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
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
      <DirectoryAdmin />
    </div>
  );
}
