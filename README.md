# KhammamCare

React + Vite hospital directory and appointment demo for Khammam.

## Features
- Role-based Firebase sign-in and protected Admin, Doctor, and Patient dashboards
- Searchable doctor and hospital directory with speciality, area, and open-now filters
- Google Maps location links and emergency contact shortcuts
- Appointment booking with doctor, date, and time selection
- Patient dashboard at `/patient/dashboard` (legacy `/appointments` route retained), with cancellation, rescheduling, and ratings
- Admin dashboard at `/admin` with appointments, patient, and doctor sections
- Doctor dashboard at `/doctor/dashboard`, limited to appointments assigned to the signed-in doctor
- Login required to continue from appointment booking to checkout
- English/Telugu navigation and booking labels
- Installable PWA shell with offline page caching
- UPI, card, and net banking demo checkout with appointment receipts

## Run
```bash
npm install
npm test
npm run dev
```

## Data and payments
Appointments and demo payment records are stored in Firestore. Patients can read and update only their own permitted appointment fields. Doctors can read appointments assigned to their exact `doctorName` custom claim and update appointment status only. The sole administrator can read authorized application records, manage appointment statuses, and access the existing Patients and Doctors dashboard sections. Existing appointments previously stored in browser local storage are not automatically migrated. Checkout is simulated; card numbers, CVV, expiry, and UPI IDs are not sent to or stored in Firestore.

Enable Email/Password under Firebase Console → Authentication → Sign-in method. Set the `VITE_FIREBASE_*` values in `.env`, select your Firebase project with the Firebase CLI, and deploy Firestore rules and the doctor-access callable with `firebase deploy --only firestore:rules,functions`.

### Admin and doctor access
Admin and doctor access use Firebase Authentication custom claims; they cannot be granted from the browser. There is no admin registration route. To configure the sole administrator, authenticate Google Cloud Application Default Credentials as a project administrator and run the admin command with that account's email. The script removes admin claims from other accounts, sets the matching `adminUid` claim, and writes the selected UID to the server-only `privateConfig/admin` document. Firestore rules require the `admin: true` claim, matching UID, and server-side configuration document:

```bash
gcloud auth application-default login
npm run set-admin -- admin@example.com
npm run set-doctor -- doctor@example.com "Dr. Exact Directory Name"
```

The doctor name is case-sensitive and must exactly match the `doctor` value saved on appointments. The script stores that name in a server-set `doctorName` custom claim and an active server-only doctor-access record; Firestore uses both to scope doctor reads and status updates. Existing doctor accounts must be assigned this claim before doctor dashboard access will work. After deploying Functions, the sole Admin can also create, authorize, reauthorize, and revoke doctor accounts from the Admin Dashboard's Doctors section. New accounts receive a one-time temporary password to share securely; doctors can use the Doctor Login password-reset flow afterward.

The `/admin` and `/doctor/dashboard` routes verify refreshed Firebase claims. The Admin and Doctor login routes are intentionally not linked from the public homepage; their homepage cards open a locked-access dialog. Unauthenticated users are sent to the appropriate login; signed-in users without access see a locked screen. The patient dashboard and booking routes require a normal patient account. Firestore rules independently enforce these permissions, including the configured sole-admin UID, active doctor assignment, patient ownership, and the allowed status changes. Do not rerun or reset the existing Admin account to deploy this change.

Alternatively, download a service-account JSON key from Firebase Console → Project settings → Service accounts, store it outside the repository, and set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path before running either command. For PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\serviceAccountKey.json"
npm run set-admin -- admin@example.com
npm run set-doctor -- doctor@example.com "Dr. Exact Directory Name"
```

The Google identity must have permission to update Firebase Authentication users. After granting the claim, sign out and sign back in. Never put service-account keys in the frontend or commit them to the repository.

## Build
```bash
npm run build
npm run preview
```

The generated `dist` folder can be hosted on a static web host. Configure that host to serve `index.html` for application routes such as `/admin`, `/doctor/dashboard`, and `/patient/dashboard`.

## Netlify
The included `netlify.toml` sets the build command to `npm run build`, publishes `dist`, selects Node 22, rewrites app routes to `index.html`, and provides the public Firebase web app configuration needed by the client build. The local `.env` file remains git-ignored. If you use another Firebase project, override these values under **Site configuration → Environment variables**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

Trigger a new deploy after adding or changing these values.

## Mobile and PWA checks
Serve the production build over HTTPS or localhost, then use browser DevTools → Application to verify the manifest and service worker. Check the navigation menu, filters, booking form, emergency call links, and `/appointments` at mobile widths.

## Image notes
Hospital cover photos and illustrative doctor profile photos use remote Unsplash images. They are not representations of the named doctors; get permission before replacing them with real people’s photos.
