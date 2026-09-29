import React, { useEffect, useMemo, useState } from "react";
import {
  Package, Search, Plus, LayoutDashboard, Truck, CheckCircle2,
  Clock3, MapPin, ArrowRight, RefreshCw, X, Trash2, Edit3,
  Menu, Box, AlertTriangle, XCircle, Upload, Download, FileSpreadsheet, Eye, Table2
} from "lucide-react";

const API = "/api";

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
    duties: "", gatepass: "", shippingLines: "", container: "",
    billOfLading: "", trackingNumber: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API}/shipments`, {
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
          <label>Sender *<input name="sender" value={form.sender} onChange={update} required placeholder="Sender name/company" /></label>
          <label>Receiver *<input name="receiver" value={form.receiver} onChange={update} required placeholder="Receiver name/company" /></label>
          <label>Origin *<input name="origin" value={form.origin} onChange={update} required placeholder="e.g. Manila Warehouse" /></label>
          <label>Destination *<input name="destination" value={form.destination} onChange={update} required placeholder="e.g. Cebu City" /></label>
          <label>Package Description<input name="packageDescription" value={form.packageDescription} onChange={update} placeholder="Documents, equipment, cargo..." /></label>
          <label>Weight (kg)<input type="number" min="0" step="0.01" name="weight" value={form.weight} onChange={update} placeholder="0.00" /></label>
          <label className="full">Estimated Delivery *<input type="date" name="estimatedDelivery" value={form.estimatedDelivery} onChange={update} required /></label>
          <label>Duties<input name="duties" value={form.duties} onChange={update} placeholder="Duty amount or reference" /></label>
          <label>Gatepass<input name="gatepass" value={form.gatepass} onChange={update} placeholder="Gatepass number or status" /></label>
          <label className="full">Shipping Lines<input name="shippingLines" value={form.shippingLines} onChange={update} placeholder="Shipping line" /></label>
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
    estimatedDelivery: shipment.estimatedDelivery,
    duties: shipment.duties || "",
    gatepass: shipment.gatepass || "",
    shippingLines: shipment.shippingLines || "",
    container: shipment.container || "",
    billOfLading: shipment.billOfLading || "",
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
      const response = await fetch(`${API}/shipments/${encodeURIComponent(shipment.trackingNumber)}`, {
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
          <label>Sender *<input name="sender" value={form.sender} onChange={update} required /></label>
          <label>Receiver *<input name="receiver" value={form.receiver} onChange={update} required /></label>
          <label>Origin *<input name="origin" value={form.origin} onChange={update} required /></label>
          <label>Destination *<input name="destination" value={form.destination} onChange={update} required /></label>
          <label>Package Description<input name="packageDescription" value={form.packageDescription} onChange={update} /></label>
          <label>Weight (kg)<input type="number" min="0" step="0.01" name="weight" value={form.weight} onChange={update} /></label>
          <label>Estimated Delivery *<input type="date" name="estimatedDelivery" value={form.estimatedDelivery} onChange={update} required /></label>
          <label>Duties<input name="duties" value={form.duties} onChange={update} /></label>
          <label>Gatepass<input name="gatepass" value={form.gatepass} onChange={update} /></label>
          <label>Shipping Lines<input name="shippingLines" value={form.shippingLines} onChange={update} /></label>
          <label>Container<input name="container" value={form.container} onChange={update} /></label>
          <label>Bill of Lading<input name="billOfLading" value={form.billOfLading} onChange={update} /></label>
        </div>
        <label>Current Location<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Manila Hub" /></label>
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
      const response = await fetch(`${API}/shipments/import`, {
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
        <p className="form-hint">Required: Sender, Receiver, Origin, Destination, Estimated Delivery. Download the latest workbook for each batch, keep existing tracking numbers unchanged, and add new shipments on blank rows.</p>
        <div className="template-download"><a href={`${API}/shipments/template`}><Download size={15}/> Download latest shipment workbook</a></div>
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
          <span>{shipment.origin}</span><ArrowRight size={18}/><span>{shipment.destination}</span>
        </div>
      </div>

      <div className="details-grid">
        <div><span>Sender</span><strong>{shipment.sender}</strong></div>
        <div><span>Receiver</span><strong>{shipment.receiver}</strong></div>
        <div><span>Package</span><strong>{shipment.packageDescription}</strong></div>
        <div><span>Weight</span><strong>{shipment.weight} kg</strong></div>
        <div><span>Estimated Delivery</span><strong>{shipment.estimatedDelivery}</strong></div>
        <div><span>Duties</span><strong>{shipment.duties || "—"}</strong></div>
        <div><span>Gatepass</span><strong>{shipment.gatepass || "—"}</strong></div>
        <div><span>Shipping Lines</span><strong>{shipment.shippingLines || "—"}</strong></div>
        <div><span>Container</span><strong>{shipment.container || "—"}</strong></div>
        <div><span>Bill of Lading</span><strong>{shipment.billOfLading || "—"}</strong></div>
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
              <p>{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShipmentViewModal({ shipment, onClose }) {
  const fields = [
    ["Tracking Number", shipment.trackingNumber],
    ["Status", shipment.status],
    ["Sender", shipment.sender],
    ["Receiver", shipment.receiver],
    ["Origin", shipment.origin],
    ["Destination", shipment.destination],
    ["Package Description", shipment.packageDescription],
    ["Weight", shipment.weight == null ? "—" : `${shipment.weight} kg`],
    ["Estimated Delivery", shipment.estimatedDelivery],
    ["Container", shipment.container],
    ["Bill of Lading", shipment.billOfLading],
    ["Shipping Lines", shipment.shippingLines],
    ["Duties", shipment.duties],
    ["Gatepass", shipment.gatepass],
    ["Record ID", shipment.id],
    ["Created", formatDate(shipment.createdAt)],
    ["Last Updated", formatDate(shipment.updatedAt)]
  ];

  return (
    <Modal title={`Shipment ${shipment.trackingNumber}`} onClose={onClose} wide>
      <div className="details-grid full-shipment-details">
        {fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}
      </div>
      <h3 className="section-title">Complete Status History</h3>
      {shipment.history?.length ? (
        <div className="timeline">
          {[...shipment.history].reverse().map((item, index) => (
            <div className="timeline-item" key={`${item.timestamp}-${index}`}>
              <div className="timeline-dot"><CheckCircle2 size={14}/></div>
              <div className="timeline-content">
                <div className="timeline-heading"><strong>{item.status}</strong><span>{formatDate(item.timestamp)}</span></div>
                <div className="timeline-location"><MapPin size={14}/> {item.location || "—"}</div>
                <p>{item.note || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="form-hint">No status history recorded.</p>}
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function ShipmentSpreadsheetModal({ shipments, onClose }) {
  const columns = [
    ["Tracking Number", shipment => shipment.trackingNumber],
    ["Sender", shipment => shipment.sender],
    ["Receiver", shipment => shipment.receiver],
    ["Origin", shipment => shipment.origin],
    ["Destination", shipment => shipment.destination],
    ["Package Description", shipment => shipment.packageDescription],
    ["Weight (kg)", shipment => shipment.weight],
    ["Estimated Delivery", shipment => shipment.estimatedDelivery],
    ["Status", shipment => shipment.status],
    ["Container", shipment => shipment.container],
    ["Bill of Lading", shipment => shipment.billOfLading],
    ["Shipping Lines", shipment => shipment.shippingLines],
    ["Duties", shipment => shipment.duties],
    ["Gatepass", shipment => shipment.gatepass],
    ["Current Location", shipment => shipment.history?.at(-1)?.location],
    ["Latest Note", shipment => shipment.history?.at(-1)?.note],
    ["Created At", shipment => formatDate(shipment.createdAt)],
    ["Last Updated", shipment => formatDate(shipment.updatedAt)],
    ["Record ID", shipment => shipment.id],
    ["Complete Status History", shipment => (shipment.history || []).map(item =>
      `${formatDate(item.timestamp)} | ${item.status} | ${item.location || "—"} | ${item.note || "—"}`
    ).join("\n")]
  ];

  return (
    <Modal title="All Shipments · Spreadsheet View" onClose={onClose} spreadsheet>
      <div className="spreadsheet-toolbar">
        <span>{shipments.length} shipment{shipments.length === 1 ? "" : "s"}</span>
        <a href={`${API}/shipments/template`}><Download size={15}/> Download Excel workbook</a>
      </div>
      <div className="spreadsheet-scroll" role="region" aria-label="All shipment data" tabIndex={0}>
        <table className="spreadsheet-table">
          <thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>
            {shipments.map(shipment => (
              <tr key={shipment.id}>
                {columns.map(([label, value]) => (
                  <td className={label === "Complete Status History" ? "spreadsheet-history" : ""} key={label}>
                    {value(shipment) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function App() {
  const [shipments, setShipments] = useState([]);
  const [query, setQuery] = useState("");
  const [trackQuery, setTrackQuery] = useState("");
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [mobileNav, setMobileNav] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  async function loadShipments() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/shipments`);
      setShipments(await res.json());
    } catch {
      alert("Cannot connect to the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadShipments(); }, []);

  async function track(e) {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    try {
      const res = await fetch(`${API}/shipments/${encodeURIComponent(trackQuery.trim())}`);
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
    const res = await fetch(`${API}/shipments/${shipment.trackingNumber}`, { method: "DELETE" });
    if (res.ok) {
      setShipments(prev => prev.filter(s => s.trackingNumber !== shipment.trackingNumber));
      if (tracking?.trackingNumber === shipment.trackingNumber) setTracking(null);
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
    const matchesSearch = !q || [
      s.trackingNumber, s.sender, s.receiver, s.origin, s.destination, s.status,
      s.duties, s.gatepass, s.shippingLines, s.container, s.billOfLading
    ].some(v => String(v).toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

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
          <button className="nav-item" onClick={() => document.getElementById("shipments")?.scrollIntoView()}><Package size={18}/> Shipments</button>
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
            <button className="button secondary refresh" onClick={loadShipments}><RefreshCw size={16}/> Refresh</button>
            <button className="button secondary excel-import" title="Import shipments from Excel" aria-label="Import shipments from Excel" onClick={() => setModal("import")}><FileSpreadsheet size={16}/><span>Excel Import</span></button>
            <button className="button primary" onClick={() => setModal("create")}><Plus size={17}/> New Shipment</button>
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

        <section className="stats">
          <StatCard icon={<Package/>} label="Total Shipments" value={counts.all} onClick={() => setActiveFilter("All")}/>
          <StatCard icon={<Truck/>} label="In Transit" value={counts.transit} onClick={() => setActiveFilter("In Transit")}/>
          <StatCard icon={<CheckCircle2/>} label="Delivered" value={counts.delivered} onClick={() => setActiveFilter("Delivered")}/>
          <StatCard icon={<Clock3/>} label="Pending" value={counts.pending} onClick={() => setActiveFilter("Shipment Created")}/>
          <StatCard icon={<AlertTriangle/>} label="Delayed" value={counts.delayed} onClick={() => setActiveFilter("Delayed")}/>
        </section>

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

        <section id="shipments" className="table-section">
          {importMessage && <div className="import-result" role="status"><span>{importMessage}</span><button className="icon-button" aria-label="Dismiss import summary" onClick={() => setImportMessage("")}><X size={16}/></button></div>}
          <div className="section-header">
            <div><div className="eyebrow">SHIPMENT MANAGEMENT</div><h2>All Shipments</h2></div>
            <div className="table-tools">
              <button className="button secondary spreadsheet-button" onClick={() => setModal({ type: "spreadsheet" })}><Table2 size={16}/> Spreadsheet View</button>
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
              <thead><tr><th>Tracking</th><th>Route</th><th>Receiver</th><th>Container</th><th>Bill of Lading</th><th>Shipping Lines</th><th>Duties</th><th>Gatepass</th><th>Delivery</th><th>Status</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><button className="tracking-link" onClick={() => setTracking(s)}>{s.trackingNumber}</button><small>{s.packageDescription}</small></td>
                    <td><div className="route-cell"><span>{s.origin}</span><ArrowRight size={14}/><span>{s.destination}</span></div></td>
                    <td>{s.receiver}</td>
                    <td>{s.container || "—"}</td>
                    <td>{s.billOfLading || "—"}</td>
                    <td>{s.shippingLines || "—"}</td>
                    <td>{s.duties || "—"}</td>
                    <td>{s.gatepass || "—"}</td>
                    <td>{s.estimatedDelivery}</td>
                    <td><StatusBadge status={s.status}/></td>
                    <td>{formatDate(s.updatedAt)}</td>
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
        </section>

        <footer>© {new Date().getFullYear()} JART ENTERPRISE · Shipment Management System</footer>
      </main>

      {modal === "create" && <CreateShipment onClose={() => setModal(null)} onCreated={created}/>}
      {modal?.type === "view" && <ShipmentViewModal shipment={modal.shipment} onClose={() => setModal(null)}/>}
      {modal?.type === "spreadsheet" && <ShipmentSpreadsheetModal shipments={shipments} onClose={() => setModal(null)}/>}
      {modal?.type === "edit" && <EditShipmentModal shipment={modal.shipment} onClose={() => setModal(null)} onUpdated={updated}/>}
      {modal === "import" && <ExcelImport onClose={() => setModal(null)} onImported={imported}/>}
    </div>
  );
}

export default App;