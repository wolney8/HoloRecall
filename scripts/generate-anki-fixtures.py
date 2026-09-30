"""Generate tiny authorised interoperability fixtures with the pinned official Anki Python package."""
from pathlib import Path
from tempfile import TemporaryDirectory
from base64 import b64decode

from anki.collection import Collection, DeckIdLimit, ExportAnkiPackageOptions

OUT = Path("e2e/fixtures")
OUT.mkdir(parents=True, exist_ok=True)

with TemporaryDirectory() as temporary:
    collection = Collection(str(Path(temporary) / "collection.anki2"))
    deck_id = collection.decks.id("HoloRecall Fixture::Italian")

    basic = collection.new_note(collection.models.by_name("Basic"))
    basic["Front"] = "città"
    basic["Back"] = "city\n(multiline answer)"
    basic.tags = ["italiano", "accenti"]
    collection.add_note(basic, deck_id)

    reversed_note = collection.new_note(collection.models.by_name("Basic (and reversed card)"))
    reversed_note["Front"] = "buongiorno"
    reversed_note["Back"] = "good morning"
    collection.add_note(reversed_note, deck_id)

    cloze = collection.new_note(collection.models.by_name("Cloze"))
    cloze["Text"] = "{{c1::sono}} pronto e {{c2::ho}} fame"
    collection.add_note(cloze, deck_id)
    image_path = Path(temporary) / "tiny.png"
    image_path.write_bytes(b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aamkAAAAASUVORK5CYII="))
    image_name = collection.media.add_file(str(image_path))
    visual = collection.new_note(collection.models.by_name("Basic"))
    visual["Front"] = f'<img src="{image_name}">'
    visual["Back"] = "la stella"
    collection.add_note(visual, deck_id)
    collection.save()

    for legacy, name in ((True, "anki-26.9.3-legacy.apkg"), (False, "anki-26.9.3-modern.apkg")):
        collection.export_anki_package(
            out_path=str(OUT / name),
            options=ExportAnkiPackageOptions(with_scheduling=False, with_deck_configs=False, with_media=True, legacy=legacy),
            limit=DeckIdLimit(deck_id=deck_id),
        )
    collection.close()
