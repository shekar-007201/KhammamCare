import React, { useEffect, useMemo, useState } from 'react';
import { doctors, hospitals } from './data.js';
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const initials = name => name.replace('Dr. ', '').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const maps = name => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' Khammam')}`;

const hospitalPhotos = [
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80'
];
const doctorPhotos = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=500&q=80'
];

function Modal({ children, onClose }) {
  return <div className="modal show" onClick={e => e.target === e.currentTarget && onClose()}><div className="modal-card">{children}</div></div>;
}

export default function App() {
  const [query, setQuery] = useState(''), [spec, setSpec] = useState(''), [docSpec, setDocSpec] = useState(''), [docHospital, setDocHospital] = useState('');
  const [shown, setShown] = useState(24), [menu, setMenu] = useState(false), [selectedHospital, setSelectedHospital] = useState(''), [selectedDoctor, setSelectedDoctor] = useState('');
  const [login, setLogin] = useState(false), [authMode, setAuthMode] = useState('login'), [authEmail, setAuthEmail] = useState(''), [authPassword, setAuthPassword] = useState(''), [authError, setAuthError] = useState(''), [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [payment, setPayment] = useState(null), [paymentMode, setPaymentMode] = useState('UPI'), [paymentInput, setPaymentInput] = useState(''), [success, setSuccess] = useState(null), [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', hospital: '', doctor: '', date: '', time: '', reason: '' });

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const specialities = useMemo(() => [...new Set(doctors.map(d => d[1]))].sort(), []);
  const hospitalNames = useMemo(() => [...new Set(doctors.map(d => d[2]))].sort(), []);
  const filtered = useMemo(() => doctors.filter(d => {
    const q = (query + ' ' + (selectedDoctor || '')).trim().toLowerCase();
    return (!q || d.join(' ').toLowerCase().includes(q)) && (!docSpec || d[1] === docSpec) && (!spec || d[1] === spec) && (!docHospital || d[2] === docHospital);
  }), [query, selectedDoctor, docSpec, spec, docHospital]);
  const visible = filtered.slice(0, shown);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const chooseHospital = h => { setSelectedHospital(h); update('hospital', h); document.querySelector('#appointment')?.scrollIntoView({ behavior: 'smooth' }); };
  const chooseDoctor = (d, h) => { setSelectedDoctor(d); update('doctor', d); update('hospital', h); document.querySelector('#appointment')?.scrollIntoView({ behavior: 'smooth' }); };

  const openLogin = () => { setAuthError(''); setLogin(true); };

  const handleAuth = async e => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      }
      setLogin(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'This email is already registered. Please login.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setAuthError(messages[error.code] || error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const submit = e => {
    e.preventDefault();
    if (!form.hospital || !form.doctor) return;
    if (!user) {
      setAuthMode('login');
      openLogin();
      return;
    }
    setPayment(true);
  };

  const finish = async () => {
    if (!user) {
      setPayment(false);
      openLogin();
      return;
    }
    setSaving(true);
    const token = 'KHM-' + Math.floor(1000 + Math.random() * 9000);
    try {
      await addDoc(collection(db, 'appointments'), {
        ...form,
        userId: user.uid,
        userEmail: user.email,
        paymentMode,
        paymentStatus: 'demo-paid',
        token,
        status: 'confirmed',
        createdAt: serverTimestamp(),
      });
      setPayment(false);
      setSuccess({ ...form, payment: `${paymentMode} (demo)`, token });
      setForm({ name: '', phone: '', hospital: '', doctor: '', date: '', time: '', reason: '' }); setPaymentInput(''); setPaymentMode('UPI');
    } catch (error) {
      console.error(error);
      alert('Appointment save failed. Check Firebase Firestore setup and rules.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <header className="header"><div className="container nav"><a className="brand" href="#home"><span className="brand-icon">✚</span><span>Khammam<span>Care</span><small>Doctors & Hospitals</small></span></a><button className="menu-btn" onClick={() => setMenu(!menu)}>☰</button><nav className={menu ? 'open' : ''}><a href="#home">Home</a><a href="#hospitals">Hospitals</a><a href="#doctors">Doctors</a><a href="#appointment">Appointment</a><a href="#about">About</a></nav><button className="outline-btn" onClick={user ? () => signOut(auth) : openLogin}>{user ? 'Logout' : 'Login'}</button></div></header>
    <main>
      <section className="hero" id="home"><div className="container hero-grid"><div><div className="eyebrow">KHAMMAM • TELANGANA</div><h1>Find trusted <span>doctors</span> and hospitals in Khammam.</h1><p>Search publicly listed directory information, view hospital locations and send an appointment request from one professional React website.</p><div className="hero-actions"><a className="primary-btn" href="#doctors">Find a Doctor →</a><a className="secondary-btn" href="#hospitals">View Hospitals</a></div><div className="stats"><div><b>119+</b><small>GGH specialists listed online</small></div><div><b>{hospitals.length}+</b><small>local hospitals/directories</small></div><div><b>24/7</b><small>emergency information</small></div></div></div><div className="hero-card"><div className="hero-card-top"><span>KHAMMAMCARE</span><span className="live">● React + Firebase</span></div><div className="medical-art">🩺</div><h3>Need medical help?</h3><p>Choose a hospital or specialist and continue to an appointment request.</p><a href="#appointment" className="card-link">Book appointment</a></div></div></section>
      <section className="search-wrap"><div className="container search-box"><div><label>Doctor / Hospital</label><input value={query} onChange={e => { setQuery(e.target.value); setShown(24); }} placeholder="e.g. cardiologist, Rakesh, Ankura" /></div><div><label>Speciality</label><select value={spec} onChange={e => { setSpec(e.target.value); setShown(24); }}><option value="">All specialities</option>{specialities.map(s => <option key={s}>{s}</option>)}</select></div><button className="primary-btn" onClick={() => { setShown(24); document.querySelector('#doctors')?.scrollIntoView({ behavior: 'smooth' }); }}>Search</button></div></section>
      <section className="section" id="hospitals"><div className="container"><div className="section-head"><div><div className="eyebrow">LOCAL DIRECTORY</div><h2>Hospitals in Khammam</h2><p>Hospital names are carried over from the researched public directory sources used for this project.</p></div></div><div className="hospital-grid">{hospitals.map(h => { const count = doctors.filter(d => d[2] === h[0]).length; return <article className="hospital-card" key={h[0]}><img className="hospital-photo" src={hospitalPhotos[hospitals.indexOf(h) % hospitalPhotos.length]} alt={`${h[0]} hospital`} loading="lazy" /><div className="hospital-icon fallback-icon">🏥</div><span className="tag">{h[1]}</span><h3>{h[0]}</h3><p>📍 {h[2]}</p><p>{count} doctors currently listed in this directory.</p><div className="hospital-actions"><a className="map-btn" href={h[3] || maps(h[0])} target="_blank" rel="noreferrer">📍 Location</a><button className="book-btn" onClick={() => chooseHospital(h[0])}>Book</button></div></article>; })}</div></div></section>
      <section className="section doctors-section" id="doctors"><div className="container"><div className="section-head center"><div><div className="eyebrow">DOCTOR DIRECTORY</div><h2>Doctors in Khammam</h2><p>Showing {visible.length} of {filtered.length} researched doctor records</p></div></div><div className="doctor-toolbar"><input value={query} onChange={e => { setQuery(e.target.value); setShown(24); }} placeholder="Search doctor name..." /><select value={docSpec} onChange={e => { setDocSpec(e.target.value); setShown(24); }}><option value="">All specialities</option>{specialities.map(s => <option key={s}>{s}</option>)}</select><select value={docHospital} onChange={e => { setDocHospital(e.target.value); setShown(24); }}><option value="">All hospitals</option>{hospitalNames.map(h => <option key={h}>{h}</option>)}</select></div><div className="doctor-grid">{visible.map(d => <article className="doctor-card" key={d.join('|')}><div className="avatar-wrap"><img className="doctor-photo" src={doctorPhotos[doctors.indexOf(d) % doctorPhotos.length]} alt={`${d[0]} profile`} loading="lazy" /><div className="avatar fallback-avatar">{initials(d[0])}</div></div><h3>{d[0]}</h3><div className="speciality">{d[1]}</div><div className="hospital">🏥 {d[2]}</div><div className="verified">✓ Publicly listed</div><button onClick={() => chooseDoctor(d[0], d[2])}>Book with doctor</button></article>)}</div>{shown < filtered.length && <button className="load-more" onClick={() => setShown(x => x + 24)}>Load more doctors</button>}</div></section>
      <section className="section appointment-section" id="appointment"><div className="container appointment-grid"><div className="appointment-info"><div className="eyebrow">APPOINTMENT REQUEST</div><h2>Book a consultation with your selected doctor.</h2><p>This version uses Firebase Authentication and Firestore. After the demo payment step, the appointment is saved to the <b>appointments</b> collection.</p><div className="info-list"><div>✓ Login/Register with Firebase</div><div>✓ Select hospital and doctor</div><div>✓ Choose date and time</div><div>✓ Demo payment step</div><div>✓ Appointment saved in Firestore</div></div></div><form className="form-card" onSubmit={submit}><div className="form-row"><div><label>Patient name</label><input value={form.name} onChange={e => update('name', e.target.value)} required /></div><div><label>Phone</label><input value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} pattern="[0-9]{10}" required /></div></div><div className="form-row"><div><label>Hospital</label><select value={form.hospital} onChange={e => update('hospital', e.target.value)} required><option value="">Select hospital</option>{hospitals.map(h => <option key={h[0]}>{h[0]}</option>)}</select></div><div><label>Doctor</label><select value={form.doctor} onChange={e => update('doctor', e.target.value)} required><option value="">Select doctor</option>{doctors.map(d => <option key={d[0]} value={d[0]}>{d[0]} — {d[1]}</option>)}</select></div></div><div className="form-row"><div><label>Date</label><input type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={e => update('date', e.target.value)} required /></div><div><label>Time</label><input type="time" value={form.time} onChange={e => update('time', e.target.value)} required /></div></div><div><label>Reason / symptoms</label><textarea rows="3" value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="Optional" /></div><button className="primary-btn full" type="submit">{user ? 'Continue to payment →' : 'Login to continue →'}</button></form></div></section>
      <section className="section" id="about"><div className="container"><div className="about-card"><div><div className="eyebrow">ABOUT KHAMMAMCARE</div><h2>React + Firebase hospital appointment system</h2><p>Component-based UI, searchable doctor directory, hospital locations, Firebase authentication, Firestore appointment storage and demo checkout. For production, add secure rules, an admin panel, real doctor availability and a real payment gateway.</p></div><div className="tech-list"><span>React</span><span>Vite</span><span>Firebase Auth</span><span>Firestore</span><span>JavaScript</span><span>Responsive CSS</span><span>Maps</span></div></div></div></section>
    </main>
    <footer><div className="container">© 2026 KhammamCare • React + Firebase student project</div></footer>

    {login && <Modal onClose={() => setLogin(false)}><button className="modal-close" onClick={() => setLogin(false)}>×</button><div className="eyebrow">FIREBASE ACCOUNT</div><h2>{authMode === 'login' ? 'Login' : 'Create account'}</h2><form onSubmit={handleAuth}><input placeholder="Email" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required /><input placeholder="Password (6+ characters)" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} minLength="6" required />{authError && <p className="muted" style={{ color: '#c62828' }}>{authError}</p>}<button className="primary-btn full" disabled={authLoading}>{authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Register'}</button></form><p className="muted">{authMode === 'login' ? 'New patient?' : 'Already have an account?'} <button type="button" className="card-link" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Create account' : 'Login here'}</button></p></Modal>}
    {payment && <Modal onClose={() => setPayment(false)}><button className="modal-close" onClick={() => setPayment(false)}>×</button><div className="eyebrow">SECURE CHECKOUT • DEMO</div><h2>Choose payment mode</h2><div className="pay-options">{['UPI','Card','Net Banking'].map(mode => <button key={mode} type="button" className={paymentMode === mode ? 'active' : ''} onClick={() => { setPaymentMode(mode); setPaymentInput(''); }}>{mode}</button>)}</div><div className="demo-pay"><p>Appointment: <b>{form.doctor}</b></p><p>Hospital: {form.hospital}</p><p>Patient: {form.name}</p><p>Amount: <b>₹199 (demo)</b></p><small>No real payment will be charged.</small></div>{paymentMode === 'UPI' && <input className="payment-input" placeholder="Enter UPI ID (demo)" value={paymentInput} onChange={e => setPaymentInput(e.target.value)} />}{paymentMode === 'Card' && <div className="payment-fields"><input placeholder="Card number (demo)" inputMode="numeric" value={paymentInput} onChange={e => setPaymentInput(e.target.value.replace(/\D/g,'').slice(0,16))} /><div className="form-row"><input placeholder="MM/YY" /><input placeholder="CVV" type="password" inputMode="numeric" maxLength="3" /></div></div>}{paymentMode === 'Net Banking' && <select className="payment-input" value={paymentInput} onChange={e => setPaymentInput(e.target.value)}><option value="">Select bank (demo)</option><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option></select>}<button className="primary-btn full" onClick={finish} disabled={saving}>{saving ? 'Saving appointment...' : `Pay ₹199 with ${paymentMode} (Demo)`}</button></Modal>}
    {success && <Modal onClose={() => setSuccess(null)}><button className="modal-close" onClick={() => setSuccess(null)}>×</button><div className="success-icon">✓</div><div className="eyebrow">APPOINTMENT CONFIRMED</div><h2>Your token is <span>{success.token}</span></h2><p><b>{success.name}</b><br />{success.doctor}<br />{success.hospital}<br />{success.date} at {success.time}<br />{success.payment}</p><button className="primary-btn full" onClick={() => setSuccess(null)}>Done</button></Modal>}
  </>;
}
