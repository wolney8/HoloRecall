import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shippedLearnerCopySources = [
  new URL('./app.html', import.meta.url),
  new URL('./collection/collection-desk.html', import.meta.url),
  new URL('./data/local-database.ts', import.meta.url),
  new URL('./data/study-store.ts', import.meta.url),
  new URL('./settings/local-data-settings.ts', import.meta.url),
  new URL('../domain/backup.ts', import.meta.url),
  new URL('../domain/exchange.ts', import.meta.url),
];

describe('learner-facing product copy', () => {
  it('does not reintroduce known prototype or workspace scaffolding', () => {
    const shippedCopy = shippedLearnerCopySources.map(source => readFileSync(source, 'utf8')).join('\n');
    for (const phrase of ['Local prototype', 'LOCAL WORKSPACE', 'Loading local workspace', 'use this local prototype', 'prototype limit', 'Collection Desk workspace', 'stored in this browser', 'untouched browser profile', 'Bundled demonstration artwork']) {
      expect(shippedCopy, phrase).not.toContain(phrase);
    }
  });

  it('retains explicit local-storage and no-sync disclosure', () => {
    const shell = readFileSync(new URL('./app.html', import.meta.url), 'utf8');
    expect(shell).toContain('Stored on this device');
    expect(shell).toContain('No cloud account or sync.');
    expect(shell).toContain('Export backups from Settings.');
    const settings = readFileSync(new URL('./settings/local-data-settings.ts', import.meta.url), 'utf8');
    expect(settings).toContain('stored on this device and is not synced to a cloud account');
  });
});
