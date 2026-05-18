import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SignaturePad } from "./SignaturePad";
import {
  CHECKLIST_ITEMS,
  type ChecklistData,
  type FuelLevel,
  type ItemStatus,
  type PartySection,
  type TireCondition,
} from "@/lib/checklist-types";

const FUEL_LEVELS: FuelLevel[] = ["0", "1/4", "1/2", "3/4", "cheio"];
const TIRE_CONDITIONS: { value: TireCondition; label: string }[] = [
  { value: "bom", label: "Bom" },
  { value: "medio", label: "Médio" },
  { value: "ruim", label: "Ruim" },
  { value: "furado", label: "Furado" },
];

interface Props {
  data: ChecklistData;
  onChange: (d: ChecklistData) => void;
  checklistId: string;
}

export function ChecklistForm({ data, onChange, checklistId }: Props) {
  const update = (patch: Partial<ChecklistData>) => onChange({ ...data, ...patch });
  const updateItem = (key: string, status: ItemStatus) =>
    update({ items: { ...data.items, [key]: status } });
  const updateTire = (idx: number, patch: Partial<ChecklistData["tires"][number]>) => {
    const tires = data.tires.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    update({ tires });
  };
  const updateParty = (key: "pickup" | "delivery", patch: Partial<PartySection>) =>
    update({ [key]: { ...data[key], ...patch } } as Partial<ChecklistData>);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <Card className="p-4 space-y-3">
        <h3 className="text-display text-lg">Dados do veículo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Cliente</Label>
            <Input value={data.client_name} onChange={(e) => update({ client_name: e.target.value })} />
          </div>
          <div><Label>Placa</Label><Input value={data.plate} onChange={(e) => update({ plate: e.target.value.toUpperCase() })} /></div>
          <div><Label>Modelo</Label><Input value={data.model} onChange={(e) => update({ model: e.target.value })} /></div>
          <div><Label>DUT</Label><Input value={data.dut} onChange={(e) => update({ dut: e.target.value })} /></div>
          <div><Label>Cor</Label><Input value={data.color} onChange={(e) => update({ color: e.target.value })} /></div>
          <div><Label>KM</Label><Input value={data.km} onChange={(e) => update({ km: e.target.value })} /></div>
          <div><Label>Local</Label><Input value={data.location} onChange={(e) => update({ location: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={data.checklist_date} onChange={(e) => update({ checklist_date: e.target.value })} /></div>
          <div><Label>Hora</Label><Input type="time" value={data.checklist_time} onChange={(e) => update({ checklist_time: e.target.value })} /></div>
        </div>
      </Card>

      {/* Interior do veículo */}
      <Card className="p-4 space-y-3">
        <h3 className="text-display text-lg">Interior do veículo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 border border-border rounded-md px-3 py-2">
              <span className="text-sm flex-1">{item}</span>
              <div className="flex gap-1">
                <Button
                  type="button" size="sm"
                  variant={data.items[item] === "ok" ? "default" : "outline"}
                  onClick={() => updateItem(item, data.items[item] === "ok" ? null : "ok")}
                >OK</Button>
                <Button
                  type="button" size="sm"
                  variant={data.items[item] === "nok" ? "destructive" : "outline"}
                  onClick={() => updateItem(item, data.items[item] === "nok" ? null : "nok")}
                >Não OK</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pneus */}
      <Card className="p-4 space-y-3">
        <h3 className="text-display text-lg">Pneus</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-2">Posição</th>
                <th className="py-2 pr-2">Medida</th>
                <th className="py-2 pr-2">Marca</th>
                <th className="py-2">Condição</th>
              </tr>
            </thead>
            <tbody>
              {data.tires.map((t, idx) => (
                <tr key={t.position} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-2 font-medium">{t.position}</td>
                  <td className="py-2 pr-2"><Input value={t.size} placeholder="/ / R" onChange={(e) => updateTire(idx, { size: e.target.value })} /></td>
                  <td className="py-2 pr-2"><Input value={t.brand} onChange={(e) => updateTire(idx, { brand: e.target.value })} /></td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {TIRE_CONDITIONS.map((c) => (
                        <Button
                          key={c.value} type="button" size="sm"
                          variant={t.condition === c.value ? "default" : "outline"}
                          onClick={() => updateTire(idx, { condition: t.condition === c.value ? null : c.value })}
                        >{c.label}</Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Combustível + Observações */}
      <Card className="p-4 space-y-3">
        <h3 className="text-display text-lg">Combustível</h3>
        <div className="flex flex-wrap gap-2">
          {FUEL_LEVELS.map((lvl) => (
            <Button
              key={lvl} type="button"
              variant={data.fuel_level === lvl ? "default" : "outline"}
              onClick={() => update({ fuel_level: data.fuel_level === lvl ? null : lvl })}
            >{lvl === "cheio" ? "Cheio" : lvl}</Button>
          ))}
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea rows={4} value={data.observations} onChange={(e) => update({ observations: e.target.value })} />
        </div>
      </Card>

      {/* Coleta / Entrega */}
      <Card className="p-4">
        <Tabs defaultValue="pickup">
          <TabsList>
            <TabsTrigger value="pickup">Coleta</TabsTrigger>
            <TabsTrigger value="delivery">Entrega</TabsTrigger>
          </TabsList>
          {(["pickup", "delivery"] as const).map((key) => (
            <TabsContent key={key} value={key} className="space-y-3 mt-4">
              <PartyFields
                section={data[key]}
                onChange={(patch) => updateParty(key, patch)}
                checklistId={checklistId}
                fieldPrefix={key}
              />
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}

function PartyFields({
  section, onChange, checklistId, fieldPrefix,
}: {
  section: PartySection;
  onChange: (patch: Partial<PartySection>) => void;
  checklistId: string;
  fieldPrefix: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><Label>Nome do motorista</Label><Input value={section.driver_name} onChange={(e) => onChange({ driver_name: e.target.value })} /></div>
      <div><Label>RG</Label><Input value={section.driver_rg} onChange={(e) => onChange({ driver_rg: e.target.value })} /></div>
      <div><Label>Cidade</Label><Input value={section.city} onChange={(e) => onChange({ city: e.target.value })} /></div>
      <div><Label>Estado</Label><Input value={section.state} onChange={(e) => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })} /></div>
      <div className="md:col-span-2 flex items-center gap-2">
        <Checkbox id={`${fieldPrefix}-agree`} checked={section.agreed} onCheckedChange={(v) => onChange({ agreed: !!v })} />
        <Label htmlFor={`${fieldPrefix}-agree`} className="text-sm">Declaro estar de acordo com as informações deste documento.</Label>
      </div>
      <div className="md:col-span-2">
        <SignaturePad
          label="Assinatura do motorista"
          value={section.signature_url}
          onChange={(url) => onChange({ signature_url: url })}
          checklistId={checklistId}
          field={`${fieldPrefix}-driver`}
        />
      </div>
      <div><Label>Nome do responsável</Label><Input value={section.responsible_name} onChange={(e) => onChange({ responsible_name: e.target.value })} /></div>
      <div><Label>RG</Label><Input value={section.responsible_rg} onChange={(e) => onChange({ responsible_rg: e.target.value })} /></div>
      <div className="md:col-span-2">
        <SignaturePad
          label="Assinatura do responsável"
          value={section.responsible_signature_url}
          onChange={(url) => onChange({ responsible_signature_url: url })}
          checklistId={checklistId}
          field={`${fieldPrefix}-responsible`}
        />
      </div>
      <div><Label>Data</Label><Input type="date" value={section.date} onChange={(e) => onChange({ date: e.target.value })} /></div>
      <div><Label>Hora</Label><Input type="time" value={section.time} onChange={(e) => onChange({ time: e.target.value })} /></div>
    </div>
  );
}
