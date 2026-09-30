import express from "express";
import cors from "cors";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "shipments.json");

fs.mkdirSync(dataDir, { recursive: true });

const seedShipments = [
  {
    id: randomUUID(),
    trackingNumber: "JART-2026-0001",
    sender: "JART ENTERPRISE",
    receiver: "Juan Dela Cruz",
    origin: "Manila, Philippines",
    destination: "Cebu City, Philippines",
    packageDescription: "Industrial equipment",
    weight: 24.5,
    estimatedDelivery: "2026-10-02",
    status: "In Transit",
    createdAt: "2026-09-25T08:30:00.000Z",
    updatedAt: "2026-09-28T01:00:00.000Z",
    history: [
      { status: "Shipment Created", location: "Manila Warehouse", timestamp: "2026-09-25T08:30:00.000Z", note: "Shipment information received." },
      { status: "Picked Up", location: "Manila, Philippines", timestamp: "2026-09-25T10:15:00.000Z", note: "Package picked up from sender." },
      { status: "In Transit", location: "Batangas Port", timestamp: "2026-09-28T01:00:00.000Z", note: "Shipment is currently in transit." }
    ]
  },
  {
    id: randomUUID(),
    trackingNumber: "JART-2026-0002",
    sender: "ABC Trading",
    receiver: "Maria Santos",
    origin: "Davao City, Philippines",
    destination: "Manila, Philippines",
    packageDescription: "Documents",
    weight: 2.1,
    estimatedDelivery: "2026-09-30",
    status: "Delivered",
    createdAt: "2026-09-23T02:00:00.000Z",
    updatedAt: "2026-09-27T08:45:00.000Z",
    history: [
      { status: "Shipment Created", location: "Davao Office", timestamp: "2026-09-23T02:00:00.000Z", note: "Shipment information received." },
      { status: "Picked Up", location: "Davao City, Philippines", timestamp: "2026-09-23T04:30:00.000Z", note: "Package collected." },
      { status: "In Transit", location: "Manila Hub", timestamp: "2026-09-26T06:20:00.000Z", note: "Shipment arrived at Manila hub." },
      { status: "Delivered", location: "Manila, Philippines", timestamp: "2026-09-27T08:45:00.000Z", note: "Package delivered successfully." }
    ]
  }
];

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify(seedShipments, null, 2));
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
  : null;

async function readShipments() {
  if (!pool) return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const result = await pool.query("SELECT data FROM shipment_records");
  return result.rows.map(row => row.data);
}

