import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LocalStudyStore } from '../data/study-store';
import { PageRevealDirective } from '../motion/page-reveal';
import { focusPreview } from '../../domain/focus';
import { buildLibraryIndex, deckPath } from '../../domain/library';
import { effectiveStudyPreset } from '../../domain/study-settings';
import { dayKey } from '../../domain/time';
import type { FocusCriteria, FocusOrder, FocusPreset, FocusSessionRequest, FocusStudyState, StudyMode } from '../../domain/models';

export interface FocusLaunch {
  deckId?: string;
  explicitCardIds?: string[];
  sourceLabel?: string;
  criteria?: FocusCriteria;
}

@Component({
  selector: 'hr-focus',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatButtonToggleModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, PageRevealDirective],
  templateUrl: './focus.html',
  styleUrl: './focus.css',
})
export class FocusComponent {
  private readonly store = inject(LocalStudyStore);
  private launchValue?: FocusLaunch;
  private initialDeckApplied=false;

  @Input() set launch(value: FocusLaunch | undefined) {
    this.launchValue = value;
    if (!value) return;
    this.criteria.set(structuredClone({
      ...(value.criteria ?? { version: 1 }),
      version: 1,
      ...(value.deckId ? { deckId: value.deckId } : {}),
      ...(value.explicitCardIds?.length ? { explicitCardIds: [...value.explicitCardIds] } : {}),
    }));
    if (value.deckId) this.limitDeckId.set(value.deckId);
    this.label.set(value.sourceLabel?.trim() || 'Custom focus');
  }
  get launch(): FocusLaunch | undefined { return this.launchValue; }

  @Output() readonly startSession = new EventEmitter<FocusSessionRequest>();
  @Output() readonly close = new EventEmitter<void>();

  readonly criteria = signal<FocusCriteria>({ version: 1 });
  readonly mode = signal<StudyMode>('practice');
  readonly order = signal<FocusOrder>('deck');
  readonly limit = signal(20);
  readonly label = signal('Custom focus');
  readonly advancedOpen = signal(false);
  readonly limitDeckId = signal('');
  readonly message = signal('');
  readonly error = signal('');
  readonly editingPresetId = signal('');
  readonly presetName = signal('');
  readonly saving = signal(false);
  extraNew = 5;
  extraReviews = 20;

  readonly stateOptions: ReadonlyArray<{ id: FocusStudyState; label: string }> = [
    { id: 'new', label: 'New' }, { id: 'learning', label: 'Learning' },
    { id: 'review', label: 'Review' }, { id: 'due', label: 'Due' },
    { id: 'overdue', label: 'Overdue' }, { id: 'attention', label: 'Needs attention' },
    { id: 'leech', label: 'Flagged difficult' }, { id: 'suspended', label: 'Suspended' },
    { id: 'buried', label: 'Buried' }, { id: 'recently-reviewed', label: 'Recently reviewed' },
  ];
  readonly orderOptions: ReadonlyArray<{ id: FocusOrder; label: string }> = [
    { id: 'deck', label: 'Deck order' }, { id: 'due', label: 'Due first' },
    { id: 'overdue', label: 'Most overdue' }, { id: 'retrievability', label: 'Most at risk' },
    { id: 'lapses', label: 'Most lapses' }, { id: 'oldest-reviewed', label: 'Oldest reviewed' },
    { id: 'recently-added', label: 'Recently added' }, { id: 'random', label: 'Random' },
  ];

