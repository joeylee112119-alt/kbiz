import XCTest
@testable import AIPhoneEnglish

final class NotificationModuleTests: XCTestCase {
  func testPayloadValidationRequiresOccurrenceId() {
    XCTAssertThrowsError(try LessonNotificationPayload.parse(["title": "Emma"]))
  }

  func testPayloadValidationAcceptsRequiredFields() throws {
    let payload = try LessonNotificationPayload.parse([
      "occurrenceId": "occurrence-1",
      "notificationDeliveryId": "delivery-1",
      "title": "AI 영어 수업",
      "body": "예약된 수업을 시작할 시간이에요.",
      "scheduledAt": "2026-06-23T10:00:00Z"
    ])
    XCTAssertEqual(payload.occurrenceId, "occurrence-1")
    XCTAssertEqual(payload.notificationDeliveryId, "delivery-1")
  }
}
