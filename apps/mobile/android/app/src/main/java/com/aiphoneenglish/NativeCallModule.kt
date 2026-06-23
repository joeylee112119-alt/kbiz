package com.aiphoneenglish

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class NativeCallModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "NativeCallModule"

  @ReactMethod
  fun registerPushToken(promise: Promise) {
    promise.resolve("mock-android-fcm-token")
  }

  @ReactMethod
  fun endCall(callId: String, promise: Promise) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("callEnded", mapOf("callId" to callId))
    promise.resolve(null)
  }

  @ReactMethod
  fun setSpeakerEnabled(enabled: Boolean, promise: Promise) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("audioRouteChanged", mapOf("speaker" to enabled))
    promise.resolve(null)
  }
}
