// src/lib/image.ts
const MAX_WIDTH = 1600;

type OptimizedImage = {
  blob: Blob;
  contentType: string;
  fileName: string;
  previewUrl: string;
  warning?: string;
};

async function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    return await createImageBitmap(file);
  }

  const img = new Image();
  img.decoding = "async";
  img.src = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
  });

  return img;
}

export async function compressToWebp(file: File): Promise<OptimizedImage> {
  const bitmap = await loadImageBitmap(file);

  const width = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
  const height = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;

  const ratio = Math.min(1, MAX_WIDTH / width);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context missing");

  ctx.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, targetWidth, targetHeight);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/webp",
      0.85
    );
  });

  const previewUrl = URL.createObjectURL(blob);

  const ext = "webp";
  const base = file.name.replace(/\.[^.]+$/, "");
  const fileName = `${base}.${ext}`;

  let warning: string | undefined;
  if (ratio < 1) warning = `Görsel küçültüldü: ${width}×${height} → ${targetWidth}×${targetHeight}`;

  return {
    blob,
    contentType: "image/webp",
    fileName,
    previewUrl,
    warning,
  };
}
