package com.aiphoneenglish

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class LessonNotificationMessagingService : FirebaseMessagingService() {
  override fun onNewToken(token: String) {
    LessonNotificationApi.uploadPushToken(this, token)
    LessonNotificationEvents.emit("pushTokenRefreshed", mapOf("provider" to "fcm", "tokenLast4" to token.takeLast(4)))
  }

  override fun onMessageReceived(message: RemoteMessage) {
    runCatching {
      val payload = LessonNotificationPayload.from(
        message.data,
        message.notification?.title,
        message.notification?.body
      )
      LessonReminderNotification.show(this, payload)
    }.onFailure {
      LessonNotificationEvents.emit("notificationPayloadInvalid", mapOf("message" to (it.message ?: "invalid lesson notification payload")))
    }
  }
}
