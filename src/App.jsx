import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Package, Search, Plus, LayoutDashboard, Truck, CheckCircle2,
  Clock3, MapPin, ArrowRight, RefreshCw, X, Trash2, Edit3,
  Menu, Box, AlertTriangle, XCircle, Upload, Download, FileSpreadsheet, Eye, Table2
} from "lucide-react";
import { SHIPMENT_COLUMNS, getShipmentColumnValue } from "./shipmentColumns.js";

const API = "/api";
const ADMIN_SESSION_KEY = "jart-admin-session";

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API}${path}`, { ...options, headers });
}

async function downloadWorkbook(event, endpoint, filename) {
  event.preventDefault();
  try {
    const response = await apiFetch(endpoint);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Unable to download the workbook.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message || "Unable to download the workbook.");
  }
}

function downloadTemplate(event) {
  return downloadWorkbook(event, "/shipments/template", "jart-shipment-records-template.xlsx");
}

function downloadExport(event) {
  return downloadWorkbook(event, "/shipments/export", "jart-shipment-records.xlsx");
}

const STATUS_OPTIONS = [
  "Shipment Created", "Picked Up", "In Transit", "At Hub",
  "Out for Delivery", "Delivered", "Delayed", "Cancelled"
];

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function displayColumnValue(shipment, column) {
  const value = getShipmentColumnValue(shipment, column);
  if (value === "" || value === null || value === undefined) return "—";
  if (column.type === "date" || column.type === "dateTime") {
    return column.type === "dateTime" ? formatDate(value) : new Date(value).toLocaleDateString("en-PH");
  }
  if (column.key === "weight") return `${value} kg`;
  return value;
}

function statusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function StatusBadge({ status }) {
  return <span className={`badge ${statusClass(status)}`}>{status}</span>;
}

function StatCard({ icon, label, value, onClick }) {
  return (
    <button className="stat-card" onClick={onClick}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </button>
  );
}

function Modal({ title, children, onClose, wide = false, spreadsheet = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal${wide ? " modal-wide" : ""}${spreadsheet ? " modal-spreadsheet" : ""}`} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateShipment({ onClose, onCreated }) {
  const [form, setForm] = useState({
    sender: "", receiver: "", origin: "", destination: "",
    packageDescription: "", weight: "", estimatedDelivery: "",
    size: "", port: "", paid: "", entryNumber: "",
    duties: "", gatepass: "", shippingLines: "", container: "",
    billOfLading: "", trackingNumber: "", contractNumber: "", clientName: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to create shipment.");
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create New Shipment" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>Shipper *<input name="sender" value={form.sender} onChange={update} required placeholder="Shipper name/company" /></label>
          <label>Consignee *<input name="receiver" value={form.receiver} onChange={update} required placeholder="Consignee name/company" /></label>
          <label>Contract Number<input name="contractNumber" value={form.contractNumber} onChange={update} /></label>
          <label>Client<input name="clientName" value={form.clientName} onChange={update} /></label>
          <label>Entry #<input name="entryNumber" value={form.entryNumber} onChange={update} /></label>
          <label>Origin *<input name="origin" value={form.origin} onChange={update} required placeholder="e.g. Manila Warehouse" /></label>
          <label>Port *<input name="destination" value={form.destination} onChange={update} required placeholder="e.g. Cebu City" /></label>
          <label>Origin Port<input name="port" value={form.port} onChange={update} placeholder="Port of origin" /></label>
          <label>Description<input name="packageDescription" value={form.packageDescription} onChange={update} placeholder="Documents, equipment, cargo..." /></label>
          <label>Weight (kg)<input type="number" min="0" step="0.01" name="weight" value={form.weight} onChange={update} placeholder="0.00" /></label>
          <label>Size<input name="size" value={form.size} onChange={update} placeholder="e.g. 1X40" /></label>
          <label>ETA *<input type="date" name="estimatedDelivery" value={form.estimatedDelivery} onChange={update} required /></label>
          <label>Duties<input name="duties" value={form.duties} onChange={update} placeholder="Duty amount or reference" /></label>
          <label>Paid<input name="paid" value={form.paid} onChange={update} /></label>
          <label>Gatepass<input name="gatepass" value={form.gatepass} onChange={update} placeholder="Gatepass number or status" /></label>
          <label className="full">S/L<input name="shippingLines" value={form.shippingLines} onChange={update} placeholder="Shipping line" /></label>
          <label>Container<input name="container" value={form.container} onChange={update} placeholder="Container number" /></label>
          <label>Bill of Lading<input name="billOfLading" value={form.billOfLading} onChange={update} placeholder="Bill of lading number" /></label>
          <label className="full">Tracking Number<input name="trackingNumber" value={form.trackingNumber} onChange={update} placeholder="Leave blank to generate automatically" /></label>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={saving}>{saving ? "Creating..." : "Create Shipment"}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditShipmentModal({ shipment, onClose, onUpdated }) {
  const [form, setForm] = useState({
    trackingNumber: shipment.trackingNumber,
    sender: shipment.sender,
    receiver: shipment.receiver,
    origin: shipment.origin,
    destination: shipment.destination,
    packageDescription: shipment.packageDescription || "",
    weight: shipment.weight ?? 0,
    size: shipment.size || shipment.containerSize || "",
    estimatedDelivery: shipment.estimatedDelivery,
    port: shipment.port || "",
    original: shipment.original || "",
    entryNumber: shipment.entryNumber || shipment.original || "",
    duties: shipment.duties || "",
    paid: shipment.paid || "",
    gatepass: shipment.gatepass || "",
    shippingLines: shipment.shippingLines || "",
    container: shipment.container || "",
    billOfLading: shipment.billOfLading || "",
    contractNumber: shipment.contractNumber || "",
    clientName: shipment.clientName || "",
    status: shipment.status
  });
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = e => setForm(previous => ({ ...previous, [e.target.name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`/shipments/${encodeURIComponent(shipment.trackingNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, location, note })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update shipment.");
      onUpdated(data, shipment.trackingNumber);
      onClose();
    } catch (err) {
      setError(err.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit Shipment" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>Tracking Number *<input name="trackingNumber" value={form.trackingNumber} onChange={update} required /></label>
          <label>Status<select name="status" value={form.status} onChange={update}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Shipper *<input name="sender" value={form.sender} onChange={update} required /></label>
          <label>Consignee *<input name="receiver" value={form.receiver} onChange={update} required /></label>
          <label>Contract Number<input name="contractNumber" value={form.contractNumber} onChange={update} /></label>
          <label>Client<input name="clientName" value={form.clientName} onChange={update} /></label>
          <label>Entry #<input name="entryNumber" value={form.entryNumber} onChange={update} /></label>
          <label>Origin *<input name="origin" value={form.origin} onChange={update} required /></label>
          <label>Port *<input name="destination" value={form.destination} onChange={update} required /></label>
          <label>Description<input name="packageDescription" value={form.packageDescription} onChange={update} /></label>
          <label>Weight (kg)<input type="number" min="0" step="0.01" name="weight" value={form.weight} onChange={update} /></label>
          <label>Size<input name="size" value={form.size} onChange={update} /></label>
          <label>Origin Port<input name="port" value={form.port} onChange={update} /></label>
          <label>ETA *<input type="date" name="estimatedDelivery" value={form.estimatedDelivery} onChange={update} required /></label>
          <label>Duties<input name="duties" value={form.duties} onChange={update} /></label>
          <label>Paid<input name="paid" value={form.paid} onChange={update} /></label>
          <label>Gatepass<input name="gatepass" value={form.gatepass} onChange={update} /></label>
          <label>S/L<input name="shippingLines" value={form.shippingLines} onChange={update} /></label>
          <label>Container<input name="container" value={form.container} onChange={update} /></label>
          <label>Bill of Lading<input name="billOfLading" value={form.billOfLading} onChange={update} /></label>
        </div>
        <label>Delivery Location<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Manila Hub" /></label>
        <label>Note<textarea value={note} onChange={e => setNote(e.target.value)} rows="3" placeholder="Optional tracking note" /></label>
        {error && <div className="error-box">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ExcelImport({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/shipments/import", {
        method: "POST",
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        body: file
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to import this workbook.");
      onImported(data.shipments, data.skipped);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to import this workbook.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Import from Excel" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="file-input-label">Excel workbook (.xlsx)
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={e => { setFile(e.target.files?.[0] || null); setError(""); }}
            required
          />
        </label>
        {file && <div className="selected-file"><FileSpreadsheet size={17}/><span>{file.name}</span></div>}
        <p className="form-hint">Import the shipment template or a standard shipment workbook. PRO values are preserved exactly; existing PRO numbers are skipped. New rows with a blank PRO receive an assigned number.</p>
        <div className="template-download"><a href="#" onClick={downloadTemplate}><Download size={15}/> Download latest shipment workbook</a></div>
        {error && <div className="error-box">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={!file || saving}>
            <Upload size={16}/>{saving ? "Importing..." : "Import Shipments"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TrackingResult({ shipment, onClose }) {
  if (!shipment) return null;
  return (
    <div className="tracking-panel">
      <div className="tracking-top">
        <div>
          <div className="eyebrow">Tracking Number</div>
          <h2>{shipment.trackingNumber}</h2>
        </div>
        <button className="icon-button" onClick={onClose}><X size={20}/></button>
      </div>

      <div className="current-status">
        <div>
          <div className="muted">Current Status</div>
          <StatusBadge status={shipment.status} />
        </div>
        <div className="route">
          <span>{shipment.origin || shipment.port || "—"}</span><ArrowRight size={18}/><span>{shipment.destination || "—"}</span>
        </div>
      </div>

      <div className="details-grid">
        <div><span>ETA</span><strong>{shipment.estimatedDelivery}</strong></div>
        <div><span>Last Updated</span><strong>{formatDate(shipment.updatedAt)}</strong></div>
      </div>

      <h3 className="section-title">Shipment History</h3>
      <div className="timeline">
        {[...shipment.history].reverse().map((item, index) => (
          <div className="timeline-item" key={`${item.timestamp}-${index}`}>
            <div className="timeline-dot"><CheckCircle2 size={14}/></div>
            <div className="timeline-content">
              <div className="timeline-heading"><strong>{item.status}</strong><span>{formatDate(item.timestamp)}</span></div>
              <div className="timeline-location"><MapPin size={14}/> {item.location}</div>
              {item.note && <p>{item.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShipmentViewModal({ shipment, onClose }) {
  const fields = SHIPMENT_COLUMNS
    .map(column => ({
      key: column.key,
      label: column.header,
      value: displayColumnValue(shipment, column)
    }));

  return (
    <Modal title={`Shipment ${shipment.trackingNumber}`} onClose={onClose} wide>
      <div className="details-grid full-shipment-details">
        {fields.map(({ key, label, value }) => <div key={key}><span>{label}</span><strong>{value || "—"}</strong></div>)}
      </div>
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function ShipmentSpreadsheetModal({ shipments, onClose, onUpdated }) {
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState("");
  const [errors, setErrors] = useState({});

  function currentValue(shipment, column) {
    const edited = edits[shipment.id] || {};
    return edited[column.key] ?? getShipmentColumnValue(shipment, column) ?? "";
  }

  function setCell(shipment, key, value) {
    setEdits(previous => ({
      ...previous,
      [shipment.id]: { ...previous[shipment.id], [key]: value }
    }));
    setErrors(previous => ({ ...previous, [shipment.id]: "" }));
  }

  async function saveRow(shipment) {
    const changes = edits[shipment.id];
    if (!changes) return;
    const payload = { ...changes };
    if (Object.hasOwn(payload, "currentLocation")) {
      payload.location = payload.currentLocation;
      delete payload.currentLocation;
    }
    setSavingId(shipment.id);
    setErrors(previous => ({ ...previous, [shipment.id]: "" }));
    try {
      const response = await apiFetch(`/shipments/${encodeURIComponent(shipment.trackingNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, editLatest: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save this shipment.");
      onUpdated(data, shipment.trackingNumber);
      setEdits(previous => {
        const next = { ...previous };
        delete next[shipment.id];
        return next;
      });
    } catch (error) {
      setErrors(previous => ({ ...previous, [shipment.id]: error.message || "Unable to save this shipment." }));
    } finally {
      setSavingId("");
    }
  }

  function renderInput(shipment, column) {
    const value = currentValue(shipment, column);
    if (column.type === "status") {
      return <select aria-label={`${column.header} for ${shipment.trackingNumber}`} value={value} onChange={event => setCell(shipment, column.key, event.target.value)}>
        {STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}
      </select>;
    }
    return <input
      aria-label={`${column.header} for ${shipment.trackingNumber}`}
      type={column.type === "date" ? "date" : column.key === "weight" ? "number" : "text"}
      min={column.key === "weight" ? "0" : undefined}
      step={column.key === "weight" ? "0.01" : undefined}
      value={value}
      onChange={event => setCell(shipment, column.key, event.target.value)}
    />;
  }

  return (
    <Modal title="All Shipments · Spreadsheet View" onClose={onClose} spreadsheet>
      <div className="spreadsheet-toolbar">
        <span>{shipments.length} shipment{shipments.length === 1 ? "" : "s"} · Edit cells, then save each row</span>
        <div className="spreadsheet-downloads">
          <a href="#" onClick={downloadExport}><Download size={15}/> Download all shipments</a>
          <a href="#" onClick={downloadTemplate}><FileSpreadsheet size={15}/> Blank import template</a>
        </div>
      </div>
      <div className="spreadsheet-scroll" role="region" aria-label="All shipment data" tabIndex={0}>
        <table className="spreadsheet-table">
          <thead><tr>{SHIPMENT_COLUMNS.map(column => <th key={column.key}>{column.header}</th>)}<th>EDIT</th></tr></thead>
          <tbody>
            {shipments.map(shipment => (
              <tr key={shipment.id}>
                {SHIPMENT_COLUMNS.map(column => (
                  <td key={column.key}>
                    {column.type === "dateTime"
                      ? displayColumnValue(shipment, column)
                      : renderInput(shipment, column)}
                  </td>
                ))}
                <td className="spreadsheet-row-actions">
                  {errors[shipment.id] && <span className="spreadsheet-error" role="alert">{errors[shipment.id]}</span>}
                  <button className="button primary" disabled={!edits[shipment.id] || savingId === shipment.id} onClick={() => saveRow(shipment)}>
                    {savingId === shipment.id ? "Saving..." : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function AdminLogin({ onClose, onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to sign in.");
      sessionStorage.setItem(ADMIN_SESSION_KEY, data.token);
      onLogin();
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Admin Sign In" onClose={onClose}>
      <form onSubmit={submit}>
        <label>Admin password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error && <div className="error-box" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={saving}>{saving ? "Signing in..." : "Sign In"}</button>
        </div>
      </form>
    </Modal>
  );
}

function App() {
  const [shipments, setShipments] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedShipmentIds, setSelectedShipmentIds] = useState([]);
  const [deletingShipments, setDeletingShipments] = useState(false);
  const [trackQuery, setTrackQuery] = useState("");
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [proSortDirection, setProSortDirection] = useState("none");
  const [mobileNav, setMobileNav] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(
    () => import.meta.env.DEV || Boolean(sessionStorage.getItem(ADMIN_SESSION_KEY))
  );
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const selectAllVisibleRef = useRef(null);

  async function loadShipments() {
    if (!adminAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiFetch("/shipments");
      if (res.status === 401) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setAdminAuthenticated(false);
        setShipments([]);
        return;
      }
      if (!res.ok) throw new Error("Unable to load shipments.");
      const data = await res.json();
      setShipments(data);
      setSelectedShipmentIds(current => current.filter(id => data.some(shipment => shipment.id === id)));
    } catch {
      alert("Cannot connect to the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (adminAuthenticated) loadShipments(); }, [adminAuthenticated]);

  async function track(e) {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    try {
      const res = await apiFetch(`/shipments/${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTracking(data);
    } catch (err) {
      setTracking(null);
      alert(err.message || "Shipment not found.");
    }
  }

  async function deleteShipment(shipment) {
    if (!confirm(`Delete ${shipment.trackingNumber}?`)) return;
    const res = await apiFetch(`/shipments/${shipment.trackingNumber}`, { method: "DELETE" });
    if (res.ok) {
      setShipments(prev => prev.filter(s => s.trackingNumber !== shipment.trackingNumber));
      setSelectedShipmentIds(prev => prev.filter(id => id !== shipment.id));
      if (tracking?.trackingNumber === shipment.trackingNumber) setTracking(null);
    }
  }

  async function deleteSelectedShipments(deleteAll = false) {
    const targets = deleteAll
      ? shipments
      : shipments.filter(shipment => selectedShipmentIds.includes(shipment.id));
    if (!targets.length || deletingShipments) return;

    const confirmation = deleteAll
      ? `Permanently delete all ${targets.length} shipments, including shipments hidden by the current filter?`
      : `Permanently delete ${targets.length} selected shipment${targets.length === 1 ? "" : "s"}?`;
    if (!confirm(confirmation)) return;

    setDeletingShipments(true);
    try {
      const response = await apiFetch("/shipments/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteAll
          ? { all: true }
          : { trackingNumbers: targets.map(shipment => shipment.trackingNumber) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to delete shipments.");

      const deletedTrackingNumbers = new Set(targets.map(shipment => shipment.trackingNumber));
      const deletedIds = new Set(targets.map(shipment => shipment.id));
      setShipments(current => current.filter(shipment => !deletedTrackingNumbers.has(shipment.trackingNumber)));
      setSelectedShipmentIds(current => current.filter(id => !deletedIds.has(id)));
      if (tracking && deletedTrackingNumbers.has(tracking.trackingNumber)) setTracking(null);
      setImportMessage(`${data.deleted} shipment${data.deleted === 1 ? "" : "s"} deleted.`);
    } catch (error) {
      alert(error.message || "Unable to delete shipments.");
    } finally {
      setDeletingShipments(false);
    }
  }

  const counts = useMemo(() => ({
    all: shipments.length,
    transit: shipments.filter(s => ["Picked Up", "In Transit", "At Hub"].includes(s.status)).length,
    delivered: shipments.filter(s => s.status === "Delivered").length,
    pending: shipments.filter(s => s.status === "Shipment Created").length,
    delayed: shipments.filter(s => s.status === "Delayed").length
  }), [shipments]);

  const filtered = shipments.filter(s => {
    const matchesFilter =
      activeFilter === "All" ? true :
      activeFilter === "In Transit" ? ["Picked Up", "In Transit", "At Hub"].includes(s.status) :
      s.status === activeFilter;

    const q = query.toLowerCase();
    const matchesSearch = !q || SHIPMENT_COLUMNS.some(column =>
      String(getShipmentColumnValue(s, column)).toLowerCase().includes(q)
    );

    return matchesFilter && matchesSearch;
  });
  if (proSortDirection !== "none") {
    filtered.sort((left, right) => {
      const order = String(left.trackingNumber).localeCompare(String(right.trackingNumber), undefined, { numeric: true, sensitivity: "base" });
      return proSortDirection === "ascending" ? order : -order;
    });
  }
  const selectedVisibleCount = filtered.filter(shipment => selectedShipmentIds.includes(shipment.id)).length;
  const allVisibleSelected = filtered.length > 0 && selectedVisibleCount === filtered.length;

  useEffect(() => {
    if (selectAllVisibleRef.current) {
      selectAllVisibleRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
    }
  }, [allVisibleSelected, selectedVisibleCount]);

  function toggleShipmentSelection(shipmentId, selected) {
    setSelectedShipmentIds(current => selected
      ? current.includes(shipmentId) ? current : [...current, shipmentId]
      : current.filter(id => id !== shipmentId)
    );
  }

  function toggleVisibleShipments(selected) {
    const visibleIds = new Set(filtered.map(shipment => shipment.id));
    setSelectedShipmentIds(current => selected
      ? [...new Set([...current, ...visibleIds])]
      : current.filter(id => !visibleIds.has(id))
    );
  }

  function clearSelection() {
    setSelectedShipmentIds([]);
  }

  function created(shipment) {
    setShipments(prev => [shipment, ...prev]);
  }

  function imported(importedShipments, skippedCount) {
    setShipments(prev => [...importedShipments, ...prev]);
    setActiveFilter("All");
    setImportMessage(`${importedShipments.length} new shipment${importedShipments.length === 1 ? "" : "s"} imported${skippedCount ? `; ${skippedCount} existing row${skippedCount === 1 ? "" : "s"} skipped` : ""}.`);
  }

  function updated(shipment, previousTrackingNumber = shipment.trackingNumber) {
    setShipments(prev => prev.map(s => s.trackingNumber === previousTrackingNumber ? shipment : s));
    if (tracking?.trackingNumber === previousTrackingNumber) setTracking(shipment);
  }

  return (
    <div className="app">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Truck size={23}/></div>
          <div><strong>JART</strong><span>ENTERPRISE</span></div>
        </div>
        <nav>
          <button className="nav-item active"><LayoutDashboard size={18}/> Dashboard</button>
          {adminAuthenticated && <button className="nav-item" onClick={() => document.getElementById("shipments")?.scrollIntoView()}><Package size={18}/> Shipments</button>}
          <button className="nav-item" onClick={() => document.getElementById("tracking")?.scrollIntoView()}><Search size={18}/> Track Shipment</button>
        </nav>
        <div className="sidebar-footer">
          <div className="status-dot"></div>
          <div><strong>System Online</strong><span>Shipment database active</span></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu/></button>
          <div><div className="eyebrow">LOGISTICS MANAGEMENT</div><h1>Shipment Dashboard</h1></div>
          <div className="top-actions">
            {adminAuthenticated ? <>
              <button className="button secondary refresh" onClick={loadShipments}><RefreshCw size={16}/> Refresh</button>
              <button className="button secondary excel-import" title="Import shipments from Excel" aria-label="Import shipments from Excel" onClick={() => setModal("import")}><FileSpreadsheet size={16}/><span>Excel Import</span></button>
              <button className="button secondary excel-export" title="Download all shipments as an Excel workbook" aria-label="Download all shipments as an Excel workbook" onClick={downloadExport}><Download size={16}/><span>Excel Export</span></button>
              <button className="button primary" onClick={() => setModal("create")}><Plus size={17}/> New Shipment</button>
              {!import.meta.env.DEV && <button className="button secondary" onClick={() => { sessionStorage.removeItem(ADMIN_SESSION_KEY); setAdminAuthenticated(false); setShipments([]); setTracking(null); }}>Sign Out</button>}
            </> : <button className="button secondary" onClick={() => setShowAdminLogin(true)}>Admin Sign In</button>}
          </div>
        </header>

        <section className="hero">
          <div>
            <div className="hero-label">JART ENTERPRISE</div>
            <h2>Track every shipment in one place.</h2>
            <p>Manage your cargo, monitor delivery progress, and keep shipment records organized.</p>
          </div>
          <div className="hero-art"><Box size={82} strokeWidth={1}/></div>
        </section>

        {adminAuthenticated && <section className="stats">
          <StatCard icon={<Package/>} label="Total Shipments" value={counts.all} onClick={() => setActiveFilter("All")}/>
          <StatCard icon={<Truck/>} label="In Transit" value={counts.transit} onClick={() => setActiveFilter("In Transit")}/>
          <StatCard icon={<CheckCircle2/>} label="Delivered" value={counts.delivered} onClick={() => setActiveFilter("Delivered")}/>
          <StatCard icon={<Clock3/>} label="Pending" value={counts.pending} onClick={() => setActiveFilter("Shipment Created")}/>
          <StatCard icon={<AlertTriangle/>} label="Delayed" value={counts.delayed} onClick={() => setActiveFilter("Delayed")}/>
        </section>}

        <section id="tracking" className="tracking-search">
          <div>
            <div className="eyebrow">PUBLIC TRACKING</div>
            <h2>Where is your shipment?</h2>
            <p>Enter a JART tracking number to view the latest shipment status.</p>
          </div>
          <form onSubmit={track} className="track-form">
            <Search size={19}/>
            <input value={trackQuery} onChange={e => setTrackQuery(e.target.value)} placeholder="e.g. JART-2026-0001"/>
            <button className="button primary">Track</button>
          </form>
        </section>

        {tracking && <TrackingResult shipment={tracking} onClose={() => setTracking(null)}/>}

        {adminAuthenticated && <section id="shipments" className="table-section">
          {importMessage && <div className="import-result" role="status"><span>{importMessage}</span><button className="icon-button" aria-label="Dismiss import summary" onClick={() => setImportMessage("")}><X size={16}/></button></div>}
          <div className="section-header">
            <div><div className="eyebrow">SHIPMENT MANAGEMENT</div><h2>All Shipments</h2><div className="selection-summary" aria-live="polite"><span>{selectedShipmentIds.length} selected</span>{selectedShipmentIds.length > 0 && <button type="button" onClick={clearSelection}>Clear selection</button>}<div className="bulk-delete-actions">{selectedShipmentIds.length > 0 && <button className="button danger" type="button" disabled={deletingShipments} onClick={() => deleteSelectedShipments()}><Trash2 size={15}/>{deletingShipments ? "Deleting..." : `Delete selected (${selectedShipmentIds.length})`}</button>}{shipments.length > 0 && <button className="button danger" type="button" disabled={deletingShipments} onClick={() => deleteSelectedShipments(true)}><Trash2 size={15}/>{deletingShipments ? "Deleting..." : `Delete all (${shipments.length})`}</button>}</div></div></div>
            <div className="table-tools">
              <button className="button secondary spreadsheet-button" onClick={() => setModal({ type: "spreadsheet" })}><Table2 size={16}/> Spreadsheet View</button>
              <button
                className="button secondary sort-button"
                onClick={() => setProSortDirection(previous => previous === "ascending" ? "descending" : "ascending")}
                aria-label="Sort shipments by PRO number"
              >
                {proSortDirection === "none" ? "Sort by PRO" : proSortDirection === "ascending" ? "PRO: A–Z" : "PRO: Z–A"}
              </button>
              <div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search shipments..." /></div>
              <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
                <option>All</option><option>In Transit</option><option>Delivered</option><option>Shipment Created</option><option>Delayed</option><option>Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? <div className="empty"><RefreshCw className="spin"/><p>Loading shipments...</p></div> :
          filtered.length === 0 ? <div className="empty"><XCircle/><p>No shipments match your search.</p></div> :
          <div className="table-wrap">
            <table>
              <thead><tr><th className="selection-cell"><input ref={selectAllVisibleRef} className="selection-checkbox" type="checkbox" aria-label="Select all visible shipments" checked={allVisibleSelected} onChange={event => toggleVisibleShipments(event.target.checked)}/></th>{SHIPMENT_COLUMNS.map(column => <th key={column.key}>{column.header}</th>)}<th></th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr className={selectedShipmentIds.includes(s.id) ? "selected-row" : ""} key={s.id}>
                    <td className="selection-cell"><input className="selection-checkbox" type="checkbox" aria-label={`Select ${s.trackingNumber}`} checked={selectedShipmentIds.includes(s.id)} onChange={event => toggleShipmentSelection(s.id, event.target.checked)}/></td>
                    {SHIPMENT_COLUMNS.map(column => (
                      <td key={column.key}>
                        {column.key === "trackingNumber" ? <button className="tracking-link" onClick={() => setTracking(s)}>{displayColumnValue(s, column)}</button> :
                          column.key === "status" ? <StatusBadge status={s.status}/> : displayColumnValue(s, column)}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <button title="View tracking" className="icon-button" onClick={() => setTracking(s)}><Search size={16}/></button>
                        <button title="View full shipment" aria-label={`View full shipment ${s.trackingNumber}`} className="icon-button" onClick={() => setModal({ type: "view", shipment: s })}><Eye size={16}/></button>
                        <button title="Edit shipment" className="icon-button" onClick={() => setModal({ type: "edit", shipment: s })}><Edit3 size={16}/></button>
                        <button title="Delete" className="icon-button danger" onClick={() => deleteShipment(s)}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </section>}

        <footer>© {new Date().getFullYear()} JART ENTERPRISE · Shipment Management System</footer>
      </main>

      {modal === "create" && <CreateShipment onClose={() => setModal(null)} onCreated={created}/>}
      {modal?.type === "view" && <ShipmentViewModal shipment={modal.shipment} onClose={() => setModal(null)}/>}
      {modal?.type === "spreadsheet" && <ShipmentSpreadsheetModal shipments={shipments} onClose={() => setModal(null)} onUpdated={updated}/>}
      {modal?.type === "edit" && <EditShipmentModal shipment={modal.shipment} onClose={() => setModal(null)} onUpdated={updated}/>}
      {modal === "import" && <ExcelImport onClose={() => setModal(null)} onImported={imported}/>}
      {showAdminLogin && <AdminLogin onClose={() => setShowAdminLogin(false)} onLogin={() => { setAdminAuthenticated(true); setShowAdminLogin(false); }}/>}
    </div>
  );
}

export default App;