import { brl, dateBR, vehicleTypeLabel } from "@/lib/format";
import { loadLogoDataUrl } from "@/lib/pdf-logo";
import fallbackLogo from "@/assets/logo-transbh.png";
import waveHeader from "@/assets/orcamento-wave.png";

export interface DocumentPdfData {
  id: string;
  doc_type: "budget" | "contract";
  title: string;
  client_name: string;
  client_document: string | null;
  client_phone: string | null;
  client_email: string | null;
  total_amount: number | null;
  body: any;
  created_at: string;
}

export interface DocumentPdfCompany {
  name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
  website?: string | null;
}

const ORANGE: [number, number, number] = [232, 90, 30];
const MIN_ROWS = 12;

function vehicleLines(body: any): string[] {
  if (Array.isArray(body?.vehicles) && body.vehicles.length > 0) {
    return body.vehicles.map((v: any) => {
      const type = v.type ? vehicleTypeLabel[v.type] ?? v.type : "";
      return [v.description || v.model || v.brand, v.plate, v.chassis, type, v.color]
        .filter(Boolean)
        .join(" · ");
    });
  }
  if (body?.vehicle || body?.vehicle_plate) {
    return [[body.vehicle, body.vehicle_plate, body.vehicle_chassis, body.vehicle_color].filter(Boolean).join(" · ")];
  }
  return [];
}

