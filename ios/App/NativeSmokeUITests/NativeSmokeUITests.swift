import XCTest

final class NativeSmokeUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_GB"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
    }

    func testPackagedStudyAndNavigationSmoke() throws {
        let start = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'study' AND label CONTAINS '→'")).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 8))
        start.tap()
        XCTAssertTrue(revealableCard().waitForExistence(timeout: 10))

        for expectedCard in 1...3 {
            let card = app.descendants(matching: .any)
                .matching(NSPredicate(format: "label CONTAINS[c] 'flashcard'"))
                .firstMatch
            XCTAssertTrue(card.waitForExistence(timeout: 5))
            revealableCard().tap()
            let rating = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '3 Good'")).firstMatch
            XCTAssertTrue(rating.waitForExistence(timeout: 5))
            if expectedCard == 1 { attachScreenshot("mobile-rating-dock") }
            rating.tap()
            if expectedCard < 3 {
                XCTAssertTrue(revealableCard().waitForExistence(timeout: 8))
                XCTAssertTrue(card.exists)
                attachScreenshot("incoming-card-\(expectedCard + 1)")
            }
        }

        tapButton("End session")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'SESSION' OR label CONTAINS[c] 'Study saved' OR label CONTAINS[c] 'Nice work'" )).firstMatch.waitForExistence(timeout: 8))
        attachScreenshot("mobile-session-complete")
        tapButton("Done")
        tapButton("Collection")
        XCTAssertTrue(app.staticTexts["Collection"].waitForExistence(timeout: 8))
        openMore("Progress")
        XCTAssertTrue(app.staticTexts["Progress"].waitForExistence(timeout: 8))
        openMore("Settings")
        XCTAssertTrue(app.staticTexts["Settings"].waitForExistence(timeout: 8))
        attachScreenshot("native-settings")
    }

    func testSystemAppearanceAndRelaunch() throws {
        openMore("Settings")
        let dark = app.descendants(matching: .any).matching(identifier: "Dark").firstMatch
        XCTAssertTrue(dark.waitForExistence(timeout: 8))
        dark.tap()
        XCTAssertEqual(dark.value as? String, "1")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
        openMore("Settings")
        XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "Dark").firstMatch.value as? String, "1")
        let system = app.descendants(matching: .any).matching(identifier: "System").firstMatch
        XCTAssertTrue(system.waitForExistence(timeout: 8))
        system.tap()
    }

    func testNativeLifecycleRecoversActiveStudy() throws {
        let start = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'study' AND label CONTAINS '→'")).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 8))
        start.tap()
        XCTAssertTrue(revealableCard().waitForExistence(timeout: 10))
        XCUIDevice.shared.press(.home)
        sleep(3)
        app.activate()
        XCTAssertTrue(revealableCard().waitForExistence(timeout: 10))
        attachScreenshot("lifecycle-resumed-study")
    }

    func testNativeAutoAdvanceAcceptedReviewLifecycle() throws {
        tapButton("Decks")
        XCTAssertTrue(app.staticTexts["Italian essentials"].waitForExistence(timeout: 8))

        let actions = app.buttons["More deck actions"]
        XCTAssertTrue(actions.waitForExistence(timeout: 8))
        actions.tap()
        let studySettings = app.menuItems["Study settings"]
        XCTAssertTrue(studySettings.waitForExistence(timeout: 8))
        studySettings.tap()
        XCTAssertTrue(app.staticTexts["Study settings"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Italian essentials"].exists)

        let autoAdvanceSummary = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Auto Advance'" )).firstMatch
        XCTAssertTrue(autoAdvanceSummary.waitForExistence(timeout: 8), "Auto Advance settings were unavailable\n\(app.debugDescription)")
        scrollToHittable(autoAdvanceSummary)
        autoAdvanceSummary.tap()
        let autoAdvance = app.switches["Auto Advance"]
        XCTAssertTrue(autoAdvance.waitForExistence(timeout: 8))
        if (autoAdvance.value as? String) != "1" { autoAdvance.tap() }
        XCTAssertEqual(autoAdvance.value as? String, "1")
        let revealDelay = app.textFields["Reveal question after"]
        XCTAssertTrue(revealDelay.waitForExistence(timeout: 8))
        scrollToHittable(revealDelay)
        revealDelay.tap()
        revealDelay.typeText(XCUIKeyboardKey.delete.rawValue + "1")
        let keyboardDone = app.toolbars.buttons["Done"]
        XCTAssertTrue(keyboardDone.waitForExistence(timeout: 3))
        keyboardDone.tap()
        tapScrollableButton("Save study settings")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Study preset saved'" )).firstMatch.waitForExistence(timeout: 8))

        tapButton("Decks")
        XCTAssertTrue(app.staticTexts["Italian essentials"].waitForExistence(timeout: 8))
        let studies = app.buttons.matching(identifier: "Study")
        XCTAssertGreaterThanOrEqual(studies.count, 2)
        let deckStudy = studies.allElementsBoundByIndex.first { $0.isHittable && $0.frame.minY < app.frame.height - 120 }
        XCTAssertNotNil(deckStudy, "The deterministic deck Study action was not reachable\n\(app.debugDescription)")
        deckStudy!.tap()
        XCTAssertTrue(app.switches["Pause auto"].waitForExistence(timeout: 8), "The deck Study action did not start the Auto Advance session\n\(app.debugDescription)")
        XCTAssertEqual(app.switches["Pause auto"].value as? String, "1")

        XCTAssertTrue(app.staticTexts["Rate your recall"].waitForExistence(timeout: 8), "Auto Advance did not reveal the first card\n\(app.debugDescription)")
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label CONTAINS 'Undo'" )).firstMatch.exists, "Auto reveal created a review before the learner rated")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '0 /'" )).firstMatch.exists)

        let rating = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '4 Good'" )).firstMatch
        XCTAssertTrue(rating.waitForExistence(timeout: 5))
        rating.tap()
        let acceptedProgress = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '1 /'" )).firstMatch
        XCTAssertTrue(acceptedProgress.waitForExistence(timeout: 1), "The accepted review did not update visible session progress before interruption\n\(app.debugDescription)")

        XCUIDevice.shared.press(.home)
        sleep(2) // Longer than the configured one-second reveal delay; inactivity must not advance the card.
        app.activate()

        let resume = app.switches["Resume auto"]
        XCTAssertTrue(resume.waitForExistence(timeout: 10), "Auto Advance did not remain explicitly paused after foreground restoration\n\(app.debugDescription)")
        XCTAssertEqual(resume.value as? String, "0")
        let incoming = revealableCard()
        XCTAssertTrue(incoming.waitForExistence(timeout: 10), "The accepted-review transition did not settle on a visible incoming card\n\(app.debugDescription)")
        XCTAssertFalse(app.staticTexts["Rate your recall"].exists, "Auto Advance progressed while HoloRecall was inactive")
        XCTAssertTrue(acceptedProgress.exists)
        attachScreenshot("native-auto-advance-lifecycle-settled")

        resume.tap()
        XCTAssertTrue(app.switches["Pause auto"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Rate your recall"].waitForExistence(timeout: 8), "Explicit Auto Advance resume did not reveal the next card\n\(app.debugDescription)")

        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
        openMore("Progress")
        XCTAssertTrue(app.staticTexts["Progress"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["1 reviews"].waitForExistence(timeout: 8), "Progress did not report the single persisted review\n\(app.debugDescription)")
        let historyRating = app.staticTexts["Confidence 4 · Good"]
        XCTAssertTrue(historyRating.waitForExistence(timeout: 8), "History did not expose the persisted rating\n\(app.debugDescription)")
        XCTAssertEqual(app.staticTexts.matching(identifier: "Confidence 4 · Good").count, 1)
        let scheduling = app.buttons["Scheduling details"].firstMatch
        XCTAssertTrue(scheduling.waitForExistence(timeout: 8))
        scheduling.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'New' AND label CONTAINS 'Learning'" )).firstMatch.waitForExistence(timeout: 8), "History did not expose the persisted scheduling transition\n\(app.debugDescription)")
        attachScreenshot("native-auto-advance-review-history")
    }

    func testNativePracticeKeepsScheduledLearningUntouched() throws {
        openMore("Progress")
        XCTAssertTrue(app.staticTexts["0 reviews"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["0 practice events in this period."].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["16"].firstMatch.exists, "The clean fixture did not expose all 16 New cards\n\(app.debugDescription)")

        openMore("Focus")
        XCTAssertTrue(app.staticTexts["Focus"].waitForExistence(timeout: 8))
        let previewNew = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Preview new cards'" )).firstMatch
        XCTAssertTrue(previewNew.waitForExistence(timeout: 8))
        scrollToHittable(previewNew)
        XCTAssertTrue(previewNew.isHittable)
        previewNew.tap()
        XCTAssertTrue(app.staticTexts["Practice"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Preview new cards'" )).firstMatch.exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '0 / 16'" )).firstMatch.exists)

        revealableCard().tap()
        let again = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '1 Again'" )).firstMatch
        XCTAssertTrue(again.waitForExistence(timeout: 5))
        again.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '1 / 16'" )).firstMatch.waitForExistence(timeout: 8))
        XCTAssertTrue(revealableCard().waitForExistence(timeout: 8), "Practice did not settle on the second card\n\(app.debugDescription)")

        revealableCard().tap()
        let easy = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '5 Easy'" )).firstMatch
        XCTAssertTrue(easy.waitForExistence(timeout: 5))
        easy.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '2 / 16'" )).firstMatch.waitForExistence(timeout: 8))
        tapButton("End session")

        XCTAssertTrue(app.staticTexts["Practice saved"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '2 practice ratings' AND label CONTAINS '2 unique cards'" )).firstMatch.exists)
        XCTAssertTrue(app.staticTexts["3.0 / 5"].exists)
        let distribution = app.otherElements["Practice confidence distribution"]
        XCTAssertTrue(distribution.waitForExistence(timeout: 8))
        XCTAssertTrue(distribution.staticTexts["Confidence 1"].exists)
        XCTAssertTrue(distribution.staticTexts["Confidence 5"].exists)
        XCTAssertFalse(app.staticTexts["Cosmetic progress"].exists, "Practice exposed scheduled cosmetic rewards")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Practice ratings stay separate'" )).firstMatch.exists)
        attachScreenshot("native-practice-results")

        tapButton("Done")
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 8))
        openMore("Progress")
        XCTAssertTrue(app.staticTexts["0 reviews"].waitForExistence(timeout: 8), "Practice created a scheduled review")
        XCTAssertTrue(app.staticTexts["2 practice events in this period."].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["16"].firstMatch.exists, "Practice consumed or scheduled a New card\n\(app.debugDescription)")

        tapButton("Decks")
        startItalianDeckStudy()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '0 / 10'" )).firstMatch.waitForExistence(timeout: 8), "Scheduled Study did not retain its clean ten-card queue after Practice\n\(app.debugDescription)")
        tapButton("End session")
    }

    func testNativeNaturalScheduledCompletionAndResultsAccuracy() throws {
        setNewCardLimit("2")
        tapButton("Decks")
        startItalianDeckStudy()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '0 / 2'" )).firstMatch.waitForExistence(timeout: 8))

        revealableCard().tap()
        let hard = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '2 Hard'" )).firstMatch
        XCTAssertTrue(hard.waitForExistence(timeout: 5))
        hard.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH '1 / 2'" )).firstMatch.waitForExistence(timeout: 8))
        XCTAssertTrue(revealableCard().waitForExistence(timeout: 8), "The second scheduled card did not settle visibly\n\(app.debugDescription)")

        revealableCard().tap()
        let good = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '4 Good'" )).firstMatch
        XCTAssertTrue(good.waitForExistence(timeout: 5))
        good.tap()

        XCTAssertTrue(app.staticTexts["Nice work"].waitForExistence(timeout: 10), "Natural queue exhaustion did not open Results\n\(app.debugDescription)")
        XCTAssertTrue(app.staticTexts["SESSION COMPLETE"].exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '2 reviews' AND label CONTAINS '2 unique cards'" )).firstMatch.exists)
        XCTAssertTrue(app.staticTexts["3.0 / 5"].exists)
        XCTAssertTrue(app.staticTexts["Cosmetic progress"].exists)
        let contributions = app.staticTexts.matching(NSPredicate(format: "label CONTAINS '+1 eligible day'" ))
        XCTAssertEqual(contributions.count, 1, "Results did not expose exactly the Good review's eligible contribution\n\(app.debugDescription)")
        XCTAssertEqual(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'No eligible contribution'" )).count, 1, "Results did not keep the Hard review outside collectible progress\n\(app.debugDescription)")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Common' AND label CONTAINS 'Unlocked'" )).firstMatch.waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Practice summary"].exists)
        attachScreenshot("native-natural-session-results")

        tapButton("Done")
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Start studying'" )).firstMatch.exists, "The completed session remained active")

        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Start studying'" )).firstMatch.exists, "Relaunch restored a completed session as active")
        openMore("Progress")
        XCTAssertTrue(app.staticTexts["2 reviews"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["0 practice events in this period."].exists)
        XCTAssertEqual(app.staticTexts.matching(identifier: "Confidence 2 · Hard").count, 1)
        XCTAssertEqual(app.staticTexts.matching(identifier: "Confidence 4 · Good").count, 1)
        attachScreenshot("native-complete-session-history")
    }

    func testNativeOrientationAndFileSurfaces() throws {
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 8))
        attachScreenshot("iphone-landscape-dashboard")
        XCUIDevice.shared.orientation = .portrait

        openMore("Exchange")
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 10))
        tapButton("Export")
        tapScrollableButton("Export package")
        let shareSheet = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 20), "Native share sheet did not appear\n\(app.debugDescription)")
        XCTAssertTrue(app.cells["Save to Files"].waitForExistence(timeout: 8))
        attachScreenshot("native-export-share-sheet")
        app.otherElements["dismiss popup"].tap()
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 8))

        tapScrollableButton("Anki · Export an Anki deck package")
        tapScrollableButton("Preview Anki deck", timeout: 20)
        tapScrollableButton("Export Anki deck", timeout: 20)
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 30), "Anki APKG share sheet did not appear\n\(app.debugDescription)")
        XCTAssertTrue(app.cells["Save to Files"].waitForExistence(timeout: 8))
        attachScreenshot("native-anki-apkg-share-sheet")
        app.otherElements["dismiss popup"].tap()
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 8))

        for _ in 0..<4 { app.swipeDown() }
        tapButton("Import")
        let pickerLabel = app.descendants(matching: .any).matching(identifier: "Workbook or portable archive").firstMatch
        XCTAssertTrue(pickerLabel.waitForExistence(timeout: 8))
        pickerLabel.tap()
        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native document picker did not appear\n\(app.debugDescription)")
        attachScreenshot("native-document-picker")
        cancel.tap()
    }

    func testNativeApkgFilesRoundTrip() throws {
        openMore("Exchange")
        tapButton("Export")
        tapScrollableButton("Anki · Export an Anki deck package")
        tapScrollableButton("Preview Anki deck", timeout: 20)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '16 cards'" )).firstMatch.waitForExistence(timeout: 20))
        tapScrollableButton("Export Anki deck", timeout: 30)

        let shareSheet = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 30), "Native APKG share sheet did not appear\n\(app.debugDescription)")
        let saveToFiles = app.cells["Save to Files"]
        XCTAssertTrue(saveToFiles.waitForExistence(timeout: 8))
        saveToFiles.tap()
        saveSharedFileToLocalDestination()
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 20))

        let generatedHash = integrityHash(label: "Generated APKG integrity")
        XCTAssertEqual(generatedHash.count, 64)

        tapButton("Import")
        tapScrollableButton("Anki · Import Anki .apkg decks")
        let packageInput = app.descendants(matching: .any).matching(identifier: "Anki package").firstMatch
        XCTAssertTrue(packageInput.waitForExistence(timeout: 8))

        packageInput.tap()
        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native APKG picker did not appear\n\(app.debugDescription)")
        cancel.tap()
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "Selected APKG integrity").firstMatch.exists)
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "Anki import result").firstMatch.exists)

        packageInput.tap()
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native APKG picker did not reopen\n\(app.debugDescription)")
        let savedPackage = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'holorecall-' AND label CONTAINS[c] '.apkg'")).firstMatch
        if !savedPackage.waitForExistence(timeout: 2) {
            let browse = app.tabBars["Tab Bar"].buttons["Browse"]
            XCTAssertTrue(browse.waitForExistence(timeout: 8), "Native Files Browse destination was unavailable\n\(app.debugDescription)")
            browse.tap()
            let onMyIPhone = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'On My iPhone'")).firstMatch
            XCTAssertTrue(onMyIPhone.waitForExistence(timeout: 8), "On My iPhone was unavailable in the native picker\n\(app.debugDescription)")
            onMyIPhone.tap()
        }
        XCTAssertTrue(savedPackage.waitForExistence(timeout: 15), "Saved APKG was not available in the native picker\n\(app.debugDescription)")
        savedPackage.tap()

        let selectedHash = integrityHash(label: "Selected APKG integrity", timeout: 30)
        XCTAssertEqual(selectedHash, generatedHash, "The APKG selected from Files is not byte-identical to the generated artifact")
        let importResult = app.descendants(matching: .any).matching(identifier: "Anki import result").firstMatch
        XCTAssertTrue(importResult.waitForExistence(timeout: 30))
        XCTAssertTrue(importResult.descendants(matching: .staticText).matching(NSPredicate(format: "label == '16'")).firstMatch.exists, "The APKG parser did not report 16 ready cards\n\(app.debugDescription)")
        XCTAssertTrue(importResult.descendants(matching: .staticText).matching(NSPredicate(format: "label == 'Ready'")).firstMatch.exists, "The APKG parser did not expose its ready-card result\n\(app.debugDescription)")

        tapScrollableButton("Import 16 supported cards", timeout: 20)
        XCTAssertTrue(app.staticTexts["IMPORT COMPLETE"].waitForExistence(timeout: 30))
        attachScreenshot("native-apkg-files-round-trip")
    }

    func testNativePortableZipFilesRoundTrip() throws {
        openMore("Exchange")
        tapButton("Export")
        tapScrollableButton("Export package", timeout: 30)

        let shareSheet = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 30), "Native portable ZIP share sheet did not appear\n\(app.debugDescription)")
        let saveToFiles = app.cells["Save to Files"]
        XCTAssertTrue(saveToFiles.waitForExistence(timeout: 8))
        saveToFiles.tap()
        saveSharedFileToLocalDestination()
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 20))

        let generatedHash = integrityHash(label: "Generated portable ZIP integrity")
        let generatedBytes = integrityByteCount(label: "Generated portable ZIP integrity")
        XCTAssertEqual(generatedHash.count, 64)
        XCTAssertGreaterThan(generatedBytes, 0)

        // Stable portable IDs intentionally make same-store reimport a no-op. Remove only
        // this isolated Simulator fixture branch through the production deck UI so the
        // saved package is applied to a clean receiving state.
        tapButton("Decks")
        let actions = app.buttons["More deck actions"]
        XCTAssertTrue(actions.waitForExistence(timeout: 8))
        actions.tap()
        let edit = app.menuItems["Edit deck"]
        XCTAssertTrue(edit.waitForExistence(timeout: 8))
        edit.tap()
        let delete = app.buttons["Delete deck…"]
        for _ in 0..<6 where !delete.isHittable { app.swipeUp() }
        XCTAssertTrue(delete.isHittable)
        delete.tap()
        let acknowledgement = app.descendants(matching: .any).matching(identifier: "I understand this cannot be undone.").firstMatch
        XCTAssertTrue(acknowledgement.waitForExistence(timeout: 8), "Delete acknowledgement was unavailable\n\(app.debugDescription)")
        acknowledgement.tap()
        tapButton("Delete permanently")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Deck branch and its learning records'")).firstMatch.waitForExistence(timeout: 12))

        openMore("Exchange")
        let packageInput = app.descendants(matching: .any).matching(identifier: "Workbook or portable archive").firstMatch
        XCTAssertTrue(packageInput.waitForExistence(timeout: 8))

        packageInput.tap()
        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native portable ZIP picker did not appear\n\(app.debugDescription)")
        cancel.tap()
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "Selected portable ZIP integrity").firstMatch.exists)
        XCTAssertFalse(app.staticTexts["Import preview"].exists)

        packageInput.tap()
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native portable ZIP picker did not reopen\n\(app.debugDescription)")
        let savedPackage = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'holorecall-' AND label CONTAINS[c] '-v11.zip'")).firstMatch
        if !savedPackage.waitForExistence(timeout: 2) {
            let browse = app.tabBars["Tab Bar"].buttons["Browse"]
            XCTAssertTrue(browse.waitForExistence(timeout: 8), "Native Files Browse destination was unavailable\n\(app.debugDescription)")
            browse.tap()
            let onMyIPhone = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'On My iPhone'")).firstMatch
            XCTAssertTrue(onMyIPhone.waitForExistence(timeout: 8), "On My iPhone was unavailable in the native picker\n\(app.debugDescription)")
            onMyIPhone.tap()
        }
        XCTAssertTrue(savedPackage.waitForExistence(timeout: 15), "Saved portable ZIP was not available in the native picker\n\(app.debugDescription)")
        savedPackage.tap()

        let selectedHash = integrityHash(label: "Selected portable ZIP integrity", timeout: 30)
        let selectedBytes = integrityByteCount(label: "Selected portable ZIP integrity", timeout: 30)
        XCTAssertEqual(selectedHash, generatedHash, "The portable ZIP selected from Files is not byte-identical to the generated artifact")
        XCTAssertEqual(selectedBytes, generatedBytes, "The portable ZIP selected from Files changed byte length")
        XCTAssertTrue(app.staticTexts["Import preview"].waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '1 decks' AND label CONTAINS '16 cards' AND label CONTAINS '16 media'")).firstMatch.exists, "The portable parser did not expose the expected v11 manifest counts\n\(app.debugDescription)")
        tapScrollableButton("Apply 16 card changes", timeout: 20)
        XCTAssertTrue(app.staticTexts["IMPORT COMPLETE"].waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts["Italian essentials"].exists)
        attachScreenshot("native-portable-zip-files-round-trip")
    }

    func testNativeXlsxFilesRoundTrip() throws {
        openMore("Exchange")
        tapButton("Export")
        tapScrollableButton("Export XLSX", timeout: 30)

        let shareSheet = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 30), "Native XLSX share sheet did not appear\n\(app.debugDescription)")
        let saveToFiles = app.cells["Save to Files"]
        XCTAssertTrue(saveToFiles.waitForExistence(timeout: 8))
        saveToFiles.tap()
        saveSharedFileToLocalDestination()
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 20))

        let generatedHash = integrityHash(label: "Generated XLSX integrity")
        let generatedBytes = integrityByteCount(label: "Generated XLSX integrity")
        XCTAssertEqual(generatedHash.count, 64)
        XCTAssertGreaterThan(generatedBytes, 0)

        // Stable workbook IDs make same-store reimport a no-op. Remove only this
        // isolated Simulator fixture branch through the production deck UI.
        tapButton("Decks")
        let actions = app.buttons["More deck actions"]
        XCTAssertTrue(actions.waitForExistence(timeout: 8))
        actions.tap()
        let edit = app.menuItems["Edit deck"]
        XCTAssertTrue(edit.waitForExistence(timeout: 8))
        edit.tap()
        let delete = app.buttons["Delete deck…"]
        for _ in 0..<6 where !delete.isHittable { app.swipeUp() }
        XCTAssertTrue(delete.isHittable)
        delete.tap()
        let acknowledgement = app.descendants(matching: .any).matching(identifier: "I understand this cannot be undone.").firstMatch
        XCTAssertTrue(acknowledgement.waitForExistence(timeout: 8), "Delete acknowledgement was unavailable\n\(app.debugDescription)")
        acknowledgement.tap()
        tapButton("Delete permanently")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Deck branch and its learning records'")).firstMatch.waitForExistence(timeout: 12))

        openMore("Exchange")
        let workbookInput = app.descendants(matching: .any).matching(identifier: "Workbook or portable archive").firstMatch
        XCTAssertTrue(workbookInput.waitForExistence(timeout: 8))
        workbookInput.tap()
        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native XLSX picker did not appear\n\(app.debugDescription)")
        cancel.tap()
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "Selected XLSX integrity").firstMatch.exists)
        XCTAssertFalse(app.staticTexts["Import preview"].exists)

        workbookInput.tap()
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native XLSX picker did not reopen\n\(app.debugDescription)")
        let savedWorkbook = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'holorecall-' AND label CONTAINS[c] '-v11' AND label CONTAINS[c] 'xlsx'")).firstMatch
        if !savedWorkbook.waitForExistence(timeout: 2) {
            let browse = app.tabBars["Tab Bar"].buttons["Browse"]
            XCTAssertTrue(browse.waitForExistence(timeout: 8), "Native Files Browse destination was unavailable\n\(app.debugDescription)")
            browse.tap()
            let onMyIPhone = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'On My iPhone'")).firstMatch
            XCTAssertTrue(onMyIPhone.waitForExistence(timeout: 8), "On My iPhone was unavailable in the native picker\n\(app.debugDescription)")
            onMyIPhone.tap()
        }
        XCTAssertTrue(savedWorkbook.waitForExistence(timeout: 15), "Saved XLSX was not available in the native picker\n\(app.debugDescription)")
        savedWorkbook.tap()

        let selectedHash = integrityHash(label: "Selected XLSX integrity", timeout: 30)
        let selectedBytes = integrityByteCount(label: "Selected XLSX integrity", timeout: 30)
        XCTAssertEqual(selectedHash, generatedHash, "The XLSX selected from Files is not byte-identical to the generated artifact")
        XCTAssertEqual(selectedBytes, generatedBytes, "The XLSX selected from Files changed byte length")
        XCTAssertTrue(app.staticTexts["Import preview"].waitForExistence(timeout: 30))
        tapScrollableButton("Apply 16 card changes", timeout: 20)
        XCTAssertTrue(app.staticTexts["IMPORT COMPLETE"].waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts["Italian essentials"].exists)
        attachScreenshot("native-xlsx-files-round-trip")
    }

    func testNativeFullBackupFilesRoundTrip() throws {
        openMore("Settings")
        let system = app.descendants(matching: .any).matching(identifier: "System").firstMatch
        XCTAssertTrue(system.waitForExistence(timeout: 8))
        if (system.value as? String) != "1" { system.tap() }
        tapScrollableButton("Download JSON backup ↓")

        let shareSheet = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 30), "Native full-backup share sheet did not appear\n\(app.debugDescription)")
        let saveToFiles = app.cells["Save to Files"]
        XCTAssertTrue(saveToFiles.waitForExistence(timeout: 8))
        saveToFiles.tap()
        saveSharedFileToLocalDestination()
        XCTAssertTrue(app.staticTexts["Settings"].waitForExistence(timeout: 20))

        let generatedHash = integrityHash(label: "Generated full backup integrity")
        let generatedBytes = integrityByteCount(label: "Generated full backup integrity")
        XCTAssertEqual(generatedHash.count, 64)
        XCTAssertGreaterThan(generatedBytes, 0)

        // Mutate only a preference: the production restore contract deliberately
        // refuses profiles containing content or learner-history changes.
        let dark = app.descendants(matching: .any).matching(identifier: "Dark").firstMatch
        XCTAssertTrue(dark.waitForExistence(timeout: 8))
        scrollToHittable(dark)
        dark.tap()
        XCTAssertEqual(dark.value as? String, "1")

        let backupInput = app.descendants(matching: .any).matching(identifier: "Restore full backup").firstMatch
        XCTAssertTrue(backupInput.waitForExistence(timeout: 8))
        scrollToHittable(backupInput)
        backupInput.tap()
        let pickerCancel = app.buttons["Cancel"]
        XCTAssertTrue(pickerCancel.waitForExistence(timeout: 10), "Native full-backup picker did not appear\n\(app.debugDescription)")
        pickerCancel.tap()
        XCTAssertFalse(app.descendants(matching: .any).matching(identifier: "Selected full backup integrity").firstMatch.exists)
        XCTAssertEqual(dark.value as? String, "1")

        selectSavedFullBackup(using: backupInput)
        let selectedHash = integrityHash(label: "Selected full backup integrity", timeout: 30)
        let selectedBytes = integrityByteCount(label: "Selected full backup integrity", timeout: 30)
        XCTAssertEqual(selectedHash, generatedHash, "The full backup selected from Files is not byte-identical to the generated artifact")
        XCTAssertEqual(selectedBytes, generatedBytes, "The full backup selected from Files changed byte length")
        let preview = app.descendants(matching: .any).matching(identifier: "Selected full backup integrity").firstMatch
        XCTAssertTrue(preview.waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '1 decks' AND label CONTAINS '16 cards'")).firstMatch.exists)
        tapButton("Cancel")
        XCTAssertFalse(preview.exists)
        XCTAssertEqual(dark.value as? String, "1")

        selectSavedFullBackup(using: backupInput)
        XCTAssertTrue(preview.waitForExistence(timeout: 30))
        let restore = app.buttons["Restore backup"]
        XCTAssertTrue(restore.waitForExistence(timeout: 8))
        XCTAssertFalse(restore.isEnabled)
        let acknowledgement = app.descendants(matching: .any).matching(identifier: "I understand this profile will be replaced by the validated backup.").firstMatch
        XCTAssertTrue(acknowledgement.waitForExistence(timeout: 8))
        acknowledgement.tap()
        XCTAssertTrue(restore.isEnabled)
        restore.tap()
        XCTAssertTrue(app.staticTexts["Backup restored."].waitForExistence(timeout: 30))
        XCTAssertEqual(system.value as? String, "1", "Full restore did not replace the deliberately changed preference")
        attachScreenshot("native-full-backup-files-round-trip")
    }

    func testImportedMp3AndWavPersistAndPlayAfterRelaunch() throws {
        openMore("Exchange")
        tapButton("Import")
        tapScrollableButton("Anki · Import Anki .apkg decks")
        let packageInput = app.descendants(matching: .any).matching(identifier: "Anki package").firstMatch
        XCTAssertTrue(packageInput.waitForExistence(timeout: 8))
        packageInput.tap()

        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native APKG picker did not appear\n\(app.debugDescription)")
        let fixture = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'native-media' AND label CONTAINS[c] '.apkg'")).firstMatch
        if !fixture.waitForExistence(timeout: 2) {
            let browse = app.tabBars["Tab Bar"].buttons["Browse"]
            XCTAssertTrue(browse.waitForExistence(timeout: 8), "Native Files Browse destination was unavailable\n\(app.debugDescription)")
            browse.tap()
            let onMyIPhone = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'On My iPhone'")).firstMatch
            XCTAssertTrue(onMyIPhone.waitForExistence(timeout: 8), "On My iPhone was unavailable in the native picker\n\(app.debugDescription)")
            onMyIPhone.tap()
        }
        XCTAssertTrue(fixture.waitForExistence(timeout: 15), "The native-media APKG fixture was unavailable\n\(app.debugDescription)")
        fixture.tap()

        let importResult = app.descendants(matching: .any).matching(identifier: "Anki import result").firstMatch
        XCTAssertTrue(importResult.waitForExistence(timeout: 30))
        XCTAssertTrue(importResult.descendants(matching: .staticText).matching(NSPredicate(format: "label == '2'")).firstMatch.exists)
        tapScrollableButton("Import 2 supported cards", timeout: 20)
        XCTAssertTrue(app.staticTexts["IMPORT COMPLETE"].waitForExistence(timeout: 30))
        tapButton("Study now")

        XCTAssertTrue(app.buttons["Play front audio 1"].waitForExistence(timeout: 12), "The imported MP3 card did not expose its production audio control")
        app.buttons["Play front audio 1"].tap()
        XCTAssertTrue(app.buttons["Pause front audio 1"].waitForExistence(timeout: 8), "Imported MP3 did not enter the production playing state")

        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(app.buttons["Play front audio 1"].waitForExistence(timeout: 12), "Backgrounding did not return imported MP3 audio to an explicit-play state")
        XCTAssertFalse(app.buttons["Pause front audio 1"].exists, "Imported MP3 audio resumed automatically after foreground activation")
        app.buttons["Play front audio 1"].tap()
        XCTAssertTrue(app.buttons["Pause front audio 1"].waitForExistence(timeout: 8), "Imported MP3 did not replay explicitly after foreground activation")

        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
        tapButton("Study")
        XCTAssertTrue(app.buttons["Play front audio 1"].waitForExistence(timeout: 15), "The imported media Study session did not survive relaunch")
        XCTAssertFalse(app.buttons["Pause front audio 1"].exists, "Imported MP3 audio resumed automatically after relaunch")
        app.buttons["Play front audio 1"].tap()
        XCTAssertTrue(app.buttons["Pause front audio 1"].waitForExistence(timeout: 8), "Persisted MP3 did not play after relaunch")
        revealableCard().tap()
        tapButton("4 Good Confident")

        XCTAssertTrue(app.buttons["Play front audio 1"].waitForExistence(timeout: 12), "The imported WAV card did not expose its production audio control")
        app.buttons["Play front audio 1"].tap()
        XCTAssertTrue(app.buttons["Pause front audio 1"].waitForExistence(timeout: 8), "Imported WAV did not enter the production playing state")
        tapButton("End session")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Study saved' OR label CONTAINS[c] 'Nice work'")).firstMatch.waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["Pause front audio 1"].exists, "Imported WAV audio survived Study route destruction")
        attachScreenshot("native-imported-mp3-wav-playback")
    }

    func testSupportedSizeImportedMediaReconcilesAndPlays() throws {
        openMore("Exchange")
        tapButton("Import")
        tapScrollableButton("Anki · Import Anki .apkg decks")
        let packageInput = app.descendants(matching: .any).matching(identifier: "Anki package").firstMatch
        XCTAssertTrue(packageInput.waitForExistence(timeout: 8))
        packageInput.tap()

        let fixture = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'native-media-supported-size' AND label CONTAINS[c] '.apkg'")).firstMatch
        if !fixture.waitForExistence(timeout: 2) {
            let browse = app.tabBars["Tab Bar"].buttons["Browse"]
            XCTAssertTrue(browse.waitForExistence(timeout: 8))
            browse.tap()
            let onMyIPhone = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'On My iPhone'")).firstMatch
            XCTAssertTrue(onMyIPhone.waitForExistence(timeout: 8))
            onMyIPhone.tap()
        }
        XCTAssertTrue(fixture.waitForExistence(timeout: 15), "The generated supported-size APKG was unavailable\n\(app.debugDescription)")
        let started = Date()
        fixture.tap()
        let importResult = app.descendants(matching: .any).matching(identifier: "Anki import result").firstMatch
        XCTAssertTrue(importResult.waitForExistence(timeout: 60))
        tapScrollableButton("Import 5 supported cards", timeout: 30)
        XCTAssertTrue(app.staticTexts["IMPORT COMPLETE"].waitForExistence(timeout: 60))
        print("HR_NATIVE_08C_IMPORT_SECONDS=\(Date().timeIntervalSince(started))")
        tapButton("Study now")
        XCTAssertTrue(app.buttons["Play front audio 1"].waitForExistence(timeout: 20))
        app.buttons["Play front audio 1"].tap()
        XCTAssertTrue(app.buttons["Pause front audio 1"].waitForExistence(timeout: 12), "Supported-size WAV did not enter the production playing state")
        attachScreenshot("native-supported-size-media-playback")
    }

    func testCollectionSubviewNavigation() throws {
        tapButton("Collection")
        XCTAssertTrue(app.staticTexts["Collection"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Overview"].exists)
        XCTAssertTrue(app.buttons["Sets"].exists)
        XCTAssertTrue(app.buttons["Cards"].exists)
        let desk = app.buttons["Open Collection Desk"]
        XCTAssertTrue(desk.waitForExistence(timeout: 8))
        desk.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Collection Desk'")).firstMatch.waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Your collection on the table"].exists)
        app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Back to Collection'")).firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Collection"].waitForExistence(timeout: 8))
        app.buttons["Sets"].tap()
        XCTAssertTrue(app.staticTexts["Collection sets"].waitForExistence(timeout: 8))
        app.buttons["Cards"].tap()
        XCTAssertTrue(app.staticTexts["Your collection"].waitForExistence(timeout: 8))
        attachScreenshot("native-collection-segments")
    }

    func testCollectionDeskLayoutPersistence() throws {
        let start = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'study' AND label CONTAINS '→'")).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 8))
        start.tap()
        for _ in 0..<10 {
            XCTAssertTrue(revealableCard().waitForExistence(timeout: 10))
            revealableCard().tap()
            let qualifying = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '5 Easy'")).firstMatch
            XCTAssertTrue(qualifying.waitForExistence(timeout: 8))
            qualifying.tap()
            if app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Study saved' OR label CONTAINS[c] 'Nice work'")).firstMatch.waitForExistence(timeout: 1) { break }
        }
        let end = app.buttons["End session"]
        if end.exists { end.tap() }
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Study saved' OR label CONTAINS[c] 'Nice work'")).firstMatch.waitForExistence(timeout: 8))
        tapButton("Done")

        openDeskWithFirstCollectedStack()
        chooseDeskAppearance("Walnut")
        tapButton("Lay out collected")
        let placedCards = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Collected card:'"))
        XCTAssertTrue(placedCards.firstMatch.waitForExistence(timeout: 8))
        XCTAssertGreaterThanOrEqual(placedCards.count, 2)
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(placedCards.element(boundBy: 1).waitForExistence(timeout: 8))
        app.swipeUp()
        let appFrame = app.frame
        let sourceFrame = placedCards.element(boundBy: 0).frame
        let targetFrame = placedCards.element(boundBy: 1).frame
        let sourceY = max(24, min(sourceFrame.maxY - 24, appFrame.height - 80))
        let targetY = max(24, min(targetFrame.maxY - 24, appFrame.height - 80))
        let sourcePoint = app.coordinate(withNormalizedOffset: CGVector(dx: sourceFrame.midX / appFrame.width, dy: sourceY / appFrame.height))
        let targetPoint = app.coordinate(withNormalizedOffset: CGVector(dx: targetFrame.midX / appFrame.width, dy: targetY / appFrame.height))
        sourcePoint.press(forDuration: 0.2, thenDragTo: targetPoint)
        let pileGrip = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Move card pile, 2 cards'")).firstMatch
        XCTAssertTrue(pileGrip.waitForExistence(timeout: 8), "Pile grip did not appear after grouping two cards\n\(app.debugDescription)")
        pileGrip.tap()
        tapButton("Fan cards")
        XCTAssertTrue(app.buttons["Collapse pile"].waitForExistence(timeout: 8))
        tapButton("Collapse pile")
        attachScreenshot("native-desk-arrangement-before-relaunch")

        app.terminate()
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
        openDeskWithFirstCollectedStack()
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Collected card:'")).firstMatch.waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Move card pile, 2 cards'")).firstMatch.waitForExistence(timeout: 8))
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'Desk appearance' AND label CONTAINS[c] 'Walnut'")).firstMatch.waitForExistence(timeout: 8))
        attachScreenshot("native-desk-arrangement-restored")
        tapButton("Reset set")
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'Desk appearance' AND label CONTAINS[c] 'Walnut'")).firstMatch.exists)
        chooseDeskAppearance("Holo Grid")
    }

    func testDesignSuiteFoundation() throws {
        openMore("Design Studio")
        XCTAssertTrue(app.staticTexts["Design Suite"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["＋ New Design Set"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Preview"].waitForExistence(timeout: 8))
        attachScreenshot("native-design-suite")
    }

    func testDeckManagementLayoutAndDeleteDialog() throws {
        tapButton("Decks")
        let actions = app.buttons["More deck actions"]
        XCTAssertTrue(actions.waitForExistence(timeout: 8))
        actions.tap()
        let edit = app.menuItems["Edit deck"]
        XCTAssertTrue(edit.waitForExistence(timeout: 8), "Missing menu item: Edit deck\n\(app.debugDescription)")
        edit.tap()
        XCTAssertTrue(app.staticTexts["Deck details"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Save deck"].exists)
        let delete = app.buttons["Delete deck…"]
        for _ in 0..<6 where !delete.isHittable { app.swipeUp() }
        XCTAssertTrue(delete.isHittable, "Delete action is outside the reachable deck-management flow\n\(app.debugDescription)")
        attachScreenshot("native-deck-management")
        delete.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Delete'" )).firstMatch.waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Delete permanently"].exists)
        XCTAssertFalse(app.buttons["Delete permanently"].isEnabled)
        tapButton("Cancel")
    }

    func testSharedSubviewNavigation() throws {
        tapButton("Decks")
        let searchCards = app.buttons["Search cards"]
        XCTAssertTrue(searchCards.waitForExistence(timeout: 8))
        searchCards.tap()
        XCTAssertTrue(app.textFields["Search decks and cards"].waitForExistence(timeout: 8))
        let deckButtons = app.buttons.matching(identifier: "Decks")
        XCTAssertGreaterThanOrEqual(deckButtons.count, 2)
        deckButtons.element(boundBy: 1).tap()
        XCTAssertTrue(app.staticTexts["Italian essentials"].waitForExistence(timeout: 8))

        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.buttons["Search cards"].waitForExistence(timeout: 8))
        attachScreenshot("native-deck-subviews-landscape")
        XCUIDevice.shared.orientation = .portrait

        openMore("Exchange")
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Import"].exists)
        XCTAssertTrue(app.buttons["Export"].exists)
        XCTAssertTrue(app.buttons["Templates"].exists)
        app.buttons["Export"].tap()
        XCTAssertTrue(app.staticTexts["EXPORT HOLORECALL CONTENT"].waitForExistence(timeout: 8))
        attachScreenshot("native-exchange-segments")
    }

    func testExpandedImageInspection() throws {
        XCUIDevice.shared.orientation = .portrait
        let start = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'study' AND label CONTAINS '→'")).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 8))
        start.tap()
        XCTAssertTrue(revealableCard().waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Space or Enter' OR label CONTAINS 'Z to inspect'" )).firstMatch.exists)

        let expand = app.buttons["Expand Recall image"]
        XCTAssertTrue(expand.waitForExistence(timeout: 8))
        expand.tap()
        XCTAssertTrue(app.staticTexts["Expanded Recall image"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS 'Recall image inspection'" )).firstMatch.exists)

        let zoomIn = app.buttons["Zoom in"]
        XCTAssertTrue(zoomIn.isHittable)
        attachScreenshot("native-expanded-image")
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.staticTexts["Expanded Recall image"].waitForExistence(timeout: 8))
        let landscapeZoomIn = app.buttons["Zoom in"]
        let landscapeZoomReady = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isHittable == true"), object: landscapeZoomIn)
        XCTAssertEqual(XCTWaiter.wait(for: [landscapeZoomReady], timeout: 5), .completed)
        attachScreenshot("native-expanded-image-landscape")
        XCUIDevice.shared.orientation = .portrait
        XCTAssertTrue(app.staticTexts["Expanded Recall image"].waitForExistence(timeout: 8))
        tapButton("Close")
        XCTAssertTrue(expand.waitForExistence(timeout: 8))
        XCTAssertTrue(revealableCard().exists)
    }

    private func tapButton(_ label: String, timeout: TimeInterval = 8) {
        let button = app.buttons[label]
        XCTAssertTrue(button.waitForExistence(timeout: timeout), "Missing button: \(label)\n\(app.debugDescription)")
        button.tap()
    }

    private func tapScrollableButton(_ label: String, timeout: TimeInterval = 8) {
        let button = app.buttons[label]
        XCTAssertTrue(button.waitForExistence(timeout: timeout), "Missing button: \(label)\n\(app.debugDescription)")
        scrollToHittable(button)
        XCTAssertTrue(button.isHittable, "Button is outside the reachable scroll area: \(label)\n\(app.debugDescription)")
        button.tap()
    }

    private func scrollToHittable(_ element: XCUIElement, maximumSwipes: Int = 10) {
        for _ in 0..<maximumSwipes where !element.isHittable {
            if element.frame.midY < app.frame.midY {
                app.swipeDown()
            } else {
                app.swipeUp()
            }
        }
    }

    private func revealableCard() -> XCUIElement {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS[c] 'Show card answer' OR label CONTAINS[c] 'flashcard'"))
            .firstMatch
    }

    private func startItalianDeckStudy() {
        XCTAssertTrue(app.staticTexts["Italian essentials"].waitForExistence(timeout: 8))
        let studies = app.buttons.matching(identifier: "Study")
        XCTAssertGreaterThanOrEqual(studies.count, 2)
        let deckStudy = studies.allElementsBoundByIndex.first { $0.isHittable && $0.frame.minY < app.frame.height - 120 }
        XCTAssertNotNil(deckStudy, "The deterministic deck Study action was not reachable\n\(app.debugDescription)")
        deckStudy!.tap()
        XCTAssertTrue(revealableCard().waitForExistence(timeout: 10))
    }

    private func setNewCardLimit(_ value: String) {
        openMore("Settings")
        let field = app.textFields["New cards per day"]
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        scrollToHittable(field)
        let currentValue = field.value as? String ?? ""
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: currentValue.count) + value)
        XCTAssertEqual(field.value as? String, value, "The production new-card limit field did not accept the deterministic value")
        let keyboardDone = app.toolbars.buttons["Done"]
        XCTAssertTrue(keyboardDone.waitForExistence(timeout: 3))
        keyboardDone.tap()
        tapScrollableButton("Save study settings")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'Study preset saved'" )).firstMatch.waitForExistence(timeout: 8))
    }

    private func openMore(_ destination: String) {
        let direct = app.buttons[destination]
        if direct.waitForExistence(timeout: 1) {
            direct.tap()
            return
        }
        tapButton("More")
        tapButton(destination)
    }

    private func openDeskWithFirstCollectedStack() {
        tapButton("Collection")
        if app.buttons["Lay out collected"].waitForExistence(timeout: 2) { return }
        XCTAssertTrue(app.staticTexts["Collection"].waitForExistence(timeout: 8))
        tapButton("Open Collection Desk")
        XCTAssertTrue(app.staticTexts["My collection stacks"].waitForExistence(timeout: 8))
        let stack = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'collected' AND NOT label CONTAINS[c] 'not yet'")).firstMatch
        XCTAssertTrue(stack.waitForExistence(timeout: 8), "No collected Desk stack was available\n\(app.debugDescription)")
        stack.tap()
        XCTAssertTrue(app.buttons["Lay out collected"].waitForExistence(timeout: 8))
    }

    private func chooseDeskAppearance(_ name: String) {
        let trigger = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'Desk appearance'")).firstMatch
        XCTAssertTrue(trigger.waitForExistence(timeout: 8), "Desk appearance trigger is unavailable\n\(app.debugDescription)")
        trigger.tap()
        let option = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", name)).firstMatch
        XCTAssertTrue(option.waitForExistence(timeout: 8), "Missing Desk appearance preset: \(name)\n\(app.debugDescription)")
        option.tap()
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'Desk appearance' AND label CONTAINS[c] %@", name)).firstMatch.waitForExistence(timeout: 8))
    }

    private func integrityHash(label: String, timeout: TimeInterval = 10) -> String {
        let receipt = app.descendants(matching: .any).matching(identifier: label).firstMatch
        XCTAssertTrue(receipt.waitForExistence(timeout: timeout), "Missing integrity receipt: \(label)\n\(app.debugDescription)")
        let hash = receipt.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'SHA-256 '")).firstMatch
        XCTAssertTrue(hash.waitForExistence(timeout: timeout), "Missing SHA-256 value for \(label)\n\(app.debugDescription)")
        return hash.label.replacingOccurrences(of: "SHA-256 ", with: "")
    }

    private func saveSharedFileToLocalDestination() {
        let save = app.buttons["Save"]
        if !save.waitForExistence(timeout: 2) {
            let onMyIPhone = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'On My iPhone'")).firstMatch
            XCTAssertTrue(onMyIPhone.waitForExistence(timeout: 8), "Save to Files did not expose a local destination\n\(app.debugDescription)")
            onMyIPhone.tap()
        }
        XCTAssertTrue(save.waitForExistence(timeout: 15), "Save to Files destination did not appear\n\(app.debugDescription)")
        save.tap()
        let replace = app.buttons["Replace"]
        if replace.waitForExistence(timeout: 2) { replace.tap() }
    }

    private func selectSavedFullBackup(using input: XCUIElement) {
        input.tap()
        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native full-backup picker did not open\n\(app.debugDescription)")
        let fileView = app.collectionViews["File View"]
        let savedBackup = fileView.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] 'holorecall-backup-' AND label CONTAINS[c] '-v6' AND label CONTAINS[c] 'json'")).firstMatch
        if !savedBackup.waitForExistence(timeout: 2) {
            let browse = app.tabBars["Tab Bar"].buttons["Browse"]
            XCTAssertTrue(browse.waitForExistence(timeout: 8), "Native Files Browse destination was unavailable\n\(app.debugDescription)")
            browse.tap()
            let onMyIPhone = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'On My iPhone'")).firstMatch
            XCTAssertTrue(onMyIPhone.waitForExistence(timeout: 8), "On My iPhone was unavailable in the native picker\n\(app.debugDescription)")
            onMyIPhone.tap()
        }
        XCTAssertTrue(savedBackup.waitForExistence(timeout: 15), "Saved full backup was not available in the native picker\n\(app.debugDescription)")
        savedBackup.tap()
    }

    private func integrityByteCount(label: String, timeout: TimeInterval = 10) -> Int {
        let receipt = app.descendants(matching: .any).matching(identifier: label).firstMatch
        XCTAssertTrue(receipt.waitForExistence(timeout: timeout), "Missing integrity receipt: \(label)\n\(app.debugDescription)")
        let value = receipt.staticTexts.matching(NSPredicate(format: "label CONTAINS ' bytes'")).firstMatch
        XCTAssertTrue(value.waitForExistence(timeout: timeout), "Missing byte count for \(label)\n\(app.debugDescription)")
        let components = value.label.components(separatedBy: " · ")
        let count = components.last?.replacingOccurrences(of: " bytes", with: "") ?? ""
        return Int(count) ?? 0
    }

    private func attachScreenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
