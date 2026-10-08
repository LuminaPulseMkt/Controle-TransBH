import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VistoriaReport } from "@/components/vistoria/VistoriaReport";
import {
  VISTORIA_KIND_LABEL, normalizeVistoriaData,
  type VistoriaKind, type VistoriaStatus, type VistoriaTransportInfo,
} from "@/lib/vistoria-types";

interface Props {
  kind: VistoriaKind | null;
  status: VistoriaStatus | null;
  data: unknown;
  transport: VistoriaTransportInfo;
  onClose: () => void;
}

/** Abre quando `kind` não é nulo. */
export function VistoriaViewDialog({ kind, status, data, transport, onClose }: Props) {
  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Vistoria de {kind ? VISTORIA_KIND_LABEL[kind].toLowerCase() : ""}
            {status && status !== "finalizada" ? " (em andamento)" : ""}
          </DialogTitle>
        </DialogHeader>
        {kind && <VistoriaReport data={normalizeVistoriaData(data)} transport={transport} />}
      </DialogContent>
    </Dialog>
  );
}
