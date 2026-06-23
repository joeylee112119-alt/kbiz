import Foundation
import CallKit
import AVFoundation
import React

@objc(NativeCallModule)
final class NativeCallModule: RCTEventEmitter, CXProviderDelegate {
  private let provider = CXProvider(configuration: {
    let configuration = CXProviderConfiguration(localizedName: "AI 전화영어")
    configuration.supportsVideo = false
    configuration.maximumCallsPerCallGroup = 1
    configuration.includesCallsInRecents = false
    return configuration
  }())

  override init() {
    super.init()
    provider.setDelegate(self, queue: nil)
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return [
      "incomingCallReceived",
      "callAnswered",
      "callDeclined",
      "callEnded",
      "audioSessionActivated",
      "audioSessionDeactivated",
      "callTimedOut",
      "nativeCallError"
    ]
  }

  @objc(registerPushToken:rejecter:)
  func registerPushToken(resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve("mock-ios-voip-token")
  }

  @objc(endCall:resolver:rejecter:)
  func endCall(callId: String, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    sendEvent(withName: "callEnded", body: ["callId": callId])
    resolve(nil)
  }

  func providerDidReset(_ provider: CXProvider) {
    sendEvent(withName: "callEnded", body: ["reason": "provider_reset"])
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    sendEvent(withName: "callAnswered", body: ["uuid": action.callUUID.uuidString])
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    sendEvent(withName: "audioSessionActivated", body: [:])
  }

  func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    sendEvent(withName: "audioSessionDeactivated", body: [:])
  }
}
