import { loadLogoDataUrl } from "@/lib/pdf-logo";
import fallbackLogo from "@/assets/logo-transbh.png";
import {
  FUEL_STEPS, PART_STATE_LABEL, TIRE_SLOTS, VISTORIA_DOCUMENTS, VISTORIA_KIND_LABEL, VISTORIA_PARTS,
  VISTORIA_PHOTOS, type VistoriaData, type VistoriaKind, type VistoriaTransportInfo,
} from "@/lib/vistoria-types";

interface LoadedImage { dataUrl: string; w: number; h: number; format: "JPEG" | "PNG" }

async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("img"));
      img.src = dataUrl;
    });
    return { dataUrl, ...dims, format: dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG" };
  } catch {
    return null;
  }
}

const yesNo = (v: boolean | null) => (v === null ? "—" : v ? "Sim" : "Não");

export async function exportVistoriaPDF(opts: {
  kind: VistoriaKind;
  data: VistoriaData;
  transport: VistoriaTransportInfo;
  finishedAt?: string | null;
  company?: { name?: string | null; logo_url?: string | null } | null;
}): Promise<void> {
  const { kind, data, transport, finishedAt, company } = opts;
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = 10;

  // Cabeçalho
  const logo = (await loadLogoDataUrl(company?.logo_url ?? null)) ?? (await loadLogoDataUrl(fallbackLogo));
  if (logo) {
    const h = 16;
    doc.addImage(logo.dataUrl, "PNG", 10, y, Math.min(logo.widthFor(h), 50), h);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`VISTORIA DE ${VISTORIA_KIND_LABEL[kind].toUpperCase()}`, pageW / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(company?.name ?? "TransBH", pageW / 2, y + 14, { align: "center" });
  y += 22;

  const vehicle = [transport.vehicle_brand, transport.vehicle_model].filter(Boolean).join(" ") || "—";
  const when = finishedAt ? new Date(finishedAt).toLocaleString("pt-BR") : "—";
  const head = { fillColor: [13, 27, 42] as [number, number, number], textColor: 255 };
  const section = (title: string, rows: string[][]) => {
    autoTable(doc, {
      startY: y,
      head: [[{ content: title, colSpan: 2 }]],
      body: rows,
      styles: { fontSize: 8.5, cellPadding: 1.6 },
      headStyles: head,
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    });
    y = lastY() + 4;
  };

  section("Transporte e veículo", [
    ["Código", transport.code],
    ["Cliente", transport.client_name],
    ["Placa", transport.vehicle_plate],
    ["Veículo", vehicle],
    ["Cor / ano", `${transport.vehicle_color ?? "—"} / ${transport.vehicle_year ?? "—"}`],
    ["Rota", `${transport.origin_city}/${transport.origin_state} → ${transport.destination_city}/${transport.destination_state}`],
    ["Finalizada em", when],
  ]);

  section("Motorista", [
    ["Nome", data.driver.name || "—"],
    ["CPF", data.driver.cpf || "—"],
    ["Placa do guincho/cegonha", (data.driver.tow_plate || "—").toUpperCase()],
  ]);

  const g = data.general;
  section("Geral", [
    ["Acesso ao interior", yesNo(g.interior_access)],
    ["Veículo funcionando", yesNo(g.vehicle_working)],
    ["CRLV apresentado", yesNo(g.crlv_present)],
    ["KM", g.km || "—"],
    ["Combustível", FUEL_STEPS[g.fuel] ?? "—"],
    ["Observação inicial", g.notes || "—"],
    ...TIRE_SLOTS.filter((t) => g.tires[t.key]?.state || g.tires[t.key]?.brand).map((t) => [
      `Pneu ${t.label.toLowerCase()}`,
      [g.tires[t.key]?.state, g.tires[t.key]?.brand].filter(Boolean).join(" · "),
    ]),
  ]);

  section(
    "Questionário",
    VISTORIA_PARTS.map((p) => [p.label, data.checks[p.key] ? PART_STATE_LABEL[data.checks[p.key]] : "—"]),
  );

  // Fotos (3 por linha)
  const photoItems: { label: string; url: string }[] = [
    ...VISTORIA_PHOTOS.filter((p) => data.photos[p.key]).map((p) => ({ label: p.label, url: data.photos[p.key] })),
    ...data.extra_photos.map((url, i) => ({ label: `Avaria extra ${i + 1}`, url })),
    ...VISTORIA_DOCUMENTS.filter((d) => data.documents[d.key]).map((d) => ({ label: d.label, url: data.documents[d.key] })),
  ];
  if (photoItems.length > 0) {
    doc.addPage();
    y = 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Fotos e documentos", 10, y);
    y += 6;
    const cols = 3;
    const gap = 4;
    const cellW = (pageW - 20 - gap * (cols - 1)) / cols;
    const cellH = 52;
    const labelH = 5;
    const loaded = await Promise.all(photoItems.map((p) => loadImage(p.url)));
    photoItems.forEach((p, i) => {
      const col = i % cols;
      if (col === 0 && i > 0) y += cellH + labelH + gap;
      if (y + cellH + labelH > pageH - 10) {
        doc.addPage();
        y = 10;
      }
      const x = 10 + col * (cellW + gap);
      const img = loaded[i];
      if (img) {
        const ratio = Math.min(cellW / img.w, cellH / img.h);
        const w = img.w * ratio;
        const h = img.h * ratio;
        doc.addImage(img.dataUrl, img.format, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h);
      } else {
        doc.setDrawColor(180);
        doc.rect(x, y, cellW, cellH);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Imagem indisponível", x + cellW / 2, y + cellH / 2, { align: "center" });
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(p.label, x, y + cellH + 3.5, { maxWidth: cellW });
    });
    y += cellH + labelH + gap;
  }

  // Cliente + assinatura
  if (y > pageH - 80) {
    doc.addPage();
    y = 10;
  }
  section("Cliente", [
    ["Nome", data.client.name || "—"],
    ["CPF", data.client.cpf || "—"],
    ["E-mail", data.client.email || "—"],
  ]);
  if (data.client.signature_url) {
    const sig = await loadImage(data.client.signature_url);
    if (sig) {
      const h = 28;
      const w = Math.min((sig.w / sig.h) * h, 80);
      doc.addImage(sig.dataUrl, sig.format, 10, y, w, h);
      doc.setDrawColor(120);
      doc.line(10, y + h + 1, 90, y + h + 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Assinatura do cliente", 10, y + h + 5);
    }
  }

  doc.save(`vistoria-${kind}-${(transport.vehicle_plate || "veiculo").replace(/\s+/g, "_")}.pdf`);
}
