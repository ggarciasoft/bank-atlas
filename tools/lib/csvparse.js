// Minimal RFC 4180 CSV parser (zero dependencies). Handles quoted fields,
// escaped quotes (""), and CRLF/LF line endings.

/**
 * Parse CSV text into an array of string arrays (rows of cells).
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
    } else if (ch === "\r") {
      // handled by \n branch; skip lone CR
      i += 1;
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }
  // Flush the final field/row if there is trailing content.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse CSV text into an array of objects keyed by the header row.
 * @param {string} text
 * @returns {{ headers: string[], records: Record<string, string>[] }}
 */
export function parseCsvRecords(text) {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, records };
}
