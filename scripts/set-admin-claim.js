import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
    const auth = getAuth(app);
    const adminUser = await auth.getUserByEmail(email);
    let pageToken;

    do {
        const page = await auth.listUsers(1000, pageToken);

        for (const user of page.users) {
            if (user.uid === adminUser.uid || user.customClaims?.admin !== true) continue;

            const { admin, ...remainingClaims } = user.customClaims;
            await auth.setCustomUserClaims(user.uid, remainingClaims);
            await auth.revokeRefreshTokens(user.uid);
            console.log(`Revoked the admin claim from ${user.email || user.uid}.`);
        }

        pageToken = page.pageToken;
    } while (pageToken);

    await auth.setCustomUserClaims(adminUser.uid, {
        ...adminUser.customClaims,
        admin: true,
    });
    await getFirestore(app).doc('privateConfig/admin').set({
        uid: adminUser.uid,
        email: adminUser.email,
    });
    console.log(`Set ${email} as the sole administrator. Sign out and sign back in to refresh the token.`);
} catch (error) {
    console.error(`Could not configure the sole administrator: ${error.message}`);
    process.exitCode = 1;
}