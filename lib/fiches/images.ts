// Prépare une image pour Claude / OpenAI : formats acceptés JPEG, PNG, GIF, WebP.
// Les autres (AVIF, HEIC iPhone, TIFF…) sont convertis en JPEG ; si impossible, l'image est ignorée.
import "server-only";

export type Prepared = { media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: Buffer };

function detect(b: Buffer): Prepared["media_type"] | null {
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.subarray(0, 3).toString() === "GIF") return "image/gif";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export async function prepareImage(url: string): Promise<Prepared | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    let data: Buffer = Buffer.from(await res.arrayBuffer());
    let media_type = detect(data);
    // Format non accepté, ou image trop lourde (> 4 Mo) : conversion en JPEG
    if (!media_type || data.length > 4_000_000) {
      const sharp = (await import("sharp")).default;
      data = await sharp(data).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
      media_type = "image/jpeg";
    }
    return { media_type, data };
  } catch {
    return null; // illisible (ex. HEIC non pris en charge) : on continue sans cette image
  }
}
