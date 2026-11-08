import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { auth } from './firebase.js';
import {
  subscribeToAllAppointments,
  subscribeToDoctorAppointments,
  updateAppointment,
} from './appointmentStorage.js';

const doctorStatuses = ['Approved', 'Seen', 'Rejected', 'Completed'];
const adminStatuses = ['Pending', 'confirmed', ...doctorStatuses, 'canceled'];

export default function DoctorDashboard({ claims }) {
  const isAdmin = claims.admin === true;
  const doctorName = claims.doctorName;
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const handleError = subscriptionError => {
      setError(`Could not load appointments: ${subscriptionError.message}`);
    };

    return isAdmin
      ? subscribeToAllAppointments(setAppointments, handleError)
      : subscribeToDoctorAppointments(doctorName, setAppointments, handleError);
  }, [doctorName, isAdmin]);

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

  return (
    <main className="admin-page">
      <div className="admin-topbar">
        <div>
          <div className="eyebrow">KHAMMAMCARE • DOCTOR</div>
          <h1>Doctor Dashboard</h1>
          <p>{isAdmin ? 'All doctor appointments.' : `Appointments assigned to ${doctorName}.`}</p>
        </div>
        <div className="admin-access-actions">
          <Link className="admin-back" to="/home">Back to website</Link>
          <button className="admin-back admin-logout" type="button" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      {error && <div className="admin-error" role="alert">{error}</div>}
      {appointments.length === 0 && !error && (
        <div className="admin-empty">
          <h2>No appointments found</h2>
          <p>
            {isAdmin
              ? 'Appointments will appear here when patients make bookings.'
              : 'Appointments assigned to your doctor account will appear here.'}
          </p>
        </div>
      )}
      {appointments.length > 0 && (
        <div className="admin-panel">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Patient</th><th>Phone</th><th>Hospital</th>
                  <th>Date</th><th>Time</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appointment => (
                  <tr key={appointment.id}>
                    <td>
                      <b>{appointment.name || 'Patient'}</b>
                      <small>{appointment.userEmail || ''}</small>
                      {appointment.reason && <small>Reason: {appointment.reason}</small>}
                    </td>
                    <td>{appointment.phone || '-'}</td>
                    <td>{appointment.hospital || '-'}</td>
                    <td>{appointment.date || '-'}</td>
                    <td>{appointment.time || '-'}</td>
                    <td>
                      <select
                        value={appointment.status || 'confirmed'}
                        onChange={event => changeStatus(appointment.id, event.target.value)}
                        aria-label={`Change status for ${appointment.name || 'appointment'}`}
                      >
                        <option value={appointment.status || 'confirmed'}>{appointment.status || 'confirmed'}</option>
                        {(isAdmin ? adminStatuses : doctorStatuses)
                          .filter(status => status !== appointment.status)
                          .map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
