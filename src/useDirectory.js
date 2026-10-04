import { doctors as seedDoctors, hospitals as seedHospitals } from './data.js';

export const emergencyFacilities = [
    { name: 'Government General Hospital Khammam Emergency', type: '24-hour hospital', phone: '08742 224455', address: 'Wyra Road, Khammam', action: 'tel:08742224455' },
    { name: 'Khammam Ambulance Service', type: 'Ambulance', phone: '108', address: 'Emergency response across Khammam', action: 'tel:108' },
    { name: 'Red Cross Blood Bank Khammam', type: 'Blood bank', phone: '08742 224477', address: 'Khammam, Telangana', action: 'tel:08742224477' },
    { name: 'Telangana Emergency Services', type: 'Ambulance', phone: '108', address: '24-hour emergency helpline', action: 'tel:108' },
];

export function useDirectory() {
    const hospitals = seedHospitals.map(hospital => [...hospital, '', false, '']);
    return { doctors: seedDoctors, hospitals, emergencyFacilities, loading: false, error: '' };
}