import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase.js';

const adminDoctorAccess = httpsCallable(getFunctions(app, 'us-central1'), 'adminDoctorAccess');
const verifyDoctorAccess = httpsCallable(getFunctions(app, 'us-central1'), 'verifyDoctorAccess');
const verifyAdminAccess = httpsCallable(getFunctions(app, 'us-central1'), 'verifyAdminAccess');

export async function callAdminDoctorAccess(action, payload = {}) {
  const result = await adminDoctorAccess({ action, ...payload });
  return result.data;
}

export async function verifyCurrentDoctorAccess() {
  const result = await verifyDoctorAccess();
  return result.data;
}

export async function verifyCurrentAdminAccess() {
  const result = await verifyAdminAccess();
  return result.data;
}
