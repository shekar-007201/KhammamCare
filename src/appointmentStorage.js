const APPOINTMENTS_KEY = 'khammamcare-appointments';
const PAYMENTS_KEY = 'khammamcare-payments';
const CHANGE_EVENT = 'khammamcare:storage-change';

function readCollection(key) {
    if (typeof window === 'undefined') return [];

    try {
        const records = JSON.parse(window.localStorage.getItem(key) || '[]');
        return Array.isArray(records) ? records.filter(Boolean) : [];
    } catch {
        return [];
    }
}

function writeCollection(key, records) {
    const normalized = Array.isArray(records) ? records.filter(Boolean) : [];
    window.localStorage.setItem(key, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
    return normalized;
}

function subscribeToCollection(key, callback, filter = () => true) {
    if (typeof window === 'undefined') {
        callback([]);
        return () => {};
    }

    const refresh = () => callback(readCollection(key).filter(filter));
    const handleStorage = event => {
        if (event.key === key || event.key === null) refresh();
    };
    const handleLocalChange = event => {
        if (event.detail && event.detail.key === key) refresh();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CHANGE_EVENT, handleLocalChange);
    refresh();

    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(CHANGE_EVENT, handleLocalChange);
    };
}

export function createAppointment(appointment) {
    const saved = {
        ...appointment,
        id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    writeCollection(APPOINTMENTS_KEY, [...readCollection(APPOINTMENTS_KEY), saved]);
    return saved;
}

export function createPaymentRecord(payment) {
    const saved = {
        ...payment,
        id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    writeCollection(PAYMENTS_KEY, [...readCollection(PAYMENTS_KEY), saved]);
    return saved;
}

export function subscribeToAppointments(uid, callback) {
    if (!uid) {
        callback([]);
        return () => {};
    }

    return subscribeToCollection(APPOINTMENTS_KEY, callback, appointment => appointment.uid === uid);
}

export function subscribeToAllAppointments(callback) {
    return subscribeToCollection(APPOINTMENTS_KEY, callback);
}

export function updateAppointment(id, changes) {
    const appointments = readCollection(APPOINTMENTS_KEY).map(appointment =>
        appointment.id === id ? {...appointment, ...changes } : appointment,
    );
    return writeCollection(APPOINTMENTS_KEY, appointments);
}