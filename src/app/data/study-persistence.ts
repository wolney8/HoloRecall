import type { State } from '../../domain/models';

/** Atomic snapshot boundary. Native storage may implement this without changing study rules. */
export interface StudyPersistence {
  load(initial: State): Promise<State>;
  commit(next: State, expectedVersion: number): Promise<State>;
  close(): Promise<void>;
}
