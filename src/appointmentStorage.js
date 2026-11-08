import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';

function subscribeToQuery(appointmentQuery, callback, onError) {
    return onSnapshot(
        appointmentQuery,
        snapshot => callback(snapshot.docs.map(appointment => ({
            ...appointment.data(),
            id: appointment.id,
        }))),
        onError || (error => console.error('Appointment subscription failed:', error)),
    );
}

export function createBooking(appointment, payment) {
    const appointmentRef = doc(collection(db, 'appointments'));
    const paymentRef = doc(collection(db, 'payments'));
    const batch = writeBatch(db);

    batch.set(appointmentRef, appointment);
    batch.set(paymentRef, {
        ...payment,
        createdAt: serverTimestamp(),
    });

    return batch.commit().then(() => ({
        ...appointment,
        id: appointmentRef.id,
    }));
}

export function subscribeToAppointments(uid, callback, onError) {
    if (!uid) {
        callback([]);
        return () => {};
    }

    return subscribeToQuery(
        query(collection(db, 'appointments'), where('uid', '==', uid)),
        callback,
        onError,
    );
}

export function subscribeToAllAppointments(callback, onError) {
    return subscribeToQuery(collection(db, 'appointments'), callback, onError);
}

export function subscribeToDoctorAppointments(doctorName, callback, onError) {
    if (!doctorName) {
        callback([]);
        return () => {};
    }

    return subscribeToQuery(
        query(collection(db, 'appointments'), where('doctor', '==', doctorName)),
        callback,
        onError,
    );
}

export function updateAppointment(id, changes) {
    return updateDoc(doc(db, 'appointments', id), changes);
}
