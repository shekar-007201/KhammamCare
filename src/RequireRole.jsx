import { useEffect, useRef, useState } from 'react';
import { getIdTokenResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { Link, Navigate } from 'react-router-dom';
import { auth } from './firebase.js';

export default function RequireRole({ claim, loginPath, children }) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const checkId = useRef(0);

  useEffect(() => {
    let active = true;
    let unsubscribe;

    auth.authStateReady()
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, user => {
          const currentCheck = ++checkId.current;
          if (!user) {
            setStatus('unauthenticated');
            return;
          }

          setStatus('loading');
          getIdTokenResult(user, true)
            .then(token => {
              if (active && currentCheck === checkId.current) {
                setStatus(token.claims[claim] === true ? 'allowed' : 'denied');
              }
            })
            .catch(verificationError => {
              if (!active || currentCheck !== checkId.current) return;
              setError(verificationError.message || 'Could not verify account access.');
              setStatus('error');
            });
        });
      })
      .catch(authError => {
        if (!active) return;
        setError(authError.message || 'Could not restore account access.');
        setStatus('error');
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [claim]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError('');
    try {
      await signOut(auth);
    } catch (signOutError) {
      setError(signOutError.message || 'Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  if (status === 'loading') {
    return <main className="admin-page"><div className="admin-empty"><p>Verifying administrator access…</p></div></main>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to={loginPath} replace />;
  }

  if (status === 'allowed') {
    return children;
  }

  return (
    <main className="admin-page">
      <div className="admin-empty">
        <h1>{status === 'denied' ? 'Admin access required' : 'Could not verify access'}</h1>
        <p>
          {status === 'denied'
            ? 'Sign in with an administrator account to open this dashboard.'
            : error}
        </p>
        {error && status === 'denied' && <p className="role-login-error" role="alert">{error}</p>}
        <div className="role-access-actions">
          <button className="primary-btn" type="button" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          <Link className="admin-back" to="/">Back to login options</Link>
        </div>
      </div>
    </main>
  );
}
