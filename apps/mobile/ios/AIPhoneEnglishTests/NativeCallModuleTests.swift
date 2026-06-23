import XCTest
@testable import AIPhoneEnglish

final class NativeCallModuleTests: XCTestCase {
  func testPayloadValidationRequiresCallAttemptId() {
    XCTAssertThrowsError(try IncomingCallPayload.parse(["tutorName": "Emma"]))
  }

  func testPayloadValidationAcceptsRequiredFields() throws {
    let payload = try IncomingCallPayload.parse([
      "callAttemptId": "call-1",
      "tutorName": "Emma",
      "topicKo": "호텔 체크인",
      "expiresAt": "2026-06-23T10:00:00Z"
    ])
    XCTAssertEqual(payload.callAttemptId, "call-1")
    XCTAssertEqual(payload.tutorName, "Emma")
  }
}
