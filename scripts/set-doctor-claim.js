import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = String(process.argv[2] || '').trim();

if (!email) {
    console.error('Usage: npm run set-doctor -- <account-email>');
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
        doctor: true,
    });
    console.log(`Granted the doctor claim to ${email}. Sign out and sign back in to refresh the token.`);
} catch (error) {
    console.error(`Could not grant the doctor claim: ${error.message}`);
    process.exitCode = 1;
}
