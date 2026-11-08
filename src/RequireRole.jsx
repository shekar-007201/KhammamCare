import { useEffect, useRef, useState } from 'react';
import { getIdTokenResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { LockKeyhole } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { auth } from './firebase.js';
import { ADMIN_EMAIL, canAccessRole, getDashboardPath } from './accessControl.js';
import { verifyCurrentAdminAccess, verifyCurrentDoctorAccess } from './doctorAccess.js';

export default function RequireRole({ role, loginPath, children }) {
  const [access, setAccess] = useState({
    status: 'loading',
    user: null,
    claims: null,
    error: '',
  });
  const [signingOut, setSigningOut] = useState(false);
  const checkId = useRef(0);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    let unsubscribe;

    auth.authStateReady()
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, user => {
          const currentCheck = ++checkId.current;
          if (!user) {
            setAccess({ status: 'unauthenticated', user: null, claims: null, error: '' });
            return;
          }

          setAccess({ status: 'loading', user, claims: null, error: '' });
          getIdTokenResult(user, true)
            .then(async ({ claims }) => {
              const isAdmin = claims.admin === true;
              let allowed = canAccessRole(role, claims, user.uid);
              if (isAdmin) {
                const adminAccess = user.email?.trim().toLowerCase() === ADMIN_EMAIL
                  ? await verifyCurrentAdminAccess()
                  : { authorized: false };
                allowed = adminAccess.authorized;
              } else if (allowed && role === 'doctor') {
                const doctorAccess = await verifyCurrentDoctorAccess();
                allowed = doctorAccess.authorized;
              }

              if (active && currentCheck === checkId.current) {
                setAccess({
                  status: allowed ? 'allowed' : 'denied',
                  user,
                  claims,
                  error: '',
                });
              }
            })
            .catch(verificationError => {
              if (!active || currentCheck !== checkId.current) return;
              setAccess({
                status: 'error',
                user,
                claims: null,
                error: verificationError.message || 'Could not verify account access.',
              });
            });
        });
      })
      .catch(authError => {
        if (!active) return;
        setAccess({
          status: 'error',
          user: null,
          claims: null,
          error: authError.message || 'Could not restore account access.',
        });
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [role]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
    } catch (signOutError) {
      setAccess(current => ({
        ...current,
        error: signOutError.message || 'Could not sign out. Please try again.',
      }));
    } finally {
      setSigningOut(false);
    }
  };

  if (access.status === 'loading') {
    return <main className="admin-page"><div className="admin-empty"><p>Verifying your access…</p></div></main>;
  }

  if (access.status === 'unauthenticated') {
    return <Navigate to={loginPath} replace />;
  }

  if (access.status === 'allowed') {
    return typeof children === 'function'
      ? children({ user: access.user, claims: access.claims })
      : children;
  }

  const dashboardPath = getDashboardPath(access.claims, access.user?.uid);
  return (
    <main className="admin-page locked-access-page">
      <section className="admin-empty locked-access-card" role="alert">
        <LockKeyhole className="locked-access-icon" size={40} aria-hidden="true" />
        <h1>Access Restricted</h1>
        <p>You do not have permission to access this page.</p>
        {access.error && <p className="role-login-error">{access.error}</p>}
        <div className="role-access-actions">
          <Link
            className="primary-btn"
            to={dashboardPath === location.pathname ? '/home' : dashboardPath}
          >
            Back to My Dashboard
          </Link>
          <button className="admin-back admin-logout" type="button" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>
    </main>
  );
}
