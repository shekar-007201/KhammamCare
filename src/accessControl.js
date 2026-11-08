export const ADMIN_EMAIL = 'shekarchapala761@gmail.com';

export function getAuthenticatedRole(claims, uid) {
    if (!claims || typeof uid !== 'string' || !uid) {
        return null;
    }

    // The Firestore admin configuration verifies the sole administrator UID.
    if (claims.admin === true) {
        return 'admin';
    }

    // Doctor access
    if (claims.doctor === true) {
        return typeof claims.doctorName === 'string' &&
            claims.doctorName.trim() ?
            'doctor' :
            'restricted';
    }

    if (claims.accountType === 'doctor') {
        return 'restricted';
    }

    // Patient access
    return 'patient';
}

export function canAccessRole(role, claims, uid) {
    const authenticatedRole = getAuthenticatedRole(claims, uid);

    if (!authenticatedRole || authenticatedRole === 'restricted') {
        return false;
    }

    return authenticatedRole === 'admin' ||
        authenticatedRole === role;
}

export function getDashboardPath(claims, uid) {
    const authenticatedRole = getAuthenticatedRole(claims, uid);

    if (authenticatedRole === 'admin') return '/admin';
    if (authenticatedRole === 'doctor') return '/doctor/dashboard';
    if (authenticatedRole === 'patient') return '/patient/dashboard';

    return '/home';
}