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
  { key: "entryNumber", header: "ENTRY #", width: 18 },
  { key: "duties", header: "DUTIES", width: 18 },
  { key: "paid", header: "PAID", width: 18 },
  { key: "sender", header: "SHIPPER", width: 24 },
  { key: "origin", header: "ORIGIN", width: 28 },
  { key: "destination", header: "PORT", width: 28 },
  { key: "weight", header: "WEIGHT (KG)", width: 14 },
  { key: "estimatedDelivery", header: "ETA", width: 20, type: "date" },
  { key: "status", header: "STATUS", width: 22, type: "status" },
  { key: "gatepass", header: "GATEPASS", width: 20 },
  { key: "currentLocation", header: "DELIVERY LOCATION", width: 28 },
  { key: "latestNote", header: "LATEST NOTE", width: 36 },
  { key: "createdAt", header: "CREATED AT", width: 26, type: "dateTime" },
  { key: "updatedAt", header: "LAST UPDATED", width: 26, type: "dateTime" }
];

export function getShipmentColumnValue(shipment, column) {
  const key = typeof column === "string" ? column : column.key;
  const latestEvent = shipment.history?.at(-1);

  if (key === "currentLocation") return latestEvent?.location || "";
  if (key === "latestNote") return latestEvent?.note || "";
  if (key === "entryNumber") return shipment.entryNumber || shipment.original || "";
  if (key === "size") return shipment.size || shipment.containerSize || "";

  return shipment[key] ?? "";
}
