export type CollectionCardFace='recall'|'answer';

/** Collection is a showcase surface; Study owns its separate Recall-first policy. */
export const COLLECTION_DEFAULT_FACE:CollectionCardFace='answer';

export function collectionFaceIsRevealed(face:CollectionCardFace=COLLECTION_DEFAULT_FACE):boolean {
  return face==='answer';
}
