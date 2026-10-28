# KhammamCare

React + Vite hospital directory and appointment demo for Khammam.

## Features
- Searchable doctor and hospital directory with speciality, area, and open-now filters
- Google Maps location links and emergency contact shortcuts
- Appointment booking with doctor, date, and time selection
- Patient appointment history at `/appointments`, with local cancellation, rescheduling, and ratings
- Local appointment dashboard at `/admin`
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
Appointments, ratings, and demo payment records are stored in this browser only. They are not synced to other devices and can be lost when browser site data is cleared. The `/admin` page has no account protection and should only be used as a local demo dashboard. Firebase Authentication is used for email/password accounts, but appointment and payment records are not sent to Firestore.

Checkout is simulated. No real payment is processed. Card numbers, CVV, expiry, and UPI IDs are not sent to or stored in Firestore.

Enable Email/Password under Firebase Console → Authentication → Sign-in method. Set the `VITE_FIREBASE_*` values in `.env`, select your Firebase project with the Firebase CLI, and deploy Firestore rules with `firebase deploy --only firestore:rules`.

### Admin access
Admin access uses a Firebase Authentication custom claim; it cannot be granted from the browser. Install the dependencies, authenticate Google Cloud Application Default Credentials as a project administrator, and grant the claim to the account email:

```bash
gcloud auth application-default login
npm run set-admin -- admin@example.com
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
