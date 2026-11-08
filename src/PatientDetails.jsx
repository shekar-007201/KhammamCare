import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, HeartPulse } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from './firebase.js';
import { useDirectory } from './useDirectory.js';
import { getLocalDateValue, validateAppointment } from './validation.js';
import { BOOKING_DRAFT_KEY } from './bookingConstants.js';
import { subscribeToAppointments } from './appointmentStorage.js';
const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

function readBookingDraft() {
  try {
    const saved = sessionStorage.getItem(BOOKING_DRAFT_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Could not read the appointment draft:', error);
    return {};
  }
}

export default function PatientDetails() {
  const navigate = useNavigate();
  const { doctors, hospitals } = useDirectory();
  const [form, setForm] = useState(() => ({
    name: '',
    phone: '',
    age: '',
    hospital: '',
    doctor: '',
    date: '',
    time: '',
    reason: '',
    ...readBookingDraft(),
  }));
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    let active = true;
    let unsubscribe;

    auth.authStateReady()
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, currentUser => {
          if (!active) return;
          setAuthReady(true);
          setUser(currentUser);
          if (!currentUser) {
            navigate('/home?login=patient&returnTo=%2Fpatient%2Fdetails', { replace: true });
          }
        });
      })
      .catch(authError => {
        console.error('Could not restore the patient session:', authError);
        if (active) {
          setError('Could not check your sign-in status. Please refresh and try again.');
          setAuthReady(true);
        }
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      setAppointments([]);
      return undefined;
    }

    return subscribeToAppointments(user.uid, setAppointments, subscriptionError => {
      console.error('Could not load appointment times:', subscriptionError);
      setError('Could not check your existing appointment times. Please try again.');
    });
  }, [user]);

  const availableDoctors = useMemo(
    () => doctors
      .filter(doctor => !form.hospital || doctor[2] === form.hospital)
      .sort((first, second) => first[0].localeCompare(second[0])),
    [doctors, form.hospital],
  );

  const reservedSlots = useMemo(
    () => appointments
      .filter(appointment =>
        appointment.doctor === form.doctor &&
        appointment.date === form.date &&
        !['canceled', 'rejected'].includes(String(appointment.status).toLowerCase()),
      )
      .map(appointment => appointment.time),
    [appointments, form.date, form.doctor],
  );

  const update = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    const validationError = validateAppointment(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (reservedSlots.includes(form.time)) {
      setError('This time is already used by one of your appointments. Choose another time.');
      return;
    }

    setError('');
    try {
      sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(form));
    } catch (storageError) {
      console.error('Could not save the appointment draft:', storageError);
      setError('Could not save your appointment details in this browser. Check available storage and try again.');
      return;
    }

    if (!auth.currentUser) {
      navigate('/home?login=patient&returnTo=%2Fpatient%2Fdetails');
      return;
    }

    navigate('/patient/payment');
  };

  if (!authReady || !user) {
    return <main className="checkout-page"><div className="admin-empty">Checking your account…</div></main>;
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <Link className="brand" to="/home">
          <span className="brand-icon">✚</span>
          <span>Khammam<span>Care</span><small>Doctors &amp; Hospitals</small></span>
        </Link>
        <Link className="secondary-btn" to="/home"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
      </header>

      <div className="checkout-title">
        <div className="eyebrow">STEP 1 OF 2 · APPOINTMENT DETAILS</div>
        <h1>Enter patient and visit details</h1>
        <p>Choose your hospital, doctor, and preferred appointment time.</p>
      </div>

      <section className="patient-details-card">
        <form className="patient-details-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div>
              <label htmlFor="booking-name">Patient name</label>
              <input id="booking-name" value={form.name} onChange={event => update('name', event.target.value)} required maxLength={100} />
            </div>
            <div>
              <label htmlFor="booking-phone">Phone</label>
              <input
                id="booking-phone"
                inputMode="numeric"
                value={form.phone}
                onChange={event => update('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                pattern="[0-9]{10}"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="booking-age">Patient age</label>
              <input id="booking-age" type="number" min="1" max="120" value={form.age} onChange={event => update('age', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="booking-hospital">Hospital</label>
              <select
                id="booking-hospital"
                value={form.hospital}
                onChange={event => {
                  update('hospital', event.target.value);
                  if (!doctors.some(doctor => doctor[0] === form.doctor && doctor[2] === event.target.value)) {
                    update('doctor', '');
                  }
                  update('time', '');
                }}
                required
              >
                <option value="">Select hospital</option>
                {hospitals.map(hospital => <option key={hospital[0]} value={hospital[0]}>{hospital[0]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label htmlFor="booking-doctor">Doctor</label>
              <select id="booking-doctor" value={form.doctor} onChange={event => { update('doctor', event.target.value); update('time', ''); }} required>
                <option value="">Select doctor</option>
                {availableDoctors.map(doctor => <option key={doctor[0]} value={doctor[0]}>{doctor[0]} · {doctor[1]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="booking-date">Date</label>
              <input
                id="booking-date"
                type="date"
                min={getLocalDateValue()}
                value={form.date}
                onChange={event => { update('date', event.target.value); update('time', ''); }}
                required
              />
            </div>
          </div>

          <fieldset className="patient-time-slots">
            <legend>Appointment time</legend>
            <div className="time-slot-grid" role="group" aria-label="Appointment time slots">
              {timeSlots.map(slot => (
                <button
                  type="button"
                  key={slot}
                  className={`time-slot-seat${form.time === slot ? ' selected' : ''}${reservedSlots.includes(slot) ? ' booked' : ''}`}
                  aria-pressed={form.time === slot}
                  onClick={() => update('time', slot)}
                  disabled={!form.doctor || !form.date || reservedSlots.includes(slot)}
                >
                  <span className="slot-seat-time">{slot}</span>
                  <span className="slot-seat-state">{reservedSlots.includes(slot) ? 'Booked' : form.time === slot ? 'Selected' : 'Choose'}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="booking-reason">Reason / symptoms <span>(optional)</span></label>
            <textarea id="booking-reason" rows="3" maxLength={1000} value={form.reason} onChange={event => update('reason', event.target.value)} placeholder="Briefly describe the reason for your visit" />
          </div>

          {error && <p className="booking-error" role="alert">{error}</p>}

          <div className="patient-details-actions">
            <Link className="secondary-btn" to="/home"><ArrowLeft size={16} aria-hidden="true" /> Cancel</Link>
            <button className="primary-btn" type="submit">
              Continue to payment <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          {!auth.currentUser && <p className="patient-login-note"><HeartPulse size={15} aria-hidden="true" /> You’ll sign in with your patient account before payment.</p>}
        </form>
      </section>
    </main>
  );
}
