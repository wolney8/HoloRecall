---
name: holorecall-import-integrity
description: Verify HoloRecall import, media, mapping, worker, reimport, and portability changes against its content-only safety and data-integrity contracts.
---

# HoloRecall import integrity

Read `AGENTS.md`, `docs/HoloRecall_Product_Charter_v1.md`, `docs/anki-import.md`, `docs/deck-format.md`, and the import compatibility tracker in `docs/project-status.md`.

Exercise authorised real-export fixtures plus malformed/security fixtures. Verify stable source identities, note/card counts, mapping signatures, sanitisation, bounded archive/media work, worker cancellation/stale-response cleanup, atomic apply, local-edit conflict handling, reload, reimport, and portable/full-backup recovery. Confirm imports never adopt scheduling, reviews, reward state, entitlements, remote resources, or executable template content.

Update the compatibility matrix with exact variants, formats, omissions, fixture provenance, engines and native-only gaps. A passing self-generated round trip is supporting evidence, not sole interoperability proof.