  readonly decks = computed(() => this.store.decks().filter(deck => !deck.archived));
  readonly tags = computed(() => [...new Set(this.store.cards().flatMap(card => card.tags))].sort((a, b) => a.localeCompare(b)));
  readonly presets = computed(() => this.store.data()?.focusPresets ?? []);
  readonly libraryIndex = computed(() => { const state=this.store.data();return state?buildLibraryIndex(state,new Date()):null; });
  readonly request = computed<FocusSessionRequest>(() => ({
    mode: this.mode(),
    label: this.label().trim() || (this.mode() === 'practice' ? 'Focused practice' : 'Focused study'),
    criteria: structuredClone(this.criteria()),
    order: this.order(),
    limit: this.cleanLimit(this.limit()),
    ...(this.editingPresetId() ? { presetId: this.editingPresetId() } : {}),
  }));
  readonly preview = computed(() => {
    const state = this.store.data();
    if (!state) return { cards: [], matched: 0, eligible: 0, excluded: 0 };
    return focusPreview(state, this.request(), new Date(),this.libraryIndex()??undefined);
  });
  readonly currentLimits = computed(() => {
    const state = this.store.data(), deckId = this.limitDeckId();
    if (!state || !deckId) return null;
    const preset = effectiveStudyPreset(state, deckId, new Date());
    return { newCards: preset.newCardsPerDay, reviews: preset.maxReviewsPerDay };
  });

  constructor() {
    effect(() => {
      if (this.initialDeckApplied||!this.decks().length) return;
      this.initialDeckApplied=true;
      const deckId=this.criteria().deckId ?? this.decks()[0]!.id;
      this.limitDeckId.set(deckId);
      if(!this.criteria().deckId)this.patchCriteria({deckId});
    });
  }

  deckLabel(id: string): string {
    const state = this.store.data();
    return state ? deckPath(state, id) : '';
  }

  patchCriteria(patch: Partial<FocusCriteria>): void {
    this.criteria.update(current => {
      const next = { ...current, ...patch, version: 1 as const };
      for (const key of Object.keys(next) as Array<keyof FocusCriteria>) {
        const value = next[key];
        if (value === undefined || value === '' || Array.isArray(value) && !value.length) delete (next as Record<string, unknown>)[key];
      }
      return next;
    });
    this.clearNotice();
  }

  optionalDays(raw: number | string | null | undefined, minimum = 0): number | undefined {
    if (raw === null || raw === undefined || raw === '') return undefined;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value >= minimum ? value : undefined;
  }

  setMode(mode: StudyMode): void {
    this.mode.set(mode);
    if (mode === 'scheduled' && this.criteria().includeSuspended) this.patchCriteria({ includeSuspended: undefined });
    this.clearNotice();
  }

  run(): void {
    const preview = this.preview();
    if (!preview.cards.length || this.mode() === 'scheduled' && !preview.eligible) {
      this.error.set(this.mode() === 'scheduled' ? 'No matching cards are currently eligible for scheduled study.' : 'No cards match this focus.');
      return;
    }
    this.startSession.emit(this.request());
  }

  runQuick(label: string, mode: StudyMode, criteria: FocusCriteria, order: FocusOrder = 'deck', limit = 20): void {
    const request: FocusSessionRequest = { mode, label, criteria, order, limit };
    const state = this.store.data();
    if (!state) return;
    const preview = focusPreview(state, request, new Date());
    if (!preview.cards.length || mode === 'scheduled' && !preview.eligible) {
      this.error.set(mode === 'scheduled' ? 'No cards in this focus are currently due.' : 'No cards match this focus.');
      return;
    }
    this.startSession.emit(request);
  }

  quickCriteria(patch: Partial<FocusCriteria>): FocusCriteria {
    const deckId = this.limitDeckId() || this.criteria().deckId;
    return { version: 1, ...(deckId ? { deckId } : {}), ...patch };
  }

  openBuilder(patch: Partial<FocusCriteria> = {}): void {
    this.patchCriteria({ ...(this.limitDeckId() ? { deckId: this.limitDeckId() } : {}), ...patch });
    this.advancedOpen.set(true);
    queueMicrotask(() => document.getElementById('focus-builder-title')?.focus({ preventScroll: true }));
  }

