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
- Open the complete shipment record and status history by selecting its PRO # in the shipment list
- Update shipment status
- Editable spreadsheet view with PRO sorting
- Excel import/export using the shipment-record template columns
- Delete shipment
- Delete one or multiple selected shipments, or delete all shipments with confirmation
- Track template fields for PRO, consignee, bill of lading, container, size, description, shipping line, contract, port, client, entry number, duties, paid, shipper, origin, weight, ETA, status, gatepass, delivery location, notes, and timestamps
- Import the shipment-record template or a standard shipment workbook
- View all shipment columns in the dashboard and spreadsheet view
- Download a blank Excel import template or export all current shipments to Excel
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

## Free hosted deployment

The Render Blueprint in `render.yaml` creates a free Node web service. Free web services sleep when idle, so the first request after inactivity may take longer to load. Render's free Postgres databases expire after 30 days, so use a free external PostgreSQL provider such as Neon for shipment data.

1. Create a PostgreSQL database and copy its connection string (`DATABASE_URL`).
2. In Render, create a Blueprint from this private GitHub repository.
3. Set the requested `DATABASE_URL` and a strong `ADMIN_PASSWORD` in Render's environment settings. Never commit either secret.
4. Deploy. The app initializes its database and imports the sample shipments on first start.

Shipment management requires the admin password. Public tracking responses omit sender, receiver, and internal notes.

## Important

For local development, the app uses `server/data/shipments.json`. In production it requires `DATABASE_URL` and `ADMIN_PASSWORD`; the JSON file is not used as hosted storage.
