import { loadLogoDataUrl } from "@/lib/pdf-logo";
import {
  CHECKLIST_ITEMS, type ChecklistData, type PartySection,
} from "@/lib/checklist-types";

const FUEL_LABELS: Record<string, string> = { "0": "0", "1/4": "1/4", "1/2": "1/2", "3/4": "3/4", cheio: "Cheio" };
const TIRE_CONDS = ["bom", "medio", "ruim", "furado"] as const;
const TIRE_COND_LABELS = ["Bom", "Médio", "Ruim", "Furado"];

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function exportChecklistPDF(
  data: ChecklistData,
  company?: { name?: string | null; logo_url?: string | null } | null,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 10;

  // Header
  const logo = await loadLogoDataUrl(company?.logo_url ?? null);
  if (logo) {
    const h = 16;
    const w = Math.min(logo.widthFor(h), 50);
    doc.addImage(logo.dataUrl, "PNG", 10, y, w, h);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CHECK LIST DE TRANSPORTE", pageW / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(company?.name ?? "TransBH", pageW / 2, y + 14, { align: "center" });
  y += 22;

  // Veículo
  doc.setFontSize(9);
  doc.text(`Cliente: ${data.client_name || "—"}`, 10, y); y += 5;
  doc.text(`Placa: ${data.plate || "—"}   Modelo: ${data.model || "—"}   DUT: ${data.dut || "—"}   Cor: ${data.color || "—"}`, 10, y); y += 5;
  doc.text(`KM: ${data.km || "—"}   Local: ${data.location || "—"}   Data: ${data.checklist_date || "—"}   Hora: ${data.checklist_time || "—"}`, 10, y); y += 4;

  // Items
  const itemRows: string[][] = [];
  for (let i = 0; i < CHECKLIST_ITEMS.length; i += 2) {
    const a = CHECKLIST_ITEMS[i];
    const b = CHECKLIST_ITEMS[i + 1];
    const mark = (s: string | null | undefined, t: "ok" | "nok") => (s === t ? "[X]" : "[ ]");
    itemRows.push([
      mark(data.items[a], "ok"), mark(data.items[a], "nok"), a,
      b ? mark(data.items[b], "ok") : "", b ? mark(data.items[b], "nok") : "", b ?? "",
    ]);
  }
  autoTable(doc, {
    startY: y + 2,
    head: [["OK", "Não OK", "INTERIOR DO VEÍCULO", "OK", "Não OK", "INTERIOR DO VEÍCULO"]],
    body: itemRows,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [13, 27, 42], textColor: 255 },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 }, 1: { halign: "center", cellWidth: 16 },
      3: { halign: "center", cellWidth: 12 }, 4: { halign: "center", cellWidth: 16 },
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Pneus
  autoTable(doc, {
    startY: y,
    head: [["Pneus", "Medida", "Marca", "Bom", "Médio", "Ruim", "Furado"]],
    body: data.tires.map((t) => [
      t.position, t.size || "", t.brand || "",
      ...TIRE_CONDS.map((c) => (t.condition === c ? "[X]" : "[ ]")),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [13, 27, 42], textColor: 255 },
    columnStyles: {
      3: { halign: "center" }, 4: { halign: "center" },
      5: { halign: "center" }, 6: { halign: "center" },
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Combustível
  doc.setFont("helvetica", "bold");
  doc.text("Combustível:", 10, y);
  doc.setFont("helvetica", "normal");
  let fx = 35;
  for (const lvl of ["0", "1/4", "1/2", "3/4", "cheio"]) {
    const mark = data.fuel_level === lvl ? "[X]" : "[ ]";
    doc.text(`${mark} ${FUEL_LABELS[lvl]}`, fx, y);
    fx += 22;
  }
  y += 6;

  // Observações
  doc.setFont("helvetica", "bold");
  doc.text("Observações:", 10, y);
  doc.setFont("helvetica", "normal");
  y += 4;
  const obsLines = doc.splitTextToSize(data.observations || "—", pageW - 20);
  doc.text(obsLines, 10, y);
  y += obsLines.length * 4 + 4;

  // Coleta / Entrega
  for (const [title, section] of [
    ["Coleta", data.pickup],
    ["Entrega", data.delivery],
  ] as const) {
    if (y > 240) { doc.addPage(); y = 10; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, 10, y); y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    await renderParty(doc, section, y, pageW);
    y += 42;
  }

  const filename = `checklist-${(data.plate || "veiculo").replace(/\s+/g, "_")}-${data.checklist_date}.pdf`;
  doc.save(filename);
}

async function renderParty(
  doc: import("jspdf").jsPDF,
  s: PartySection,
  y: number,
  pageW: number,
): Promise<void> {
  doc.text(`Motorista: ${s.driver_name || "—"}   RG: ${s.driver_rg || "—"}`, 10, y);
  doc.text(`Cidade: ${s.city || "—"}   Estado: ${s.state || "—"}   ${s.agreed ? "[X]" : "[ ]"} De acordo`, 10, y + 5);
  doc.text(`Responsável: ${s.responsible_name || "—"}   RG: ${s.responsible_rg || "—"}`, 10, y + 10);
  doc.text(`Data: ${s.date || "—"}   Hora: ${s.time || "—"}`, 10, y + 15);

  const sigY = y + 18;
  if (s.signature_url) {
    const d = await fetchImageDataUrl(s.signature_url);
    if (d) {
      doc.addImage(d, "PNG", 10, sigY, 70, 20);
      doc.text("Assinatura do motorista", 10, sigY + 22);
    }
  } else {
    doc.line(10, sigY + 18, 80, sigY + 18);
    doc.text("Assinatura do motorista", 10, sigY + 22);
  }
  if (s.responsible_signature_url) {
    const d = await fetchImageDataUrl(s.responsible_signature_url);
    if (d) {
      doc.addImage(d, "PNG", pageW - 80, sigY, 70, 20);
      doc.text("Assinatura do responsável", pageW - 80, sigY + 22);
    }
  } else {
    doc.line(pageW - 80, sigY + 18, pageW - 10, sigY + 18);
    doc.text("Assinatura do responsável", pageW - 80, sigY + 22);
  }
}
