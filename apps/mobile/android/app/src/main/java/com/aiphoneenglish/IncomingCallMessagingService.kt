package com.aiphoneenglish

class IncomingCallMessagingService {
  fun handleMessage(callAttemptId: String): Map<String, String> {
    return mapOf(
      "event" to "incomingCallReceived",
      "callAttemptId" to callAttemptId
    )
  }
}
