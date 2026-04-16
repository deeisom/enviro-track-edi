// Lightweight CSV export utility (no external deps).

function escapeCell(value: any): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  // Quote if contains comma, quote, newline, or carriage return
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) {
    // Still produce an empty file with no headers
    triggerDownload(filename, "");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map(row => headers.map(h => escapeCell(row[h])).join(",")),
  ];
  // BOM for Excel UTF-8 compatibility
  const csv = "\uFEFF" + lines.join("\n");
  triggerDownload(filename, csv);
}

function triggerDownload(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function timestampedFilename(base: string, ext = "csv"): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${base}_${stamp}.${ext}`;
}
