package com.aiphoneenglish

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object LessonReminderNotification {
  private const val channelId = "lesson-reminders"

  fun ensureChannel(context: Context) {
    val channel = NotificationChannel(channelId, "Lesson reminders", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Scheduled AI English lesson reminders"
    }
    context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  fun show(context: Context, payload: LessonNotificationPayload) {
    ensureChannel(context)
    val intent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      putExtra("occurrenceId", payload.occurrenceId)
      putExtra("notificationDeliveryId", payload.notificationDeliveryId)
      putExtra("route", "LessonReady")
    }
    val contentIntent = PendingIntent.getActivity(
      context,
      payload.occurrenceId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(payload.title)
      .setContentText(payload.body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(contentIntent)
      .build()
    NotificationManagerCompat.from(context).notify(payload.occurrenceId.hashCode(), notification)
    LessonNotificationEvents.emit(
      "lessonReminderDisplayed",
      mapOf("occurrenceId" to payload.occurrenceId, "notificationDeliveryId" to payload.notificationDeliveryId)
    )
  }
}
