import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  Eye,
  EyeOff,
  LogOut,
  LockKeyhole,
  Pencil,
  Save,
  ShieldCheck,
  Stethoscope,
  X,
  UserRound,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { useDirectory } from './useDirectory.js';
import { auth, db, persistAuthSession } from './firebase.js';
import { ADMIN_EMAIL, canAccessRole } from './accessControl.js';
import { verifyCurrentAdminAccess, verifyCurrentDoctorAccess } from './doctorAccess.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  subscribeToAppointments,
} from './appointmentStorage.js';
import { BOOKING_DRAFT_KEY } from './bookingConstants.js';
import profilePhoto from '../me.jpg';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const [patientLoginOpen, setPatientLoginOpen] = useState(false);
  const [lockedPortalOpen, setLockedPortalOpen] = useState(false);
  const [adminPortalAccess, setAdminPortalAccess] = useState('checking');
  const [loginMode, setLoginMode] = useState('sign-in');
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [returnToAfterLogin, setReturnToAfterLogin] = useState('');
  const [bookingNavigationError, setBookingNavigationError] = useState('');
  const [appointments, setAppointments] = useState([]);

  const t = (key) => translations.en[key];

  useEffect(() => {
    let active = true;
    let unsubscribe;

    auth.authStateReady()
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, user => {
          if (!active) return;
          setAuthUser(user);
          setAuthReady(true);
        });
      })
      .catch(error => {
        console.error('Could not restore the Firebase session:', error);
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!authReady) {
      setAdminPortalAccess('checking');
      return undefined;
    }

    if (!authUser) {
      setAdminPortalAccess('locked');
      return undefined;
    }

    let active = true;
    setAdminPortalAccess('checking');
    getIdTokenResult(authUser, true)
      .then(({ claims }) => {
        if (!active) return undefined;
        if (
          authUser.email?.trim().toLowerCase() !== ADMIN_EMAIL ||
          claims.admin !== true
        ) {
          return false;
        }
        return verifyCurrentAdminAccess().then(({ authorized }) => authorized);
      })
      .then(authorized => {
        if (!active || authorized === undefined) return;
        setAdminPortalAccess(authorized ? 'unlocked' : 'locked');
      })
      .catch(error => {
        console.error('Could not verify homepage Admin access:', error);
        if (active) setAdminPortalAccess('locked');
      });

    return () => {
      active = false;
    };
  }, [authReady, authUser]);

  useEffect(() => {
    if (!authUser) {
      setAppointments([]);
      return undefined;
    }

    return subscribeToAppointments(
      authUser.uid,
      setAppointments,
      error => console.error('Could not load patient appointments:', error),
    );
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authReady) return;
    if (searchParams.get('login') !== 'patient') return;
    const returnTo = searchParams.get('returnTo');
    const safeReturnTo = returnTo === '/patient/details' || returnTo === '/patient/payment'
      ? returnTo
      : '';

    if (authUser) {
      if (safeReturnTo) navigate(safeReturnTo, { replace: true });
      setSearchParams(currentParams => {
        currentParams.delete('login');
        currentParams.delete('returnTo');
        return currentParams;
      }, { replace: true });
      return;
    }

    if (safeReturnTo) {
      setReturnToAfterLogin(returnTo);
    }
    setLoginMode('sign-in');
    setPatientLoginOpen(true);
    setSearchParams((currentParams) => {
      currentParams.delete('login');
      currentParams.delete('returnTo');
      return currentParams;
    }, { replace: true });
  }, [authReady, authUser, navigate, searchParams, setSearchParams]);

  useEffect(() => {
    if (!lockedPortalOpen) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setLockedPortalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [lockedPortalOpen]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setLoginNotice('');
    setAuthBusy(true);

    try {
      await persistAuthSession();
      let credential;

      if (loginMode === 'create-account') {
        credential = await createUserWithEmailAndPassword(
          auth,
          loginEmail.trim(),
          loginPassword,
        );

        const name = loginName.trim();

        await updateProfile(credential.user, { displayName: name });

        // Create a Firestore profile for the newly registered patient.
        await setDoc(doc(db, 'users', credential.user.uid), {
          uid: credential.user.uid,
          name,
          email: credential.user.email,
          role: 'patient',
          createdAt: serverTimestamp(),
        });

        setAuthUser({ ...credential.user, displayName: name });
      } else {
        credential = await signInWithEmailAndPassword(
          auth,
          loginEmail.trim(),
          loginPassword,
        );

        const token = await getIdTokenResult(credential.user, true);
        if (
          token.claims.admin === true ||
          token.claims.doctor === true ||
          token.claims.accountType === 'doctor'
        ) {
          await signOut(auth);
          setLoginError('Use the login page for your administrator or doctor account.');
          return;
        }

        // Backfill a profile for an existing account if it does not exist yet.
        const userRef = doc(db, 'users', credential.user.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists() && userSnapshot.data().role !== 'patient') {
          await signOut(auth);
          setLoginError('This account is not registered as a patient.');
          return;
        }

        if (!userSnapshot.exists()) {
          await setDoc(userRef, {
            uid: credential.user.uid,
            name: credential.user.displayName || '',
            email: credential.user.email,
            role: 'patient',
            createdAt: serverTimestamp(),
          });
        }
      }

      setAuthUser(credential.user);
      setPatientLoginOpen(false);
      setLoginPassword('');
      setLoginPasswordVisible(false);
      navigate(returnToAfterLogin || '/patient/dashboard', { replace: true });
      setReturnToAfterLogin('');
    } catch (error) {
      console.error('Firebase login error:', error.code, error.message);
      setLoginError(`${error.code || 'error'}: ${error.message}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminPortalClick = async () => {
    if (!authReady) {
      try {
        await auth.authStateReady();
      } catch (error) {
        console.error('Could not restore the Firebase session:', error);
        setLockedPortalOpen(true);
        return;
      }
    }

    const user = auth.currentUser;
    if (!user) {
      setLockedPortalOpen(true);
      return;
    }

    try {
      const { claims } = await getIdTokenResult(user, true);
      const authorized = user.email?.trim().toLowerCase() === ADMIN_EMAIL
        && claims.admin === true
        && (await verifyCurrentAdminAccess()).authorized;
      setAdminPortalAccess(authorized ? 'unlocked' : 'locked');
      if (authorized) {
        navigate('/admin');
      } else {
        setLockedPortalOpen(true);
      }
    } catch (error) {
      console.error('Could not verify homepage Admin access:', error);
      setAdminPortalAccess('locked');
      setLockedPortalOpen(true);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setLoginNotice('');
    setAuthBusy(true);

    try {
      await persistAuthSession();
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const { claims } = await getIdTokenResult(credential.user, true);

      if (claims.admin === true) {
        const isAuthorizedAdmin = credential.user.email?.trim().toLowerCase() === ADMIN_EMAIL
          && (await verifyCurrentAdminAccess()).authorized;
        if (!isAuthorizedAdmin) {
          await signOut(auth);
          setLoginError('This Google account is not authorized for Admin access.');
          return;
        }
        navigate('/admin', { replace: true });
        return;
      }

      if (claims.doctor === true || claims.accountType === 'doctor') {
        const isAuthorizedDoctor = canAccessRole('doctor', claims, credential.user.uid)
          && (await verifyCurrentDoctorAccess()).authorized;
        if (!isAuthorizedDoctor) {
          await signOut(auth);
          setLoginError('This Google account is not authorized for Doctor access.');
          return;
        }
        navigate('/doctor/dashboard', { replace: true });
        return;
      }

      const userRef = doc(db, 'users', credential.user.uid);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists() && userSnapshot.data().role !== 'patient') {
        await signOut(auth);
        setLoginError('This account is not registered as a patient.');
        return;
      }
      if (!userSnapshot.exists()) {
        await setDoc(userRef, {
          uid: credential.user.uid,
          name: credential.user.displayName || '',
          email: credential.user.email,
          role: 'patient',
          createdAt: serverTimestamp(),
        });
      }

      setAuthUser(credential.user);
      setPatientLoginOpen(false);
      navigate(returnToAfterLogin || '/patient/dashboard', { replace: true });
      setReturnToAfterLogin('');
    } catch (error) {
      console.error('Google sign-in error:', error.code, error.message);
      setLoginError(error.message || 'Could not sign in with Google. Please try again.');
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
      setPatientLoginOpen(true);
      requestAnimationFrame(() => {
        document.querySelector('#patient-login')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.querySelector('#login-email')?.focus({ preventScroll: true });
      });
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

      // Keep the Firestore profile in sync with the Firebase Auth profile.
      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        {
          uid: auth.currentUser.uid,
          name,
          email: auth.currentUser.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

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
      navigate('/');
    } catch (error) {
      setProfileError(error.message || 'Could not sign out. Please try again.');
      setProfileOpen(true);
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

  const patientLoginForm = (
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
      <div className="password-input-wrap">
        <input
          id="login-password"
          type={loginPasswordVisible ? 'text' : 'password'}
          autoComplete={loginMode === 'create-account' ? 'new-password' : 'current-password'}
          minLength={6}
          required
          value={loginPassword}
          onChange={(event) => setLoginPassword(event.target.value)}
        />
        <button
          type="button"
          className="password-visibility-toggle"
          aria-label={loginPasswordVisible ? 'Hide password' : 'Show password'}
          aria-controls="login-password"
          onClick={() => setLoginPasswordVisible(visible => !visible)}
        >
          {loginPasswordVisible
            ? <EyeOff size={18} aria-hidden="true" />
            : <Eye size={18} aria-hidden="true" />}
          <span>{loginPasswordVisible ? 'Hide' : 'Show'}</span>
        </button>
      </div>
      {loginError && <p className="booking-error" role="alert">{loginError}</p>}
      <button type="submit" className="primary-btn" disabled={authBusy}>
        {authBusy ? 'Please wait…' : loginMode === 'create-account' ? 'Create account' : 'Log in'}
      </button>
      <div className="google-login-divider" aria-hidden="true"><span>or</span></div>
      <button
        type="button"
        className="secondary-btn google-login-button"
        onClick={handleGoogleLogin}
        disabled={authBusy}
      >
        {authBusy ? 'Please wait…' : 'Continue with Google'}
      </button>
    </form>
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

  const openBooking = (defaults = {}) => {
    setBookingNavigationError('');
    try {
      const savedDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY);
      const draft = savedDraft ? JSON.parse(savedDraft) : {};
      sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ ...draft, ...defaults }));
      navigate('/patient/details');
    } catch (error) {
      console.error('Could not prepare appointment details:', error);
      setBookingNavigationError('Could not open appointment details. Check your browser storage and try again.');
    }
  };

  const chooseHospital = (hospital) => {
    openBooking({ hospital, doctor: '' });
  };

  const chooseDoctor = (doctor, hospital) => {
    setSelectedDoctor(doctor);
    openBooking({ hospital, doctor });
  };

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

          <nav id="main-navigation" className={menu ? 'open' : ''}>
            <a href="#home" onClick={() => setMenu(false)}>{t('home')}</a>
            <a href="#hospitals" onClick={() => setMenu(false)}>{t('hospitals')}</a>
            <a href="#doctors" onClick={() => setMenu(false)}>{t('doctors')}</a>
            <a
              href="#appointment"
              onClick={(event) => {
                event.preventDefault();
                setMenu(false);
                openBooking();
              }}
            >
              {t('appointment')}
            </a>
            <a href="#about" onClick={() => setMenu(false)}>{t('about')}            </a>
          </nav>

          <div className="nav-actions">
            <button
              type="button"
              className="secondary-btn header-login-button"
              onClick={handleAuthButton}
            >
              <UserRound size={16} aria-hidden="true" />
              <span className="header-login-label">
                {authUser ? authUser.displayName || 'My account' : 'Login'}
              </span>
            </button>
            {authUser && (
              <button
                type="button"
                className="secondary-btn header-logout-button"
                onClick={handleProfileSignOut}
                disabled={profileBusy}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Log out</span>
              </button>
            )}
          </div>

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
        </div>
      </header>

      <main>
        {directoryError && (
          <div className="offline-banner" role="status">
            {directoryError}
          </div>
        )}

        <section className="portal-section" id="portals">
          <div className="container">
            <div className="portal-heading">
              <div className="eyebrow">KHAMMAMCARE PORTALS</div>
              <h2>Choose your account</h2>
              <p>Sign in to the right portal to continue.</p>
            </div>
            <div className="portal-grid">
              <button
                type="button"
                className={`portal-card portal-admin-card ${adminPortalAccess === 'unlocked' ? 'unlocked-portal-card' : 'locked-portal-card'}`}
                onClick={handleAdminPortalClick}
                aria-haspopup="dialog"
                aria-label={adminPortalAccess === 'unlocked' ? 'Open Admin Dashboard' : 'Admin Login locked'}
              >
                <span className="portal-icon">
                  <ShieldCheck aria-hidden="true" />
                  {adminPortalAccess !== 'unlocked' && (
                    <LockKeyhole className="portal-lock-badge" aria-hidden="true" />
                  )}
                </span>
                <span className="portal-card-copy">
                  <strong>Admin Login</strong>
                  <span>Manage appointments and hospital services.</span>
                  <b>
                    {adminPortalAccess === 'unlocked'
                      ? 'UNLOCKED'
                      : <><LockKeyhole size={14} aria-hidden="true" /> LOCKED</>}
                  </b>
                </span>
              </button>
              <button
                type="button"
                className="portal-card portal-doctor-card locked-portal-card"
                onClick={() => setLockedPortalOpen(true)}
                aria-haspopup="dialog"
              >
                <span className="portal-icon">
                  <Stethoscope aria-hidden="true" />
                  <LockKeyhole className="portal-lock-badge" aria-hidden="true" />
                </span>
                <span className="portal-card-copy">
                  <strong>Doctor Login</strong>
                  <span>Sign in to your verified doctor account.</span>
                  <b><LockKeyhole size={14} aria-hidden="true" /> LOCKED</b>
                </span>
              </button>
              {authUser ? (
                <Link className="portal-card portal-patient-card" to="/patient/dashboard">
                  <span className="portal-icon"><UserRound aria-hidden="true" /></span>
                  <span className="portal-card-copy">
                    <strong>Patient Account</strong>
                    <span>View and manage your appointments.</span>
                    <b>My Appointments <span aria-hidden="true">→</span></b>
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="portal-card portal-patient-card"
                  onClick={() => {
                    setLoginMode('sign-in');
                    setLoginError('');
                    setPatientLoginOpen(value => !value);
                  }}
                  aria-expanded={patientLoginOpen}
                  aria-controls="patient-login"
                >
                  <span className="portal-icon"><UserRound aria-hidden="true" /></span>
                  <span className="portal-card-copy">
                    <strong>Patient Login</strong>
                    <span>Book visits and manage your healthcare appointments.</span>
                    <b>{patientLoginOpen ? <>Close Login <span aria-hidden="true">↑</span></> : <>Login <span aria-hidden="true">→</span></>}</b>
                  </span>
                </button>
              )}
            </div>

            {lockedPortalOpen && (
              <div
                className="modal show locked-portal-modal"
                role="presentation"
                onClick={event => {
                  if (event.target === event.currentTarget) setLockedPortalOpen(false);
                }}
              >
                <section
                  className="modal-card locked-portal-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="locked-portal-title"
                  aria-describedby="locked-portal-description"
                >
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setLockedPortalOpen(false)}
                    aria-label="Close access restricted message"
                    autoFocus
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                  <LockKeyhole className="locked-portal-dialog-icon" size={42} aria-hidden="true" />
                  <div className="eyebrow">DON'T TOUCH THAT!</div>
                  <h2 id="locked-portal-title">ACCESS RESTRICTED</h2>
                  <p id="locked-portal-description">
                    This section is privately managed by KhammamCare Administration.
                  </p>
                  <button
                    type="button"
                    className="primary-btn locked-portal-dismiss"
                    onClick={() => setLockedPortalOpen(false)}
                  >
                    Close
                  </button>
                </section>
              </div>
            )}

            {patientLoginOpen && !authUser && (
              <section className="patient-inline-login" id="patient-login" aria-labelledby="patient-login-title">
                <div className="patient-inline-login-copy">
                  <div className="eyebrow">PATIENT ACCOUNT</div>
                  <h3 id="patient-login-title">
                    {loginMode === 'create-account' ? 'Create your patient account' : 'Welcome back'}
                  </h3>
                  <p>
                    {loginMode === 'create-account'
                      ? 'Register to book and manage appointments.'
                      : 'Sign in to book a visit or view your appointments.'}
                  </p>
                </div>
                {patientLoginForm}
                <div className="patient-inline-login-actions">
                  <button
                    type="button"
                    className="auth-mode-toggle"
                    onClick={() => {
                      setLoginMode(loginMode === 'sign-in' ? 'create-account' : 'sign-in');
                      setLoginError('');
                      setLoginPasswordVisible(false);
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
                </div>
              </section>
            )}
          </div>
        </section>

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
                    openBooking();
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
                <div>✓ Patient account protected</div>
                <div>✓ Select hospital and doctor</div>
                <div>✓ Choose date and time</div>
                <div>✓ Demo payment step</div>
                <div>✓ Appointment saved securely</div>
              </div>
            </div>

            <div className="form-card booking-start-card">
              <h3>Ready to book your appointment?</h3>
              <p>Enter your patient details and visit preferences on the next page, then continue to the separate demo payment page.</p>
              {bookingNavigationError && <p className="booking-error" role="alert">{bookingNavigationError}</p>}
              <button className="primary-btn full" type="button" onClick={() => openBooking()}>
                Enter appointment details →
              </button>
            </div>
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
                    openBooking();
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
