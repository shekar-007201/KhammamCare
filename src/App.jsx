import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  CreditCard,
  LogIn,
  LogOut,
  Landmark,
  Pencil,
  Save,
  Smartphone,
  Stethoscope,
  X,
  UserRound,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { useDirectory } from './useDirectory.js';
import { auth } from './firebase.js';
import {
  createAppointment,
  createPaymentRecord,
  subscribeToAllAppointments,
} from './appointmentStorage.js';
import { getLocalDateValue, validateAppointment } from './validation.js';
import profilePhoto from '../me.jpg';

const initials = (name) =>
  name
    .replace('Dr. ', '')
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();

const maps = (name) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    name + ' Khammam',
  )}`;

const APPOINTMENT_FEE = 399;

const translations = {
  en: {
    home: 'Home',
    hospitals: 'Hospitals',
    doctors: 'Doctors',
    appointment: 'Appointment',
    about: 'About',
    myAppointments: 'My Appointments',
    search: 'Search',
    book: 'Book with doctor',
    selectDoctor: 'Select doctor',
    timeSlot: 'Time slot',
    selectTime: 'Select time',
  },
};

const downloadReceipt = (receipt) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  canvas.width = 1200;
  canvas.height = 1000;

  const roundedRect = (x, y, width, height, radius) => {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  };

  const drawField = (label, value, x, y, maxWidth) => {
    context.fillStyle = '#71828a';
    context.font = '700 17px Arial, sans-serif';
    context.fillText(label.toUpperCase(), x, y);
    context.fillStyle = '#233940';
    context.font = '700 25px Arial, sans-serif';
    const text = String(value || '-');
    const words = text.split(/\s+/);
    let line = '';
    let lineY = y + 42;

    for (const word of words) {
      const nextLine = line ? `${line} ${word}` : word;
      if (context.measureText(nextLine).width > maxWidth && line) {
        context.fillText(line, x, lineY);
        line = word;
        lineY += 32;
      } else {
        line = nextLine;
      }
    }

    context.fillText(line, x, lineY, maxWidth);
  };

  context.fillStyle = '#eaf3f3';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = 'rgba(24, 58, 65, 0.14)';
  context.shadowBlur = 36;
  context.shadowOffsetY = 14;
  roundedRect(50, 45, 1100, 910, 28);
  context.fillStyle = '#ffffff';
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  roundedRect(50, 45, 1100, 235, 28);
  context.fillStyle = '#1769e0';
  context.fill();
  context.fillRect(50, 200, 1100, 80);

  context.fillStyle = '#ffffff';
  context.font = '700 44px Arial, sans-serif';
  context.fillText('KhammamCare', 100, 125);
  context.fillStyle = '#d8f2ef';
  context.font = '20px Arial, sans-serif';
  context.fillText('Doctors & Hospitals · Khammam', 102, 163);
  context.textAlign = 'right';
  context.fillStyle = '#ffffff';
  context.font = '700 20px Arial, sans-serif';
  context.fillText('PAYMENT RECEIVED', 1095, 105);
  context.font = '16px Arial, sans-serif';
  context.fillText('APPOINTMENT CONFIRMED', 1095, 137);
  context.textAlign = 'left';

  roundedRect(100, 320, 1000, 145, 18);
  context.fillStyle = '#effafa';
  context.fill();
  context.setLineDash([9, 7]);
  context.strokeStyle = '#1769e0';
  context.lineWidth = 2;
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = '#71828a';
  context.font = '700 17px Arial, sans-serif';
  context.fillText('APPOINTMENT TOKEN', 140, 370);
  context.fillStyle = '#1769e0';
  context.font = '700 39px Arial, sans-serif';
  context.fillText(String(receipt.token || '-'), 140, 425);

  drawField('Patient', receipt.name, 120, 530, 430);
  context.fillStyle = '#71828a';
  context.font = '18px Arial, sans-serif';
  context.fillText(`Age ${receipt.age || '-'} · ${receipt.phone || '-'}`, 120, 610, 430);
  drawField('Doctor', receipt.doctor, 650, 530, 430);
  drawField('Hospital', receipt.hospital, 120, 675, 430);
  drawField('Appointment', `${receipt.date || '-'} at ${receipt.time || '-'}`, 650, 675, 430);

  context.beginPath();
  context.moveTo(100, 770);
  context.lineTo(1100, 770);
  context.strokeStyle = '#e2ebeb';
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#52666d';
  context.font = '20px Arial, sans-serif';
  context.fillText(`Total paid · ${receipt.payment || 'Demo'}`, 120, 830);
  context.textAlign = 'right';
  context.fillStyle = '#1769e0';
  context.font = '700 34px Arial, sans-serif';
  context.fillText(`₹${receipt.amount || 0}.00`, 1080, 835);
  context.textAlign = 'left';
  context.fillStyle = '#71828a';
  context.font = '16px Arial, sans-serif';
  context.fillText('Please keep this token for your hospital visit.', 120, 900);

  const bookedAt = new Date(receipt.bookedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  context.textAlign = 'right';
  context.fillText(`Issued ${bookedAt}`, 1080, 900);
  context.textAlign = 'left';

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KhammamCare-${receipt.token}-receipt.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
};

const hospitalPhotos = [
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=900&q=80',
];

const timeSlots = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

const doctorPhotos = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=500&q=80',
];

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="admin-page">
          <div className="admin-empty">
            <h2>Something went wrong</h2>
            <p>Please refresh the page and try again.</p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const {
    doctors,
    hospitals,
    emergencyFacilities,
    loading: directoryLoading,
    error: directoryError,
  } = useDirectory();

  const [query, setQuery] = useState('');
  const [docSpec, setDocSpec] = useState('');
  const [docHospital, setDocHospital] = useState('');
  const [docArea, setDocArea] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const [shown, setShown] = useState(24);
  const [menu, setMenu] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState('sign-in');
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');

  const [payment, setPayment] = useState(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentInput, setPaymentInput] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    hospital: '',
    doctor: '',
    date: '',
    time: '',
    reason: '',
  });

  const [appointments, setAppointments] = useState([]);
  const [bookingError, setBookingError] = useState('');

  const t = (key) => translations.en[key];

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  useEffect(() => subscribeToAllAppointments(setAppointments), []);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setLoginNotice('');
    setAuthBusy(true);

    try {
      if (loginMode === 'create-account') {
        const credential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        const name = loginName.trim();
        await updateProfile(credential.user, { displayName: name });
        setAuthUser({ ...credential.user, displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
      setLoginOpen(false);
      setLoginPassword('');
      if (checkoutPending) {
        setCheckoutPending(false);
        setPayment(true);
      }
    } catch (error) {
      console.error('Firebase login error:', error.code, error.message);
      setLoginError(`${error.code}: ${error.message}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = loginEmail.trim();
    setLoginError('');
    setLoginNotice('');

    if (!email) {
      setLoginError('Enter your email address first.');
      return;
    }

    setAuthBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setLoginNotice('Password reset email sent. Check your inbox.');
    } catch (error) {
      setLoginError(error.message || 'Could not send a reset email. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAuthButton = async () => {
    if (!authUser) {
      setLoginError('');
      setLoginMode('sign-in');
      setLoginOpen(true);
      return;
    }

    setProfileName(authUser.displayName || '');
    setProfileError('');
    setProfileNotice('');
    setProfileEditing(false);
    setProfileOpen(true);
  };

  const handleProfileSave = async () => {
    const name = profileName.trim();
    if (!name) {
      setProfileError('Enter your name to save your profile.');
      return;
    }

    setProfileBusy(true);
    setProfileError('');
    setProfileNotice('');
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      setAuthUser({ ...auth.currentUser, displayName: name });
      setProfileName(name);
      setProfileEditing(false);
      setProfileNotice('Profile name updated.');
    } catch (error) {
      setProfileError(error.message || 'Could not update your profile. Please try again.');
    } finally {
      setProfileBusy(false);
    }
  };

  const handleProfilePasswordReset = async () => {
    if (!authUser?.email) return;
    setProfileError('');
    setProfileNotice('');
    setProfileBusy(true);
    try {
      await sendPasswordResetEmail(auth, authUser.email);
      setProfileNotice(`Password reset email sent to ${authUser.email}.`);
    } catch (error) {
      setProfileError(error.message || 'Could not send a reset email. Please try again.');
    } finally {
      setProfileBusy(false);
    }
  };

  const handleProfileSignOut = async () => {
    setProfileBusy(true);
    setProfileError('');
    try {
      await signOut(auth);
      setProfileOpen(false);
    } catch (error) {
      setProfileError(error.message || 'Could not sign out. Please try again.');
    } finally {
      setProfileBusy(false);
    }
  };

  const profileDialog = profileOpen && authUser && (
    <div
      className="modal show profile-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setProfileOpen(false);
      }}
    >
      <section className="modal-card profile-card" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button
          type="button"
          className="modal-close"
          aria-label="Close profile"
          onClick={() => setProfileOpen(false)}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true"><UserRound size={28} /></div>
          <div>
            <div className="eyebrow">YOUR ACCOUNT</div>
            <h2 id="profile-title">Profile</h2>
          </div>
        </div>
        <label className="profile-field">
          Name
          <input
            type="text"
            autoComplete="name"
            maxLength={60}
            value={profileName}
            readOnly={!profileEditing}
            onChange={(event) => setProfileName(event.target.value)}
          />
        </label>
        <label className="profile-field">
          Email
          <input type="email" value={authUser.email || ''} readOnly />
        </label>
        {profileError && <p className="booking-error" role="alert">{profileError}</p>}
        {profileNotice && <p className="login-notice" role="status">{profileNotice}</p>}
        <div className="profile-actions">
          {profileEditing ? (
            <>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setProfileName(authUser.displayName || '');
                  setProfileEditing(false);
                  setProfileError('');
                }}
              >
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleProfileSave} disabled={profileBusy}>
                <Save size={16} aria-hidden="true" /> Save name
              </button>
            </>
          ) : (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setProfileEditing(true);
                setProfileError('');
                setProfileNotice('');
              }}
            >
              <Pencil size={16} aria-hidden="true" /> Edit name
            </button>
          )}
          <button type="button" className="profile-link-button" onClick={handleProfilePasswordReset} disabled={profileBusy}>
            Send password reset email
          </button>
          <button type="button" className="profile-signout-button" onClick={handleProfileSignOut} disabled={profileBusy}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </section>
    </div>
  );

  const reservedSlots = useMemo(
    () => appointments
      .filter(appointment =>
        appointment.doctor === form.doctor &&
        appointment.date === form.date &&
        !['canceled', 'Rejected'].includes(appointment.status),
      )
      .map(appointment => appointment.time),
    [appointments, form.doctor, form.date],
  );

  const doctorRatings = useMemo(() => {
    const totals = {};

    appointments.forEach(appointment => {
      if (!appointment.doctor || !appointment.rating) return;
      totals[appointment.doctor] ||= { total: 0, count: 0 };
      totals[appointment.doctor].total += appointment.rating;
      totals[appointment.doctor].count += 1;
    });

    return totals;
  }, [appointments]);

  const specialities = useMemo(
    () => [...new Set(doctors.map((d) => d[1]))].sort(),
    [doctors],
  );

  const hospitalNames = useMemo(
    () => [...new Set(doctors.map((d) => d[2]))].sort(),
    [doctors],
  );

  const areaNames = useMemo(
    () => [...new Set(hospitals.map((h) => h[4]).filter(Boolean))].sort(),
    [hospitals],
  );

  const hospitalByName = useMemo(
    () => new Map(hospitals.map((hospital) => [hospital[0], hospital])),
    [hospitals],
  );

  const availableSpecialities = useMemo(() => {
    if (!form.hospital) return specialities;
    return [
      ...new Set(
        doctors.filter((d) => d[2] === form.hospital).map((d) => d[1]),
      ),
    ].sort();
  }, [form.hospital, specialities, doctors]);

  const availableDoctors = useMemo(
    () =>
      doctors
        .filter((d) => !form.hospital || d[2] === form.hospital)
        .sort((first, second) => first[0].localeCompare(second[0])),
    [form.hospital, doctors],
  );

  const filtered = useMemo(
    () =>
      doctors.filter((d) => {
        const q = (query + ' ' + (selectedDoctor || '')).trim().toLowerCase();
        const hospital = hospitalByName.get(d[2]);

        return (
          (!q || d.join(' ').toLowerCase().includes(q)) &&
          (!docSpec || d[1] === docSpec) &&
          (!docHospital || d[2] === docHospital) &&
          (!docArea || hospital?.[4] === docArea) &&
          (!openNow || hospital?.[5])
        );
      }),
    [
      query,
      selectedDoctor,
      docSpec,
      docHospital,
      docArea,
      openNow,
      hospitalByName,
      doctors,
    ],
  );

  const visible = filtered.slice(0, shown);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const chooseHospital = (hospital) => {
    setSelectedHospital(hospital);
    update('hospital', hospital);
    document
      .querySelector('#appointment')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const chooseDoctor = (doctor, hospital) => {
    setSelectedDoctor(doctor);
    update('doctor', doctor);
    update('hospital', hospital);
    document
      .querySelector('#appointment')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const submit = (event) => {
    event.preventDefault();

    const validationError = validateAppointment(form);

    if (validationError) {
      setBookingError(validationError);
      return;
    }

    setBookingError('');
    setPaymentError('');

    if (!authUser) {
      setCheckoutPending(true);
      setLoginMode('sign-in');
      setLoginError('');
      setLoginNotice('Sign in to continue to payment.');
      setLoginOpen(true);
      return;
    }

    setPayment(true);
  };

  const finish = async () => {
    setPaymentError('');

    if (!authUser) {
      setPayment(false);
      setCheckoutPending(true);
      setLoginMode('sign-in');
      setLoginNotice('Sign in to continue to payment.');
      setLoginOpen(true);
      return;
    }

    setSaving(true);

    const token = 'KHM-' + Math.floor(1000 + Math.random() * 9000);

    try {
      const conflict = appointments.some(appointment =>
        appointment.doctor === form.doctor &&
        appointment.date === form.date &&
        appointment.time === form.time &&
        !['canceled', 'Rejected'].includes(appointment.status),
      );

      if (conflict) {
        setPaymentError('This time slot is already booked. Choose another slot.');
        return;
      }

      const bookedAt = new Date().toISOString();
      const appointment = {
        ...form,
        amount: APPOINTMENT_FEE,
        paymentMode,
        paymentStatus: 'demo-paid',
        payment: `${paymentMode} (demo)`,
        token,
        status: 'confirmed',
        paymentProvider: 'demo',
        createdAt: bookedAt,
        bookedAt,
        userEmail: authUser.email || '',
      };

      const savedAppointment = createAppointment({
        ...appointment,
        uid: authUser.uid,
      });

      createPaymentRecord({
        uid: authUser.uid,
        appointmentToken: token,
        amount: APPOINTMENT_FEE,
        paymentMode,
        paymentStatus: 'demo-paid',
        paymentProvider: 'demo',
        createdAt: bookedAt,
      });

      setPayment(false);
      setSuccess(savedAppointment);

      setForm({
        name: '',
        phone: '',
        age: '',
        hospital: '',
        doctor: '',
        date: '',
        time: '',
        reason: '',
      });
      setPaymentInput('');
      setPaymentMode('UPI');
    } catch (error) {
      console.error(error);
      setPaymentError(`Could not save the appointment or demo payment record: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <main className="receipt-page">
        <section className="receipt success receipt-card">
          <div className="receipt-header">
            <div>
              <div className="eyebrow">APPOINTMENT CONFIRMED</div>
              <h1>Payment receipt</h1>
            </div>
            <div className="success-icon" aria-label="Payment confirmed">✓</div>
          </div>

          <div className="receipt-token">
            <small>APPOINTMENT TOKEN</small>
            <strong>{success.token}</strong>
          </div>

          <div className="receipt-details">
            <div>
              <span>Patient</span>
              <b>{success.name}</b>
              <small>Age {success.age} · {success.phone}</small>
            </div>
            <div><span>Doctor</span><b>{success.doctor}</b></div>
            <div><span>Hospital</span><b>{success.hospital}</b></div>
            <div>
              <span>Appointment</span>
              <b>{success.date} at {success.time}</b>
            </div>
          </div>

          <div className="receipt-total">
            <span>Total paid · {success.payment}</span>
            <b>₹{success.amount}.00</b>
          </div>

          <p className="receipt-note">
            Keep this token for your hospital visit. This is a demo payment receipt.
          </p>

          <div className="receipt-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setSuccess(null)}
            >
              Back to home
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => downloadReceipt(success)}
            >
              Download receipt card
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (directoryLoading) {
    return (
      <main className="admin-page">
        <div className="admin-empty">
          <span className="loading-spinner" />
          Loading the Khammam directory...
        </div>
      </main>
    );
  }

  if (payment) {
    return (
      <main className="checkout-page">
        <header className="checkout-header">
          <a className="brand" href="#home">
            <span className="brand-icon">✚</span>
            <span>
              Khammam<span>Care</span>
              <small>Doctors &amp; Hospitals</small>
            </span>
          </a>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setPayment(false);
              setPaymentError('');
            }}
          >
            Back to appointment
          </button>
        </header>

        <div className="checkout-title">
          <div className="eyebrow">SECURE CHECKOUT • DEMO</div>
          <h1>Choose a payment method</h1>
          <p>No real payment will be processed or charged.</p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-card">
            <h2>Payment method</h2>
            <div className="pay-options">
              {[
                { name: 'UPI', Icon: Smartphone },
                { name: 'Card', Icon: CreditCard },
                { name: 'Net Banking', Icon: Landmark },
              ].map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  className={paymentMode === name ? 'active' : ''}
                  aria-pressed={paymentMode === name}
                  onClick={() => {
                    setPaymentMode(name);
                    setPaymentInput('');
                    setPaymentError('');
                  }}
                >
                  <Icon aria-hidden="true" />
                  <span>{name}</span>
                </button>
              ))}
            </div>

            {paymentMode === 'UPI' && (
              <label className="checkout-field">
                UPI ID <span>(demo)</span>
                <input
                  className="payment-input"
                  placeholder="name@bank"
                  autoComplete="off"
                  value={paymentInput}
                  onChange={(event) => setPaymentInput(event.target.value)}
                />
              </label>
            )}

            {paymentMode === 'Card' && (
              <div className="payment-fields checkout-card-fields">
                <label className="checkout-field">
                  Card number <span>(demo)</span>
                  <input
                    className="payment-input"
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                    autoComplete="off"
                    value={paymentInput}
                    onChange={(event) =>
                      setPaymentInput(
                        event.target.value.replace(/\D/g, '').slice(0, 16),
                      )
                    }
                  />
                </label>
                <div className="form-row">
                  <label className="checkout-field">
                    Expiry <span>(demo)</span>
                    <input placeholder="MM/YY" autoComplete="off" />
                  </label>
                  <label className="checkout-field">
                    CVV <span>(demo)</span>
                    <input
                      placeholder="123"
                      type="password"
                      inputMode="numeric"
                      maxLength="3"
                      autoComplete="off"
                    />
                  </label>
                </div>
              </div>
            )}

            {paymentMode === 'Net Banking' && (
              <label className="checkout-field">
                Select bank <span>(demo)</span>
                <select
                  className="payment-input"
                  value={paymentInput}
                  onChange={(event) => setPaymentInput(event.target.value)}
                >
                  <option value="">Choose a bank</option>
                  <option>State Bank of India</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                </select>
              </label>
            )}

            {paymentError && (
              <div className="admin-error" role="alert">{paymentError}</div>
            )}

            <button
              type="button"
              className="primary-btn full checkout-submit"
              onClick={finish}
              disabled={saving}
            >
              {saving
                ? 'Confirming appointment...'
                : `Confirm demo payment · ₹${APPOINTMENT_FEE}`}
            </button>
          </section>

          <aside className="checkout-card checkout-summary">
            <h2>Appointment summary</h2>
            <dl>
              <div><dt>Patient</dt><dd>{form.name}</dd></div>
              <div><dt>Doctor</dt><dd>{form.doctor}</dd></div>
              <div><dt>Hospital</dt><dd>{form.hospital}</dd></div>
              <div><dt>Date and time</dt><dd>{form.date} · {form.time}</dd></div>
            </dl>
            <div className="checkout-total">
              <span>Total <small>(demo)</small></span>
              <strong>₹{APPOINTMENT_FEE}</strong>
            </div>
            <p className="checkout-disclaimer">This is a demonstration checkout. No real payment will be charged.</p>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="#home">
            <span className="brand-icon">✚</span>
            <span>
              Khammam<span>Care</span>
              <small>Doctors &amp; Hospitals</small>
            </span>
          </a>

          <button
            type="button"
            className="menu-btn"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-controls="main-navigation"
            aria-label={menu ? 'Close menu' : 'Open menu'}
          >
            {menu ? '×' : '☰'}
          </button>

          <nav id="main-navigation" className={menu ? 'open' : ''}>
            <a href="#home" onClick={() => setMenu(false)}>{t('home')}</a>
            <a href="#hospitals" onClick={() => setMenu(false)}>{t('hospitals')}</a>
            <a href="#doctors" onClick={() => setMenu(false)}>{t('doctors')}</a>
            <a
              href="#appointment"
              onClick={(event) => {
                event.preventDefault();
                setMenu(false);
                document
                  .querySelector('#appointment')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('appointment')}
            </a>
            <a href="#about" onClick={() => setMenu(false)}>{t('about')}</a>
            <a href="/appointments" onClick={() => setMenu(false)}>{t('myAppointments')}</a>
          </nav>
          <button
            type="button"
            className="outline-btn header-login-button"
            onClick={handleAuthButton}
            disabled={authBusy}
            aria-label={authUser ? `Open profile for ${authUser.displayName || authUser.email}` : 'Log in'}
            title={authUser ? 'Open profile' : 'Log in'}
          >
            {authUser ? <UserRound size={16} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
            <span className="header-login-label">
              {authUser ? authUser.displayName || authUser.email?.split('@')[0] : 'Log in'}
            </span>
          </button>
        </div>
      </header>

      <main>
        {directoryError && (
          <div className="offline-banner" role="status">
            {directoryError}
          </div>
        )}

        <section className="section emergency-section" id="emergency">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">EMERGENCY HELP</div>
                <h2>Khammam emergency contacts</h2>
                <p>
                  Call first in an emergency. These public contacts are provided
                  for quick access.
                </p>
              </div>
            </div>

            <div className="emergency-grid">
              {emergencyFacilities.map((facility) => (
                <article
                  className="emergency-card"
                  key={`${facility.type}-${facility.name}`}
                >
                  <span className="tag">{facility.type}</span>
                  <h3>{facility.name}</h3>
                  <p>{facility.address}</p>
                  <a className="primary-btn" href={facility.action}>
                    {facility.phone}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hero" id="home">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">KHAMMAM • TELANGANA</div>
              <h1>
                Find trusted <span>doctors</span> and hospitals in Khammam.
              </h1>
              <p>
                Search publicly listed directory information, view hospital
                locations and send an appointment request from one professional
                React website.
              </p>
              <div className="hero-actions">
                <a
                  className="primary-btn"
                  href="#appointment"
                  onClick={(event) => {
                    event.preventDefault();
                    document
                      .querySelector('#appointment')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Appointment
                </a>
                <a className="secondary-btn" href="#doctors">
                  Find a Doctor →
                </a>
                <a className="secondary-btn" href="#hospitals">
                  View Hospitals
                </a>
              </div>
              <div className="stats">
                <div>
                  <b>119+</b>
                  <small>GGH specialists listed online</small>
                </div>
                <div>
                  <b>{hospitals.length}+</b>
                  <small>local hospitals/directories</small>
                </div>
                <div>
                  <b>24/7</b>
                  <small>emergency information</small>
                </div>
              </div>
            </div>

            <div className="hero-card">
              <div className="hero-card-top">
                <span>KHAMMAMCARE</span>
              </div>
              <div className="medical-art">✚</div>
              <div className="support-panel">
                <div className="support-avatar">
                  <img src={profilePhoto} alt="Shekar profile" />
                </div>
                <div className="support-info">
                  <div className="support-heading">
                    Need support for this website?
                  </div>
                  <div className="support-name">Shekar.ch</div>
                  <div className="support-links">
                    <a className="contact-number" href="tel:+916302403464">
                      <span aria-hidden="true">☎</span>
                      <span className="contact-detail">
                        <small>Mobile</small>
                        <strong>+91 63024 03464</strong>
                      </span>
                    </a>
                    <a
                      className="contact-number"
                      href="mailto:shekarchapala@gmail.com"
                    >
                      <span aria-hidden="true">✉</span>
                      <span className="contact-detail">
                        <small>Email</small>
                        <strong>shekarchapala@gmail.com</strong>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="search-wrap">
          <div className="container search-box">
            <div>
              <label>Doctor / Hospital</label>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(24);
                }}
                placeholder="e.g. cardiologist, Rakesh, Ankura"
              />
            </div>
            <button
              className="primary-btn"
              onClick={() => {
                setShown(24);
                document
                  .querySelector('#doctors')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('search')}
            </button>
          </div>
        </section>

        <section className="section" id="hospitals">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">LOCAL DIRECTORY</div>
                <h2>Hospitals in Khammam</h2>
                <p>
                  Hospital names are carried over from the researched public
                  directory sources used for this project.
                </p>
              </div>
            </div>

            <div className="hospital-grid">
              {hospitals
                .filter((h) => (!docArea || h[4] === docArea) && (!openNow || h[5]))
                .map((h) => {
                  const count = doctors.filter((d) => d[2] === h[0]).length;

                  return (
                    <article className="hospital-card" key={h[0]}>
                      <img
                        className="hospital-photo"
                        src={
                          hospitalPhotos[
                            hospitals.indexOf(h) % hospitalPhotos.length
                          ]
                        }
                        alt={`${h[0]} hospital`}
                        loading="lazy"
                      />
                      <div className="hospital-icon fallback-icon">✚</div>
                      <span className="tag">{h[1]}</span>
                      <h3>{h[0]}</h3>
                      <p>📍 {h[2]}</p>
                      <p>{count} doctors currently listed in this directory.</p>
                      <div className="hospital-actions">
                        <a
                          className="map-btn"
                          href={h[3] || maps(h[0])}
                          target="_blank"
                          rel="noreferrer"
                        >
                          📍 Location
                        </a>
                        <button
                          className="book-btn"
                          onClick={() => chooseHospital(h[0])}
                        >
                          Book
                        </button>
                      </div>
                    </article>
                  );
                })}
            </div>
          </div>
        </section>

        <section className="section doctors-section" id="doctors">
          <div className="container">
            <div className="section-head center">
              <div>
                <div className="eyebrow">DOCTOR DIRECTORY</div>
                <h2>Doctors in Khammam</h2>
                <p>
                  Showing {visible.length} of {filtered.length} researched doctor
                  records
                </p>
              </div>
            </div>

            <div className="doctor-toolbar">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(24);
                }}
                placeholder="Search doctor name..."
              />
              <select
                value={docSpec}
                onChange={(e) => {
                  setDocSpec(e.target.value);
                  setShown(24);
                }}
              >
                <option value="">All specialities</option>
                {specialities.map((speciality) => (
                  <option key={speciality}>{speciality}</option>
                ))}
              </select>
              <select
                value={docHospital}
                onChange={(e) => {
                  setDocHospital(e.target.value);
                  setShown(24);
                }}
              >
                <option value="">All hospitals</option>
                {hospitalNames.map((hospital) => (
                  <option key={hospital}>{hospital}</option>
                ))}
              </select>
              <select
                value={docArea}
                onChange={(e) => {
                  setDocArea(e.target.value);
                  setShown(24);
                }}
              >
                <option value="">All areas</option>
                {areaNames.map((area) => (
                  <option key={area}>{area}</option>
                ))}
              </select>
              <label className="filter-check">
                <input
                  type="checkbox"
                  checked={openNow}
                  onChange={(e) => setOpenNow(e.target.checked)}
                />{' '}
                Open now
              </label>
            </div>

            <div className="doctor-grid">
              {visible.map((doctor) => {
                const doctorRating = doctorRatings[doctor[0]];

                return (
                  <article className="doctor-card" key={doctor.join('|')}>
                    <div className="avatar-wrap">
                      <img
                        className="doctor-photo"
                        src={
                          doctorPhotos[
                            doctors.indexOf(doctor) % doctorPhotos.length
                          ]
                        }
                        alt={`${doctor[0]} profile`}
                        loading="lazy"
                      />
                      <div className="avatar fallback-avatar">
                        {initials(doctor[0])}
                      </div>
                    </div>
                    <h3>{doctor[0]}</h3>
                    <div className="speciality">{doctor[1]}</div>
                    <div className="hospital">🏥 {doctor[2]}</div>
                    {doctorRating ? (
                      <div className="doctor-rating">
                        ★{' '}
                        {(doctorRating.total / doctorRating.count).toFixed(1)} (
                        {doctorRating.count})
                      </div>
                    ) : (
                      <div className="doctor-rating">No ratings yet</div>
                    )}
                    <div className="verified">✓ Publicly listed</div>
                    <button onClick={() => chooseDoctor(doctor[0], doctor[2])}>
                      {t('book')}
                    </button>
                  </article>
                );
              })}
            </div>

            {shown < filtered.length && (
              <button
                className="load-more"
                onClick={() => setShown((value) => value + 24)}
              >
                Load more doctors
              </button>
            )}
          </div>
        </section>

        <section className="section appointment-section" id="appointment">
          <div className="container appointment-grid">
            <div className="appointment-info">
              <div className="eyebrow">APPOINTMENT REQUEST</div>
              <h2>Book a consultation with your selected doctor.</h2>
              <p>Book a visit and manage your appointments securely.</p>
              <div className="info-list">
                <div>✓ No account required</div>
                <div>✓ Select hospital and doctor</div>
                <div>✓ Choose date and time</div>
                <div>✓ Demo payment step</div>
                <div>✓ Appointment saved on this device</div>
              </div>
            </div>

            <form className="form-card" onSubmit={submit}>
              <div className="form-row">
                <div>
                  <label>Patient name</label>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      update(
                        'phone',
                        e.target.value.replace(/\D/g, '').slice(0, 10),
                      )
                    }
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Patient age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={form.age}
                    onChange={(e) => update('age', e.target.value)}
                    placeholder="e.g. 32"
                    required
                  />
                </div>
                <div>
                  <label>Hospital</label>
                  <select
                    value={form.hospital}
                    onChange={(e) => {
                      const hospital = e.target.value;
                      update('hospital', hospital);

                      if (
                        form.doctor &&
                        !doctors.some(
                          (doctor) =>
                            doctor[2] === hospital && doctor[0] === form.doctor,
                        )
                      ) {
                        update('doctor', '');
                      }
                    }}
                    required
                  >
                    <option value="">Select hospital</option>
                    {hospitals.map((hospital) => (
                      <option key={hospital[0]} value={hospital[0]}>
                        {hospital[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>{t('selectDoctor')}</label>
                  <select
                    value={form.doctor}
                    onChange={(e) => {
                      update('doctor', e.target.value);
                      update('time', '');
                    }}
                    required
                  >
                    <option value="">{t('selectDoctor')}</option>
                    {availableDoctors.map((doctor) => (
                      <option key={doctor[0]} value={doctor[0]}>
                        {doctor[0]} · {doctor[1]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Date</label>
                  <input
                    type="date"
                    min={getLocalDateValue()}
                    value={form.date || ''}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      update('date', /^\d{4}-\d{2}-\d{2}$/.test(nextDate) ? nextDate : '');
                      update('time', '');
                    }}
                    required
                  />
                </div>
              </div>

              <div className="time-slot-picker">
                <div className="time-slot-heading">
                  <label>{t('timeSlot')}</label>
                  {form.time && <span className="selected-time-label">Selected: {form.time}</span>}
                </div>
                {!form.doctor || !form.date ? (
                  <p className="slot-picker-prompt">Choose a doctor and date to see available times.</p>
                ) : (
                  <>
                    <div className="slot-legend" aria-label="Slot availability legend">
                      <span><i className="slot-legend-mark available" />Available</span>
                      <span><i className="slot-legend-mark selected" />Selected</span>
                      <span><i className="slot-legend-mark booked" />Booked</span>
                    </div>
                    <div className="time-slot-grid" role="group" aria-label="Appointment time slots">
                      {timeSlots.map(slot => {
                        const booked = reservedSlots.includes(slot);
                        const selected = form.time === slot;
                        const state = booked ? 'Booked' : selected ? 'Selected' : 'Available';

                        return (
                          <button
                            type="button"
                            key={slot}
                            className={`time-slot-seat${selected ? ' selected' : ''}${booked ? ' booked' : ''}`}
                            disabled={booked}
                            aria-pressed={selected}
                            aria-label={`${slot}, ${state}`}
                            onClick={() => update('time', slot)}
                          >
                            <span className="slot-seat-time">{slot}</span>
                            <span className="slot-seat-state">{state}</span>
                          </button>
                        );
                      })}
                    </div>
                    {reservedSlots.length === timeSlots.length ? (
                      <small className="slot-availability-note">No times remain for this doctor on the selected date.</small>
                    ) : reservedSlots.length > 0 ? (
                      <small className="slot-availability-note">{reservedSlots.length} time{reservedSlots.length === 1 ? '' : 's'} already booked.</small>
                    ) : null}
                  </>
                )}
              </div>

              <div>
                <label>Reason / symptoms</label>
                <textarea
                  rows="3"
                  value={form.reason}
                  onChange={(e) => update('reason', e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {bookingError && (
                <p className="booking-error" role="alert">
                  {bookingError}
                </p>
              )}

              <button className="primary-btn full" type="submit">
                Continue to payment →
              </button>
            </form>
          </div>
        </section>

        <section className="section about" id="direct-book">
          <div className="container">
            <div className="about-card">
              <div>
                <div className="eyebrow">NO CONTACTS? NO PROBLEM</div>
                <h2>Don’t know anyone directly?</h2>
                <p>
                  You can request an appointment through KhammamCare without a
                  personal referral. Choose a hospital, select a doctor and
                  time, then submit your request online.
                </p>
              </div>
              <div className="source-note">
                <h3>Book in 3 steps</h3>
                <div className="booking-steps">
                  <div className="booking-step">
                    <Building2 aria-hidden="true" />
                    <span>Choose a hospital</span>
                  </div>
                  <div className="booking-step">
                    <Stethoscope aria-hidden="true" />
                    <span>Select a doctor and visit time</span>
                  </div>
                  <div className="booking-step">
                    <CalendarCheck aria-hidden="true" />
                    <span>Review and submit your request</span>
                  </div>
                </div>
                <a
                  href="#appointment"
                  className="primary-btn"
                  onClick={(event) => {
                    event.preventDefault();
                    document
                      .querySelector('#appointment')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Book appointment
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="about">
          <div className="container">
            <div className="about-card">
              <div>
                <div className="eyebrow">ABOUT THIS WEBSITE</div>
                <h2>A healthcare website for Khammam.</h2>
                <p>
                  KhammamCare is a website where people can explore listed
                  doctors and hospitals in Khammam, search by speciality, open
                  hospital locations in Google Maps, and save appointment
                  requests in this browser. Checkout is a demo only; no real
                  payment is processed.
                </p>
              </div>
              <div className="tech-list">
                <span>React</span>
                <span>Vite</span>
                <span>JavaScript</span>
                <span>Local browser storage</span>
                <span>Responsive CSS</span>
                <span>Google Maps links</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          © 2026 KhammamCare • React local demo
        </div>
      </footer>

      {profileDialog}

      {loginOpen && (
        <div
          className="modal show"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLoginOpen(false);
          }}
        >
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
            <button
              type="button"
              className="modal-close"
              aria-label="Close login"
              onClick={() => setLoginOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <div className="eyebrow">KHAMMAMCARE ACCOUNT</div>
            <h2 id="login-title">{loginMode === 'create-account' ? 'Create your account' : 'Welcome back'}</h2>
            <p>{loginMode === 'create-account' ? 'Create an account to sign in.' : 'Sign in with your email and password.'}</p>
            <form className="login-form" onSubmit={handleLoginSubmit}>
              {loginMode === 'create-account' && (
                <>
                  <label htmlFor="login-name">Your name</label>
                  <input
                    id="login-name"
                    type="text"
                    autoComplete="name"
                    maxLength={60}
                    required
                    value={loginName}
                    onChange={(event) => setLoginName(event.target.value)}
                  />
                </>
              )}
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete={loginMode === 'create-account' ? 'new-password' : 'current-password'}
                minLength={6}
                required
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
              />
              {loginError && <p className="booking-error" role="alert">{loginError}</p>}
              <button type="submit" className="primary-btn" disabled={authBusy}>
                {authBusy ? 'Please wait…' : loginMode === 'create-account' ? 'Create account' : 'Log in'}
              </button>
            </form>
            <button
              type="button"
              className="auth-mode-toggle"
              onClick={() => {
                setLoginMode(loginMode === 'sign-in' ? 'create-account' : 'sign-in');
                setLoginError('');
              }}
            >
              {loginMode === 'create-account' ? 'Already have an account? Log in' : 'Create an account'}
            </button>
            {loginMode === 'sign-in' && (
              <button
                type="button"
                className="auth-mode-toggle password-reset-button"
                onClick={handlePasswordReset}
                disabled={authBusy}
              >
                Forgot password?
              </button>
            )}
            {loginNotice && <p className="login-notice" role="status">{loginNotice}</p>}
          </section>
        </div>
      )}

    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
