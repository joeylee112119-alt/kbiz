package com.aiphoneenglish

import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.messaging.FirebaseMessaging

class NativeCallModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "NativeCallModule"

  init {
    NativeCallEvents.attach(reactContext)
  }

  @ReactMethod
  fun registerPushToken(promise: Promise) {
    FirebaseMessaging.getInstance().token
      .addOnSuccessListener { token ->
        if (token.isNullOrBlank()) {
          promise.reject("FCM_TOKEN_UNAVAILABLE", "Firebase returned an empty FCM token.")
        } else {
          NativeCallApi.uploadPushToken(reactContext, token, "fcm")
          promise.resolve(token)
        }
      }
      .addOnFailureListener { error ->
        promise.reject("FCM_TOKEN_UNAVAILABLE", "FCM token is unavailable. Check google-services.json and Firebase configuration.", error)
      }
  }

  @ReactMethod
  fun scheduleDebugIncomingCall(callAttemptId: String, tutorName: String, topicKo: String, expiresAtIso: String, promise: Promise) {
    Handler(Looper.getMainLooper()).postDelayed({
      NativeCallCoordinator.showIncomingCall(
        reactContext,
        IncomingCallPayload(callAttemptId, tutorName, topicKo, expiresAtIso)
      )
    }, 5_000)
    promise.resolve(mapOf("scheduled" to true, "callAttemptId" to callAttemptId))
  }

  @ReactMethod
  fun answerCall(callAttemptId: String, promise: Promise) {
    NativeCallCoordinator.answer(reactContext, callAttemptId)
    promise.resolve(null)
  }

  @ReactMethod
  fun declineCall(callAttemptId: String, promise: Promise) {
    NativeCallCoordinator.decline(reactContext, callAttemptId)
    promise.resolve(null)
  }

  @ReactMethod
  fun endCall(callAttemptId: String, promise: Promise) {
    NativeCallCoordinator.end(reactContext, callAttemptId)
    promise.resolve(null)
  }

  @ReactMethod
  fun setSpeakerEnabled(enabled: Boolean, promise: Promise) {
    val audioManager = reactContext.getSystemService(AudioManager::class.java)
    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
    audioManager.isSpeakerphoneOn = enabled
    emitAudioRoute(audioManager)
    promise.resolve(null)
  }

  private fun emitAudioRoute(audioManager: AudioManager) {
    val outputs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map { device ->
      when (device.type) {
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetooth"
        AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired"
        AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "speaker"
        else -> "other"
      }
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("audioRouteChanged", mapOf("outputs" to outputs))
  }
}
