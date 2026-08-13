import { relations } from "drizzle-orm";
import { contract, contractItem } from "./contract";
import { factoryDateChangeLog } from "./factory-date-change-log";
import { inspectionRecord } from "./inspection-record";
import { task } from "./task";
import {
  quote,
  quoteItem,
  quoteEnDescSuggestion,
  quoteImageCandidate,
  quoteFeedbackLog,
} from "./quote";
import { shipmentPaymentRecord } from "./shipment-payment-record";

// ---- contract ----
export const contractRelations = relations(contract, ({ many }) => ({
  items: many(contractItem),
  tasks: many(task),
}));

// ---- contract_item ----
export const contractItemRelations = relations(contractItem, ({ one, many }) => ({
  contract: one(contract, {
    fields: [contractItem.contractId],
    references: [contract.id],
  }),
  dateChangeLogs: many(factoryDateChangeLog),
  inspectionRecords: many(inspectionRecord),
  tasks: many(task),
  shipmentPaymentRecords: many(shipmentPaymentRecord),
}));

// ---- factory_date_change_log ----
export const factoryDateChangeLogRelations = relations(
  factoryDateChangeLog,
  ({ one }) => ({
    contractItem: one(contractItem, {
      fields: [factoryDateChangeLog.contractItemId],
      references: [contractItem.id],
    }),
  }),
);

// ---- inspection_record ----
export const inspectionRecordRelations = relations(inspectionRecord, ({ one }) => ({
  contractItem: one(contractItem, {
    fields: [inspectionRecord.contractItemId],
    references: [contractItem.id],
  }),
}));

// ---- task ----
export const taskRelations = relations(task, ({ one }) => ({
  contract: one(contract, {
    fields: [task.contractId],
    references: [contract.id],
  }),
  contractItem: one(contractItem, {
    fields: [task.contractItemId],
    references: [contractItem.id],
  }),
}));

// ---- quote ----
export const quoteRelations = relations(quote, ({ many }) => ({
  items: many(quoteItem),
  feedbackLogs: many(quoteFeedbackLog),
}));

// ---- quote_item ----
export const quoteItemRelations = relations(quoteItem, ({ one, many }) => ({
  quote: one(quote, {
    fields: [quoteItem.quoteId],
    references: [quote.id],
  }),
  enDescSuggestions: many(quoteEnDescSuggestion),
  imageCandidates: many(quoteImageCandidate),
}));

// ---- quote_en_desc_suggestion ----
export const quoteEnDescSuggestionRelations = relations(
  quoteEnDescSuggestion,
  ({ one }) => ({
    quoteItem: one(quoteItem, {
      fields: [quoteEnDescSuggestion.quoteItemId],
      references: [quoteItem.id],
    }),
  }),
);

// ---- quote_image_candidate ----
export const quoteImageCandidateRelations = relations(
  quoteImageCandidate,
  ({ one }) => ({
    quoteItem: one(quoteItem, {
      fields: [quoteImageCandidate.quoteItemId],
      references: [quoteItem.id],
    }),
  }),
);

// ---- quote_feedback_log ----
export const quoteFeedbackLogRelations = relations(quoteFeedbackLog, ({ one }) => ({
  quote: one(quote, {
    fields: [quoteFeedbackLog.quoteId],
    references: [quote.id],
  }),
}));

// ---- shipment_payment_record ----
export const shipmentPaymentRecordRelations = relations(
  shipmentPaymentRecord,
  ({ one }) => ({
    contractItem: one(contractItem, {
      fields: [shipmentPaymentRecord.contractItemId],
      references: [contractItem.id],
    }),
  }),
);
