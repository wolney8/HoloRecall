import { describe, expect, it } from 'vitest';
import type { DesignSet } from '../../domain/models';
import { DesignDraftHistory } from './design-draft-history';

const design = (name = 'Original'): DesignSet => ({ id: 'design', name, backgroundFit: 'cover', backgroundPositionX: 50, backgroundPositionY: 50, frameFit: 'contain', credit: '', source: '', license: '' });

describe('Design Studio draft history', () => {
  it('tracks dirty state, bounded undo and redo without mutating saved input', () => {
    const history = new DesignDraftHistory(2), original = design(); history.start(original);
    let editor = history.record(original, design('First')); editor = history.record(editor, design('Second')); editor = history.record(editor, design('Third'));
    expect(history.dirty(editor)).toBe(true); expect(history.canUndo()).toBe(true); expect(original.name).toBe('Original');
    editor = history.undo(editor); expect(editor.name).toBe('Second'); editor = history.undo(editor); expect(editor.name).toBe('First');
    editor = history.undo(editor); expect(editor.name).toBe('First'); editor = history.redo(editor); expect(editor.name).toBe('Second');
  });
  it('reverts to the last saved baseline and clears transient history', () => {
    const history = new DesignDraftHistory(); let editor = design(); history.start(editor); editor = history.record(editor, design('Draft')); history.saved(design('Saved'));
    editor = history.record(design('Saved'), design('Later')); editor = history.revert(editor);
    expect(editor.name).toBe('Saved'); expect(history.dirty(editor)).toBe(false); expect(history.canUndo()).toBe(false);
  });
});
