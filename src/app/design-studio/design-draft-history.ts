import type { DesignSet } from '../../domain/models';

const copy = (design: DesignSet): DesignSet => structuredClone(design);
export const designSnapshot = (design: DesignSet): string => JSON.stringify(design);

/** Bounded editor-local history. Persisted Design Sets remain the store's concern. */
export class DesignDraftHistory {
  private baseline = '';
  private past: DesignSet[] = [];
  private future: DesignSet[] = [];
  constructor(private readonly limit = 40) {}

  start(design: DesignSet): void { this.baseline = designSnapshot(design); this.past = []; this.future = []; }
  saved(design: DesignSet): void { this.start(design); }
  dirty(design: DesignSet): boolean { return designSnapshot(design) !== this.baseline; }
  canUndo(): boolean { return this.past.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }
  record(current: DesignSet, next: DesignSet): DesignSet {
    if (designSnapshot(current) === designSnapshot(next)) return current;
    this.past.push(copy(current));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    return copy(next);
  }
  undo(current: DesignSet): DesignSet {
    const previous = this.past.pop();
    if (!previous) return current;
    this.future.push(copy(current));
    return copy(previous);
  }
  redo(current: DesignSet): DesignSet {
    const next = this.future.pop();
    if (!next) return current;
    this.past.push(copy(current));
    return copy(next);
  }
  revert(current: DesignSet): DesignSet {
    if (!this.baseline) return current;
    const restored = JSON.parse(this.baseline) as DesignSet;
    this.start(restored);
    return restored;
  }
}
