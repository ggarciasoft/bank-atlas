// Normalization helpers for amounts, dates, currencies, and account masking.
// Mirrors docs/07-extraction-playbook.md.

const CURRENCY_ALIASES = {
  "RD$": "DOP",
  "DOP": "DOP",
  "US$": "USD",
  "USD": "USD",
  "$": "USD",
  "€": "EUR",
  "EUR": "EUR",
};

/**
 * Parse a human-entered amount into { amount, direction }.
 * Accepts numbers or strings like "RD$ 12,500.75", "(1,500.00)", "-1,500.00".
 * Parentheses or a leading minus mark a debit. Returns amount as a positive number.
 * @param {string|number|null|undefined} raw
 * @returns {{ amount: number|null, direction: "debit"|"credit"|null, currency: string|null }}
 */
export function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { amount: null, direction: null, currency: null };
  }
  if (typeof raw === "number") {
    return {
      amount: Math.abs(raw),
      direction: raw < 0 ? "debit" : "credit",
      currency: null,
    };
  }

  let s = String(raw).trim();
  let currency = null;
  for (const [symbol, code] of Object.entries(CURRENCY_ALIASES)) {
    if (s.toUpperCase().includes(symbol.toUpperCase())) {
      currency = code;
      break;
    }
  }

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.includes("-")) negative = true;

  // Strip everything except digits, separators.
  const numeric = s.replace(/[^0-9.,]/g, "");
  const amount = parseGroupedNumber(numeric);
  if (amount === null) return { amount: null, direction: null, currency };

  return {
    amount: Math.abs(amount),
    direction: negative ? "debit" : "credit",
    currency,
  };
}

/**
 * Parse a grouped number that may use "," or "." as the thousands/decimal separator.
 * Uses the last separator as the decimal point when both are present.
 * @param {string} numeric
 * @returns {number|null}
 */
export function parseGroupedNumber(numeric) {
  if (!numeric) return null;
  const lastComma = numeric.lastIndexOf(",");
  const lastDot = numeric.lastIndexOf(".");
  let normalized;
  if (lastComma === -1 && lastDot === -1) {
    normalized = numeric;
  } else if (lastComma > lastDot) {
    // comma is decimal separator: 12.500,75
    normalized = numeric.replace(/\./g, "").replace(",", ".");
  } else {
    // dot is decimal separator: 12,500.75
    normalized = numeric.replace(/,/g, "");
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Normalize a currency token to an ISO-ish code (best effort).
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export function normalizeCurrency(raw) {
  if (!raw) return null;
  const upper = String(raw).trim().toUpperCase();
  if (CURRENCY_ALIASES[upper]) return CURRENCY_ALIASES[upper];
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return CURRENCY_ALIASES[raw] || null;
}

/**
 * Normalize a date to ISO (YYYY-MM-DD) when the format is unambiguous.
 * Returns { date, ambiguous }. Ambiguous dates are returned as-is with ambiguous=true.
 * @param {string|null|undefined} raw
 * @returns {{ date: string|null, ambiguous: boolean }}
 */
export function normalizeDate(raw) {
  if (!raw) return { date: null, ambiguous: false };
  const s = String(raw).trim();

  // Already ISO.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, ambiguous: false };

  const slash = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    let [, a, b, y] = slash;
    if (y.length === 2) y = `20${y}`;
    const na = Number(a);
    const nb = Number(b);
    // Unambiguous only when one part is clearly > 12 (a day).
    if (na > 12 && nb <= 12) {
      return { date: `${y}-${pad(nb)}-${pad(na)}`, ambiguous: false }; // DD/MM
    }
    if (nb > 12 && na <= 12) {
      return { date: `${y}-${pad(na)}-${pad(nb)}`, ambiguous: false }; // MM/DD
    }
    // Both <= 12: cannot tell DD/MM vs MM/DD.
    return { date: s, ambiguous: true };
  }

  return { date: s, ambiguous: true };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Return true if a string contains a run of digits long enough to be a full
 * account/card number (>= 12 consecutive digits). Used by the safety audit.
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeFullAccountNumber(value) {
  if (value === null || value === undefined) return false;
  const digitsOnly = String(value).replace(/[\s-]/g, "");
  return /\d{12,}/.test(digitsOnly);
}

/**
 * Mask an identifier to the last 4 digits, e.g. "1234567890123456" -> "****3456".
 * If it already looks masked, return it unchanged.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function maskIdentifier(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s.includes("*") || /terminad/i.test(s)) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) return `****${digits.slice(-4)}`;
  return s;
}

/**
 * Round a currency amount to 2 decimals, returning a Number (or null).
 * @param {number|null|undefined} n
 * @returns {number|null}
 */
export function money(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return null;
  return Math.round(Number(n) * 100) / 100;
}
