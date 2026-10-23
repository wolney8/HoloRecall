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
        for _ in 0..<4 where !button.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(button.isHittable, "Button is outside the reachable scroll area: \(label)\n\(app.debugDescription)")
        button.tap()
    }

    private func revealableCard() -> XCUIElement {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS[c] 'Show card answer' OR label CONTAINS[c] 'flashcard'"))
            .firstMatch
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

    private func attachScreenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
