export type FileIntegrity = {
  name: string;
  byteLength: number;
  sha256: string;
};

/** Identifies the exact bytes handed to or received from a platform file surface. */
export async function fileIntegrity(name: string, bytes: Uint8Array): Promise<FileIntegrity> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', copy.buffer));
  return {
    name,
    byteLength: bytes.byteLength,
    sha256: [...digest].map(byte => byte.toString(16).padStart(2, '0')).join(''),
  };
}
