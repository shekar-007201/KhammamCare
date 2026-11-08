import { useState } from 'react';
import { ArrowLeft, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import { getIdTokenResult, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth, persistAuthSession } from './firebase.js';

const roleDetails = {
  admin: {
    title: 'Admin Login',
    claim: 'admin',
    Icon: ShieldCheck,
    unauthorizedMessage: 'This account does not have administrator access.',
  },
  doctor: {
    title: 'Doctor Login',
    claim: 'doctor',
    Icon: Stethoscope,
    unauthorizedMessage: 'This account is not registered as a doctor.',
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

      if (token.claims[details.claim] !== true) {
        await signOut(auth);
        setError(details.unauthorizedMessage);
        return;
      }

      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        setNotice('Doctor account verified. You are signed in with your doctor account.');
      }
      setPassword('');
    } catch (loginError) {
      console.error(`${role} Firebase login error:`, loginError.code, loginError.message);
      setError(loginError.message || 'Could not sign in. Please try again.');
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

        {notice ? (
          <Link className="role-login-back" to="/home">Go to KhammamCare</Link>
        ) : (
          <Link className="role-login-back" to="/">
            <ArrowLeft size={16} aria-hidden="true" /> Back to login options
          </Link>
        )}
      </section>
    </main>
  );
}
