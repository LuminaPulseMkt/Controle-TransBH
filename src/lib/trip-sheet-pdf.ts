import { loadLogoDataUrl } from "@/lib/pdf-logo";
import fallbackLogo from "@/assets/logo-transbh.png";
import type { TripSheetData, TripRow, ExpenseRow } from "@/lib/trip-sheet-types";
import { dateBR } from "@/lib/format";

const COLUMNS: { key: keyof TripRow; label: string; width: number }[] = [
  { key: "veiculo", label: "VEÍCULO", width: 28 },
  { key: "placa", label: "PLACA", width: 24 },
  { key: "empresa", label: "EMPRESA", width: 38 },
  { key: "origem", label: "ORIGEM", width: 25 },
  { key: "destino", label: "DESTINO", width: 25 },
  { key: "patio", label: "PÁTIO", width: 20 },
  { key: "valor", label: "VALOR", width: 20 },
  { key: "pago", label: "PAGO", width: 14 },
  { key: "recebido_por", label: "REC. POR", width: 24 },
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
    doc.text(`DATA IDA: ${dateBR(data.sheet_date)}`, pageW - 10, y + 12, { align: "right" });
    if (data.return_date) {
      doc.text(`DATA VOLTA: ${dateBR(data.return_date)}`, pageW - 10, y + 18, { align: "right" });
      y += 6;
    }
    y += 18;

    const rows = data.rows.filter((r) => r.direction === (title === "IDA" ? "ida" : "volta"));
    const body = rows.length
      ? rows.map((r) => COLUMNS.map((c) => {
          if (c.key === "pago") return r.pago ? "SIM" : "NÃO";
          return (r[c.key] || "").toString();
        }))
      : [COLUMNS.map(() => "")];

    autoTable(doc, {
      startY: y,
      head: [COLUMNS.map((c) => c.label)],
      body,
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [230, 88, 26], textColor: 255, halign: "center" },
      columnStyles: Object.fromEntries(
        COLUMNS.map((c, i) => [i, { cellWidth: c.width }]),
      ) as Record<number, { cellWidth: number }>,
      margin: { left: 10, right: 10 },
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  let currentY = 12;
  currentY = await drawSection("IDA", currentY);
  currentY += 8;
  if (currentY > 120) { doc.addPage(); currentY = 12; }
  currentY = await drawSection("VOLTA", currentY);

  // Totals & Expenses
  currentY += 10;
  if (currentY > 160) { doc.addPage(); currentY = 12; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DESPESAS", 10, currentY);
  currentY += 5;

  const expenseBody = (data.expenses || []).map(e => [e.description, e.paid_by ?? "", e.value]);
  autoTable(doc, {
    startY: currentY,
    head: [["DESCRIÇÃO", "PAGO POR", "VALOR"]],
    body: expenseBody.length ? expenseBody : [["-", "-", "-"]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [100, 100, 100] },
    margin: { left: 10, right: 120 },
  });

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const totalReceived = data.rows.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
  const totalExpenses = (data.expenses || []).reduce((acc, e) => acc + (parseFloat(e.value) || 0), 0);
  const totalNet = totalReceived - totalExpenses;

  // Expenses per payer
  const spentByPayer: Record<string, number> = {};
  (data.expenses || []).forEach(e => {
    const payer = (e.paid_by || "Não informado").trim();
    const val = parseFloat(e.value) || 0;
    spentByPayer[payer] = (spentByPayer[payer] || 0) + val;
  });

  doc.setFontSize(11);
  doc.text(`TOTAL RECEBIDO: R$ ${totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageW - 10, currentY, { align: "right" });
  doc.text(`TOTAL DESPESAS: R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageW - 10, currentY + 6, { align: "right" });
  
  let nextY = currentY + 12;
  if (Object.keys(spentByPayer).length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("DESPESAS POR PAGADOR:", pageW - 10, nextY, { align: "right" });
    nextY += 4;
    Object.entries(spentByPayer).forEach(([payer, val]) => {
      doc.text(`${payer.toUpperCase()}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageW - 10, nextY, { align: "right" });
      nextY += 4;
    });
    nextY += 2;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(230, 88, 26);
  doc.text(`VALOR TOTAL LIVRE: R$ ${totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageW - 10, nextY, { align: "right" });

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