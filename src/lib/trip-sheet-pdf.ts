import { loadLogoDataUrl } from "@/lib/pdf-logo";
import fallbackLogo from "@/assets/logo-transbh.png";
import type { TripSheetData, TripRow } from "@/lib/trip-sheet-types";
import { dateBR } from "@/lib/format";

const COLUMNS: { key: keyof TripRow; label: string; width: number }[] = [
  { key: "veiculo", label: "VEÍCULO", width: 28 },
  { key: "placa", label: "PLACA", width: 24 },
  { key: "empresa", label: "EMPRESA", width: 38 },
  { key: "origem", label: "ORIGEM", width: 30 },
  { key: "destino", label: "DESTINO", width: 30 },
  { key: "patio", label: "PÁTIO", width: 26 },
  { key: "pagamento", label: "PAGAMENTO", width: 22 },
];

export async function generateTripSheetPdfBlob(
  data: TripSheetData,
  company?: { name?: string | null; logo_url?: string | null } | null,
): Promise<{ blob: Blob; filename: string }> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const drawSection = async (title: "IDA" | "VOLTA", startY: number): Promise<number> => {
    let y = startY;
    const logo =
      (await loadLogoDataUrl(company?.logo_url ?? null)) ??
      (await loadLogoDataUrl(fallbackLogo));
    if (logo) {
      const h = 14;
      const w = Math.min(logo.widthFor(h), 40);
      doc.addImage(logo.dataUrl, "PNG", 10, y, w, h);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(title, pageW / 2, y + 10, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`TELEFONE: ${data.phone || "—"}`, pageW - 10, y + 6, { align: "right" });
    doc.text(`DATA: ${dateBR(data.sheet_date)}`, pageW - 10, y + 12, { align: "right" });
    y += 18;

    const rows = data.rows.filter((r) => r.direction === (title === "IDA" ? "ida" : "volta"));
    const body = rows.length
      ? rows.map((r) => COLUMNS.map((c) => (r[c.key] || "").toString()))
      : [COLUMNS.map(() => "")];

    autoTable(doc, {
      startY: y,
      head: [COLUMNS.map((c) => c.label)],
      body,
      styles: { fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [230, 88, 26], textColor: 255, halign: "center" },
      columnStyles: Object.fromEntries(
        COLUMNS.map((c, i) => [i, { cellWidth: c.width }]),
      ) as Record<number, { cellWidth: number }>,
      margin: { left: 10, right: 10 },
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  let y = 12;
  y = await drawSection("IDA", y);
  y += 8;
  if (y > 130) { doc.addPage(); y = 12; }
  y = await drawSection("VOLTA", y);

  const blob = doc.output("blob") as Blob;
  const safeDate = data.sheet_date || "planilha";
  const filename = `planilha-${safeDate}.pdf`;
  return { blob, filename };
}

export async function exportTripSheetPDF(
  data: TripSheetData,
  company?: { name?: string | null; logo_url?: string | null } | null,
): Promise<void> {
  const { blob, filename } = await generateTripSheetPdfBlob(data, company);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
