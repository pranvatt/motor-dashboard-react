import { PARAMS } from "./params.js";

export function historyToCsv(history) {
  const header = ["timestamp", ...PARAMS.map((p) => `${p.name} (${p.unit})`)].join(",");
  // Use the longest series so a short one never truncates the export.
  const len = PARAMS.reduce((m, p) => Math.max(m, history[p.key]?.length || 0), 0);
  const rows = [header];
  for (let i = 0; i < len; i++) {
    let t = "";
    for (const p of PARAMS) {
      const d = history[p.key]?.[i];
      if (d) {
        t = d.t;
        break;
      }
    }
    const row = [t];
    PARAMS.forEach((p) => {
      const d = history[p.key]?.[i];
      row.push(d ? d.v.toFixed(p.decimals) : "");
    });
    rows.push(row.join(","));
  }
  return rows.join("\n");
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
