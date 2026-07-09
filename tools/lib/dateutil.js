// Date helpers for recurring day-of-month fields in the items registry.

function pad(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Next calendar date on or after refDateIso whose day-of-month equals `day`
 * (clamped to the month's length, e.g. day 31 in April → 30).
 * @param {number} day 1-31
 * @param {string} refDateIso YYYY-MM-DD
 * @returns {string|null}
 */
export function nextDayOfMonth(day, refDateIso) {
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (!refDateIso || !/^\d{4}-\d{2}-\d{2}$/.test(refDateIso)) return null;

  let year = Number(refDateIso.slice(0, 4));
  let month = Number(refDateIso.slice(5, 7));

  for (let attempt = 0; attempt < 14; attempt++) {
    const dim = daysInMonth(year, month);
    const targetDay = Math.min(day, dim);
    const candidate = `${year}-${pad(month)}-${pad(targetDay)}`;
    if (candidate >= refDateIso) return candidate;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return null;
}

/**
 * Extract day-of-month from an ISO date string.
 * @param {string|null|undefined} iso
 * @returns {number|null}
 */
export function dayFromIso(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const day = Number(iso.slice(8, 10));
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}
