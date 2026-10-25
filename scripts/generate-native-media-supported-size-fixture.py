"""Generate an ignored, deterministic near-limit APKG for HR-NATIVE-08C.

Requires the development-only official Anki Python environment used by the
existing APKG oracle. Output belongs under .runtime and must not be committed.
"""
from hashlib import sha256, shake_256
from pathlib import Path
from struct import pack
from tempfile import TemporaryDirectory
from wave import open as wave_open
import json
import sys
import zlib

from anki.collection import Collection, DeckIdLimit, ExportAnkiPackageOptions


MAX_ASSET_BYTES = 5 * 1024 * 1024
WAV_BYTES = MAX_ASSET_BYTES - 100
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".runtime/native-media-supported-size.apkg")


def deterministic_bytes(label: str, length: int) -> bytes:
    return shake_256(label.encode()).digest(length)


def write_wav(path: Path, index: int) -> None:
    payload = deterministic_bytes(f"holorecall-wav-{index}", WAV_BYTES - 44)
    with wave_open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(8_000)
        output.writeframes(payload)


def png_bytes() -> bytes:
    width = height = 1024
    scanlines = b"".join(b"\0" + deterministic_bytes(f"holorecall-png-{row}", width * 3) for row in range(height))
    def chunk(kind: bytes, data: bytes) -> bytes:
        return pack(">I", len(data)) + kind + data + pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(scanlines, 6)) + chunk(b"IEND", b"")


with TemporaryDirectory() as temporary:
    root = Path(temporary)
    collection = Collection(str(root / "collection.anki2"))
    deck_id = collection.decks.id("HoloRecall Supported Size Media")
    image_path = root / "supported-raster.png"
    image_path.write_bytes(png_bytes())
    image_name = collection.media.add_file(str(image_path))

    model = collection.models.new("HoloRecall Supported Size Media")
    for field_name in ("Prompt", "Answer", "Sound", "Image"):
        collection.models.add_field(model, collection.models.new_field(field_name))
    template = collection.models.new_template("Forward")
    template["qfmt"] = "{{Prompt}}<br>{{Sound}}<br>{{Image}}"
    template["afmt"] = "{{FrontSide}}<hr>{{Answer}}"
    collection.models.add_template(model, template)
    collection.models.add(model)

    files = []
    for index in range(5):
        wav_path = root / f"supported-tone-{index + 1}.wav"
        write_wav(wav_path, index)
        media_name = collection.media.add_file(str(wav_path))
        note = collection.new_note(model)
        note["Prompt"] = f"Play supported-size audio {index + 1}"
        note["Answer"] = f"Supported-size answer {index + 1}"
        note["Sound"] = f"[sound:{media_name}]"
        note["Image"] = f'<img src="{image_name}">' if index == 0 else ""
        note.tags = ["native-media", "supported-size"]
        collection.add_note(note, deck_id)
        files.append(wav_path)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    collection.export_anki_package(
        out_path=str(OUT),
        options=ExportAnkiPackageOptions(with_scheduling=False, with_deck_configs=False, with_media=True, legacy=True),
        limit=DeckIdLimit(deck_id=deck_id),
    )
    collection.close()
    manifest = {
        "package": {"path": str(OUT), "bytes": OUT.stat().st_size, "sha256": sha256(OUT.read_bytes()).hexdigest()},
        "assets": [
            {"name": path.name, "bytes": path.stat().st_size, "sha256": sha256(path.read_bytes()).hexdigest()}
            for path in [*files, image_path]
        ],
    }
    OUT.with_suffix(".manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))
