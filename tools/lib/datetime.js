// Local date/time helpers that keep the machine's timezone offset.

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Local calendar date as YYYY-MM-DD. */
export function todayIso(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local ISO timestamp with timezone offset, e.g. 2026-07-06T23:00:00-04:00. */
export function nowIso(d = new Date()) {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`
  );
}
