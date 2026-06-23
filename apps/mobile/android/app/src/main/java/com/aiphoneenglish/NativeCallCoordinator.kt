package com.aiphoneenglish

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import androidx.core.content.ContextCompat
import androidx.core.content.ContextCompat.startForegroundService
import androidx.core.telecom.CallsManager
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

object NativeCallCoordinator {
  private val activeCalls = ConcurrentHashMap<String, IncomingCallPayload>()

  fun showIncomingCall(context: Context, payload: IncomingCallPayload) {
    try {
      payload.validate()
      if (activeCalls.putIfAbsent(payload.callAttemptId, payload) != null) {
        NativeCallEvents.emit("telecomError", mapOf("code" to "DUPLICATE_CALL", "callAttemptId" to payload.callAttemptId))
        return
      }
      IncomingCallService.ensureChannel(context)
      startForegroundService(context, IncomingCallService.intent(context, payload))
      registerWithTelecom(context, payload)
      NativeCallEvents.emit(
        "incomingCallReceived",
        mapOf("callAttemptId" to payload.callAttemptId, "tutorName" to payload.tutorName, "topicKo" to payload.topicKo)
      )
    } catch (error: Exception) {
      NativeCallEvents.emit("telecomError", mapOf("message" to (error.message ?: "incoming call failed")))
    }
  }

  fun answer(context: Context, callAttemptId: String) {
    val payload = activeCalls[callAttemptId] ?: return
    if (Instant.now().isAfter(payload.expiresAt)) {
      activeCalls.remove(callAttemptId)
      NativeCallEvents.emit("callTimedOut", mapOf("callAttemptId" to callAttemptId))
      return
    }
    val audioManager = context.getSystemService(AudioManager::class.java)
    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
    audioManager.requestAudioFocus(
      { },
      AudioManager.STREAM_VOICE_CALL,
      AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
    )
    NativeCallApi.syncCallState(context, callAttemptId, "accept")
    NativeCallEvents.emit("callAnswered", mapOf("callAttemptId" to callAttemptId))
  }

  fun decline(context: Context, callAttemptId: String) {
    activeCalls.remove(callAttemptId)
    NativeCallApi.syncCallState(context, callAttemptId, "decline")
    NativeCallEvents.emit("callDeclined", mapOf("callAttemptId" to callAttemptId))
    context.stopService(Intent(context, IncomingCallService::class.java))
  }

  fun end(context: Context, callAttemptId: String) {
    activeCalls.remove(callAttemptId)
    NativeCallApi.syncCallState(context, callAttemptId, "end")
    NativeCallEvents.emit("callEnded", mapOf("callAttemptId" to callAttemptId))
    context.stopService(Intent(context, IncomingCallService::class.java))
  }

  private fun registerWithTelecom(context: Context, payload: IncomingCallPayload) {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.MANAGE_OWN_CALLS) != PackageManager.PERMISSION_GRANTED) {
      NativeCallEvents.emit("telecomError", mapOf("code" to "MANAGE_OWN_CALLS_NOT_GRANTED", "callAttemptId" to payload.callAttemptId))
      return
    }
    try {
      val callsManager = CallsManager(context)
      NativeCallEvents.emit("audioRouteChanged", mapOf("telecomRegistered" to true, "callsManager" to callsManager.javaClass.simpleName))
    } catch (error: Exception) {
      NativeCallEvents.emit("telecomError", mapOf("code" to "CALLS_MANAGER_FAILED", "message" to (error.message ?: "CallsManager failed")))
    }
  }
}
