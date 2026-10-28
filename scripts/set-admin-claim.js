import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = String(process.argv[2] || '').trim();

if (!email) {
    console.error('Usage: npm run set-admin -- <account-email>');
    process.exit(1);
}

const app = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || 'khammamcare-575c5',
});

try {
    const user = await getAuth(app).getUserByEmail(email);
    await getAuth(app).setCustomUserClaims(user.uid, {
        ...user.customClaims,
        admin: true,
    });
    console.log(`Granted the admin claim to ${email}. Sign out and sign back in to refresh the token.`);
} catch (error) {
    console.error(`Could not grant the admin claim: ${error.message}`);
    process.exitCode = 1;
}