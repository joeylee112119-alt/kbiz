import AVFoundation
import CallKit
import Foundation
import PushKit
import React

struct IncomingCallPayload {
  let callAttemptId: String
  let tutorName: String
  let topicKo: String
  let expiresAt: Date

  static func parse(_ dictionary: [AnyHashable: Any]) throws -> IncomingCallPayload {
    guard let callAttemptId = dictionary["callAttemptId"] as? String, !callAttemptId.isEmpty else {
      throw NativeCallError.invalidPayload("callAttemptId is required")
    }
    guard let tutorName = dictionary["tutorName"] as? String, !tutorName.isEmpty else {
      throw NativeCallError.invalidPayload("tutorName is required")
    }
    let topicKo = dictionary["topicKo"] as? String ?? "AI 전화영어"
    let expiresAtString = dictionary["expiresAt"] as? String
    let expiresAt = expiresAtString.flatMap(Self.iso8601.date(from:)) ?? Date().addingTimeInterval(45)
    return IncomingCallPayload(callAttemptId: callAttemptId, tutorName: tutorName, topicKo: topicKo, expiresAt: expiresAt)
  }

  private static let iso8601 = ISO8601DateFormatter()
}

enum NativeCallError: Error {
  case invalidPayload(String)
  case tokenUnavailable
  case duplicateCall(String)
  case expiredCall(String)
}

@objc(NativeCallModule)
final class NativeCallModule: RCTEventEmitter, PKPushRegistryDelegate, CXProviderDelegate {
  private let callController = CXCallController()
  private let userDefaults = UserDefaults.standard
  private var pushRegistry: PKPushRegistry?
  private var voipToken: String?
  private var uuidByCallAttemptId: [String: UUID] = [:]
  private var callAttemptIdByUuid: [UUID: String] = [:]
  private var timeoutWorkItems: [UUID: DispatchWorkItem] = [:]

  private lazy var provider: CXProvider = {
    let configuration = CXProviderConfiguration(localizedName: "AI 전화영어")
    configuration.supportsVideo = false
    configuration.maximumCallsPerCallGroup = 1
    configuration.maximumCallGroups = 1
    configuration.includesCallsInRecents = false
    configuration.supportedHandleTypes = [.generic]
    return CXProvider(configuration: configuration)
  }()

  override init() {
    super.init()
    provider.setDelegate(self, queue: nil)
    restorePersistedCalls()
    observeAudioRouteChanges()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    [
      "incomingCallReceived",
      "callAnswered",
      "callDeclined",
      "callEnded",
      "callTimedOut",
      "audioSessionActivated",
      "audioSessionDeactivated",
      "audioRouteChanged",
      "nativeCallError"
    ]
  }

