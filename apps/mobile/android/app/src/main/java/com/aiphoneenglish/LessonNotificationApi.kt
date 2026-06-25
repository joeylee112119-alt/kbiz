package com.aiphoneenglish

import android.content.Context
import android.provider.Settings
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

object LessonNotificationApi {
  private const val baseUrl = "http://10.0.2.2:4000/v1"

  fun uploadPushToken(context: Context, token: String, provider: String = "fcm") {
    val deviceId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "android"
    postJson(
      "$baseUrl/devices",
      """{"userId":"debug-user","platform":"android","deviceId":"$deviceId","deviceName":"Android"}"""
    ) { deviceResponse ->
      val deviceRecordId = Regex("\"id\"\\s*:\\s*\"([^\"]+)\"").find(deviceResponse)?.groupValues?.get(1) ?: return@postJson
      postJson(
        "$baseUrl/devices/$deviceRecordId/push-tokens",
        """{"provider":"$provider","token":"$token"}"""
      )
    }
  }

  fun markNotificationOpened(notificationDeliveryId: String) {
    if (notificationDeliveryId.isBlank()) return
    postJson("$baseUrl/notifications/deliveries/$notificationDeliveryId/open", "{}")
  }

  private fun postJson(url: String, body: String, onSuccess: (String) -> Unit = {}) {
    thread(name = "lesson-notification-api") {
      runCatching {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          setRequestProperty("Content-Type", "application/json")
          doOutput = true
        }
        OutputStreamWriter(connection.outputStream).use { it.write(body) }
        val responseBody = connection.inputStream.bufferedReader().use { it.readText() }
        if (connection.responseCode in 200..299) onSuccess(responseBody)
      }.onFailure {
        LessonNotificationEvents.emit("notificationSyncFailed", mapOf("message" to (it.message ?: "notification API sync failed")))
      }
    }
  }
}
