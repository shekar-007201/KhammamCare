import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.js';
import { doctors as seedDoctors, hospitals as seedHospitals } from './data.js';

export const emergencyFacilities = [
    { name: 'Government General Hospital Khammam Emergency', type: '24-hour hospital', phone: '08742 224455', address: 'Wyra Road, Khammam', action: 'tel:08742224455' },
    { name: 'Khammam Ambulance Service', type: 'Ambulance', phone: '108', address: 'Emergency response across Khammam', action: 'tel:108' },
    { name: 'Red Cross Blood Bank Khammam', type: 'Blood bank', phone: '08742 224477', address: 'Khammam, Telangana', action: 'tel:08742224477' },
    { name: 'Telangana Emergency Services', type: 'Ambulance', phone: '108', address: '24-hour emergency helpline', action: 'tel:108' },
];

const normalizeDoctors = snapshot => snapshot.docs.map(item => {
    const data = item.data();
    return [data.name, data.speciality, data.hospital, item.id];
}).filter(doctor => doctor[0] && doctor[1] && doctor[2]);

const normalizeHospitals = snapshot => snapshot.docs.map(item => {
    const data = item.data();
    return [data.name, data.type || 'Hospital', data.address || '', data.mapUrl || '', data.area || '', data.open24Hours === true, item.id];
}).filter(hospital => hospital[0]);

export function useDirectory() {
    const [doctors, setDoctors] = useState(seedDoctors);
    const [hospitals, setHospitals] = useState(seedHospitals.map(hospital => [...hospital, '', false, '']));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [doctorLoaded, setDoctorLoaded] = useState(false);
    const [hospitalLoaded, setHospitalLoaded] = useState(false);

    useEffect(() => {
        const doctorUnsubscribe = onSnapshot(collection(db, 'doctors'), snapshot => {
            setDoctors(snapshot.empty ? seedDoctors : normalizeDoctors(snapshot));
            setDoctorLoaded(true);
        }, firestoreError => {
            console.error(firestoreError);
            setError('Directory is offline. Showing the last bundled directory while you reconnect.');
            setDoctorLoaded(true);
        });
        const hospitalUnsubscribe = onSnapshot(collection(db, 'hospitals'), snapshot => {
            setHospitals(snapshot.empty ? seedHospitals.map(hospital => [...hospital, '', false, '']) : normalizeHospitals(snapshot));
            setHospitalLoaded(true);
        }, firestoreError => {
            console.error(firestoreError);
            setError('Hospital directory is offline. Showing the last bundled directory while you reconnect.');
            setHospitalLoaded(true);
        });
        return () => {
            doctorUnsubscribe();
            hospitalUnsubscribe();
        };
    }, []);

    useEffect(() => {
        if (doctorLoaded && hospitalLoaded) setLoading(false);
    }, [doctorLoaded, hospitalLoaded]);

    return { doctors, hospitals, emergencyFacilities, loading, error };
}