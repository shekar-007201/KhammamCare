import { useState } from 'react';
import { ArrowLeft, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import {
  getIdTokenResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth, persistAuthSession } from './firebase.js';
import { ADMIN_EMAIL, canAccessRole } from './accessControl.js';
import { verifyCurrentAdminAccess, verifyCurrentDoctorAccess } from './doctorAccess.js';

const roleDetails = {
  admin: {
    title: 'Admin Login',
    Icon: ShieldCheck,
    unauthorizedMessage: 'This account does not have administrator access.',
  },
  doctor: {
    title: 'Doctor Login',
    Icon: Stethoscope,
    unauthorizedMessage: 'This account is not registered to an assigned doctor.',
  },
};

export default function RoleLogin({ role }) {
  const details = roleDetails[role];
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      await persistAuthSession();
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await getIdTokenResult(credential.user, true);

      if (token.claims.admin === true) {
        const adminAccess = credential.user.email?.trim().toLowerCase() === ADMIN_EMAIL
          ? await verifyCurrentAdminAccess()
          : { authorized: false };
        if (!adminAccess.authorized) {
          await signOut(auth);
          setError(details.unauthorizedMessage);
          return;
        }
      }

      if (!canAccessRole(role, token.claims, credential.user.uid)) {
        await signOut(auth);
        setError(details.unauthorizedMessage);
        return;
      }

      if (role === 'doctor' && token.claims.admin !== true) {
        const access = await verifyCurrentDoctorAccess();
        if (!access.authorized) {
          await signOut(auth);
          setError(details.unauthorizedMessage);
          return;
        }
      }

      if (role === 'admin' || token.claims.admin === true) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/doctor/dashboard', { replace: true });
      }
      setPassword('');
    } catch (loginError) {
      console.error(`${role} Firebase login error:`, loginError.code, loginError.message);
      setError(loginError.message || 'Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    const accountEmail = email.trim();
    setError('');
    setNotice('');
    if (!accountEmail) {
      setError('Enter your doctor account email first.');
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, accountEmail);
      setNotice(`Password reset email sent to ${accountEmail}.`);
    } catch (resetError) {
      console.error('Doctor password reset error:', resetError.code, resetError.message);
      setError(resetError.message || 'Could not send the password reset email.');
    } finally {
      setBusy(false);
    }
  };

  const Icon = details.Icon;

  return (
    <main className="role-login-page">
      <section className="role-login-card">
        <Link className="role-login-brand" to="/" aria-label="Back to KhammamCare">
          <HeartPulse aria-hidden="true" />
          <span>Khammam<span>Care</span></span>
        </Link>
        <div className="role-login-icon"><Icon size={27} aria-hidden="true" /></div>
        <h1>{details.title}</h1>
        <p className="role-login-description">
          Sign in with the Firebase account authorized for this role.
        </p>

        <form className="role-login-form" onSubmit={handleSubmit}>
          <label htmlFor={`${role}-email`}>Email address</label>
          <input
            id={`${role}-email`}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor={`${role}-password`}>Password</label>
          <input
            id={`${role}-password`}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <p className="role-login-error" role="alert">{error}</p>}
          {notice && <p className="role-login-notice" role="status">{notice}</p>}
          <button className="login-card-link" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
        </form>

        {role === 'doctor' && (
          <button
            type="button"
            className="auth-mode-toggle password-reset-button"
            onClick={handlePasswordReset}
            disabled={busy}
          >
            Forgot password?
          </button>
        )}
        <Link className="role-login-back" to="/">
          <ArrowLeft size={16} aria-hidden="true" /> Back to login options
        </Link>
      </section>
    </main>
  );
}
