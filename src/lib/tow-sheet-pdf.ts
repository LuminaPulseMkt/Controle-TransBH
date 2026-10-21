import { loadLogoDataUrl } from "@/lib/pdf-logo";
import fallbackLogo from "@/assets/logo-transbh.png";
import { dateBR } from "@/lib/format";
import { brlText, num, type TowSheetData } from "@/lib/fleet-types";

export function towSheetTotals(data: TowSheetData) {
  const days = data.rows.length;
  const total = data.rows.reduce((acc, r) => acc + num(r.valor), 0);
  const paid = data.rows.filter((r) => r.pago).reduce((acc, r) => acc + num(r.valor), 0);
  const expenses = (data.expenses || []).reduce((acc, e) => acc + num(e.value), 0);
  return { days, total, paid, pending: total - paid, expenses, net: total - expenses };
}

export async function exportTowSheetPDF(
  data: TowSheetData,
  vehicleLabel: string,
  company?: { name?: string | null; logo_url?: string | null } | null,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = 12;

  const logo = (await loadLogoDataUrl(company?.logo_url ?? null)) ?? (await loadLogoDataUrl(fallbackLogo));
  if (logo) doc.addImage(logo.dataUrl, "PNG", 10, y, Math.min(logo.widthFor(14), 40), 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GUINCHO - DIÁRIAS", pageW / 2, y + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`TELEFONE: ${data.phone || "—"}`, pageW - 10, y + 5, { align: "right" });
  doc.text(`GUINCHO: ${vehicleLabel || "—"}`, pageW - 10, y + 11, { align: "right" });
  doc.text(`MOTORISTA: ${data.driver_name || "—"}`, pageW - 10, y + 17, { align: "right" });
  const period = `${dateBR(data.period_start)}${data.period_end ? ` a ${dateBR(data.period_end)}` : ""}`;
  doc.text(`PERÍODO: ${period}`, 10, y + 22);
  y += 26;

  const rows = [...data.rows].sort((a, b) => a.date.localeCompare(b.date));
  autoTable(doc, {
    startY: y,
    head: [["DATA", "CLIENTE", "LOCAL", "SERVIÇO", "VEÍCULOS", "DIÁRIA", "PAGO", "REC. POR"]],
    body: rows.length
      ? rows.map((r) => [dateBR(r.date), r.cliente, r.local, r.servico, r.veiculos, r.valor, r.pago ? "SIM" : "NÃO", r.recebido_por])
      : [["", "", "", "", "", "", "", ""]],
    styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [230, 88, 26], textColor: 255, halign: "center" },
    margin: { left: 10, right: 10 },
  });
  y = lastY() + 8;

  if (y > 150) { doc.addPage(); y = 12; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DESPESAS", 10, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["DESCRIÇÃO", "PAGO POR", "VALOR"]],
    body: (data.expenses || []).length
      ? data.expenses.map((e) => [e.description, e.paid_by ?? "", e.value])
      : [["-", "-", "-"]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [100, 100, 100] },
    margin: { left: 10, right: 120 },
  });
  y = lastY() + 10;

  const t = towSheetTotals(data);
  doc.setFontSize(11);
  doc.text(`DIAS TRABALHADOS: ${t.days}`, pageW - 10, y, { align: "right" });
  doc.text(`TOTAL DE DIÁRIAS: ${brlText(t.total)}`, pageW - 10, y + 6, { align: "right" });
  doc.text(`JÁ PAGO: ${brlText(t.paid)}   ·   A PAGAR: ${brlText(t.pending)}`, pageW - 10, y + 12, { align: "right" });
  doc.text(`TOTAL DESPESAS: ${brlText(t.expenses)}`, pageW - 10, y + 18, { align: "right" });
  doc.setFontSize(14);
  doc.setTextColor(230, 88, 26);
  doc.text(`VALOR LIVRE: ${brlText(t.net)}`, pageW - 10, y + 26, { align: "right" });

  const label = (vehicleLabel || "guincho").replace(/[^A-Za-z0-9]+/g, "_");
  doc.save(`guincho-${label}-${data.period_start || "planilha"}.pdf`);
}
