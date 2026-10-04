# KhammamCare

React + Vite hospital directory and appointment demo for Khammam.

## Features
- Searchable doctor and hospital directory with speciality, area, and open-now filters
- Google Maps location links and emergency contact shortcuts
- Appointment booking with doctor, date, and time selection
- Patient appointment history at `/appointments`, with local cancellation, rescheduling, and ratings
- Local appointment dashboard at `/admin`
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
This is a frontend-only demo. Appointments and ratings are stored in the current browser's local storage; they are not synced to other devices and may be lost if browser site data is cleared. There is no login, server, or access control for the local admin page.

Checkout is simulated. No real payment is processed, and the selected payment mode is only recorded as demo data.

## Build
```bash
npm run build
npm run preview
```

The generated `dist` folder can be hosted on a static web host. Configure that host to serve `index.html` for application routes such as `/admin` and `/appointments`.

## Mobile and PWA checks
Serve the production build over HTTPS or localhost, then use browser DevTools → Application to verify the manifest and service worker. Check the navigation menu, filters, booking form, emergency call links, and `/appointments` at mobile widths.

## Image notes
Hospital cover photos and illustrative doctor profile photos use remote Unsplash images. They are not representations of the named doctors; get permission before replacing them with real people’s photos.
