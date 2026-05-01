import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: () => (
    <AuthGate adminOnly>
      <SettingsPage />
    </AuthGate>
  ),
});

function SettingsPage() {
  return (
    <AppLayout title="Configurações">
      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="templates">Modelos de Mensagem</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="mt-4"><CompanyTab /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function CompanyTab() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("company_settings").select("*").maybeSingle();
      setData(c ?? {});
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("company_settings")
      .update({
        name: data.name,
        cnpj: data.cnpj,
        address: data.address,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        logo_url: data.logo_url,
        google_review_url: data.google_review_url,
        instagram_url: data.instagram_url,
        facebook_url: data.facebook_url,
        whatsapp_url: data.whatsapp_url,
        google_business_url: data.google_business_url,
      })
      .eq("singleton", true);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas.");
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `logo-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data: url } = supabase.storage.from("company-assets").getPublicUrl(path);
    setData({ ...data, logo_url: url.publicUrl });
    setUploading(false);
  };

  if (!data) return <Skeleton className="h-72 w-full" />;

  return (
    <Card className="p-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 flex items-center gap-4">
          {data.logo_url ? (
            <img src={data.logo_url} alt="Logo" className="h-20 w-20 rounded object-contain bg-muted p-2" />
          ) : (
            <div className="h-20 w-20 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">Logo</div>
          )}
          <div>
            <Label>Logo da empresa</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="file" accept="image/*" onChange={onLogoChange} disabled={uploading} />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </div>
        <div>
          <Label>Nome</Label>
          <Input value={data.name ?? ""} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </div>
        <div>
          <Label>CNPJ</Label>
          <Input value={data.cnpj ?? ""} onChange={(e) => setData({ ...data, cnpj: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Endereço</Label>
          <Input value={data.address ?? ""} onChange={(e) => setData({ ...data, address: e.target.value })} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={data.phone ?? ""} onChange={(e) => setData({ ...data, phone: e.target.value })} />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={data.whatsapp ?? ""} onChange={(e) => setData({ ...data, whatsapp: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>E-mail</Label>
          <Input type="email" value={data.email ?? ""} onChange={(e) => setData({ ...data, email: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Link Google Reviews</Label>
          <Input
            type="url"
            placeholder="https://g.page/r/..."
            value={data.google_review_url ?? ""}
            onChange={(e) => setData({ ...data, google_review_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Clientes que avaliarem 4 ou 5 estrelas serão redirecionados para este link.
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <h3 className="text-display text-lg mb-1">Redes Sociais</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Configure os links das suas próprias contas. Deixe em branco para ocultar da página Social.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Instagram</Label>
            <Input
              type="url"
              placeholder="https://instagram.com/seu_perfil"
              value={data.instagram_url ?? ""}
              onChange={(e) => setData({ ...data, instagram_url: e.target.value })}
            />
          </div>
          <div>
            <Label>Facebook</Label>
            <Input
              type="url"
              placeholder="https://facebook.com/sua_pagina"
              value={data.facebook_url ?? ""}
              onChange={(e) => setData({ ...data, facebook_url: e.target.value })}
            />
          </div>
          <div>
            <Label>WhatsApp Business</Label>
            <Input
              type="url"
              placeholder="https://wa.me/5531999999999"
              value={data.whatsapp_url ?? ""}
              onChange={(e) => setData({ ...data, whatsapp_url: e.target.value })}
            />
          </div>
          <div>
            <Label>Google Business</Label>
            <Input
              type="url"
              placeholder="https://g.page/seu-negocio"
              value={data.google_business_url ?? ""}
              onChange={(e) => setData({ ...data, google_business_url: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </Card>
  );
}

function TemplatesTab() {
  const [items, setItems] = useState<{ id: string; key: string; label: string; body: string }[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("message_templates").select("*").order("key");
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const save = async (id: string, body: string) => {
    setBusyId(id);
    const { error } = await supabase.from("message_templates").update({ body }).eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Modelo atualizado.");
  };

  if (!items) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      {items.map((t) => (
        <Card key={t.id} className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-display text-lg">{t.label}</h3>
              <p className="text-xs text-muted-foreground">
                Variáveis: {"{client_name}"}, {"{amount}"}, {"{transport_code}"}, {"{days_overdue}"}
              </p>
            </div>
          </div>
          <Textarea
            rows={5}
            defaultValue={t.body}
            onBlur={(e) => { if (e.target.value !== t.body) void save(t.id, e.target.value); }}
          />
          {busyId === t.id && <div className="text-xs text-muted-foreground mt-1">Salvando…</div>}
        </Card>
      ))}
    </div>
  );
}

void Upload;
