import type { LocalAsset } from '../domain/models';

/** Raster-only local upload. Decode before saving; source bytes remain portable. */
export async function readArtwork(file: File): Promise<LocalAsset> {
  if (file.size > 4 * 1024 * 1024) throw new Error('Choose an image smaller than 4 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null;
  if (!mime || file.type !== mime) throw new Error('Use a valid PNG, WebP or JPEG. SVG, HTML and scripts are not accepted.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('This image could not be decoded. Choose a different file.'); }
  const { width, height } = bitmap;
  bitmap.close();
  if (width < 16 || height < 16 || width > 4096 || height > 4096) throw new Error('Image dimensions must be between 16 and 4096 pixels.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(file);
  });
  return { id: crypto.randomUUID(), name: file.name.slice(0, 160), mime, dataUrl, width, height };
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
