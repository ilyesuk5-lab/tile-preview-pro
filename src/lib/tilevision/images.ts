export interface ImageAsset {
  id: string;
  name: string;
  dataUrl: string;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIDE = 1400;

export class InvalidImageError extends Error {
  constructor() {
    super("الصورة غير صالحة. المسموح: JPG أو PNG أو WEBP.");
  }
}

export async function fileToAsset(file: File): Promise<ImageAsset> {
  if (!ALLOWED.includes(file.type)) throw new InvalidImageError();
  const dataUrl = await resizeToDataUrl(file);
  return { id: crypto.randomUUID(), name: file.name, dataUrl };
}

async function resizeToDataUrl(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new InvalidImageError();
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    throw new InvalidImageError();
  }
}

export function dataUrlToFile(dataUrl: string, name: string): File {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head ?? "")?.[1] ?? "image/jpeg";
  const binary = atob(body ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}
