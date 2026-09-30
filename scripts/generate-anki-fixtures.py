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

    audio_path = Path(temporary) / "saluto.mp3"
    audio_path.write_bytes(b64decode("SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAwAAAAAAAAAAAAAAD/80DEABOIqmwVWTAAJWsF3rvWHVOqdd7E2duWzhYRFRAIg4uiGQqKarJ4XHZIbiRkAIoMQch3IcCwcBgMBgMmTuIgghAIS4Ph/hiUd38p5/o9/oyAP8CO7//0KkBwAIIIMMIAAAA4S//zQsQMF4nSnZeaoAO7//2VPr9X1ppomQBwUBLTSDKjANEDE6i5QCmY7mAGhGcUkILCFvyGjmjKk1/kWIsYl0mf/JoixFjEukyZf/5eLyJdLqSSS///y6XUi8XopIKi1f///sFPfNSIkP/zQMQJFlh6HAHfYAAAwMAPhEAPGAJgNZgWwCCBQT0weYqQNxKJ2TFow0Qw8UD+MCRAQjAVAJcwHIA9MAgAAzAAQBgHAD09CCJqe/9v/7qL6uz/2K//9bP/t+3P/QqMAAASOMurP/f6//NCxAoSmHo2XM+4gP5alr6syVRKoRImK9GAYFuYW6/hwJq4mPGyeTPhmQVmJwYAgyXSVy61Fcq5blLV3Tmz31I6Ov9/9u7//u//+/01////cOLKUBAAGMgABgFwBoWhHAEUwPEFHMEp//NAxBsVcH4gAV9IAAeExFsVbNkFIkjCHACAwXAIUMGGBCjAzgIYwCAATMAjAHzAHQA9dUHHCUN7/6f//5nX/tR///1f/9Gl/4xV1a+o/b+1aZwxZal+Aaj6xAAOJyF+iEGbUQIg3Fj/80LEIBwR/pwBmpgACHkHMieMfLpFzcm0ky7+boE+cLiKK0VfzYuGhgaLNFsZVJK/6zc8Zm606aVTo1o//7oHwQBgAGQiGiTCyjz/5cBjz58MggIM6VRVPf+GDQnVgImrMhCFCEUwhCj/80DECw0Yfhi1wRgAhB4ZCETATPDWWeCpU6WWdEpjrDSj3LTf4l6zol/+IlHuW/Wd5W7/54RKTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg=="))
    audio_name = collection.media.add_file(str(audio_path))
    custom = collection.models.new("HoloRecall Custom Audio")
    for field_name in ("Prompt", "Response", "Pronunciation", "NaturalMeaning", "Context", "QuestionSound", "AnswerSound"):
        collection.models.add_field(custom, collection.models.new_field(field_name))
    template = collection.models.new_template("Forward")
    template["qfmt"] = "{{Prompt}}<br>{{QuestionSound}}"
    template["afmt"] = "{{FrontSide}}<hr>{{Response}}<br>{{AnswerSound}}"
    collection.models.add_template(custom, template)
    collection.models.add(custom)
    audio = collection.new_note(custom)
    audio["Prompt"] = "Greet someone"
    audio["Response"] = "buonasera"
    audio["Pronunciation"] = "bwoh-nah-SEH-rah"
    audio["NaturalMeaning"] = "good evening"
    audio["Context"] = "Used later in the day."
    audio["QuestionSound"] = f"[sound:{audio_name}]"
    audio["AnswerSound"] = f"[sound:{audio_name}]"
    collection.add_note(audio, deck_id)
    collection.save()

    for legacy, name in ((True, "anki-26.9.3-legacy.apkg"), (False, "anki-26.9.3-modern.apkg")):
        collection.export_anki_package(
            out_path=str(OUT / name),
            options=ExportAnkiPackageOptions(with_scheduling=False, with_deck_configs=False, with_media=True, legacy=legacy),
            limit=DeckIdLimit(deck_id=deck_id),
        )
    collection.close()
