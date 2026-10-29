import { describe, expect, it } from 'vitest';
import { exportBackup, parseBackup } from './backup';
import { createInitialState } from './study';
import type { FocusSessionRequest, StudyExperienceMode, StudySession } from './models';
import { publicSessionLabel, STUDY_MODE_OPTIONS, studyModePresentation } from './study-mode-presentation';

const modeSession = (experienceMode: StudyExperienceMode, label?: string, focus?: FocusSessionRequest): StudySession => ({
  id: 'session',
  mode: experienceMode === 'free-revision' ? 'practice' : 'scheduled',
  experienceMode,
  label,
  focus,
  queue: [],
  total: 0,
  plannedTotal: 0,
  completed: 0,
  revealed: false,
  activeMs: 0,
});

describe('public Study mode presentation', () => {
  it('maps all persisted IDs to the approved public contract', () => {
    expect(STUDY_MODE_OPTIONS.map(mode => [mode.id, mode.label, mode.description])).toEqual([
      ['mastery', 'Confidence Study', 'Work through a scheduled queue and use confidence ratings to plan future reviews.'],
      ['anki', 'Spaced Review', 'Review due cards, with difficult cards returning again during the session when needed.'],
      ['free-revision', 'Free Practice', 'Practise selected cards without changing their schedule or reward progress.'],
    ]);
    expect(studyModePresentation(undefined).id).toBe('mastery');
  });

  it('normalises generated historical labels without changing custom Focus labels', () => {
    expect(publicSessionLabel(modeSession('anki', 'Anki mode'))).toBe('Spaced Review');
    expect(publicSessionLabel(modeSession('mastery', 'Mastery mode'))).toBe('Confidence Study');
    expect(publicSessionLabel(modeSession('free-revision', 'Free revision'))).toBe('Free Practice');
    const focus: FocusSessionRequest = { mode: 'scheduled', label: 'Anki pronunciation intensive', criteria: { version: 1 }, order: 'due', limit: 20 };
    expect(publicSessionLabel(modeSession('anki', focus.label, focus))).toBe('Anki pronunciation intensive');
  });

  it('round-trips legacy internal IDs and generated labels without a schema or format migration', () => {
    const state = createInitialState([], []);
    state.preferences.studyMode = 'anki';
    state.session = modeSession('anki', 'Anki mode');
    const restored = parseBackup(exportBackup(state, new Date('2026-10-29T12:00:00.000Z')));
    expect(restored.schemaVersion).toBe(11);
    expect(restored.preferences.studyMode).toBe('anki');
    expect(restored.session?.experienceMode).toBe('anki');
    expect(restored.session?.label).toBe('Anki mode');
    expect(publicSessionLabel(restored.session!)).toBe('Spaced Review');
  });
});
