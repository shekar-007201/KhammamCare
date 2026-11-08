import { randomBytes } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

const app = getApps().length ? getApps()[0] : initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);
const doctorAccounts = db.collection('privateConfig').doc('admin').collection('doctors');

async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in with the administrator account.');
  }

  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Administrator access is required.');
  }

  const adminConfig = await db.doc('privateConfig/admin').get();
  if (!adminConfig.exists || adminConfig.data().uid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'This account is not the configured administrator.');
  }
}

async function listDoctors() {
  const snapshot = await doctorAccounts.get();
  return snapshot.docs
    .map(document => {
      const { email, doctorName, active } = document.data();
      return { uid: document.id, email, doctorName, active };
    })
    .sort((first, second) => first.doctorName.localeCompare(second.doctorName));
}

async function authorizeDoctor(data) {
  const email = String(data.email || '').trim().toLowerCase();
  const doctorName = String(data.doctorName || '').trim();

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid doctor email address.');
  }

  if (!doctorName || doctorName.length > 120) {
    throw new HttpsError('invalid-argument', 'Select a valid doctor directory name.');
  }

  let user;
  let created = false;
  let temporaryPassword;

  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;

    temporaryPassword = `Kc-${randomBytes(24).toString('base64')}9!`;
    user = await auth.createUser({ email, password: temporaryPassword, displayName: doctorName });
    created = true;
  }

  if (user.disabled) {
    throw new HttpsError('failed-precondition', 'This Firebase account is disabled.');
  }

  if (user.customClaims?.admin === true) {
    throw new HttpsError('failed-precondition', 'The administrator account cannot be assigned as a doctor.');
  }

  await auth.setCustomUserClaims(user.uid, {
    ...user.customClaims,
    accountType: 'doctor',
    doctor: true,
    doctorName,
  });
  await doctorAccounts.doc(user.uid).set({
    uid: user.uid,
    email: user.email || email,
    doctorName,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { uid: user.uid, email: user.email || email, doctorName, created, temporaryPassword };
}

async function revokeDoctor(uid) {
  if (typeof uid !== 'string' || !uid.trim()) {
    throw new HttpsError('invalid-argument', 'Select a doctor account to revoke.');
  }

  const accountRef = doctorAccounts.doc(uid);
  const account = await accountRef.get();
  if (!account.exists) {
    throw new HttpsError('not-found', 'This doctor account was not found.');
  }

  const user = await auth.getUser(uid);
  await accountRef.set({ active: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  if (user.customClaims?.doctor === true) {
    const { doctor, doctorName, ...remainingClaims } = user.customClaims;
    await auth.setCustomUserClaims(uid, remainingClaims);
    await auth.revokeRefreshTokens(uid);
  }

  return { uid, revoked: true };
}

export const adminDoctorAccess = onCall({ region: 'us-central1' }, async request => {
  await requireAdmin(request);

  try {
    switch (request.data?.action) {
      case 'list':
        return { doctors: await listDoctors() };
      case 'authorize':
        return await authorizeDoctor(request.data);
      case 'revoke':
        return await revokeDoctor(request.data.uid);
      default:
        throw new HttpsError('invalid-argument', 'Unsupported doctor access action.');
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Doctor account administration failed.', error);
    throw new HttpsError('internal', 'Could not complete the doctor access request.');
  }
});

export const verifyDoctorAccess = onCall({ region: 'us-central1' }, async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in with the authorized doctor account.');
  }

  const { doctor, doctorName } = request.auth.token;
  if (
    doctor !== true ||
    request.auth.token.accountType !== 'doctor' ||
    typeof doctorName !== 'string'
  ) {
    return { authorized: false };
  }

  const account = await doctorAccounts.doc(request.auth.uid).get();
  return {
    authorized: account.exists
      && account.data().active === true
      && account.data().doctorName === doctorName,
  };
});

export const verifyAdminAccess = onCall({ region: 'us-central1' }, async request => {
  if (!request.auth || request.auth.token.admin !== true) {
    return { authorized: false };
  }

  const adminConfig = await db.doc('privateConfig/admin').get();
  return {
    authorized: adminConfig.exists && adminConfig.data().uid === request.auth.uid,
  };
});