function lineItems(d: DocumentPdfData): Array<{ label: string; value: number }> {
  const body = d.body ?? {};
  const items: Array<{ label: string; value: number }> = [];
  const origin: string | undefined = body.origin;
  const destination: string | undefined = body.destination;
  const freightLabel =
    origin && destination
      ? `Embarque ${origin.toUpperCase()} \u2192 ${destination.toUpperCase()}`
      : "Frete";
  const service = Number(body.service_value ?? 0);
  if (service > 0 || (!body.pickup_value && !body.delivery_value && !body.extra)) {
    items.push({ label: freightLabel, value: service });
  }
  if (Number(body.pickup_value) > 0) items.push({ label: "Coleta", value: Number(body.pickup_value) });
  if (Number(body.delivery_value) > 0) items.push({ label: "Entrega", value: Number(body.delivery_value) });
  if (Number(body.extra) > 0) items.push({ label: "Adicionais", value: Number(body.extra) });
  return items;
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Renders an orçamento/contrato PDF matching the official TransBH layout
 * (orange + blue wave header, description/value table, footer with contact info).
 */
export async function exportDocumentPdf(
  d: DocumentPdfData,
  company: DocumentPdfCompany | null | undefined,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const isContract = d.doc_type === "contract";

  // --- Header band with wave ---
  const headerH = 55;
  const waveUrl = await loadImageDataUrl(waveHeader);
  if (waveUrl) {
    pdf.addImage(waveUrl, "PNG", 0, 0, pageW, headerH);
  } else {
    pdf.setFillColor(...ORANGE);
    pdf.rect(0, 0, pageW, headerH, "F");
  }
  // Logo centered
  const logo = await loadLogoDataUrl(company?.logo_url ?? fallbackLogo);
  if (logo) {
    const targetH = 38;
    const targetW = Math.min(logo.widthFor(targetH), 120);
    pdf.addImage(logo.dataUrl, "PNG", (pageW - targetW) / 2, (headerH - targetH) / 2, targetW, targetH);
  } else {
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(26);
    pdf.setFont("helvetica", "bold");
    pdf.text(company?.name || "TransBH", pageW / 2, headerH / 2 + 2, { align: "center" });
  }

  // --- Title + Date ---
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(isContract ? "CONTRATO" : "ORÇAMENTO", 15, headerH + 18);

  pdf.setFontSize(13);
  pdf.text("DATA:", pageW - 55, headerH + 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const dateStr = dateBR(d.created_at);
  pdf.text(dateStr, pageW - 15, headerH + 16, { align: "right" });
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(pageW - 40, headerH + 17.5, pageW - 15, headerH + 17.5);

  // --- Client fields with underline ---
  const body = d.body ?? {};
  const labelX = 15;
  const valueX = 45;
  const valueEndX = pageW - 15;
  let y = headerH + 30;

  const drawField = (label: string, value: string, italic = false) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`${label}:`, labelX, y);
    pdf.setFont("helvetica", italic ? "italic" : "normal");
    pdf.setFontSize(11);
    const v = value || "";
    // truncate to fit
    const maxWidth = valueEndX - valueX;
    const fitted = pdf.splitTextToSize(v, maxWidth)[0] ?? "";
    pdf.text(fitted, valueX, y);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    pdf.line(valueX, y + 1.2, valueEndX, y + 1.2);
    y += 7;
  };

  drawField("Cliente", d.client_name);
  const veics = vehicleLines(body);
  if (veics.length > 0) {
    drawField("Veículo", veics[0]);
    for (let i = 1; i < veics.length; i++) drawField("", veics[i]);
  }
  drawField("Origem", body.origin ?? "", true);
  drawField("Destino", body.destination ?? "", true);
  if (d.client_phone) drawField("Telefone", d.client_phone, true);
  if (d.client_email) drawField("E-mail", d.client_email, true);
  if (d.client_document) drawField("CPF/CNPJ", d.client_document);

  // --- Table ---
  y += 4;
  const items = lineItems(d);
  const rowsToDraw = Math.max(MIN_ROWS, items.length);
  const rowH = 8;
  const tableX = 15;
  const tableW = pageW - 30;
  const colDescW = tableW * 0.7;
  const colValW = tableW - colDescW;

  const drawCellBox = (x: number, yTop: number, w: number, h: number) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.25);
    pdf.rect(x, yTop, w, h);
  };

  // Header row
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  drawCellBox(tableX, y, colDescW, rowH);
  drawCellBox(tableX + colDescW, y, colValW, rowH);
  pdf.text("DESCRIÇÃO", tableX + colDescW / 2, y + rowH / 2 + 1.6, { align: "center" });
  pdf.text("VALOR", tableX + colDescW + colValW / 2, y + rowH / 2 + 1.6, { align: "center" });
  y += rowH;

  // Item rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  for (let i = 0; i < rowsToDraw; i++) {
    drawCellBox(tableX, y, colDescW, rowH);
    drawCellBox(tableX + colDescW, y, colValW, rowH);
    if (i < items.length) {
      const it = items[i];
      // Bold uppercase words after "Embarque"
      const m = it.label.match(/^(Embarque )(.+?)( \u2192 )(.+)$/);
      const centerX = tableX + colDescW / 2;
      const textY = y + rowH / 2 + 1.5;
      if (m) {
        // draw label parts with mixed bold
        pdf.setFont("helvetica", "normal");
        const w1 = pdf.getTextWidth(m[1]);
        pdf.setFont("helvetica", "bold");
        const w2 = pdf.getTextWidth(m[2]);
        pdf.setFont("helvetica", "normal");
        const w3 = pdf.getTextWidth(m[3]);
        pdf.setFont("helvetica", "bold");
        const w4 = pdf.getTextWidth(m[4]);
        const totalW = w1 + w2 + w3 + w4;
        let x = centerX - totalW / 2;
        pdf.setFont("helvetica", "normal");
        pdf.text(m[1], x, textY); x += w1;
        pdf.setFont("helvetica", "bold");
        pdf.text(m[2], x, textY); x += w2;
        pdf.setFont("helvetica", "normal");
        pdf.text(m[3], x, textY); x += w3;
        pdf.setFont("helvetica", "bold");
        pdf.text(m[4], x, textY);
        pdf.setFont("helvetica", "normal");
      } else {
        pdf.text(it.label, centerX, textY, { align: "center" });
      }
      pdf.text(brl(it.value), tableX + colDescW + colValW / 2, textY, { align: "center" });
    }
    y += rowH;
  }

  // Footer row: validity + total
  drawCellBox(tableX, y, colDescW, rowH);
  drawCellBox(tableX + colDescW, y, colValW, rowH);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(
    isContract ? "Contrato" : "Orçamento válido por 7 dias",
    tableX + 2,
    y + rowH / 2 + 1.5,
  );
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bolditalic");
  pdf.text("Total:", tableX + colDescW + 3, y + rowH / 2 + 1.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(brl(Number(d.total_amount ?? 0)), tableX + colDescW + colValW - 3, y + rowH / 2 + 1.5, {
    align: "right",
  });
  y += rowH;

  // Contract clauses + signatures
  if (isContract) {
    const notes: string = body.notes ?? "";
    y += 8;
    const bottomLimit = pageH - 40;
    const ensureSpace = (mm: number) => {
      if (y + mm > bottomLimit) {
        pdf.addPage();
        y = 20;
      }
    };
    if (notes) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      ensureSpace(6);
      pdf.text("Cláusulas", 15, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const split: string[] = pdf.splitTextToSize(notes, pageW - 30);
      for (const line of split) {
        ensureSpace(5);
        pdf.text(line, 15, y);
        y += 5;
      }
    }
    ensureSpace(20);
    y += 12;
    pdf.setDrawColor(0, 0, 0);
    pdf.line(20, y, 90, y);
    pdf.line(pageW - 90, y, pageW - 20, y);
    pdf.setFontSize(9);
    pdf.text(d.client_name, 55, y + 4, { align: "center" });
    pdf.text("Contratante", 55, y + 8, { align: "center" });
    pdf.text(company?.name || "TransBH", pageW - 55, y + 4, { align: "center" });
    pdf.text("Contratada", pageW - 55, y + 8, { align: "center" });
  }

  // --- Footer with company info ---
  const footerY = pageH - 20;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const line1 = [company?.phone, company?.email]
    .filter(Boolean)
    .join(" | ") || "(61) 98275-5951 | Transbh2018@hotmail.com";
  pdf.text(line1, pageW / 2, footerY, { align: "center" });
  if (company?.address) {
    pdf.text(company.address, pageW / 2, footerY + 4, { align: "center" });
  }
  if (company?.cnpj) {
    pdf.text(`Cnpj: ${company.cnpj}`, pageW / 2, footerY + 8, { align: "center" });
  }

  pdf.save(`${d.doc_type}-${d.client_name.replace(/\s+/g, "_")}-${Date.now()}.pdf`);
}
