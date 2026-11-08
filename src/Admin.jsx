import { useEffect, useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { getAppointmentStats } from './adminStats.js';
import DoctorAccessManager from './DoctorAccessManager.jsx';
import { subscribeToAllAppointments, updateAppointment } from './appointmentStorage.js';
import { doctors } from './data.js';
import { auth } from './firebase.js';

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [dashboard, setDashboard] = useState('appointments');
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    return subscribeToAllAppointments(
      setAppointments,
      subscriptionError => setError(`Could not load appointments: ${subscriptionError.message}`),
    );
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

  const patients = useMemo(() => {
    const patientMap = new Map();
    appointments.forEach(appointment => {
      const key = appointment.uid || [
        appointment.userEmail,
        appointment.phone,
        appointment.name,
        appointment.id,
      ].filter(Boolean).join(':');
      const patient = patientMap.get(key) || {
        uid: key,
        name: appointment.name || 'Patient',
        email: appointment.userEmail || '',
        phone: appointment.phone || '',
        appointmentCount: 0,
        latestAppointment: '',
      };

      patient.appointmentCount += 1;
      if (appointment.date && appointment.date > patient.latestAppointment) {
        patient.latestAppointment = appointment.date;
      }
      patientMap.set(key, patient);
    });

    return [...patientMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments]);

  const doctorsWithAppointments = useMemo(() => {
    const appointmentCounts = new Map();
    appointments.forEach(appointment => {
      if (appointment.doctor) {
        appointmentCounts.set(
          appointment.doctor,
          (appointmentCounts.get(appointment.doctor) || 0) + 1,
        );
      }
    });

    return doctors.map(([name, specialty, hospital]) => ({
      name,
      specialty,
      hospital,
      appointmentCount: appointmentCounts.get(name) || 0,
    }));
  }, [appointments]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter(patient =>
      !q || [patient.name, patient.email, patient.phone].join(' ').toLowerCase().includes(q)
    );
  }, [patients, search]);

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctorsWithAppointments.filter(doctor =>
      !q || [doctor.name, doctor.specialty, doctor.hospital].join(' ').toLowerCase().includes(q)
    );
  }, [doctorsWithAppointments, search]);

  const changeStatus = async (appointmentId, status) => {
    try {
      await updateAppointment(appointmentId, { status });
    } catch (updateError) {
      setError(`Could not update appointment: ${updateError.message}`);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setError('');
    try {
      await signOut(auth);
    } catch (signOutError) {
      setError(`Could not sign out: ${signOutError.message}`);
    } finally {
      setSigningOut(false);
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
        <div className="admin-access-actions">
          <Link className="admin-back" to="/home">← Back to website</Link>
          <button className="admin-back admin-logout" type="button" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      <nav className="admin-dashboard-nav" aria-label="Admin dashboard sections">
        <button
          type="button"
          className={dashboard === 'appointments' ? 'active' : ''}
          aria-pressed={dashboard === 'appointments'}
          onClick={() => { setDashboard('appointments'); setSearch(''); }}
        >
          Appointments
        </button>
        <button
          type="button"
          className={dashboard === 'patients' ? 'active' : ''}
          aria-pressed={dashboard === 'patients'}
          onClick={() => { setDashboard('patients'); setSearch(''); }}
        >
          Patients <span>{patients.length}</span>
        </button>
        <button
          type="button"
          className={dashboard === 'doctors' ? 'active' : ''}
          aria-pressed={dashboard === 'doctors'}
          onClick={() => { setDashboard('doctors'); setSearch(''); }}
        >
          Doctors <span>{doctorsWithAppointments.length}</span>
        </button>
      </nav>

      <div className="admin-stats">
        <div><span>Total</span><strong>{stats.total}</strong></div>
        <div><span>Seen</span><strong>{stats.seen}</strong></div>
        <div><span>Pending</span><strong>{stats.pending}</strong></div>
        <div><span>Confirmed</span><strong>{stats.confirmed}</strong></div>
        <div><span>Completed</span><strong>{stats.completed}</strong></div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-toolbar-heading">
            <h2>
              {dashboard === 'appointments' && 'Patient appointments'}
              {dashboard === 'patients' && 'Patient dashboard'}
              {dashboard === 'doctors' && 'Doctor dashboard'}
            </h2>
            {dashboard === 'patients' && <p>Patients with appointment records</p>}
            {dashboard === 'doctors' && <p>Doctor directory and appointment activity</p>}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              dashboard === 'appointments'
                ? 'Search patient, doctor, hospital...'
                : dashboard === 'patients'
                  ? 'Search patients...'
                  : 'Search doctors, speciality, hospital...'
            }
            aria-label={`Search ${dashboard}`}
          />
          {dashboard === 'appointments' && (
            <select value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)} aria-label="Filter by hospital">
              <option value="">All hospitals</option>
              {hospitalNames.map(hospital => <option key={hospital} value={hospital}>{hospital}</option>)}
            </select>
          )}
        </div>

        {error && <div className="admin-error" role="alert">{error}</div>}

        {dashboard === 'doctors' && <DoctorAccessManager />}

        {dashboard === 'appointments' && filtered.length === 0 && (
          <div className="admin-empty">
            <h3>No appointments found</h3>
            <p>Book an appointment from the main website. Demo checkout records a demo booking only.</p>
          </div>
        )}

        {dashboard === 'appointments' && filtered.length > 0 && (
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

        {dashboard === 'patients' && filteredPatients.length === 0 && (
          <div className="admin-empty">
            <h3>{patients.length ? 'No matching patients' : 'No patient records yet'}</h3>
            <p>Patient records appear here when appointments are booked.</p>
          </div>
        )}

        {dashboard === 'patients' && filteredPatients.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table admin-directory-table">
              <thead>
                <tr><th>Patient</th><th>Email</th><th>Phone</th><th>Appointments</th><th>Latest visit</th></tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => (
                  <tr key={patient.uid}>
                    <td><b>{patient.name}</b></td>
                    <td>{patient.email || '-'}</td>
                    <td>{patient.phone || '-'}</td>
                    <td>{patient.appointmentCount}</td>
                    <td>{patient.latestAppointment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dashboard === 'doctors' && filteredDoctors.length === 0 && (
          <div className="admin-empty">
            <h3>No matching doctors</h3>
            <p>Try searching by doctor name, speciality, or hospital.</p>
          </div>
        )}

        {dashboard === 'doctors' && filteredDoctors.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table admin-directory-table">
              <thead>
                <tr><th>Doctor</th><th>Speciality</th><th>Hospital</th><th>Appointments</th></tr>
              </thead>
              <tbody>
                {filteredDoctors.map(doctor => (
                  <tr key={`${doctor.name}-${doctor.hospital}`}>
                    <td><b>{doctor.name}</b></td>
                    <td>{doctor.specialty}</td>
                    <td>{doctor.hospital}</td>
                    <td>{doctor.appointmentCount}</td>
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
