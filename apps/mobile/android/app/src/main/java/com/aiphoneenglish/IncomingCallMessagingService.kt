package com.aiphoneenglish

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class IncomingCallMessagingService : FirebaseMessagingService() {
  override fun onNewToken(token: String) {
    super.onNewToken(token)
    NativeCallApi.uploadPushToken(this, token, "fcm")
  }

  override fun onMessageReceived(message: RemoteMessage) {
    super.onMessageReceived(message)
    try {
      val payload = IncomingCallPayload.from(message.data)
      payload.validate()
      NativeCallCoordinator.showIncomingCall(this, payload)
    } catch (error: Exception) {
      NativeCallEvents.emit("telecomError", mapOf("code" to "INVALID_FCM_PAYLOAD", "message" to (error.message ?: "invalid data message")))
    }
  }
}
