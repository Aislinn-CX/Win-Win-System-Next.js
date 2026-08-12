// Phase 2 — core business tables
export { contract, contractItem } from "./contract";
export { factoryDateChangeLog } from "./factory-date-change-log";
export { inspectionRecord } from "./inspection-record";
export { task } from "./task";

// Phase 3 — auxiliary tables
export { auditLog } from "./audit-log";
export {
  quote,
  quoteItem,
  quoteEnDescSuggestion,
  quoteImageCandidate,
  quoteFeedbackLog,
} from "./quote";
export { customer } from "./customer";
export { shipmentPaymentRecord } from "./shipment-payment-record";

// Phase 4 — relations
export * from "./relations";
