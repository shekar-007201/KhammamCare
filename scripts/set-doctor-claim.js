import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const email = String(process.argv[2] || '').trim();
const doctorName = String(process.argv[3] || '').trim();

if (!email || !doctorName) {
    console.error('Usage: npm run set-doctor -- <account-email> "<exact doctor name>"');
    process.exit(1);
}

const app = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || 'khammamcare-575c5',
});

try {
    const auth = getAuth(app);
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, {
        ...user.customClaims,
        accountType: 'doctor',
        doctor: true,
        doctorName,
    });
    await getFirestore(app).doc(`privateConfig/admin/doctors/${user.uid}`).set({
        uid: user.uid,
        email: user.email,
        doctorName,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`Granted the doctor claim for ${doctorName} to ${email}. Sign out and sign back in to refresh the token.`);
} catch (error) {
    console.error(`Could not grant the doctor claim: ${error.message}`);
    process.exitCode = 1;
}
