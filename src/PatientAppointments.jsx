import { useState } from 'react';
import { getLocalDateValue } from './validation.js';

const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
const storageKey = 'khammamcare-demo-appointments';
const readAppointments = () => {
  try {
    const appointments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(appointments) ? appointments : [];
  } catch {
    return [];
  }
};
const saveAppointments = appointments => localStorage.setItem(storageKey, JSON.stringify(appointments));

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState(readAppointments);
  const [reschedule, setReschedule] = useState(null);
  const [rating, setRating] = useState({});
  const [message, setMessage] = useState('');

  const cancelAppointment = async appointment => {
    const updated = appointments.map(item => item.id === appointment.id ? { ...item, status: 'canceled' } : item);
    saveAppointments(updated);
    setAppointments(updated);
    setMessage('Demo appointment canceled.');
  };

  const requestReschedule = async event => {
    event.preventDefault();
    if (!reschedule?.date || !reschedule?.time) return;
    const updated = appointments.map(item => item.id === reschedule.id ? { ...item, date: reschedule.date, time: reschedule.time } : item);
    saveAppointments(updated);
    setAppointments(updated);
    setReschedule(null);
    setMessage('Demo appointment rescheduled.');
  };

  const submitRating = async (appointment, value) => {
    const updated = appointments.map(item => item.id === appointment.id ? { ...item, rating: value } : item);
    saveAppointments(updated);
    setAppointments(updated);
    setRating(current => ({ ...current, [appointment.id]: value }));
    setMessage('Demo rating saved.');
  };

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
          const currentRating = rating[appointment.id] || appointment.rating || 0;
          return <article className="patient-appointment" key={appointment.id}>
            <div><span className="tag">{appointment.status || 'confirmed'}</span><h2>{appointment.doctor}</h2><p>{appointment.hospital}</p><p><b>{appointment.date}</b> at <b>{appointment.time}</b></p><small>Token: {appointment.token || 'Pending'}</small></div>
            <div className="patient-actions">
              {active && <><button className="secondary-btn" onClick={() => setReschedule({ id: appointment.id, doctor: appointment.doctor, date: appointment.date, time: appointment.time })}>Request reschedule</button><button className="book-btn" onClick={() => cancelAppointment(appointment)}>Cancel appointment</button></>}
              {appointment.status === 'Completed' && <div className="rating-control"><span>Rate doctor</span>{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} className={value <= currentRating ? 'active' : ''} onClick={() => submitRating(appointment, value)} aria-label={`${value} stars`}>★</button>)}</div>}
            </div>
          </article>;
        })}
      </div>
      {reschedule && <div className="modal show" onClick={event => event.target === event.currentTarget && setReschedule(null)}><form className="modal-card login-form" onSubmit={requestReschedule}><button type="button" className="modal-close" onClick={() => setReschedule(null)}>×</button><div className="eyebrow">RESCHEDULE REQUEST</div><h2>Choose a new visit time</h2><label htmlFor="reschedule-date">Date</label><input id="reschedule-date" type="date" min={getLocalDateValue()} value={reschedule.date} onChange={event => setReschedule(current => ({ ...current, date: event.target.value }))} required /><label htmlFor="reschedule-time">Time</label><select id="reschedule-time" value={reschedule.time} onChange={event => setReschedule(current => ({ ...current, time: event.target.value }))} required>{timeSlots.map(slot => <option key={slot}>{slot}</option>)}</select><button className="primary-btn full">Send reschedule request</button></form></div>}
    </main>
  );
}
