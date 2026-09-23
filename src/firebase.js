import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCs3maJRCQ-APi4PPwzF3HjOdeAehuvR_M",
    authDomain: "khammamcare-575c5.firebaseapp.com",
    projectId: "khammamcare-575c5",
    storageBucket: "khammamcare-575c5.firebasestorage.app",
    messagingSenderId: "357881059461",
    appId: "1:357881059461:web:c8044cd30e1689590331ec",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);