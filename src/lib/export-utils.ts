/**
 * Export data as CSV file download.
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data as a simple PDF (HTML-based print).
 */
export function exportToPDF(title: string, data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const tableRows = data
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td style="padding:6px 10px;border:1px solid #ddd;font-size:12px">${row[h] ?? ""}</td>`).join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:system-ui,sans-serif;padding:24px}
    h1{font-size:18px;margin-bottom:16px}
    table{border-collapse:collapse;width:100%}
    th{padding:8px 10px;border:1px solid #ccc;background:#f5f5f5;font-size:12px;text-align:left}
  </style></head><body>
    <h1>${title}</h1>
    <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 300);
  }
}
