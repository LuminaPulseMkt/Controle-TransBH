import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentView, type DocumentViewData } from "@/components/DocumentView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { brl, dateBR } from "@/lib/format";
import jsPDF from "jspdf";
import { AcceptBudgetCard } from "@/components/AcceptBudgetCard";

export const Route = createFileRoute("/d/$token")({
  component: PublicDocumentPage,
});

interface CompanyInfo {
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  cnpj: string | null;
}

function PublicDocumentPage() {
  const { token } = Route.useParams();
  const [doc, setDoc] = useState<(DocumentViewData & { accepted_at?: string | null; accepted_contract_id?: string | null }) | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acceptedContractToken, setAcceptedContractToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: docData, error }, { data: companyData }] = await Promise.all([
        supabase
          .from("documents")
          .select("id,doc_type,title,client_name,client_document,client_phone,client_email,total_amount,body,created_at,accepted_at,accepted_contract_id")
          .eq("public_token", token)
          .maybeSingle(),
        supabase.from("company_settings").select("name,phone,whatsapp,email,address,cnpj").maybeSingle(),
      ]);

      // Se já foi aceito, buscar token público do contrato gerado
      let contractToken: string | null = null;
      if (docData?.accepted_contract_id) {
        const { data: contractData } = await supabase
          .from("documents")
          .select("public_token")
          .eq("id", docData.accepted_contract_id)
          .maybeSingle();
        contractToken = contractData?.public_token ?? null;
      }
      setAcceptedContractToken(contractToken);
      if (!active) return;
      if (error || !docData) {
        setNotFound(true);
      } else {
        setDoc(docData as any);
        setCompany((companyData as CompanyInfo) ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const exportPDF = () => {
    if (!doc) return;
    const d = doc;
    const pdf = new jsPDF();
    pdf.setFillColor(13, 27, 42);
    pdf.rect(0, 0, 210, 30, "F");
    pdf.setTextColor(245, 158, 11);
    pdf.setFontSize(24);
    pdf.text(company?.name || "TransBH", 14, 20);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text(d.doc_type === "budget" ? "ORÇAMENTO" : "CONTRATO DE TRANSPORTE", 200, 20, { align: "right" });

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.text(d.title, 14, 45);
    pdf.setFontSize(10);
    pdf.text(`Data: ${dateBR(d.created_at)}`, 14, 52);

    let y = 65;
    pdf.setFontSize(12);
    pdf.text("Cliente", 14, y); y += 6;
    pdf.setFontSize(10);
    pdf.text(`Nome: ${d.client_name}`, 14, y); y += 5;
    if (d.client_document) { pdf.text(`Documento: ${d.client_document}`, 14, y); y += 5; }
    if (d.client_phone) { pdf.text(`Telefone: ${d.client_phone}`, 14, y); y += 5; }
    if (d.client_email) { pdf.text(`E-mail: ${d.client_email}`, 14, y); y += 5; }
    if (d.body?.client_address) { pdf.text(`Endereço: ${d.body.client_address}`, 14, y); y += 5; }

    y += 5;
    pdf.setFontSize(12);
    pdf.text("Detalhes do Serviço", 14, y); y += 6;
    pdf.setFontSize(10);
    if (d.body?.vehicle) { pdf.text(`Veículo: ${d.body.vehicle}`, 14, y); y += 5; }
    if (d.body?.origin) { pdf.text(`Origem: ${d.body.origin}`, 14, y); y += 5; }
    if (d.body?.destination) { pdf.text(`Destino: ${d.body.destination}`, 14, y); y += 5; }

    y += 5;
    pdf.setFontSize(12);
    pdf.text("Valores", 14, y); y += 6;
    pdf.setFontSize(10);
    pdf.text(`Frete: ${brl(d.body?.service_value ?? 0)}`, 14, y); y += 5;
    if (d.body?.extra) { pdf.text(`Adicionais: ${brl(d.body.extra)}`, 14, y); y += 5; }
    if (d.body?.pickup_value) { pdf.text(`Coleta: ${brl(d.body.pickup_value)}`, 14, y); y += 5; }
    if (d.body?.delivery_value) { pdf.text(`Entrega: ${brl(d.body.delivery_value)}`, 14, y); y += 5; }
    pdf.setFontSize(14);
    pdf.setTextColor(245, 158, 11);
    pdf.text(`TOTAL: ${brl(d.total_amount ?? 0)}`, 14, y + 5);

    if (d.body?.notes) {
      y += 18;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      const split = pdf.splitTextToSize(d.body.notes, 180);
      pdf.text(split, 14, y);
    }

    pdf.save(`${d.doc_type}-${d.client_name.replace(/\s+/g, "_")}-${Date.now()}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 dark py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Documento não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O link pode estar incorreto ou ter expirado. Entre em contato com a TransBH.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Ir para o início
          </Link>
        </div>
      </div>
    );
  }

  const isContract = doc.doc_type === "contract";

  return (
    <div className="min-h-screen bg-muted/20 dark">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">{company?.name || "TransBH"}</span>
            <span className="text-muted-foreground ml-2 hidden sm:inline">
              {isContract ? "Contrato" : "Orçamento"} — {doc.client_name}
            </span>
          </div>
          <Button size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-1" /> Baixar PDF
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-lg overflow-hidden border border-border shadow-sm bg-background">
          <DocumentView doc={doc} company={company} showFooter />
        </div>

        {doc.doc_type === "budget" && (
          <AcceptBudgetCard
            token={token}
            acceptedAt={doc.accepted_at}
            acceptedContractToken={acceptedContractToken}
            onAccepted={(ct) => setAcceptedContractToken(ct)}
          />
        )}

        <div className="mt-2 text-center text-xs text-muted-foreground">
          Documento gerado por {company?.name || "TransBH"} · Para dúvidas entre em contato pelos canais acima.
        </div>
      </div>
    </div>
  );
}
