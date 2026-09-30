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
  let dimensions: { width: number; height: number };
  try { dimensions = await decodeRaster(file); } catch { throw new Error('This image could not be decoded. Choose a different file.'); }
  const { width, height } = dimensions;
  if (width < 16 || height < 16 || width > 4096 || height > 4096) throw new Error('Image dimensions must be between 16 and 4096 pixels.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(file);
  });
  return { id: crypto.randomUUID(), name: file.name.slice(0, 160), mime, dataUrl, width, height };
}

/** Decode dimensions with ImageBitmap where available and a WebKit-safe Image fallback. */
export async function decodeRaster(blob: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    if (typeof image.decode === 'function') await image.decode();
    else await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Image decode failed.')); });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image has no dimensions.');
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}
