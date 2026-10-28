import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppointmentStats } from '../src/adminStats.js';
import { getLocalDateValue, validateAppointment } from '../src/validation.js';

const validAppointment = {
    name: 'Shekar',
    phone: '6302403464',
    age: '24',
    hospital: 'KHIMS Hospitals',
    doctor: 'Dr. Krishna Kishore',
    date: '2026-10-01',
    time: '10:00 AM',
};

test('accepts a complete future appointment', () => {
    assert.equal(validateAppointment(validAppointment, '2026-09-28'), '');
});

test('rejects invalid phone numbers', () => {
    assert.equal(validateAppointment({...validAppointment, phone: '123' }, '2026-09-28'), 'Enter a valid 10-digit phone number.');
});

test('rejects past appointment dates', () => {
    assert.equal(validateAppointment({...validAppointment, date: '2026-09-27' }, '2026-09-28'), 'Choose today or a future appointment date.');
});

test('formats dates using the local calendar instead of UTC', () => {
    const localDate = new Date(2026, 9, 6, 23, 45, 0);
    assert.equal(getLocalDateValue(localDate), '2026-10-06');
});

test('rejects partial date strings from the native browser datepicker', () => {
    assert.equal(validateAppointment({...validAppointment, date: '2026' }, '2026-10-06'), 'Choose today or a future appointment date.');
});

test('counts appointment statuses correctly', () => {
    const stats = getAppointmentStats([
        { id: 'a1', name: 'Asha', phone: '90000', userEmail: 'asha@example.com', status: 'Seen' },
        { id: 'a2', name: 'Bharat', phone: '90001', userEmail: 'bharat@example.com', status: 'confirmed' },
        { id: 'a3', name: 'Chandra', phone: '90002', userEmail: 'asha@example.com', status: 'Pending' },
        { id: 'a4', name: 'Dinesh', phone: '90003', status: 'Completed' },
        { id: 'a5', name: 'Esha', phone: '90004', status: 'Seen' },
    ]);

    assert.equal(stats.total, 5);
    assert.equal(stats.seen, 2);
    assert.equal(stats.pending, 1);
    assert.equal(stats.confirmed, 1);
    assert.equal(stats.completed, 1);
});