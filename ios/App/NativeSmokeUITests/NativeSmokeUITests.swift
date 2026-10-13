import XCTest

final class NativeSmokeUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
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

        openMore("Import / export")
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 10))
        tapButton("Export")
        tapScrollableButton("Export XLSX")
        let shareSheet = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 20), "Native share sheet did not appear\n\(app.debugDescription)")
        XCTAssertTrue(app.cells["Save to Files"].waitForExistence(timeout: 8))
        attachScreenshot("native-export-share-sheet")
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

        openMore("Import / export")
        XCTAssertTrue(app.staticTexts["Exchange"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Import"].exists)
        XCTAssertTrue(app.buttons["Export"].exists)
        XCTAssertTrue(app.buttons["Templates"].exists)
        app.buttons["Export"].tap()
        XCTAssertTrue(app.staticTexts["EXPORT HOLORECALL CONTENT"].waitForExistence(timeout: 8))
        attachScreenshot("native-exchange-segments")
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

    private func attachScreenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
