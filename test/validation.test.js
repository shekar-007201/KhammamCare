import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAppointment } from '../src/validation.js';

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