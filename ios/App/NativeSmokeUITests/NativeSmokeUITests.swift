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
        tapButton("Dark")
        XCTAssertTrue(app.buttons["Dark"].isSelected)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Study dashboard"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.buttons["Dark"].isSelected)
        tapButton("System")
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
