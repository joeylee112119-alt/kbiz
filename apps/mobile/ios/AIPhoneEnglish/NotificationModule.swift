import Foundation
import React
import UIKit
import UserNotifications

struct LessonNotificationPayload {
  let occurrenceId: String
  let notificationDeliveryId: String
  let title: String
  let body: String
  let scheduledAt: Date?

  static func parse(_ dictionary: [AnyHashable: Any]) throws -> LessonNotificationPayload {
    guard let occurrenceId = dictionary["occurrenceId"] as? String, !occurrenceId.isEmpty else {
      throw NotificationModuleError.invalidPayload("occurrenceId is required")
    }
    let notificationDeliveryId = dictionary["notificationDeliveryId"] as? String ?? ""
    let title = dictionary["title"] as? String ?? "AI 영어 수업"
    let body = dictionary["body"] as? String ?? "예약된 수업을 시작할 시간이에요."
    let scheduledAt = (dictionary["scheduledAt"] as? String).flatMap(Self.iso8601.date(from:))
    return LessonNotificationPayload(
      occurrenceId: occurrenceId,
      notificationDeliveryId: notificationDeliveryId,
      title: title,
      body: body,
      scheduledAt: scheduledAt
    )
  }

  private static let iso8601 = ISO8601DateFormatter()
}

enum NotificationModuleError: Error {
  case invalidPayload(String)
}

@objc(NativeNotificationModule)
final class NativeNotificationModule: RCTEventEmitter, UNUserNotificationCenterDelegate {
  private var hasListeners = false

  override init() {
    super.init()
    UNUserNotificationCenter.current().delegate = self
    NotificationCenter.default.addObserver(self, selector: #selector(handleApnsToken(_:)), name: .apnsTokenRegistered, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(handleApnsRegistrationFailed(_:)), name: .apnsTokenRegistrationFailed, object: nil)
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    [
      "pushTokenRegistered",
      "pushTokenRegistrationFailed",
      "notificationPermissionChanged",
      "lessonReminderDisplayed",
      "notificationOpened",
      "notificationError"
    ]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc(registerPushToken:rejecter:)
  func registerPushToken(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if let error {
        reject("NOTIFICATION_PERMISSION_FAILED", error.localizedDescription, error)
        return
      }
      self.emit("notificationPermissionChanged", ["granted": granted])
      DispatchQueue.main.async {
        UIApplication.shared.registerForRemoteNotifications()
        resolve(["registrationRequested": true, "granted": granted])
      }
    }
  }

  @objc(presentDebugLessonReminder:resolver:rejecter:)
  func presentDebugLessonReminder(payload: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    do {
      let input = try LessonNotificationPayload.parse(payload as? [AnyHashable: Any] ?? [:])
      let content = UNMutableNotificationContent()
      content.title = input.title
      content.body = input.body
      content.sound = .default
      content.categoryIdentifier = "LESSON_REMINDER"
      content.userInfo = [
        "occurrenceId": input.occurrenceId,
        "notificationDeliveryId": input.notificationDeliveryId,
        "route": "LessonReady"
      ]
      let request = UNNotificationRequest(
        identifier: "lesson-\(input.occurrenceId)",
        content: content,
        trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
      )
      UNUserNotificationCenter.current().add(request) { error in
        if let error {
          reject("DEBUG_LESSON_REMINDER_FAILED", error.localizedDescription, error)
          return
        }
        self.emit("lessonReminderDisplayed", ["occurrenceId": input.occurrenceId, "notificationDeliveryId": input.notificationDeliveryId])
        resolve(["displayed": true, "occurrenceId": input.occurrenceId])
      }
    } catch {
      reject("INVALID_NOTIFICATION_PAYLOAD", "\(error)", error)
    }
  }

  @objc(markNotificationOpened:resolver:rejecter:)
  func markNotificationOpened(notificationDeliveryId: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    emit("notificationOpened", ["notificationDeliveryId": notificationDeliveryId])
    resolve(["queued": true, "notificationDeliveryId": notificationDeliveryId])
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .sound, .list])
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo
    emit("notificationOpened", [
      "occurrenceId": userInfo["occurrenceId"] as? String ?? "",
      "notificationDeliveryId": userInfo["notificationDeliveryId"] as? String ?? "",
      "route": userInfo["route"] as? String ?? "LessonReady"
    ])
    completionHandler()
  }

  @objc private func handleApnsToken(_ notification: Notification) {
    guard let token = notification.userInfo?["token"] as? String else { return }
    emit("pushTokenRegistered", ["provider": "apns", "token": token, "tokenLast4": String(token.suffix(4))])
  }

  @objc private func handleApnsRegistrationFailed(_ notification: Notification) {
    emit("pushTokenRegistrationFailed", ["message": notification.userInfo?["message"] as? String ?? "APNs registration failed"])
  }

  private func emit(_ name: String, _ body: Any) {
    if hasListeners {
      sendEvent(withName: name, body: body)
    }
  }
}

extension Notification.Name {
  static let apnsTokenRegistered = Notification.Name("AIPhoneEnglishApnsTokenRegistered")
  static let apnsTokenRegistrationFailed = Notification.Name("AIPhoneEnglishApnsTokenRegistrationFailed")
}
