import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.js';

const emptyDoctor = { name: '', speciality: '', hospital: '' };
const emptyHospital = { name: '', type: '', address: '', area: '', mapUrl: '', open24Hours: false };

export default function DirectoryAdmin() {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [doctor, setDoctor] = useState(emptyDoctor);
  const [hospital, setHospital] = useState(emptyHospital);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribeDoctors = onSnapshot(collection(db, 'doctors'), snapshot => setDoctors(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((first, second) => first.name.localeCompare(second.name))));
    const unsubscribeHospitals = onSnapshot(collection(db, 'hospitals'), snapshot => setHospitals(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((first, second) => first.name.localeCompare(second.name))));
    return () => {
      unsubscribeDoctors();
      unsubscribeHospitals();
    };
  }, []);

  const addDoctor = async event => {
    event.preventDefault();
    try {
      await addDoc(collection(db, 'doctors'), doctor);
      setDoctor(emptyDoctor);
      setMessage('Doctor added to Firestore.');
    } catch (error) {
      console.error(error);
      setMessage('Could not add doctor. Check your admin claim and rules.');
    }
  };

  const addHospital = async event => {
    event.preventDefault();
    try {
      await addDoc(collection(db, 'hospitals'), hospital);
      setHospital(emptyHospital);
      setMessage('Hospital added to Firestore.');
    } catch (error) {
      console.error(error);
      setMessage('Could not add hospital. Check your admin claim and rules.');
    }
  };

  const remove = async (collectionName, id) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      setMessage('Directory record deleted.');
    } catch (error) {
      console.error(error);
      setMessage('Could not delete directory record.');
    }
  };

  return <section className="admin-panel directory-admin">
    <div className="admin-toolbar"><div><h2>Directory records</h2><p>Add or remove doctors and hospitals stored in Firestore.</p></div>{message && <span className="admin-feedback">{message}</span>}</div>
    <div className="directory-forms">
      <form className="directory-form" onSubmit={addDoctor}><h3>Add doctor</h3><input value={doctor.name} onChange={event => setDoctor(current => ({ ...current, name: event.target.value }))} placeholder="Doctor name" required /><input value={doctor.speciality} onChange={event => setDoctor(current => ({ ...current, speciality: event.target.value }))} placeholder="Speciality" required /><input value={doctor.hospital} onChange={event => setDoctor(current => ({ ...current, hospital: event.target.value }))} placeholder="Hospital name" required /><button className="primary-btn">Add doctor</button></form>
      <form className="directory-form" onSubmit={addHospital}><h3>Add hospital</h3><input value={hospital.name} onChange={event => setHospital(current => ({ ...current, name: event.target.value }))} placeholder="Hospital name" required /><input value={hospital.type} onChange={event => setHospital(current => ({ ...current, type: event.target.value }))} placeholder="Hospital type" required /><input value={hospital.area} onChange={event => setHospital(current => ({ ...current, area: event.target.value }))} placeholder="Area" required /><input value={hospital.address} onChange={event => setHospital(current => ({ ...current, address: event.target.value }))} placeholder="Address" required /><input value={hospital.mapUrl} onChange={event => setHospital(current => ({ ...current, mapUrl: event.target.value }))} placeholder="Google Maps URL" /><label className="filter-check"><input type="checkbox" checked={hospital.open24Hours} onChange={event => setHospital(current => ({ ...current, open24Hours: event.target.checked }))} /> Open 24 hours</label><button className="primary-btn">Add hospital</button></form>
    </div>
    <div className="directory-records"><div><h3>Doctors in Firestore ({doctors.length})</h3>{doctors.slice(0, 12).map(item => <div className="directory-record" key={item.id}><span><b>{item.name}</b><small>{item.speciality} · {item.hospital}</small></span><button className="card-link" type="button" onClick={() => remove('doctors', item.id)}>Delete</button></div>)}</div><div><h3>Hospitals in Firestore ({hospitals.length})</h3>{hospitals.slice(0, 12).map(item => <div className="directory-record" key={item.id}><span><b>{item.name}</b><small>{item.area} · {item.address}</small></span><button className="card-link" type="button" onClick={() => remove('hospitals', item.id)}>Delete</button></div>)}</div></div>
  </section>;
}
