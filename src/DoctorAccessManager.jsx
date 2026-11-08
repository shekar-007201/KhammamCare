import { useEffect, useState } from 'react';
import { doctors } from './data.js';
import { callAdminDoctorAccess } from './doctorAccess.js';

const doctorNames = [...new Set(doctors.map(([name]) => name))].sort();

export default function DoctorAccessManager() {
  const [accounts, setAccounts] = useState([]);
  const [email, setEmail] = useState('');
  const [doctorName, setDoctorName] = useState(doctorNames[0] || '');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callAdminDoctorAccess('list');
      setAccounts(result.doctors);
    } catch (loadError) {
      setError(loadError.message || 'Could not load doctor access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, []);

  const authorize = async (accountEmail, assignedDoctorName) => {
    setBusy(true);
    setError('');
    setNotice('');
    setTemporaryPassword('');
    try {
      const result = await callAdminDoctorAccess('authorize', {
        email: accountEmail,
        doctorName: assignedDoctorName,
      });
      setTemporaryPassword(result.temporaryPassword || '');
      setNotice(result.created
        ? 'Doctor account created and access authorized.'
        : 'Doctor access authorized.');
      setEmail('');
      await refreshAccounts();
    } catch (authorizationError) {
      setError(authorizationError.message || 'Could not authorize this doctor.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    await authorize(email.trim(), doctorName);
  };

  const revoke = async account => {
    if (!window.confirm(`Revoke Doctor Dashboard access for ${account.email}?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    setTemporaryPassword('');
    try {
      await callAdminDoctorAccess('revoke', { uid: account.uid });
      setNotice(`Doctor access revoked for ${account.email}.`);
      await refreshAccounts();
    } catch (revokeError) {
      setError(revokeError.message || 'Could not revoke doctor access.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="doctor-access-manager" aria-labelledby="doctor-access-heading">
      <div className="admin-toolbar-heading">
        <h3 id="doctor-access-heading">Doctor account access</h3>
        <p>Create doctor accounts, authorize existing accounts, or revoke access.</p>
      </div>
      <form className="doctor-access-form" onSubmit={handleSubmit}>
        <label>
          Doctor account email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="doctor@example.com"
          />
        </label>
        <label>
          Assign to doctor
          <select value={doctorName} onChange={event => setDoctorName(event.target.value)} required>
            {doctorNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button className="primary-btn" type="submit" disabled={busy || !doctorName}>
          {busy ? 'Please wait…' : 'Create / authorize'}
        </button>
      </form>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="doctor-access-notice" role="status">{notice}</p>}
      {temporaryPassword && (
        <p className="doctor-temporary-password" role="status">
          Share this temporary password with the doctor through a secure channel. It will only be shown once:
          <code>{temporaryPassword}</code>
        </p>
      )}

      {loading ? (
        <p>Loading authorized doctors…</p>
      ) : accounts.length === 0 ? (
        <p>No doctor accounts have been authorized.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-directory-table">
            <thead>
              <tr><th>Account</th><th>Assigned doctor</th><th>Access</th><th>Action</th></tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <tr key={account.uid}>
                  <td>{account.email || account.uid}</td>
                  <td>{account.doctorName}</td>
                  <td>{account.active ? 'Authorized' : 'Revoked'}</td>
                  <td>
                    {account.active ? (
                      <button
                        type="button"
                        className="admin-back admin-logout"
                        onClick={() => revoke(account)}
                        disabled={busy}
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-back"
                        onClick={() => authorize(account.email, account.doctorName)}
                        disabled={busy || !account.email}
                      >
                        Reauthorize
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
