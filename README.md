# KhammamCare — React + Firebase

React + Vite hospital appointment student project for Khammam.

## Features
- React + Vite UI
- Hospital and doctor directory
- Search and filters
- Google Maps location links
- Firebase Email/Password Authentication
- Firestore appointment storage with protected security rules
- Atomic doctor/date/time slot reservations
- Patient appointment history at `/appointments`
- Patient cancellation, rescheduling, and completed-visit ratings
- Admin dashboard at `/admin` with Firebase admin-claim protection and hospital filtering
- English/Telugu navigation and booking labels
- Emergency ambulance, blood-bank, and 24-hour hospital contacts
- Firestore-backed directory management with an offline migration fallback
- Specialty, area, and open-now filters
- Installable PWA shell with offline page caching
- Demo payment before appointment confirmation
- Appointment token generation
- Responsive UI

## Run
```bash
npm install
npm run test
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the Firebase web-app values before running locally. `.env.local` is ignored by Git.

## Firebase setup
1. Create a Firebase project.
2. Enable Authentication → Sign-in method → Email/Password.
3. Create Firestore Database.
4. Deploy the included rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`.
5. Firebase web configuration is loaded from Vite environment variables in `.env.local`.

Appointments are saved to `appointments`; slot locks are saved to `slotReservations`; ratings are saved to `ratings`.

Doctors and hospitals are read from the Firestore collections `doctors` and `hospitals`. Until those collections are seeded, the app shows the bundled migration fallback from `src/data.js`; use the protected admin directory panel to add new Firestore records. Emergency contacts are ready to move into `emergencyFacilities` when an admin-managed emergency directory is needed.

## Admin access
The dashboard requires a Firebase Authentication custom claim named `admin` with value `true`. Set it from a trusted Firebase Admin SDK script, then sign out and back in so the browser receives a fresh ID token. Do not grant this claim from client-side code.

## Notifications and payments
New bookings include a `notification` outbox payload with the patient's email and phone and `status: "pending"`. Connect a trusted Firebase Cloud Function or the Firebase Trigger Email extension to deliver email/SMS confirmations and update that status. Provider API keys must stay in server-side environment variables; never put them in `src/`.

Payment is intentionally marked `paymentProvider: "demo"`. The next production step is a server-created Razorpay Test Mode order, followed by server-side signature verification and a webhook update. A Razorpay key must not be embedded in the React bundle.

## Deploy to Firebase Hosting
Install and authenticate the Firebase CLI, then run:

```bash
npm run build
firebase login
firebase use khammamcare-575c5
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

The expected Hosting URL is `https://khammamcare-575c5.web.app` after the first successful deployment. Replace the pending link below with the actual URL shown by Firebase:

**Live site:** deployment pending

## Mobile and PWA checks
Run `npm run build` and serve `dist` over HTTPS (or localhost), then open browser DevTools → Application to verify the manifest and service worker. Test at least 360px wide and 390px wide viewports, including the navigation menu, filters, booking form, emergency call links, and `/appointments`.

## Screenshots
Add current screenshots here after running the app locally. Recommended viva captures:

- `docs/screenshots/home-mobile.png`
- `docs/screenshots/emergency-and-filters.png`
- `docs/screenshots/admin-directory.png`

## Important
Payment is a demo only. No real money is charged. Production use would require secure backend rules, real doctor availability, admin workflows, privacy/security controls, and a real payment gateway.

## Latest UI upgrade
- Added hospital cover photos and doctor profile-style photos using remote Unsplash images.
- The doctor images are illustrative profile photos and are not claimed to be the actual people named in the directory. Get written permission from each doctor or hospital before replacing them with real patient/doctor photos.
- Added selectable demo payment modes: UPI, Card and Net Banking.
- Selected payment mode is saved with each Firestore appointment.
- Payment remains demo-only; no real money is charged.
