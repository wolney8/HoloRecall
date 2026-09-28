import { Injectable, computed, signal } from '@angular/core';
import type { CardContent, ConfidenceRating, Deck, Preferences, State } from '../../domain/models';
import { applyReview, createInitialState, undoLatestReview } from '../../domain/study';
import { exportBackup, parseBackup, validateCard, validateDeck, validatePreferences } from '../../domain/backup';
import { SEED_CARDS, SEED_DECKS } from '../seed';
import { LocalDatabase } from './local-database';

@Injectable({ providedIn: 'root' })
export class LocalStudyStore {
  readonly data = signal<State | null>(null);
  readonly error = signal('');
  readonly cards = computed(() => this.data()?.cards ?? []);
  readonly decks = computed(() => this.data()?.decks ?? []);
  private readonly database = new LocalDatabase();
  private saving = false;

  async init(): Promise<void> {
    try { await this.refresh(); } catch { /* error signal presents the storage failure; never fall back to volatile progress. */ }
  }

  async refresh(): Promise<void> {
    try {
      const result = await this.database.load(createInitialState(SEED_DECKS, SEED_CARDS));
      this.data.set(result);
      this.error.set('');
    } catch (error) { this.report(error); throw error; }
  }

  private report(error: unknown): void { this.error.set(error instanceof Error ? error.message : 'Local storage failed. No progress was discarded.'); }

  private async change(transform: (data: State) => State): Promise<void> {
    if (this.saving) throw new Error('A local save is already in progress.');
    this.saving = true;
    try {
      const previous = this.data();
      if (!previous) throw new Error('Local study data is not ready.');
      const next = transform(previous);
      if (next !== previous) this.data.set(await this.database.commit(next, previous.version));
      this.error.set('');
    } catch (error) { this.report(error); throw error; }
    finally { this.saving = false; }
  }

  async saveCard(card: CardContent): Promise<void> {
    await this.change(data => {
      if (!data.decks.some(deck => deck.id === card.deckId)) throw new Error('Choose an existing deck.');
      const previous = data.cards.find(item => item.id === card.id);
      if (previous && previous.revision !== card.revision) throw new Error('This card was edited elsewhere. Reopen the editor before saving.');
      const next = structuredClone({ ...card, revision: previous ? previous.revision + 1 : 1 });
      validateCard(next);
      return { ...data, version: data.version + 1, cards: previous ? data.cards.map(item => item.id === card.id ? next : item) : [...data.cards, next] };
    });
  }

  async saveDeck(deck: Deck): Promise<void> {
    await this.change(data => {
      validateDeck(deck);
      const next = structuredClone(deck);
      return { ...data, version: data.version + 1, decks: data.decks.some(item => item.id === deck.id) ? data.decks.map(item => item.id === deck.id ? next : item) : [...data.decks, next] };
    });
  }

  async review(cardId: string, rating: ConfidenceRating, sessionId: string, eventId = crypto.randomUUID()): Promise<void> {
    await this.change(data => applyReview(data, { cardId, rating, sessionId, id: eventId, now: new Date() }));
  }

  async undo(expectedCardId?: string, expectedSessionId?: string): Promise<void> {
    await this.change(data => undoLatestReview(data, new Date(), crypto.randomUUID(), expectedCardId, expectedSessionId));
  }

  async updatePreferences(patch: Partial<Preferences>): Promise<void> {
    await this.change(data => {
      const preferences = { ...data.preferences, ...patch };
      validatePreferences(preferences);
      return { ...data, version: data.version + 1, preferences };
    });
  }

  exportJson(): string {
    const data = this.data();
    if (!data) throw new Error('Local study data is not ready.');
    return exportBackup(data, new Date());
  }

  async restoreJson(json: string): Promise<void> {
    await this.change(data => {
      const restored = parseBackup(json);
      if (data.version !== 0) throw new Error('Restore is supported only in an untouched browser profile. Export this profile first; use a fresh browser/profile to restore without replacing existing study data.');
      return { ...restored, version: data.version + 1 };
    });
  }
}
