import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fileIntegrity } from './file-integrity';

describe('file integrity receipt', () => {
  it('reports the exact byte length and SHA-256 without changing the bytes', async () => {
    const bytes = new TextEncoder().encode('HoloRecall APKG round-trip');
    const before = bytes.slice();
    const receipt = await fileIntegrity('lesson.apkg', bytes);
    expect(receipt).toEqual({
      name: 'lesson.apkg',
      byteLength: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    expect(bytes).toEqual(before);
  });
});
