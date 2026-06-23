package com.aiphoneenglish

import java.time.Instant

data class LessonNotificationPayload(
  val occurrenceId: String,
  val notificationDeliveryId: String,
  val notificationType: String,
  val title: String,
  val body: String,
  val scheduledAt: String?
) {
  init {
    require(occurrenceId.isNotBlank()) { "occurrenceId is required" }
    if (!scheduledAt.isNullOrBlank()) {
      Instant.parse(scheduledAt)
    }
  }

  companion object {
    fun from(data: Map<String, String>, fallbackTitle: String?, fallbackBody: String?): LessonNotificationPayload {
      return LessonNotificationPayload(
        occurrenceId = data["occurrenceId"].orEmpty(),
        notificationDeliveryId = data["notificationDeliveryId"].orEmpty(),
        notificationType = data["notificationType"] ?: "LESSON_REMINDER",
        title = data["title"] ?: fallbackTitle ?: "AI 영어 수업",
        body = data["body"] ?: fallbackBody ?: "예약된 수업을 시작할 시간이에요.",
        scheduledAt = data["scheduledAt"]
      )
    }
  }
}
