import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessRole, getAuthenticatedRole, getDashboardPath } from '../src/accessControl.js';

const adminClaims = { admin: true };
const doctorClaims = { doctor: true, doctorName: 'Dr. Doctor' };
const patientClaims = {};

test('admin can access all three dashboards and returns to Admin', () => {
    for (const role of ['admin', 'doctor', 'patient']) {
        assert.equal(canAccessRole(role, adminClaims, 'admin-1'), true);
    }
    assert.equal(getAuthenticatedRole(adminClaims, 'admin-1'), 'admin');
    assert.equal(getDashboardPath(adminClaims, 'admin-1'), '/admin');
});

test('doctor is limited to the assigned Doctor Dashboard', () => {
    assert.equal(canAccessRole('doctor', doctorClaims, 'doctor-1'), true);
    assert.equal(canAccessRole('admin', doctorClaims, 'doctor-1'), false);
    assert.equal(canAccessRole('patient', doctorClaims, 'doctor-1'), false);
    assert.equal(getDashboardPath(doctorClaims, 'doctor-1'), '/doctor/dashboard');
});

test('patient is limited to the Patient Dashboard', () => {
    assert.equal(canAccessRole('patient', patientClaims, 'patient-1'), true);
    assert.equal(canAccessRole('admin', patientClaims, 'patient-1'), false);
    assert.equal(canAccessRole('doctor', patientClaims, 'patient-1'), false);
    assert.equal(getDashboardPath(patientClaims, 'patient-1'), '/patient/dashboard');
});

test('unauthenticated and incorrectly assigned privileged accounts are denied', () => {
    assert.equal(getAuthenticatedRole(null, null), null);
    assert.equal(canAccessRole('patient', null, null), false);
    assert.equal(canAccessRole('doctor', { doctor: true }, 'doctor-1'), false);
    assert.equal(getDashboardPath({ doctor: true }, 'doctor-1'), '/home');
    assert.equal(canAccessRole('patient', { accountType: 'doctor' }, 'doctor-1'), false);
});