async function writeShipments(data) {
  if (!pool) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM shipment_records");
    for (const shipment of data) {
      await client.query(
        "INSERT INTO shipment_records (tracking_number, data) VALUES ($1, $2)",
        [shipment.trackingNumber, JSON.stringify(shipment)]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initializeStorage() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipment_records (
      tracking_number TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);
  const existing = await pool.query("SELECT 1 FROM shipment_records LIMIT 1");
  if (existing.rowCount === 0) {
    const seeds = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    await writeShipments(seeds);
  }
}

const allowedStatuses = [
  "Shipment Created", "Picked Up", "In Transit", "At Hub",
  "Out for Delivery", "Delivered", "Delayed", "Cancelled"
];

function nextTrackingNumber(shipments) {
  const year = new Date().getFullYear();
  const highestSequence = shipments.reduce((highest, shipment) => {
    const match = shipment.trackingNumber?.match(new RegExp(`^JART-${year}-(\\d+)$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `JART-${year}-${String(highestSequence + 1).padStart(4, "0")}`;
}

function createShipment(input, shipments) {
  const now = new Date().toISOString();
  const status = input.status || "Shipment Created";
  const trackingNumber = String(input.trackingNumber ?? "").trim() || nextTrackingNumber(shipments);
  return {
    id: randomUUID(),
    trackingNumber,
    sender: input.sender,
    receiver: input.receiver,
    contractNumber: input.contractNumber || "",
    clientName: input.clientName || "",
    origin: input.origin,
    destination: input.destination,
    packageDescription: input.packageDescription || "General Cargo",
    weight: Number(input.weight) || 0,
    estimatedDelivery: input.estimatedDelivery,
    duties: input.duties || "",
    gatepass: input.gatepass || "",
    shippingLines: input.shippingLines || "",
    container: input.container || "",
    billOfLading: input.billOfLading || "",
    status,
    createdAt: now,
    updatedAt: now,
    history: [{
      status,
      location: input.location || input.origin,
      timestamp: now,
      note: input.note || (status === "Shipment Created" ? "Shipment has been created." : "Shipment imported from Excel.")
    }]
  };
}

function isValidISODate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

function normalizeExcelDate(value, uses1904Dates) {
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    const serial = value + (uses1904Dates ? 1462 : 0);
    date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  } else {
    const text = String(value ?? "").trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (isoMatch) return isValidISODate(text) ? text : "";
    if (slashMatch) {
      date = new Date(Date.UTC(Number(slashMatch[3]), Number(slashMatch[1]) - 1, Number(slashMatch[2])));
      if (date.toISOString().slice(0, 10) !== `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`) return "";
    } else {
      date = new Date(text);
    }
  }

  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function excelCellValue(value) {
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return value.result;
    if ("text" in value) return value.text;
  }
  return value;
}

const app = express();
app.set("trust proxy", 1);
if (process.env.NODE_ENV !== "production") app.use(cors());
app.use(express.json({ limit: "2mb" }));

const adminPassword = process.env.ADMIN_PASSWORD;
const adminSessions = new Map();
const loginAttempts = new Map();

function requireAdmin(req, res, next) {
  if (process.env.NODE_ENV !== "production") return next();
  const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const expiresAt = token && adminSessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    if (token) adminSessions.delete(token);
    return res.status(401).json({ message: "Admin sign-in required." });
  }
  next();
}

function publicShipment(shipment) {
  return {
    trackingNumber: shipment.trackingNumber,
    origin: shipment.origin,
    destination: shipment.destination,
    status: shipment.status,
    estimatedDelivery: shipment.estimatedDelivery,
    updatedAt: shipment.updatedAt,
    history: (shipment.history || []).map(({ status, location, timestamp }) => ({ status, location, timestamp }))
  };
}

app.post("/api/auth/login", (req, res) => {
  if (!adminPassword) return res.status(503).json({ message: "Admin sign-in is not configured." });
  const key = req.ip;
  const now = Date.now();
  let attempt = loginAttempts.get(key);
  if (!attempt || attempt.expiresAt <= now) {
    attempt = { count: 0, expiresAt: now + 15 * 60 * 1000 };
  }
  if (attempt.count >= 5) return res.status(429).json({ message: "Too many sign-in attempts. Try again later." });

  const candidate = Buffer.from(String(req.body?.password ?? ""));
  const expected = Buffer.from(adminPassword);
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
    loginAttempts.set(key, { ...attempt, count: attempt.count + 1 });
    return res.status(401).json({ message: "Incorrect admin password." });
  }

  loginAttempts.delete(key);
  const token = randomBytes(32).toString("hex");
  adminSessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.json({ token });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/shipments", requireAdmin, async (_req, res) => {
  const shipments = (await readShipments()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(shipments);
});

app.get("/api/shipments/template", requireAdmin, async (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Shipments");
  worksheet.columns = [
    { header: "PRO", key: "trackingNumber", width: 22 },
    { header: "Shipper", key: "sender", width: 24 },
    { header: "Consignee", key: "receiver", width: 24 },
    { header: "Contract Number", key: "contractNumber", width: 24 },
    { header: "Client Name", key: "clientName", width: 24 },
    { header: "Origin", key: "origin", width: 28 },
    { header: "Destination", key: "destination", width: 28 },
    { header: "Package Description", key: "packageDescription", width: 30 },
    { header: "Weight (kg)", key: "weight", width: 14 },
    { header: "Estimated Delivery", key: "estimatedDelivery", width: 20, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Status", key: "status", width: 22 },
    { header: "Current Location", key: "location", width: 28 },
    { header: "Note", key: "note", width: 36 },
    { header: "Duties", key: "duties", width: 18 },
    { header: "Gatepass", key: "gatepass", width: 20 },
    { header: "Shipping Lines", key: "shippingLines", width: 24 },
    { header: "Container", key: "container", width: 22 },
    { header: "Bill of Lading", key: "billOfLading", width: 24 },
    { header: "Created At", key: "createdAt", width: 26 },
    { header: "Last Updated", key: "updatedAt", width: 26 },
    { header: "History (JSON)", key: "historyJson", width: 50 }
  ];
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const shipments = (await readShipments()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  for (const shipment of shipments) {
    const latestEvent = shipment.history?.[shipment.history.length - 1] || {};
    worksheet.addRow({
      ...shipment,
      estimatedDelivery: shipment.estimatedDelivery ? new Date(`${shipment.estimatedDelivery}T00:00:00Z`) : "",
      location: latestEvent.location || "",
      note: latestEvent.note || "",
      historyJson: JSON.stringify(shipment.history || [])
    });
  }
  worksheet.addRow(Array(worksheet.columns.length).fill(""));
  worksheet.autoFilter = `A1:${worksheet.getColumn(worksheet.columns.length).letter}${worksheet.rowCount}`;
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=jart-shipment-records.xlsx");
  res.send(Buffer.from(buffer));
});

app.get("/api/shipments/:trackingNumber", async (req, res) => {
  const tracking = req.params.trackingNumber.toUpperCase();
  const shipment = (await readShipments()).find(s => s.trackingNumber.toUpperCase() === tracking);
  if (!shipment) return res.status(404).json({ message: "Shipment not found." });
  res.json(publicShipment(shipment));
});

app.post(
  "/api/shipments/import",
  requireAdmin,
  express.raw({ type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", limit: "10mb" }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: "Choose a non-empty Excel workbook (.xlsx)." });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.body);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) return res.status(400).json({ message: "The workbook has no worksheets." });

      const columns = new Map();
      worksheet.getRow(1).eachCell((cell, columnNumber) => {
        const key = String(cell.value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (key) columns.set(key, columnNumber);
      });

      const missingColumns = ["origin", "destination", "estimateddelivery"].filter(column => !columns.has(column));
      if (!columns.has("shipper") && !columns.has("sender")) missingColumns.unshift("shipper");
      if (!columns.has("consignee") && !columns.has("receiver")) missingColumns.unshift("consignee");
      if (missingColumns.length) {
        return res.status(400).json({ message: `Missing required columns: ${missingColumns.join(", ")}.` });
      }

      const shipments = await readShipments();
      const existingTrackingNumbers = new Set(shipments.map(shipment => shipment.trackingNumber.toUpperCase()));
      const pendingTrackingNumbers = new Set();
      const rows = [];
      let skipped = 0;
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const getValue = key => {
          const columnNumber = columns.get(key);
          return columnNumber ? excelCellValue(row.getCell(columnNumber).value) : undefined;
        };
        const values = [...columns.values()].map(columnNumber => row.getCell(columnNumber).value);
        if (values.every(value => value === null || value === undefined || String(value).trim() === "")) continue;

        const trackingNumber = String(getValue("pro") ?? getValue("trackingnumber") ?? "").trim();
        if (trackingNumber) {
          if (existingTrackingNumbers.has(trackingNumber.toUpperCase())) {
            skipped += 1;
            continue;
          }
          if (pendingTrackingNumbers.has(trackingNumber.toUpperCase())) {
            return res.status(400).json({ message: `Row ${rowNumber}: Tracking Number is duplicated in this workbook.` });
          }
          pendingTrackingNumbers.add(trackingNumber.toUpperCase());
        }

        const input = {
          trackingNumber,
          sender: String(getValue("shipper") ?? getValue("sender") ?? "").trim(),
          receiver: String(getValue("consignee") ?? getValue("receiver") ?? "").trim(),
          contractNumber: String(getValue("contractnumber") ?? "").trim(),
          clientName: String(getValue("clientname") ?? "").trim(),
          origin: String(getValue("origin") ?? "").trim(),
          destination: String(getValue("destination") ?? "").trim(),
          packageDescription: String(getValue("packagedescription") ?? "").trim(),
          weight: getValue("weightkg") ?? getValue("weight") ?? 0,
          estimatedDelivery: normalizeExcelDate(getValue("estimateddelivery"), workbook.properties.date1904),
          status: String(getValue("status") ?? "").trim() || "Shipment Created",
          location: String(getValue("currentlocation") ?? "").trim(),
          note: String(getValue("note") ?? "").trim(),
          duties: String(getValue("duties") ?? "").trim(),
          gatepass: String(getValue("gatepass") ?? getValue("gatepassed") ?? "").trim(),
          shippingLines: String(getValue("shippinglines") ?? getValue("shippingline") ?? "").trim(),
          container: String(getValue("container") ?? "").trim(),
          billOfLading: String(getValue("billoflading") ?? getValue("billofladingnumber") ?? "").trim()
        };

        for (const field of ["sender", "receiver", "origin", "destination", "estimatedDelivery"]) {
          if (!input[field]) return res.status(400).json({ message: `Row ${rowNumber}: ${field} is required.` });
        }
        if (!isValidISODate(input.estimatedDelivery)) {
          return res.status(400).json({ message: `Row ${rowNumber}: Estimated Delivery must be a valid date.` });
        }
        input.weight = Number(input.weight);
        if (!Number.isFinite(input.weight) || input.weight < 0) {
          return res.status(400).json({ message: `Row ${rowNumber}: Weight must be a non-negative number.` });
        }
        if (!allowedStatuses.includes(input.status)) {
          return res.status(400).json({ message: `Row ${rowNumber}: Status is not recognized.` });
        }
        rows.push(input);
        if (rows.length > 1000) return res.status(400).json({ message: "Import limit is 1,000 shipments per workbook." });
      }

      if (!rows.length && !skipped) return res.status(400).json({ message: "The worksheet contains no shipment rows." });

      const imported = [];
      for (const input of rows) {
        const shipment = createShipment(input, [...shipments, ...imported]);
        imported.push(shipment);
      }
      if (imported.length) await writeShipments([...shipments, ...imported]);
      res.status(imported.length ? 201 : 200).json({ imported: imported.length, skipped, shipments: imported });
    } catch {
      res.status(400).json({ message: "Could not read the workbook. Use a valid .xlsx file." });
    }
  }
);

app.post("/api/shipments", requireAdmin, async (req, res) => {
  const {
    sender, receiver, origin, destination, packageDescription,
    weight, estimatedDelivery, duties, gatepass, shippingLines, container,
    billOfLading, trackingNumber, contractNumber, clientName
  } = req.body;

  if (!sender || !receiver || !origin || !destination || !estimatedDelivery) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }

  const shipments = await readShipments();
  if (trackingNumber && shipments.some(shipment => shipment.trackingNumber.toUpperCase() === String(trackingNumber).trim().toUpperCase())) {
    return res.status(409).json({ message: "That tracking number is already in use." });
  }
  const shipment = createShipment({
    sender,
    receiver,
    origin,
    destination,
    packageDescription,
    weight,
    estimatedDelivery,
    duties,
    gatepass,
    shippingLines,
    container,
    billOfLading,
    trackingNumber,
    contractNumber,
    clientName
  }, shipments);

  shipments.push(shipment);
  await writeShipments(shipments);
  res.status(201).json(shipment);
});

app.patch("/api/shipments/:trackingNumber", requireAdmin, async (req, res) => {
  const shipments = await readShipments();
  const index = shipments.findIndex(
    shipment => shipment.trackingNumber.toUpperCase() === req.params.trackingNumber.toUpperCase()
  );
  if (index === -1) return res.status(404).json({ message: "Shipment not found." });

  const shipment = shipments[index];
  const textValue = (field, existing = "") => String(req.body[field] ?? existing).trim();
  const trackingNumber = textValue("trackingNumber", shipment.trackingNumber);
  const sender = textValue("sender", shipment.sender);
  const receiver = textValue("receiver", shipment.receiver);
  const origin = textValue("origin", shipment.origin);
  const destination = textValue("destination", shipment.destination);
  const estimatedDelivery = textValue("estimatedDelivery", shipment.estimatedDelivery);
  const status = textValue("status", shipment.status);
  const weight = Number(req.body.weight ?? shipment.weight);

  if (!trackingNumber || !sender || !receiver || !origin || !destination || !estimatedDelivery) {
    return res.status(400).json({ message: "Tracking number, sender, receiver, origin, destination, and delivery date are required." });
  }
  if (!isValidISODate(estimatedDelivery)) {
    return res.status(400).json({ message: "Estimated Delivery must be a valid date." });
  }
  if (!Number.isFinite(weight) || weight < 0) {
    return res.status(400).json({ message: "Weight must be a non-negative number." });
  }
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid shipment status." });
  }
  if (shipments.some((item, itemIndex) => itemIndex !== index && item.trackingNumber.toUpperCase() === trackingNumber.toUpperCase())) {
    return res.status(409).json({ message: "That tracking number is already in use." });
  }

  const previousStatus = shipment.status;
  const location = textValue("location");
  const note = textValue("note");
  Object.assign(shipment, {
    trackingNumber,
    sender,
    receiver,
    origin,
    destination,
    packageDescription: textValue("packageDescription", shipment.packageDescription || "General Cargo") || "General Cargo",
    weight,
    estimatedDelivery,
    duties: textValue("duties", shipment.duties),
    gatepass: textValue("gatepass", shipment.gatepass),
    shippingLines: textValue("shippingLines", shipment.shippingLines),
    container: textValue("container", shipment.container),
    billOfLading: textValue("billOfLading", shipment.billOfLading),
    contractNumber: textValue("contractNumber", shipment.contractNumber),
    clientName: textValue("clientName", shipment.clientName),
    status,
    updatedAt: new Date().toISOString()
  });

  if (status !== previousStatus || location || note) {
    shipment.history.push({
      status,
      location: location || destination,
      timestamp: shipment.updatedAt,
      note: note || (status !== previousStatus ? `Shipment status updated to ${status}.` : "Shipment details updated.")
    });
  }

  await writeShipments(shipments);
  res.json(shipment);
});

app.patch("/api/shipments/:trackingNumber/status", requireAdmin, async (req, res) => {
  const { status, location, note } = req.body;
  const allowed = ["Shipment Created", "Picked Up", "In Transit", "At Hub", "Out for Delivery", "Delivered", "Delayed", "Cancelled"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid shipment status." });
  }

  const shipments = await readShipments();
  const index = shipments.findIndex(
    s => s.trackingNumber.toUpperCase() === req.params.trackingNumber.toUpperCase()
  );

  if (index === -1) return res.status(404).json({ message: "Shipment not found." });

  const now = new Date().toISOString();
  shipments[index].status = status;
  shipments[index].updatedAt = now;
  shipments[index].history.push({
    status,
    location: location || shipments[index].destination,
    timestamp: now,
    note: note || `Shipment status updated to ${status}.`
  });

  await writeShipments(shipments);
  res.json(shipments[index]);
});

app.delete("/api/shipments/:trackingNumber", requireAdmin, async (req, res) => {
  const shipments = await readShipments();
  const filtered = shipments.filter(
    s => s.trackingNumber.toUpperCase() !== req.params.trackingNumber.toUpperCase()
  );

  if (filtered.length === shipments.length) {
    return res.status(404).json({ message: "Shipment not found." });
  }

  await writeShipments(filtered);
  res.json({ message: "Shipment deleted." });
});

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV === "production" && (!adminPassword || !pool)) {
  throw new Error("Production requires ADMIN_PASSWORD and DATABASE_URL.");
}

initializeStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`JART Shipment Tracker API running on port ${PORT}`);
  });
}).catch(error => {
  console.error("Could not initialize shipment storage:", error);
  process.exit(1);
});