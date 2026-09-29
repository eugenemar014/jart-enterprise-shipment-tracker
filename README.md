# JART ENTERPRISE — Shipment Tracker

A complete local shipment-tracking web application built with React, Vite, Express, and a JSON file database.

## Requirements
- Node.js 18+ (Node.js 20+ recommended)
- Visual Studio Code or another code editor

## Run the project

1. Extract/open this folder in Visual Studio Code.
2. Open the integrated terminal.
3. Run:

```bash
npm install
npm run dev
```

4. Open:
   http://localhost:5173

The backend runs on:
http://localhost:4000

## Included features

- Shipment dashboard
- Total / In Transit / Delivered / Pending / Delayed counters
- Create shipment
- Automatic JART tracking number
- Search and filter shipments
- Public tracking search
- Shipment details
- Shipment history timeline
- Update shipment status
- Delete shipment
- Responsive desktop/tablet/mobile layout
- Local JSON persistence in `server/data/shipments.json`

## Default sample tracking numbers

- JART-2026-0001
- JART-2026-0002

## Build for production

```bash
npm run build
npm start
```

Then open:
http://localhost:4000

## Important

This starter project is intended for local development. For a production deployment, replace the JSON database with PostgreSQL/MySQL/MongoDB, add authentication and authorization, validate all input on the server, add audit logs, and configure HTTPS.
