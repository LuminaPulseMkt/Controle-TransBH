import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSiteSettings, SiteImageKey } from "@/lib/use-site-settings";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";

export const Route = createFileRoute("/site-images")({
  component: SiteImagesPage,
});

function SiteImagesPage() {
  const { settings, refetch, isLoading } = useSiteSettings();
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const imageConfigs: { key: SiteImageKey; label: string; description: string }[] = [
    {
      key: "hero_bg",
      label: "Fundo do Hero (Home)",
      description: "Imagem de fundo exibida na primeira seção da página inicial.",
    },
    {
      key: "about_img",
      label: "Imagem 'Sobre Nós'",
      description: "Imagem exibida na seção que conta a história da TransBH.",
    },
    {
      key: "features_img",
      label: "Ícone de Diferenciais",
      description: "Imagem ou ícone destaque da seção de diferenciais.",
    },
    {
      key: "lead_form_bg",
      label: "Fundo do Formulário",
      description: "Imagem de fundo suave para a seção de orçamento.",
    },
  ];

  const handleUpload = async (key: SiteImageKey, file: File) => {
    if (!file) return;

    setIsUploading(key);
    try {
      // 1. Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${key}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `site/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Gerar URL assinada de longa duração (bucket privado)
      const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
      const { data: signed, error: signedError } = await supabase.storage
        .from("site-images")
        .createSignedUrl(filePath, TEN_YEARS_IN_SECONDS);

      if (signedError || !signed?.signedUrl) throw signedError ?? new Error("URL não gerada");

      // 3. Save to site_settings table
      const { error: dbError } = await supabase
        .from("site_settings")
        .upsert({ key, value: signed.signedUrl }, { onConflict: "key" });

      if (dbError) throw dbError;

      toast.success(`${key} atualizado com sucesso!`);
      refetch();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da imagem.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleDelete = async (key: SiteImageKey) => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .delete()
        .eq("key", key);

      if (error) throw error;

      toast.success("Configuração removida. O site voltará ao padrão.");
      refetch();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erro ao remover configuração.");
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Imagens do Site</h1>
            <p className="text-muted-foreground">
              Gerencie as imagens principais da sua landing page.
            </p>
          </div>
          <ImageIcon className="h-10 w-10 text-muted-foreground opacity-20" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {imageConfigs.map((config) => (
              <Card key={config.key} className="overflow-hidden border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">{config.label}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                    {settings?.[config.key] ? (
                      <>
                        <img 
                          src={settings[config.key]} 
                          alt={config.label} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <Button 
                             variant="destructive" 
                             size="icon"
                             onClick={() => handleDelete(config.key)}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6">
                        <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <span className="text-xs text-muted-foreground italic">Nenhuma imagem personalizada</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`upload-${config.key}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(config.key, file);
                      }}
                      disabled={isUploading === config.key}
                    />
                    <Button 
                      asChild 
                      className="w-full cursor-pointer"
                      disabled={isUploading === config.key}
                    >
                      <label htmlFor={`upload-${config.key}`}>
                        {isUploading === config.key ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {settings?.[config.key] ? "Trocar Imagem" : "Enviar Imagem"}
                      </label>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
