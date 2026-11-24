// Regroupe plusieurs bordereaux (PDF ou images) en un seul PDF à imprimer.
import { PDFDocument } from "pdf-lib";
import { bordereauLink } from "./data";

export async function mergeBordereaux(values: string[]) {
  const out = await PDFDocument.create();
  const failed: string[] = [];
  for (const v of values) {
    try {
      const res = await fetch(await bordereauLink(v));
      if (!res.ok) throw new Error(String(res.status));
      const bytes = new Uint8Array(await res.arrayBuffer());
      const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50; // "%P"
      if (isPdf) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else {
        const isPng = bytes[0] === 0x89;
        const img = isPng ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([595, 842]); // A4
        const scale = Math.min(555 / img.width, 802 / img.height);
        page.drawImage(img, {
          x: (595 - img.width * scale) / 2,
          y: 842 - 20 - img.height * scale,
          width: img.width * scale,
          height: img.height * scale,
        });
      }
    } catch {
      failed.push(v);
    }
  }
  const blob = new Blob([(await out.save()) as BlobPart], { type: "application/pdf" });
  return { url: URL.createObjectURL(blob), count: out.getPageCount(), failed: failed.length };
}