  async addToday(kind: 'new' | 'reviews'): Promise<void> {
    const state = this.store.data(), deckId = this.limitDeckId(), current = this.currentLimits();
    if (!state || !deckId || !current || this.saving()) return;
    const amount = kind === 'new' ? this.extraNew : this.extraReviews;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > (kind === 'new' ? 1000 : 10000)) {
      this.error.set('Choose a positive whole-number increase.'); return;
    }
    const studyDay = dayKey(new Date(), state.preferences.timeZone);
    const prior = state.todayOverrides.find(item => item.deckId === deckId && item.studyDay === studyDay);
    this.saving.set(true);
    try {
      await this.store.setTodayOverride({
        deckId, studyDay,
        ...(prior ?? {}),
        ...(kind === 'new' ? { newCardsPerDay: current.newCards + amount } : { maxReviewsPerDay: current.reviews + amount }),
      });
      this.message.set(`${kind === 'new' ? 'New-card' : 'Review'} allowance increased for today.`);
      this.error.set('');
      this.startSession.emit({ mode: 'scheduled', label: kind === 'new' ? 'More new cards today' : 'More reviews today', criteria: this.quickCriteria({}), order: 'due', limit: kind === 'new' ? current.newCards + amount : current.reviews + amount });
    } catch (error) { this.fail(error); }
    finally { this.saving.set(false); }
  }

  editPreset(preset: FocusPreset): void {
    this.editingPresetId.set(preset.id);
    this.presetName.set(preset.name);
    this.mode.set(preset.mode);
    this.criteria.set(structuredClone(preset.criteria));
    this.order.set(preset.order);
    this.limit.set(preset.limit);
    this.label.set(preset.name);
    if (preset.criteria.deckId) this.limitDeckId.set(preset.criteria.deckId);
    this.advancedOpen.set(true);
    this.clearNotice();
  }

  runPreset(preset: FocusPreset): void {
    const request: FocusSessionRequest = { mode: preset.mode, label: preset.name, criteria: structuredClone(preset.criteria), order: preset.order, limit: preset.limit, presetId: preset.id };
    const state = this.store.data();
    if (!state) return;
    const preview = focusPreview(state, request, new Date());
    if (!preview.cards.length) { this.error.set(preset.mode === 'scheduled' ? 'This preset has no cards currently eligible for scheduled study.' : 'No current cards match this preset.'); return; }
    this.startSession.emit(request);
  }

  async savePreset(): Promise<void> {
    const name = this.presetName().trim();
    if (!name) { this.error.set('Give this Focus preset a name.'); return; }
    const preset: FocusPreset = { id: this.editingPresetId() || `focus-${crypto.randomUUID()}`, version: 1, name, mode: this.mode(), criteria: structuredClone(this.criteria()), order: this.order(), limit: this.cleanLimit(this.limit()) };
    this.saving.set(true);
    try {
      await this.store.saveFocusPreset(preset);
      this.editingPresetId.set(preset.id);
      this.label.set(name);
      this.message.set('Focus preset saved. It will rerun these criteria against current cards.');
      this.error.set('');
    } catch (error) { this.fail(error); }
    finally { this.saving.set(false); }
  }

  async duplicatePreset(preset: FocusPreset): Promise<void> {
    const copy: FocusPreset = { ...structuredClone(preset), id: `focus-${crypto.randomUUID()}`, name: `${preset.name} copy` };
    this.saving.set(true);
    try { await this.store.saveFocusPreset(copy); this.message.set('Focus preset duplicated.'); this.error.set(''); }
    catch (error) { this.fail(error); }
    finally { this.saving.set(false); }
  }

  async removePreset(preset: FocusPreset): Promise<void> {
    this.saving.set(true);
    try {
      await this.store.deleteFocusPreset(preset.id);
      if (this.editingPresetId() === preset.id) this.newPreset();
      this.message.set('Focus preset removed. Cards were not changed.'); this.error.set('');
    } catch (error) { this.fail(error); }
    finally { this.saving.set(false); }
  }

  newPreset(): void {
    this.editingPresetId.set(''); this.presetName.set(''); this.label.set('Custom focus');
  }

  private cleanLimit(value: number): number { return Math.max(1, Math.min(10_000, Math.round(Number(value) || 20))); }
  private clearNotice(): void { this.message.set(''); this.error.set(''); }
  private fail(error: unknown): void { this.error.set(error instanceof Error ? error.message : 'Focus settings could not be saved.'); this.message.set(''); }
}
