import { loadLogoDataUrl } from "@/lib/pdf-logo";

export type Cell = string | number | null | undefined;

export interface ExportRow {
  [key: string]: Cell;
}

function escapeCsv(v: Cell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportCSV(filename: string, columns: string[], rows: Cell[][]): void {
  const head = columns.map(escapeCsv).join(";");
  const body = rows.map((r) => r.map(escapeCsv).join(";")).join("\n");
  const csv = `\uFEFF${head}\n${body}`; // BOM for Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExportPDFOpts {
  filename: string;
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Cell[][];
  company?: { name?: string | null; logo_url?: string | null } | null;
  summary?: { label: string; value: string }[];
  orientation?: "portrait" | "landscape";
}

export async function exportPDF(opts: ExportPDFOpts): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const orientation = opts.orientation ?? "portrait";
  const doc = new jsPDF({ orientation });
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerH = 50;

  doc.setFillColor(13, 27, 42);
  doc.rect(0, 0, pageWidth, headerH, "F");

  const logo = await loadLogoDataUrl(opts.company?.logo_url ?? null);
  if (logo) {
    const targetH = 38;
    const targetW = Math.min(logo.widthFor(targetH), 120);
    doc.addImage(logo.dataUrl, "PNG", 14, (headerH - targetH) / 2, targetW, targetH);
  } else {
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(22);
    doc.text(opts.company?.name || "TransBH", 14, headerH / 2 + 2);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(
    new Date().toLocaleString("pt-BR"),
    pageWidth - 14,
    headerH - 8,
    { align: "right" },
  );

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text(opts.title, 14, headerH + 12);
  let cursor = headerH + 18;
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(opts.subtitle, 14, cursor);
    cursor += 6;
  }

  if (opts.summary && opts.summary.length) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const items = opts.summary.map((s) => `${s.label}: ${s.value}`);
    const text = items.join("    •    ");
    const lines = doc.splitTextToSize(text, pageWidth - 28);
    doc.text(lines, 14, cursor + 2);
    cursor += lines.length * 5 + 2;
  }

  autoTable(doc, {
    startY: cursor + 4,
    head: [opts.columns],
    body: opts.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [13, 27, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  const fname = opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`;
  doc.save(fname);
}
