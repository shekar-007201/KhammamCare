import { useEffect, useState } from 'react';
import { CalendarClock, CalendarDays, Clock3, MapPin, Stethoscope, Ticket, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.js';
import { getLocalDateValue } from './validation.js';
import { subscribeToAppointments, updateAppointment } from './appointmentStorage.js';

const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [reschedule, setReschedule] = useState(null);
  const [message, setMessage] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setAuthUser(user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authUser) {
      setAppointments([]);
      return undefined;
    }

    return subscribeToAppointments(
      authUser.uid,
      setAppointments,
      error => setMessage(`Could not load appointments: ${error.message}`),
    );
  }, [authUser?.uid]);

  const cancelAppointment = async appointment => {
    try {
      await updateAppointment(appointment.id, { status: 'canceled' });
      setMessage('Appointment canceled.');
    } catch (error) {
      setMessage(`Could not cancel appointment: ${error.message}`);
    }
  };

  const requestReschedule = async event => {
    event.preventDefault();
    if (!reschedule?.date || !reschedule?.time) return;
    const appointment = appointments.find(item => item.id === reschedule.id);
    if (!appointment) return;

    try {
      const conflict = appointments.some(item =>
        item.id !== appointment.id &&
        item.doctor === appointment.doctor &&
        item.date === reschedule.date &&
        item.time === reschedule.time &&
        !['canceled', 'Rejected'].includes(item.status),
      );
      if (conflict) throw new Error('That appointment time is already booked. Choose another slot.');

      await updateAppointment(appointment.id, {
        date: reschedule.date,
        time: reschedule.time,
      });
      setReschedule(null);
      setMessage('Appointment rescheduled.');
    } catch (error) {
      setMessage(`Could not reschedule appointment: ${error.message}`);
    }
  };

  const submitRating = async (appointment, value) => {
    try {
      await updateAppointment(appointment.id, { rating: value });
      setMessage('Rating saved.');
    } catch (error) {
      setMessage(`Could not save rating: ${error.message}`);
    }
  };

  if (!authReady) {
    return <main className="admin-page"><div className="admin-empty"><p>Loading your account…</p></div></main>;
  }

  if (!authUser) {
    return (
      <main className="admin-page">
        <div className="admin-empty">
          <h1>Sign in to view appointments</h1>
          <p>Your appointment details are available only to your account.</p>
          <a className="admin-back" href="/">Back to sign in</a>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-topbar">
        <div><div className="eyebrow">KHAMMAMCARE • PATIENT</div><h1>My Appointments</h1><p>View history, cancel a visit, request a new time, and rate completed visits.</p></div>
        <a className="admin-back" href="/">Back to website</a>
      </div>
      {message && <div className="admin-error">{message}</div>}
      {appointments.length === 0 && <div className="admin-empty"><h3>No appointments yet</h3><p>Book your first consultation from the main website.</p></div>}
      <div className="patient-appointments">
        {appointments.map(appointment => {
          const active = !['canceled', 'Rejected', 'Completed'].includes(appointment.status);
          const currentRating = appointment.rating || 0;
          const status = appointment.status || 'confirmed';
          const statusClass = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          return (
            <article className="patient-appointment" key={appointment.id}>
              <div className="appointment-card-main">
                <div className="appointment-heading">
                  <span className="appointment-mark" aria-hidden="true"><Stethoscope size={21} /></span>
                  <div className="appointment-heading-copy">
                    <span className={`appointment-status status-${statusClass}`}>{status}</span>
                    <h2>{appointment.doctor || 'Doctor appointment'}</h2>
                    <p><MapPin size={15} aria-hidden="true" />{appointment.hospital || 'Hospital not specified'}</p>
                  </div>
                </div>

                <dl className="appointment-meta">
                  <div>
                    <dt>Date</dt>
                    <dd><CalendarDays size={16} aria-hidden="true" />{appointment.date || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd><Clock3 size={16} aria-hidden="true" />{appointment.time || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt>Visit token</dt>
                    <dd><Ticket size={16} aria-hidden="true" />{appointment.token || 'Pending'}</dd>
                  </div>
                </dl>
              </div>

              <footer className="appointment-card-footer">
                <div className="appointment-reference">
                  <span className="appointment-reference-icon" aria-hidden="true"><CalendarClock size={17} /></span>
                  <span>Appointment booking</span>
                </div>
                <div className="patient-actions">
                  {active && (
                    <>
                      <button
                        type="button"
                        className="secondary-btn appointment-action"
                        onClick={() => setReschedule({ id: appointment.id, doctor: appointment.doctor, date: appointment.date, time: appointment.time })}
                      >
                        <CalendarClock size={16} aria-hidden="true" />Request reschedule
                      </button>
                      <button
                        type="button"
                        className="book-btn appointment-action cancel-appointment-btn"
                        onClick={() => cancelAppointment(appointment)}
                      >
                        <X size={16} aria-hidden="true" />Cancel appointment
                      </button>
                    </>
                  )}
                  {appointment.status === 'Completed' && (
                    <div className="rating-control">
                      <span>Rate doctor</span>
                      {[1, 2, 3, 4, 5].map(value => (
                        <button
                          type="button"
                          key={value}
                          className={value <= currentRating ? 'active' : ''}
                          onClick={() => submitRating(appointment, value)}
                          aria-label={`${value} stars`}
                        >★</button>
                      ))}
                    </div>
                  )}
                </div>
              </footer>
            </article>
          );
        })}
      </div>
      {reschedule && <div className="modal show" onClick={event => event.target === event.currentTarget && setReschedule(null)}><form className="modal-card login-form" onSubmit={requestReschedule}><button type="button" className="modal-close" onClick={() => setReschedule(null)}>×</button><div className="eyebrow">RESCHEDULE REQUEST</div><h2>Choose a new visit time</h2><label htmlFor="reschedule-date">Date</label><input id="reschedule-date" type="date" min={getLocalDateValue()} value={reschedule.date} onChange={event => setReschedule(current => ({ ...current, date: event.target.value }))} required /><label htmlFor="reschedule-time">Time</label><select id="reschedule-time" value={reschedule.time} onChange={event => setReschedule(current => ({ ...current, time: event.target.value }))} required>{timeSlots.map(slot => <option key={slot}>{slot}</option>)}</select><button className="primary-btn full">Send reschedule request</button></form></div>}
    </main>
  );
}
