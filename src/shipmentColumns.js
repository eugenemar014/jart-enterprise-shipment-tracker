export const SHIPMENT_COLUMNS = [
  { key: "trackingNumber", header: "PRO #", width: 20 },
  { key: "receiver", header: "CONSIGNEE", width: 28 },
  { key: "billOfLading", header: "BILL OF LADING", width: 24 },
  { key: "container", header: "CONTAINER", width: 22 },
  { key: "size", header: "SIZE", width: 14 },
  { key: "packageDescription", header: "DESCRIPTION", width: 32 },
  { key: "shippingLines", header: "S/L", width: 22 },
  { key: "contractNumber", header: "CONTRACT #", width: 24 },
  { key: "port", header: "PORT", width: 18 },
  { key: "clientName", header: "CLIENT", width: 24 },
  { key: "original", header: "ORIGINAL", width: 18, type: "date" },
  { key: "paid", header: "PAID", width: 18, type: "date" },
  { key: "duties", header: "DUTIES", width: 18 },
  { key: "sender", header: "SHIPPER", width: 24 },
  { key: "origin", header: "ORIGIN", width: 28 },
  { key: "destination", header: "DESTINATION", width: 28 },
  { key: "weight", header: "WEIGHT (KG)", width: 14 },
  { key: "estimatedDelivery", header: "ESTIMATED DELIVERY", width: 20, type: "date" },
  { key: "status", header: "STATUS", width: 22 },
  { key: "gatepass", header: "GATEPASS", width: 20 },
  { key: "currentLocation", header: "CURRENT LOCATION", width: 28 },
  { key: "latestNote", header: "LATEST NOTE", width: 36 },
  { key: "createdAt", header: "CREATED AT", width: 26, type: "dateTime" },
  { key: "updatedAt", header: "LAST UPDATED", width: 26, type: "dateTime" },
  { key: "recordId", header: "RECORD ID", width: 38 },
  { key: "statusHistory", header: "COMPLETE STATUS HISTORY", width: 60 }
];

export function getShipmentColumnValue(shipment, column) {
  const key = typeof column === "string" ? column : column.key;
  const latestEvent = shipment.history?.at(-1);

  if (key === "currentLocation") return latestEvent?.location || "";
  if (key === "latestNote") return latestEvent?.note || "";
  if (key === "recordId") return shipment.id || "";
  if (key === "statusHistory") {
    return (shipment.history || []).map(item =>
      `${item.timestamp || ""} | ${item.status || ""} | ${item.location || ""} | ${item.note || ""}`
    ).join("\n");
  }

  return shipment[key] ?? "";
}