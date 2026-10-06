export function getVerificationStatus(user) {
    if (!user) return null;

    const isPasswordUser = user.providerData?.some(
        (provider) => provider.providerId === 'password',
    );

    if (isPasswordUser && user.emailVerified) {
        return 'Verification complete.';
    }

    return null;
}
