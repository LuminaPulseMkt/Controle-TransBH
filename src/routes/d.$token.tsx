import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentView, type DocumentViewData } from "@/components/DocumentView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";

import { AcceptBudgetCard } from "@/components/AcceptBudgetCard";
import { exportDocumentPdf } from "@/lib/document-pdf";

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
  logo_url: string | null;
  website: string | null;
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
      const [{ data: docRows, error }, { data: companyData }] = await Promise.all([
        supabase.rpc("get_document_by_token", { _token: token }),
        supabase.rpc("get_public_company_info").maybeSingle(),
      ]);
      const docData = Array.isArray(docRows) ? docRows[0] ?? null : (docRows as any) ?? null;

      // Se já foi aceito, recuperar token público do contrato gerado via RPC
      let contractToken: string | null = null;
      if (docData?.accepted_contract_id) {
        const { data: ctk } = await supabase.rpc("get_contract_token_for_budget", { _budget_token: token });
        contractToken = (typeof ctk === "string" ? ctk : null);
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

  const exportPDF = async () => {
    if (!doc) return;
    await exportDocumentPdf(doc, company);
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
