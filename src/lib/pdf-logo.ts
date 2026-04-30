// Helper para carregar a logo da empresa como dataURL para usar em jsPDF.addImage.
// Retorna também as dimensões originais para preservar a proporção.

export interface LoadedLogo {
  dataUrl: string;
  width: number;
  height: number;
  /** Calcula a largura proporcional para uma dada altura (em mm ou px) */
  widthFor(height: number): number;
}

export async function loadLogoDataUrl(url: string | null | undefined): Promise<LoadedLogo | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("img load fail"));
      img.src = dataUrl;
    });
    return {
      dataUrl,
      width: dims.w,
      height: dims.h,
      widthFor(height: number) {
        if (!dims.h) return height;
        return (dims.w / dims.h) * height;
      },
    };
  } catch {
    return null;
  }
}