  @objc(registerPushToken:rejecter:)
  func registerPushToken(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if self.pushRegistry == nil {
        let registry = PKPushRegistry(queue: DispatchQueue.main)
        registry.delegate = self
        registry.desiredPushTypes = [.voIP]
        self.pushRegistry = registry
      }
      guard let token = self.voipToken ?? self.userDefaults.string(forKey: "voipToken") else {
        reject("VOIP_TOKEN_UNAVAILABLE", "VoIP token registration started, but APNs has not returned a token yet.", nil)
        return
      }
      resolve(token)
    }
  }

  @objc(scheduleDebugIncomingCall:resolver:rejecter:)
  func scheduleDebugIncomingCall(payload: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    do {
      let input = try IncomingCallPayload.parse(payload as? [AnyHashable: Any] ?? [:])
      DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
        self.reportIncomingCall(input)
      }
      resolve(["scheduled": true, "callAttemptId": input.callAttemptId])
    } catch {
      reject("INVALID_DEBUG_CALL_PAYLOAD", "\(error)", error)
    }
  }

  @objc(answerCall:resolver:rejecter:)
  func answerCall(callAttemptId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let uuid = uuidByCallAttemptId[callAttemptId] else {
      reject("CALL_NOT_FOUND", "No active CallKit UUID for \(callAttemptId)", nil)
      return
    }
    let action = CXAnswerCallAction(call: uuid)
    callController.request(CXTransaction(action: action)) { error in
      if let error {
        reject("CALLKIT_ANSWER_FAILED", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }

  @objc(declineCall:resolver:rejecter:)
  func declineCall(callAttemptId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    endCall(callAttemptId: callAttemptId, reason: .declinedElsewhere, eventName: "callDeclined", resolver: resolve, rejecter: reject)
  }

  @objc(endCall:resolver:rejecter:)
  func endCall(callAttemptId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    endCall(callAttemptId: callAttemptId, reason: .remoteEnded, eventName: "callEnded", resolver: resolve, rejecter: reject)
  }

  @objc(setMuted:muted:resolver:rejecter:)
  func setMuted(callAttemptId: String, muted: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let uuid = uuidByCallAttemptId[callAttemptId] else {
      reject("CALL_NOT_FOUND", "No active CallKit UUID for \(callAttemptId)", nil)
      return
    }
    callController.request(CXTransaction(action: CXSetMutedCallAction(call: uuid, muted: muted))) { error in
      if let error {
        reject("CALLKIT_MUTE_FAILED", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }

  @objc(setSpeakerEnabled:resolver:rejecter:)
  func setSpeakerEnabled(enabled: Bool, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    do {
      let session = AVAudioSession.sharedInstance()
      try session.overrideOutputAudioPort(enabled ? .speaker : .none)
      sendEvent(withName: "audioRouteChanged", body: ["speaker": enabled])
      resolve(nil)
    } catch {
      reject("AUDIO_ROUTE_FAILED", error.localizedDescription, error)
    }
  }

  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    guard type == .voIP else { return }
    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    voipToken = token
    userDefaults.set(token, forKey: "voipToken")
    sendEvent(withName: "incomingCallReceived", body: ["voipTokenUpdated": true])
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    guard type == .voIP else { return }
    voipToken = nil
    userDefaults.removeObject(forKey: "voipToken")
    sendEvent(withName: "nativeCallError", body: ["code": "VOIP_TOKEN_INVALIDATED"])
  }

  func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    guard type == .voIP else {
      completion()
      return
    }
    do {
      let incoming = try IncomingCallPayload.parse(payload.dictionaryPayload)
      reportIncomingCall(incoming)
    } catch {
      sendEvent(withName: "nativeCallError", body: ["code": "INVALID_PUSH_PAYLOAD", "message": "\(error)"])
    }
    completion()
  }

  func providerDidReset(_ provider: CXProvider) {
    timeoutWorkItems.values.forEach { $0.cancel() }
    timeoutWorkItems.removeAll()
    uuidByCallAttemptId.removeAll()
    callAttemptIdByUuid.removeAll()
    persistCalls()
    sendEvent(withName: "callEnded", body: ["reason": "provider_reset"])
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    let callAttemptId = callAttemptIdByUuid[action.callUUID]
    timeoutWorkItems[action.callUUID]?.cancel()
    configureAudioSession()
    sendEvent(withName: "callAnswered", body: ["uuid": action.callUUID.uuidString, "callAttemptId": callAttemptId ?? ""])
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    let callAttemptId = callAttemptIdByUuid[action.callUUID]
    clearCall(uuid: action.callUUID)
    sendEvent(withName: "callEnded", body: ["uuid": action.callUUID.uuidString, "callAttemptId": callAttemptId ?? ""])
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    sendEvent(withName: "audioRouteChanged", body: ["uuid": action.callUUID.uuidString, "muted": action.isMuted])
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    configureAudioSession()
    sendEvent(withName: "audioSessionActivated", body: [:])
  }

  func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    sendEvent(withName: "audioSessionDeactivated", body: [:])
  }

  private func reportIncomingCall(_ payload: IncomingCallPayload) {
    if Date() > payload.expiresAt {
      sendEvent(withName: "callTimedOut", body: ["callAttemptId": payload.callAttemptId])
      return
    }
    if uuidByCallAttemptId[payload.callAttemptId] != nil {
      sendEvent(withName: "nativeCallError", body: ["code": "DUPLICATE_CALL", "callAttemptId": payload.callAttemptId])
      return
    }

    let uuid = UUID()
    uuidByCallAttemptId[payload.callAttemptId] = uuid
    callAttemptIdByUuid[uuid] = payload.callAttemptId
    persistCalls()

    let update = CXCallUpdate()
    update.localizedCallerName = payload.tutorName
    update.remoteHandle = CXHandle(type: .generic, value: payload.topicKo)
    update.hasVideo = false

    provider.reportNewIncomingCall(with: uuid, update: update) { error in
      if let error {
        self.clearCall(uuid: uuid)
        self.sendEvent(withName: "nativeCallError", body: ["code": "REPORT_INCOMING_CALL_FAILED", "message": error.localizedDescription])
        return
      }
      self.scheduleTimeout(uuid: uuid, callAttemptId: payload.callAttemptId, expiresAt: payload.expiresAt)
      self.sendEvent(withName: "incomingCallReceived", body: [
        "callAttemptId": payload.callAttemptId,
        "uuid": uuid.uuidString,
        "topicKo": payload.topicKo,
        "expiresAt": ISO8601DateFormatter().string(from: payload.expiresAt)
      ])
    }
  }

  private func endCall(callAttemptId: String, reason: CXCallEndedReason, eventName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let uuid = uuidByCallAttemptId[callAttemptId] else {
      reject("CALL_NOT_FOUND", "No active CallKit UUID for \(callAttemptId)", nil)
      return
    }
    let action = CXEndCallAction(call: uuid)
    callController.request(CXTransaction(action: action)) { error in
      if let error {
        reject("CALLKIT_END_FAILED", error.localizedDescription, error)
        return
      }
      self.provider.reportCall(with: uuid, endedAt: Date(), reason: reason)
      self.clearCall(uuid: uuid)
      self.sendEvent(withName: eventName, body: ["callAttemptId": callAttemptId, "uuid": uuid.uuidString])
      resolve(nil)
    }
  }

  private func scheduleTimeout(uuid: UUID, callAttemptId: String, expiresAt: Date) {
    let delay = max(0, expiresAt.timeIntervalSinceNow)
    let work = DispatchWorkItem { [weak self] in
      guard let self, self.callAttemptIdByUuid[uuid] != nil else { return }
      self.provider.reportCall(with: uuid, endedAt: Date(), reason: .unanswered)
      self.clearCall(uuid: uuid)
      self.sendEvent(withName: "callTimedOut", body: ["callAttemptId": callAttemptId, "uuid": uuid.uuidString])
    }
    timeoutWorkItems[uuid] = work
    DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
  }

  private func clearCall(uuid: UUID) {
    let callAttemptId = callAttemptIdByUuid[uuid]
    if let callAttemptId {
      uuidByCallAttemptId.removeValue(forKey: callAttemptId)
    }
    callAttemptIdByUuid.removeValue(forKey: uuid)
    timeoutWorkItems[uuid]?.cancel()
    timeoutWorkItems.removeValue(forKey: uuid)
    persistCalls()
  }

  private func configureAudioSession() {
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker])
      try session.setActive(true)
    } catch {
      sendEvent(withName: "nativeCallError", body: ["code": "AUDIO_SESSION_FAILED", "message": error.localizedDescription])
    }
  }

  private func observeAudioRouteChanges() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(audioRouteChanged(_:)),
      name: AVAudioSession.routeChangeNotification,
      object: nil
    )
  }

  @objc private func audioRouteChanged(_ notification: Notification) {
    let outputs = AVAudioSession.sharedInstance().currentRoute.outputs.map { $0.portType.rawValue }
    sendEvent(withName: "audioRouteChanged", body: ["outputs": outputs])
  }

  private func persistCalls() {
    let encoded = uuidByCallAttemptId.mapValues { $0.uuidString }
    userDefaults.set(encoded, forKey: "callKitUuidByCallAttemptId")
  }

  private func restorePersistedCalls() {
    guard let encoded = userDefaults.dictionary(forKey: "callKitUuidByCallAttemptId") as? [String: String] else { return }
    uuidByCallAttemptId = encoded.compactMapValues(UUID.init(uuidString:))
    callAttemptIdByUuid = Dictionary(uniqueKeysWithValues: uuidByCallAttemptId.map { ($0.value, $0.key) })
    for uuid in callAttemptIdByUuid.keys {
      provider.reportCall(with: uuid, endedAt: Date(), reason: .failed)
      clearCall(uuid: uuid)
    }
  }
}
