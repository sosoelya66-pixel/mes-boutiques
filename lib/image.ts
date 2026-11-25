// Réduit les photos avant l'envoi (une photo d'iPhone fait 3 à 8 Mo ; ici ~300 Ko),
// pour une appli plus rapide sur téléphone et moins de stockage utilisé.
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 400_000) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // format non lisible par le navigateur : on envoie l'original
  }
}
