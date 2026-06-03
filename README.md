# guesthouse

Guest house management app built with React, TypeScript, Vite, and Firebase.

## Features

- Rooms, bookings, and guests
- Dashboard with occupancy and payments
- Role-based access control
- Mail, SMS templates, and communication history
- Property settings

## Setup

1. Copy `.env.example` to `.env.local` and add your Firebase config.
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run preview` — preview production build
