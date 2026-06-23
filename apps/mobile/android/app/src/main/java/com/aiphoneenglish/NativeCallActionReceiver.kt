package com.aiphoneenglish

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class NativeCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val callAttemptId = intent.getStringExtra("callAttemptId") ?: return
    when (intent.getStringExtra("action")) {
      "answer" -> NativeCallCoordinator.answer(context, callAttemptId)
      "decline" -> NativeCallCoordinator.decline(context, callAttemptId)
      "end" -> NativeCallCoordinator.end(context, callAttemptId)
    }
  }

  companion object {
    fun intent(context: Context, callAttemptId: String, action: String): Intent =
      Intent(context, NativeCallActionReceiver::class.java).apply {
        putExtra("callAttemptId", callAttemptId)
        putExtra("action", action)
      }
  }
}
