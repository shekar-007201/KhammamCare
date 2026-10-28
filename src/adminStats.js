const normalizeStatus = (status) => String(status == null ? '' : status).trim();

export const getAppointmentStats = (appointments = []) => {
    const total = appointments.length;
    const pending = appointments.filter((appointment) => normalizeStatus(appointment.status) === 'Pending').length;
    const confirmed = appointments.filter((appointment) => ['confirmed', 'Approved'].includes(normalizeStatus(appointment.status))).length;
    const completed = appointments.filter((appointment) => normalizeStatus(appointment.status) === 'Completed').length;
    const seen = appointments.filter((appointment) => normalizeStatus(appointment.status) === 'Seen').length;

    return { total, pending, confirmed, completed, seen };
};