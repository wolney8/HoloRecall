import { InjectionToken } from '@angular/core';
import type { State } from '../../domain/models';
import { LocalDatabase } from './local-database';

/** Atomic snapshot boundary. Native storage may implement this without changing study rules. */
export interface StudyPersistence {
  load(initial: State): Promise<State>;
  commit(next: State, expectedVersion: number): Promise<State>;
  close(): Promise<void>;
}

/** Platform selection point. The web provider remains IndexedDB until a native migration is proven. */
export const STUDY_PERSISTENCE = new InjectionToken<StudyPersistence>('Study persistence', {
  providedIn: 'root',
  factory: () => new LocalDatabase(),
});
