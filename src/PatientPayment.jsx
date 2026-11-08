import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Landmark, Smartphone } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { APPOINTMENT_FEE, BOOKING_DRAFT_KEY } from './bookingConstants.js';
import { auth } from './firebase.js';
import { createBooking } from './appointmentStorage.js';

const PAYMENT_METHODS = [
  { name: 'UPI', Icon: Smartphone },
  { name: 'Card', Icon: CreditCard },
  { name: 'Net Banking', Icon: Landmark },
];

function readBookingDraft() {
  try {
    const draft = sessionStorage.getItem(BOOKING_DRAFT_KEY);
    return draft ? JSON.parse(draft) : null;
  } catch (error) {
    console.error('Could not read the appointment draft:', error);
    return null;
  }
}

export default function PatientPayment() {
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(readBookingDraft);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentInput, setPaymentInput] = useState('');
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    let active = true;
    let unsubscribe;

    auth.authStateReady()
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, user => {
          if (!active) return;
          setAuthReady(true);
          if (!user) {
            navigate('/home?login=patient&returnTo=%2Fpatient%2Fpayment', { replace: true });
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
    if (authReady && !appointment && !receipt) navigate('/patient/details', { replace: true });
  }, [appointment, authReady, navigate, receipt]);

  const finishPayment = async event => {
    event.preventDefault();
    if (!auth.currentUser || !appointment) return;
    if (!paymentInput.trim()) {
      setError(`Enter your ${paymentMode === 'UPI' ? 'UPI ID' : paymentMode === 'Card' ? 'card number' : 'bank'}.`);
      return;
    }

    setSaving(true);
    setError('');
    const token = `KHM-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookedAt = new Date().toISOString();
    const booking = {
      ...appointment,
      amount: APPOINTMENT_FEE,
      paymentMode,
      paymentStatus: 'demo-paid',
      payment: `${paymentMode} (demo)`,
      token,
      status: 'confirmed',
      paymentProvider: 'demo',
      createdAt: bookedAt,
      bookedAt,
      userEmail: auth.currentUser.email || '',
      uid: auth.currentUser.uid,
    };

    try {
      const saved = await createBooking(booking, {
        uid: auth.currentUser.uid,
        appointmentToken: token,
        amount: APPOINTMENT_FEE,
        paymentMode,
        paymentStatus: 'demo-paid',
        paymentProvider: 'demo',
      });
      sessionStorage.removeItem(BOOKING_DRAFT_KEY);
      setAppointment(null);
      setReceipt(saved);
      setPaymentInput('');
    } catch (saveError) {
      console.error('Could not save the appointment and demo payment:', saveError);
      setError(`Could not save the appointment: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || (!appointment && !receipt)) {
    return <main className="checkout-page"><div className="admin-empty">Loading your appointment…</div></main>;
  }

  if (receipt) {
    return (
      <main className="receipt-page">
        <section className="receipt success receipt-card">
          <div className="receipt-header">
            <div><div className="eyebrow">APPOINTMENT CONFIRMED</div><h1>Payment receipt</h1></div>
            <div className="success-icon" aria-label="Appointment confirmed">✓</div>
          </div>
          <div className="receipt-token"><small>APPOINTMENT TOKEN</small><strong>{receipt.token}</strong></div>
          <div className="receipt-details">
            <div><span>Patient</span><b>{receipt.name}</b><small>Age {receipt.age} · {receipt.phone}</small></div>
            <div><span>Doctor</span><b>{receipt.doctor}</b></div>
            <div><span>Hospital</span><b>{receipt.hospital}</b></div>
            <div><span>Appointment</span><b>{receipt.date} at {receipt.time}</b></div>
          </div>
          <div className="receipt-total"><span>Total paid · {receipt.payment}</span><b>₹{receipt.amount}.00</b></div>
          <p className="receipt-note">Keep this token for your hospital visit. This is a demo payment receipt.</p>
          <div className="receipt-actions">
            <Link className="secondary-btn" to="/home">Back to home</Link>
            <Link className="primary-btn" to="/appointments">My appointments</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <Link className="brand" to="/home">
          <span className="brand-icon">✚</span>
          <span>Khammam<span>Care</span><small>Doctors &amp; Hospitals</small></span>
        </Link>
        <Link className="secondary-btn" to="/patient/details"><ArrowLeft size={16} aria-hidden="true" /> Edit details</Link>
      </header>
      <div className="checkout-title">
        <div className="eyebrow">STEP 2 OF 2 · DEMO CHECKOUT</div>
        <h1>Choose a payment method</h1>
        <p>No real payment will be processed or charged.</p>
      </div>
      <div className="checkout-layout">
        <form className="checkout-card" onSubmit={finishPayment}>
          <h2>Payment method</h2>
          <div className="pay-options">
            {PAYMENT_METHODS.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                className={paymentMode === name ? 'active' : ''}
                aria-pressed={paymentMode === name}
                onClick={() => { setPaymentMode(name); setPaymentInput(''); setError(''); }}
              >
                <Icon aria-hidden="true" /><span>{name}</span>
              </button>
            ))}
          </div>
          <label className="checkout-field" htmlFor="demo-payment-input">
            {paymentMode === 'UPI' ? 'UPI ID' : paymentMode === 'Card' ? 'Card number' : 'Select bank'} <span>(demo only)</span>
            {paymentMode === 'Net Banking' ? (
              <select id="demo-payment-input" className="payment-input" value={paymentInput} onChange={event => setPaymentInput(event.target.value)} required>
                <option value="">Choose a bank</option>
                <option>State Bank of India</option>
                <option>HDFC Bank</option>
                <option>ICICI Bank</option>
                <option>Axis Bank</option>
              </select>
            ) : (
              <input
                id="demo-payment-input"
                className="payment-input"
                autoComplete="off"
                inputMode={paymentMode === 'Card' ? 'numeric' : 'text'}
                maxLength={paymentMode === 'Card' ? 16 : 100}
                value={paymentInput}
                onChange={event => setPaymentInput(paymentMode === 'Card' ? event.target.value.replace(/\D/g, '') : event.target.value)}
                required
              />
            )}
          </label>
          {error && <div className="admin-error" role="alert">{error}</div>}
          <button type="submit" className="primary-btn full checkout-submit" disabled={saving}>
            {saving ? 'Confirming appointment…' : `Confirm demo payment · ₹${APPOINTMENT_FEE}`}
          </button>
          <p className="checkout-disclaimer">Demo only. Payment details are not stored or sent to a payment provider.</p>
        </form>
        <aside className="checkout-card checkout-summary">
          <h2>Appointment summary</h2>
          <dl>
            <div><dt>Patient</dt><dd>{appointment.name}</dd></div>
            <div><dt>Doctor</dt><dd>{appointment.doctor}</dd></div>
            <div><dt>Hospital</dt><dd>{appointment.hospital}</dd></div>
            <div><dt>Date and time</dt><dd>{appointment.date} · {appointment.time}</dd></div>
          </dl>
          <div className="checkout-total"><span>Total <small>(demo)</small></span><strong>₹{APPOINTMENT_FEE}</strong></div>
        </aside>
      </div>
    </main>
  );
}
