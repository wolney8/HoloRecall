import type { LocalAsset } from './models';
import { validateAsset } from './backup';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Decode raster files only. Saved data URLs contain durable bytes, never temporary blob URLs. */
export async function imageFileToAsset(file: File, id = crypto.randomUUID()): Promise<LocalAsset> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new Error('Choose a PNG, WebP or JPEG image, up to 5 MB.');
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = file.type === 'image/png' ? signature[0] === 137 && signature[1] === 80 && signature[2] === 78 && signature[3] === 71
    : file.type === 'image/jpeg' ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255
      : String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' && String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
  if (!valid) throw new Error('The image bytes do not match the file type. SVG and active content are not accepted.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file);
  });
  const image = new Image(); image.src = dataUrl;
  try { await image.decode(); } catch { throw new Error('This image could not be decoded.'); }
  const asset: LocalAsset = { id, name: file.name, mime: file.type as LocalAsset['mime'], dataUrl, width: image.naturalWidth, height: image.naturalHeight };
  validateAsset(asset);
  return asset;
}
