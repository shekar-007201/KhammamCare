export function validateAppointment(form, today = new Date().toISOString().split('T')[0]) {
    if (!(form.name || '').trim() || form.name.trim().length < 2) return 'Enter the patient name.';
    if (!/^\d{10}$/.test(form.phone || '')) return 'Enter a valid 10-digit phone number.';
    if (!Number.isInteger(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 120) return 'Enter an age between 1 and 120.';
    if (!form.hospital) return 'Select a hospital.';
    if (!form.doctor) return 'Select a doctor.';
    if (!form.date || form.date < today) return 'Choose today or a future appointment date.';
    if (!form.time) return 'Select a time slot.';
    return '';
}