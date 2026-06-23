package com.aiphoneenglish

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.firebase.messaging.FirebaseMessaging

class NotificationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "NativeNotificationModule"

  init {
    LessonNotificationEvents.attach(reactContext)
  }

  @ReactMethod
  fun getFcmToken(promise: Promise) {
    FirebaseMessaging.getInstance().token
      .addOnSuccessListener { token ->
        LessonNotificationApi.uploadPushToken(reactContext, token)
        promise.resolve(token)
      }
      .addOnFailureListener { error -> promise.reject("FCM_TOKEN_FAILED", error) }
  }

  @ReactMethod
  fun hasNotificationPermission(promise: Promise) {
    val granted = Build.VERSION.SDK_INT < 33 ||
      ContextCompat.checkSelfPermission(reactContext, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    promise.resolve(granted)
  }

  @ReactMethod
  fun presentDebugLessonReminder(occurrenceId: String, notificationDeliveryId: String, title: String, body: String, promise: Promise) {
    try {
      val payload = LessonNotificationPayload(
        occurrenceId = occurrenceId,
        notificationDeliveryId = notificationDeliveryId,
        notificationType = "LESSON_REMINDER",
        title = title,
        body = body,
        scheduledAt = null
      )
      LessonReminderNotification.show(reactContext, payload)
      promise.resolve(mapOf("displayed" to true, "occurrenceId" to occurrenceId))
    } catch (error: Throwable) {
      promise.reject("DEBUG_LESSON_REMINDER_FAILED", error)
    }
  }

  @ReactMethod
  fun markNotificationOpened(notificationDeliveryId: String, promise: Promise) {
    LessonNotificationApi.markNotificationOpened(notificationDeliveryId)
    promise.resolve(mapOf("queued" to true, "notificationDeliveryId" to notificationDeliveryId))
  }
}
