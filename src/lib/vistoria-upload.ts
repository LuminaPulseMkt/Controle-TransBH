import { supabase } from "@/integrations/supabase/client";

const BUCKET = "transport-photos";
const MAX_SIDE = 1600;

/** Reduz a foto (câmera do celular costuma gerar 5–10 MB) antes do envio. */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Envia um arquivo para vistorias/<token>/<nome> e devolve a URL pública. */
export async function uploadVistoriaFile(
  token: string,
  name: string,
  body: Blob,
  contentType: string,
): Promise<string> {
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `vistorias/${token}/${name}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadVistoriaPhoto(token: string, name: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  return uploadVistoriaFile(token, name, blob, blob.type === "image/jpeg" ? "image/jpeg" : file.type || "image/jpeg");
}
