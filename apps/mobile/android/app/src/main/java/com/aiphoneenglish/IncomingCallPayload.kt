package com.aiphoneenglish

import java.time.Instant

data class IncomingCallPayload(
  val callAttemptId: String,
  val tutorName: String,
  val topicKo: String,
  val expiresAtIso: String
) {
  val expiresAt: Instant = Instant.parse(expiresAtIso)

  fun validate() {
    require(callAttemptId.isNotBlank()) { "callAttemptId is required" }
    require(tutorName.isNotBlank()) { "tutorName is required" }
    require(Instant.now().isBefore(expiresAt)) { "callAttemptId $callAttemptId is expired" }
  }

  companion object {
    fun from(data: Map<String, String>): IncomingCallPayload {
      return IncomingCallPayload(
        callAttemptId = data["callAttemptId"].orEmpty(),
        tutorName = data["tutorName"].orEmpty(),
        topicKo = data["topicKo"] ?: "AI 전화영어",
        expiresAtIso = data["expiresAt"] ?: Instant.now().plusSeconds(45).toString()
      )
    }
  }
}
