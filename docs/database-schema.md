# Database Schema

The Prisma schema includes the requested models:

User, UserIdentity, RefreshToken, LearnerProfile, Tutor, TutorVoice, BackchannelClip, Device, PushToken, CallSchedule, CallAttempt, LessonTemplate, LessonTemplateVersion, LessonStageTemplate, MaterialCard, TargetExpression, LessonSession, LessonStageSession, Utterance, TranscriptSegment, BackchannelEvent, Correction, VocabularyItem, UserVocabulary, ReviewItem, LessonReport, ProgressSnapshot, Subscription, Entitlement, NotificationLog, PromptTemplate, PromptVersion, FeatureFlag, AuditLog, and OutboxEvent.

Important choices:

- UUID primary keys.
- `createdAt` and `updatedAt` on mutable core tables.
- `deletedAt` where soft delete matters.
- Explicit `onDelete` policies.
- Version fields on schedule/call/user rows that need optimistic locking.
- Transactional outbox via `OutboxEvent`.
- Audit trail via `AuditLog`.
