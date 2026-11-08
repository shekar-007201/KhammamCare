# KhammamCare

React + Vite hospital directory and appointment demo for Khammam.

## Features
- Role-based landing page with Firebase-protected admin and doctor sign-in
- Searchable doctor and hospital directory with speciality, area, and open-now filters
- Google Maps location links and emergency contact shortcuts
- Appointment booking with doctor, date, and time selection
- Patient appointment history at `/appointments`, with cancellation, rescheduling, and ratings
- Administrator appointment dashboard at `/admin`, protected by a Firebase custom claim
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
Appointments and demo payment records are stored in Firestore. Patient accounts can read only their own appointments; the admin dashboard can read and update appointment statuses only for accounts with the Firebase `admin` custom claim. Existing appointments previously stored in browser local storage are not automatically migrated. Checkout is simulated; card numbers, CVV, expiry, and UPI IDs are not sent to or stored in Firestore.

Enable Email/Password under Firebase Console → Authentication → Sign-in method. Set the `VITE_FIREBASE_*` values in `.env`, select your Firebase project with the Firebase CLI, and deploy Firestore rules with `firebase deploy --only firestore:rules`.

### Admin and doctor access
Admin and doctor access use Firebase Authentication custom claims; they cannot be granted from the browser. There is no admin registration route. To configure one administrator, authenticate Google Cloud Application Default Credentials as a project administrator and run the admin command with that account's email. The script removes admin claims from other accounts and writes the selected UID to the server-only `privateConfig/admin` document. Firestore rules require both the admin claim and this UID, so old claims alone do not grant access:

```bash
gcloud auth application-default login
npm run set-admin -- admin@example.com
npm run set-doctor -- doctor@example.com
```

The administrator can sign out from the dashboard. The `/admin` route verifies the signed-in Firebase token and redirects accounts without the admin claim to `/admin/login`. Firestore rules also enforce admin-only access independently of the React route. Deploy the rules after configuring Firebase with `firebase deploy --only firestore:rules`.

Alternatively, download a service-account JSON key from Firebase Console → Project settings → Service accounts, store it outside the repository, and set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path before running either command. For PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\serviceAccountKey.json"
npm run set-admin -- admin@example.com
npm run set-doctor -- doctor@example.com
```

The Google identity must have permission to update Firebase Authentication users. After granting the claim, sign out and sign back in. Never put service-account keys in the frontend or commit them to the repository.

## Build
```bash
npm run build
npm run preview
```

The generated `dist` folder can be hosted on a static web host. Configure that host to serve `index.html` for application routes such as `/admin` and `/appointments`.

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
