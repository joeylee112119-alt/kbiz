package com.aiphoneenglish

import android.content.Context
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object NativeCallApi {
  private fun baseUrl(context: Context): String =
    context.getSharedPreferences("native-call", Context.MODE_PRIVATE).getString("apiBaseUrl", "http://10.0.2.2:4000/v1")!!

  fun uploadPushToken(context: Context, token: String, provider: String) {
    postJson(context, "/devices/current/push-tokens", """{"token":"$token","provider":"$provider"}""")
  }

  fun syncCallState(context: Context, callAttemptId: String, action: String) {
    postJson(context, "/calls/$callAttemptId/$action", "{}")
  }

  private fun postJson(context: Context, path: String, body: String) {
    Thread {
      try {
        val connection = URL("${baseUrl(context)}$path").openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("content-type", "application/json")
        connection.doOutput = true
        OutputStreamWriter(connection.outputStream).use { it.write(body) }
        connection.inputStream.close()
      } catch (error: Exception) {
        NativeCallEvents.emit("telecomError", mapOf("message" to (error.message ?: "call API sync failed"), "path" to path))
      }
    }.start()
  }
}
