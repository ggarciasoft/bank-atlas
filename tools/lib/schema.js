// Canonical schema definitions for the financial snapshot.
// Mirrors docs/08-data-schema.md and docs/09-output-formats.md.
// Keep this file as the single source of truth for field names and CSV column order.

export const CONFIDENCE_LEVELS = ["high", "medium", "low"];

export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "wallet",
  "investment",
  "other",
];

export const DIRECTIONS = ["debit", "credit"];

export const EXTRACTION_STATUSES = ["completed", "partial", "failed", "skipped"];

// CSV column order per docs/08-data-schema.md. Do not reorder without updating docs.
export const CSV_COLUMNS = {
  accounts: [
    "snapshot_date",
    "bank_id",
    "bank_name",
    "account_type",
    "account_name",
    "account_id_masked",
    "currency",
    "available_balance",
    "current_balance",
    "confidence",
    "needs_review",
  ],
  credit_cards: [
    "snapshot_date",
    "bank_id",
    "bank_name",
    "card_name",
    "card_id_masked",
    "currency",
    "current_balance",
    "statement_balance",
    "minimum_payment",
    "due_date",
    "available_credit",
    "credit_limit",
    "confidence",
    "needs_review",
  ],
  loans: [
    "snapshot_date",
    "bank_id",
    "bank_name",
    "loan_name",
    "loan_id_masked",
    "currency",
    "remaining_balance",
    "monthly_payment",
    "next_due_date",
    "confidence",
    "needs_review",
  ],
  transactions: [
    "snapshot_date",
    "bank_id",
    "bank_name",
    "account_id_masked",
    "date",
    "description",
    "amount",
    "direction",
    "currency",
    "category_guess",
    "is_pending",
    "is_large_movement",
    "possible_duplicate",
    "confidence",
    "needs_review",
  ],
};

// Keywords that make a transaction "noteworthy" (docs/04 + docs/07).
export const NOTEWORTHY_KEYWORDS = [
  "interest",
  "interes",
  "intereses",
  "fee",
  "comision",
  "comisión",
  "cargo",
  "tax",
  "impuesto",
  "itbis",
  "penalty",
  "penalidad",
  "mora",
  "insurance",
  "seguro",
  "transfer",
  "transferencia",
  "loan",
  "prestamo",
  "préstamo",
];

// Keywords that suggest a recurring charge (docs/07).
export const RECURRING_KEYWORDS = [
  "subscription",
  "suscripcion",
  "suscripción",
  "membership",
  "membresia",
  "membresía",
  "insurance",
  "seguro",
  "loan",
  "prestamo",
  "fee",
  "comision",
  "interest",
  "interes",
  "maintenance",
  "mantenimiento",
  "app",
  "cloud",
  "streaming",
  "netflix",
  "spotify",
  "prime",
  "disney",
  "hbo",
  "youtube",
];

// A per-bank extraction input file (input/banks/<bank_id>.json).
export function emptyBank(bankId = "", bankName = "") {
  return {
    bank_id: bankId,
    bank_name: bankName,
    extraction_status: "partial",
    extracted_at: null,
    accounts: [],
    credit_cards: [],
    loans: [],
    transactions: [],
    notes: [],
    warnings: [],
  };
}
