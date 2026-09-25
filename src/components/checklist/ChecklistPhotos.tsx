import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  checklistId: string;
}

export function ChecklistPhotos({ photos, onChange, checklistId }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? "anon";
      const uploaded: string[] = [];
      for (const file of files) {
        const path = `${uid}/checklists/${checklistId}/photos/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("transport-photos")
          .upload(path, file, { contentType: file.type, upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("transport-photos").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      onChange([...photos, ...uploaded]);
      toast.success(`${uploaded.length} foto(s) adicionada(s).`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (url: string) => onChange(photos.filter((p) => p !== url));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((url) => (
          <div key={url} className="relative h-20 w-20 rounded-md overflow-hidden border border-neutral-300 group">
            <img src={url} alt="Foto do checklist" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover foto"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={onFilesSelected} />
      <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
        Adicionar fotos
      </Button>
    </div>
  );
}
