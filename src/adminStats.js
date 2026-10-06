const normalizeStatus = (status) => String(status ?? '').trim();

export const getAppointmentStats = (appointments = []) => {
  const total = appointments.length;
  const pending = appointments.filter((appointment) => normalizeStatus(appointment.status) === 'Pending').length;
  const confirmed = appointments.filter((appointment) => ['confirmed', 'Approved'].includes(normalizeStatus(appointment.status))).length;
  const completed = appointments.filter((appointment) => normalizeStatus(appointment.status) === 'Completed').length;
  const seen = appointments.filter((appointment) => normalizeStatus(appointment.status) === 'Seen').length;

  const loggedIn = new Set(
    appointments
      .map((appointment) => {
        const identifier = appointment.userEmail ?? appointment.phone ?? appointment.userPhone;
        return identifier ? String(identifier).trim().toLowerCase() : null;
      })
      .filter(Boolean),
  ).size;

  return { total, pending, confirmed, completed, seen, loggedIn };
};
