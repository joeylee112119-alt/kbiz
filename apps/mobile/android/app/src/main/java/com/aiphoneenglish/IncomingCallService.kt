package com.aiphoneenglish

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.Person

class IncomingCallService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val payload = IncomingCallPayload(
      callAttemptId = intent?.getStringExtra("callAttemptId").orEmpty(),
      tutorName = intent?.getStringExtra("tutorName") ?: "AI Tutor",
      topicKo = intent?.getStringExtra("topicKo") ?: "AI 전화영어",
      expiresAtIso = intent?.getStringExtra("expiresAt") ?: java.time.Instant.now().plusSeconds(45).toString()
    )
    startForeground(NOTIFICATION_ID, buildNotification(this, payload))
    return START_NOT_STICKY
  }

  companion object {
    const val CHANNEL_ID = "incoming_calls"
    const val NOTIFICATION_ID = 4100

    fun intent(context: Context, payload: IncomingCallPayload): Intent =
      Intent(context, IncomingCallService::class.java).apply {
        putExtra("callAttemptId", payload.callAttemptId)
        putExtra("tutorName", payload.tutorName)
        putExtra("topicKo", payload.topicKo)
        putExtra("expiresAt", payload.expiresAtIso)
      }

    fun ensureChannel(context: Context) {
      val manager = context.getSystemService(NotificationManager::class.java)
      val channel = NotificationChannel(CHANNEL_ID, "Incoming AI calls", NotificationManager.IMPORTANCE_HIGH)
      channel.description = "Incoming AI phone English calls"
      manager.createNotificationChannel(channel)
    }

    fun buildNotification(context: Context, payload: IncomingCallPayload): Notification {
      ensureChannel(context)
      val answerIntent = PendingIntent.getBroadcast(
        context,
        payload.callAttemptId.hashCode(),
        NativeCallActionReceiver.intent(context, payload.callAttemptId, "answer"),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
      val declineIntent = PendingIntent.getBroadcast(
        context,
        payload.callAttemptId.hashCode() + 1,
        NativeCallActionReceiver.intent(context, payload.callAttemptId, "decline"),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
      val person = Person.Builder().setName(payload.tutorName).setImportant(true).build()
      return NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.sym_call_incoming)
        .setContentTitle(payload.tutorName)
        .setContentText(payload.topicKo)
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setCategory(NotificationCompat.CATEGORY_CALL)
        .setFullScreenIntent(answerIntent, true)
        .setStyle(NotificationCompat.CallStyle.forIncomingCall(person, declineIntent, answerIntent))
        .setOngoing(true)
        .build()
    }
  }
}
