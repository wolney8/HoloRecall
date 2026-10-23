#!/usr/bin/env python3
"""Development-only interoperability oracle for generated HoloRecall APKG files.

Run with the official `anki` Python package. Nothing from this script or that
package is bundled into HoloRecall's web/native runtime.
"""
import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from anki.collection import (
    Collection,
    DeckIdLimit,
    ExportAnkiPackageOptions,
    ImportAnkiPackageOptions,
    ImportAnkiPackageRequest,
)


def summary(package: Path, reexport: Path | None, repeat: bool, second: Path | None) -> dict:
    with TemporaryDirectory(prefix="holorecall-anki-oracle-") as temporary:
        collection = Collection(str(Path(temporary) / "collection.anki2"))
        def import_package(path: Path):
            return collection.import_anki_package(ImportAnkiPackageRequest(
                package_path=str(path),
                options=ImportAnkiPackageOptions(
                    merge_notetypes=True,
                    with_scheduling=False,
                    with_deck_configs=False,
                ),
            ))
        response = import_package(package)
        repeat_response = import_package(package) if repeat else None
        second_response = import_package(second) if second else None
        note_ids = collection.find_notes("")
        card_ids = collection.find_cards("")
        notes = []
        for note_id in note_ids:
            note = collection.get_note(note_id)
            notes.append(
                {
                    "id": note.id,
                    "guid": note.guid,
                    "notetype": note.note_type()["name"],
                    "fields": dict(note.items()),
                    "tags": list(note.tags),
                }
            )
        cards = []
        for card_id in card_ids:
            card = collection.get_card(card_id)
            cards.append(
                {
                    "id": card.id,
                    "noteId": card.nid,
                    "deckId": card.did,
                    "type": card.type,
                    "queue": card.queue,
                    "due": card.due,
                    "interval": card.ivl,
                    "reps": card.reps,
                    "lapses": card.lapses,
                    "question": card.question(),
                    "answer": card.answer(),
                }
            )
        decks = [item.name for item in collection.decks.all_names_and_ids() if item.name != "Default"]
        media_dir = Path(collection.media.dir())
        media = sorted(path.name for path in media_dir.iterdir() if path.is_file())
        revlog_count = collection.db.scalar("select count(*) from revlog")
        if reexport:
            if not decks:
                raise RuntimeError("No imported deck is available to re-export")
            reexport.parent.mkdir(parents=True, exist_ok=True)
            collection.export_anki_package(
                out_path=str(reexport),
                options=ExportAnkiPackageOptions(
                    with_scheduling=False,
                    with_deck_configs=False,
                    with_media=True,
                    legacy=True,
                ),
                limit=DeckIdLimit(deck_id=collection.decks.id(decks[0])),
            )
        output = {
            "foundNotes": response.log.found_notes,
            "newNotes": len(response.log.new),
            "updatedNotes": len(response.log.updated),
            "duplicateNotes": len(response.log.duplicate),
            "repeat": {"new": len(repeat_response.log.new), "updated": len(repeat_response.log.updated), "duplicate": len(repeat_response.log.duplicate)} if repeat_response else None,
            "second": {"new": len(second_response.log.new), "updated": len(second_response.log.updated), "duplicate": len(second_response.log.duplicate)} if second_response else None,
            "decks": decks,
            "notes": notes,
            "cards": cards,
            "media": media,
            "revlogCount": revlog_count,
            "reexport": str(reexport) if reexport else None,
        }
        collection.close()
        return output


parser = argparse.ArgumentParser()
parser.add_argument("package", type=Path)
parser.add_argument("--reexport", type=Path)
parser.add_argument("--repeat", action="store_true")
parser.add_argument("--second", type=Path)
args = parser.parse_args()
print(json.dumps(summary(args.package.resolve(), args.reexport.resolve() if args.reexport else None, args.repeat, args.second.resolve() if args.second else None), ensure_ascii=False))
