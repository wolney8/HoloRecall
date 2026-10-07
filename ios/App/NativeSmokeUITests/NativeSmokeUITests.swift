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
        XCTAssertTrue(app.buttons["Reveal answer ↻"].waitForExistence(timeout: 10))

        for expectedCard in 1...3 {
            let card = app.descendants(matching: .any)
                .matching(NSPredicate(format: "label CONTAINS[c] 'flashcard'"))
                .firstMatch
            XCTAssertTrue(card.waitForExistence(timeout: 5))
            tapButton("Reveal answer ↻")
            let rating = app.buttons.matching(NSPredicate(format: "label BEGINSWITH '3 Good'")).firstMatch
            XCTAssertTrue(rating.waitForExistence(timeout: 5))
            rating.tap()
            if expectedCard < 3 {
                XCTAssertTrue(app.buttons["Reveal answer ↻"].waitForExistence(timeout: 8))
                XCTAssertTrue(card.exists)
                attachScreenshot("incoming-card-\(expectedCard + 1)")
            }
        }

        tapButton("End session")
        tapButton("Collection")
        XCTAssertTrue(app.staticTexts["Collection"].waitForExistence(timeout: 8))
        tapButton("Progress")
        XCTAssertTrue(app.staticTexts["Progress"].waitForExistence(timeout: 8))
        tapButton("Settings")
        XCTAssertTrue(app.staticTexts["Settings"].waitForExistence(timeout: 8))
        attachScreenshot("native-settings")
    }

    func testSystemAppearanceAndRelaunch() throws {
        let dark = app.otherElements["Dark"]
        XCTAssertTrue(dark.waitForExistence(timeout: 8))
        dark.tap()
        XCTAssertEqual(dark.value as? String, "1")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.otherElements["Dark"].value as? String, "1")
        let system = app.otherElements["System"]
        XCTAssertTrue(system.waitForExistence(timeout: 8))
        system.tap()
    }

    func testNativeLifecycleRecoversActiveStudy() throws {
        let start = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'study' AND label CONTAINS '→'")).firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 8))
        start.tap()
        XCTAssertTrue(app.buttons["Reveal answer ↻"].waitForExistence(timeout: 10))
        XCUIDevice.shared.press(.home)
        sleep(3)
        app.activate()
        XCTAssertTrue(app.buttons["Reveal answer ↻"].waitForExistence(timeout: 10))
        attachScreenshot("lifecycle-resumed-study")
    }

    func testNativeOrientationAndFileSurfaces() throws {
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 8))
        attachScreenshot("iphone-landscape-dashboard")
        XCUIDevice.shared.orientation = .portrait

        tapButton("Import / export")
        XCTAssertTrue(app.staticTexts["Import & export"].waitForExistence(timeout: 10))
        tapButton("Export current XLSX")
        let shareSheet = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        XCTAssertTrue(shareSheet.waitForExistence(timeout: 20), "Native share sheet did not appear\n\(app.debugDescription)")
        XCTAssertTrue(app.cells["Save to Files"].exists)
        attachScreenshot("native-export-share-sheet")
        app.otherElements["dismiss popup"].tap()
        XCTAssertTrue(app.staticTexts["Import & export"].waitForExistence(timeout: 8))

        let pickerLabel = app.staticTexts["Workbook or portable archive"]
        XCTAssertTrue(pickerLabel.waitForExistence(timeout: 8))
        pickerLabel.tap()
        let cancel = app.buttons["Cancel"]
        XCTAssertTrue(cancel.waitForExistence(timeout: 10), "Native document picker did not appear\n\(app.debugDescription)")
        attachScreenshot("native-document-picker")
        cancel.tap()
    }

    private func tapButton(_ label: String, timeout: TimeInterval = 8) {
        let button = app.buttons[label]
        XCTAssertTrue(button.waitForExistence(timeout: timeout), "Missing button: \(label)\n\(app.debugDescription)")
        button.tap()
    }

    private func attachScreenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
