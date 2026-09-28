import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase.js';

const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
const slotIdFor = (doctor, date, time) => [doctor, date, time].map(value => encodeURIComponent(value)).join('__');

export default function PatientAppointments() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [reschedule, setReschedule] = useState(null);
  const [rating, setRating] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return undefined;
    }
    const appointmentsQuery = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    return onSnapshot(appointmentsQuery, snapshot => {
      setAppointments(snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((first, second) => `${second.date} ${second.time}`.localeCompare(`${first.date} ${first.time}`)));
      setLoading(false);
    }, error => {
      console.error(error);
      setMessage('Unable to load your appointments. Please try again.');
      setLoading(false);
    });
  }, [user]);

  const cancelAppointment = async appointment => {
    try {
      await runTransaction(db, async transaction => {
        const appointmentRef = doc(db, 'appointments', appointment.id);
        const appointmentSnapshot = await transaction.get(appointmentRef);
        if (!appointmentSnapshot.exists() || appointmentSnapshot.data().userId !== user.uid) throw new Error('Appointment not found.');
        transaction.update(appointmentRef, { status: 'canceled', updatedAt: serverTimestamp(), updatedBy: 'patient' });
        if (appointment.slotId) transaction.delete(doc(db, 'slotReservations', appointment.slotId));
      });
      setMessage('Appointment canceled and its time slot is available again.');
    } catch (error) {
      console.error(error);
      setMessage('Could not cancel this appointment.');
    }
  };

  const requestReschedule = async event => {
    event.preventDefault();
    if (!reschedule?.date || !reschedule?.time) return;
    try {
      const appointmentRef = doc(db, 'appointments', reschedule.id);
      const newSlotId = slotIdFor(reschedule.doctor, reschedule.date, reschedule.time);
      await runTransaction(db, async transaction => {
        const appointmentSnapshot = await transaction.get(appointmentRef);
        const newSlotRef = doc(db, 'slotReservations', newSlotId);
        const newSlotSnapshot = await transaction.get(newSlotRef);
        if (!appointmentSnapshot.exists() || appointmentSnapshot.data().userId !== user.uid) throw new Error('Appointment not found.');
        if (newSlotSnapshot.exists() && newSlotSnapshot.data().status === 'reserved') throw new Error('That time slot is already booked.');
        const oldSlotId = appointmentSnapshot.data().slotId;
        if (oldSlotId && oldSlotId !== newSlotId) transaction.delete(doc(db, 'slotReservations', oldSlotId));
        transaction.set(newSlotRef, { doctor: reschedule.doctor, date: reschedule.date, time: reschedule.time, userId: user.uid, appointmentId: reschedule.id, status: 'reserved', updatedAt: serverTimestamp() });
        transaction.update(appointmentRef, { date: reschedule.date, time: reschedule.time, slotId: newSlotId, status: 'confirmed', updatedAt: serverTimestamp(), updatedBy: 'patient' });
      });
      setReschedule(null);
      setMessage('Appointment rescheduled successfully.');
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Could not request a reschedule.');
    }
  };

  const submitRating = async (appointment, value) => {
    try {
      const ratingId = `${user.uid}__${encodeURIComponent(appointment.doctor)}`;
      await setDoc(doc(db, 'ratings', ratingId), { userId: user.uid, doctor: appointment.doctor, hospital: appointment.hospital, rating: value, appointmentId: appointment.id, updatedAt: serverTimestamp() });
      setRating(current => ({ ...current, [appointment.id]: value }));
      setMessage('Thank you for rating your doctor.');
    } catch (error) {
      console.error(error);
      setMessage('Could not save the rating.');
    }
  };

  if (!user) {
    return <main className="admin-page"><div className="admin-topbar"><div><div className="eyebrow">KHAMMAMCARE</div><h1>My Appointments</h1><p>Please sign in from the main website to view your appointment history.</p></div><a className="admin-back" href="/">Back to website</a></div></main>;
  }

  return (
    <main className="admin-page">
      <div className="admin-topbar">
        <div><div className="eyebrow">KHAMMAMCARE • PATIENT</div><h1>My Appointments</h1><p>View history, cancel a visit, request a new time, and rate completed visits.</p></div>
        <a className="admin-back" href="/">Back to website</a>
      </div>
      {message && <div className="admin-error">{message}</div>}
      {loading && <div className="admin-empty">Loading your appointments...</div>}
      {!loading && appointments.length === 0 && <div className="admin-empty"><h3>No appointments yet</h3><p>Book your first consultation from the main website.</p></div>}
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
      {reschedule && <div className="modal show" onClick={event => event.target === event.currentTarget && setReschedule(null)}><form className="modal-card login-form" onSubmit={requestReschedule}><button type="button" className="modal-close" onClick={() => setReschedule(null)}>×</button><div className="eyebrow">RESCHEDULE REQUEST</div><h2>Choose a new visit time</h2><label htmlFor="reschedule-date">Date</label><input id="reschedule-date" type="date" min={new Date().toISOString().split('T')[0]} value={reschedule.date} onChange={event => setReschedule(current => ({ ...current, date: event.target.value }))} required /><label htmlFor="reschedule-time">Time</label><select id="reschedule-time" value={reschedule.time} onChange={event => setReschedule(current => ({ ...current, time: event.target.value }))} required>{timeSlots.map(slot => <option key={slot}>{slot}</option>)}</select><button className="primary-btn full">Send reschedule request</button></form></div>}
    </main>
  );
}
