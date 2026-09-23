# KhammamCare — React + Firebase

React + Vite hospital appointment student project for Khammam.

## Features
- React + Vite UI
- Hospital and doctor directory
- Search and filters
- Google Maps location links
- Firebase Email/Password Authentication
- Firestore appointment storage
- Demo payment before appointment confirmation
- Appointment token generation
- Responsive UI

## Run
```bash
npm install
npm run dev
```

## Firebase setup
1. Create a Firebase project.
2. Enable Authentication → Sign-in method → Email/Password.
3. Create Firestore Database.
4. For college/demo testing, test mode can be used temporarily. Before production, replace it with proper Firestore security rules.
5. Firebase web configuration is stored in `src/firebase.js`.

Appointments are saved to the Firestore collection named `appointments`.

## Important
Payment is a demo only. No real money is charged. Production use would require secure backend rules, real doctor availability, admin workflows, privacy/security controls, and a real payment gateway.

## Latest UI upgrade
- Added hospital cover photos and doctor profile-style photos using remote Unsplash images.
- The doctor images are illustrative profile photos and are not claimed to be the actual people named in the directory.
- Added selectable demo payment modes: UPI, Card and Net Banking.
- Selected payment mode is saved with each Firestore appointment.
- Payment remains demo-only; no real money is charged.
