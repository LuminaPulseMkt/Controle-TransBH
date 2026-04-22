import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentView, type DocumentViewData } from "./DocumentView";

interface DocumentPreview extends DocumentViewData {
  template: string | null;
  public_token?: string | null;
}

interface Props {
  doc: DocumentPreview | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExportPDF?: (d: DocumentPreview) => void;
  onShareWhatsApp?: (d: DocumentPreview) => void;
}

export function DocumentPreviewDialog({ doc, open, onOpenChange, onExportPDF, onShareWhatsApp }: Props) {
  if (!doc) return null;

  const copyLink = async () => {
    if (!doc.public_token) return toast.error("Link público indisponível.");
    const url = `${window.location.origin}/d/${doc.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      window.prompt("Copie o link:", url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{doc.title}</DialogTitle>
        </DialogHeader>

        <DocumentView doc={doc} />

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
          {doc.public_token && (
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Link2 className="h-4 w-4 mr-1" /> Copiar link
            </Button>
          )}
          {onShareWhatsApp && (
            <Button variant="outline" size="sm" onClick={() => onShareWhatsApp(doc)}>
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </Button>
          )}
          {onExportPDF && (
            <Button size="sm" onClick={() => onExportPDF(doc)}>
              <Download className="h-4 w-4 mr-1" /> Baixar PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
