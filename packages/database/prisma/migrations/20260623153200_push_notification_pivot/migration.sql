-- CreateEnum
CREATE TYPE "LessonOccurrenceStatus" AS ENUM ('SCHEDULED', 'NOTIFICATION_PENDING', 'NOTIFIED', 'READY', 'SNOOZED', 'STARTING', 'ACTIVE', 'COMPLETED', 'SKIPPED', 'MISSED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'ACTIONED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LESSON_PRE_REMINDER', 'LESSON_REMINDER', 'LESSON_SNOOZE_REMINDER', 'REPORT_READY');

-- AlterEnum
BEGIN;
CREATE TYPE "AppState_new" AS ENUM ('ONBOARDING', 'TRIAL_READY', 'TRIAL_LESSON', 'TRIAL_RESULT', 'SUBSCRIPTION', 'HOME', 'LESSON_SCHEDULED', 'LESSON_READY', 'LESSON_ACTIVE', 'LESSON_FINISHING', 'RESULT_GENERATING', 'RESULT', 'REVIEW');
ALTER TABLE "User" ALTER COLUMN "appState" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "appState" TYPE "AppState_new" USING ("appState"::text::"AppState_new");
ALTER TYPE "AppState" RENAME TO "AppState_old";
ALTER TYPE "AppState_new" RENAME TO "AppState";
DROP TYPE "AppState_old";
ALTER TABLE "User" ALTER COLUMN "appState" SET DEFAULT 'ONBOARDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "CallAttempt" DROP CONSTRAINT "CallAttempt_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "CallAttempt" DROP CONSTRAINT "CallAttempt_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "CallAttempt" DROP CONSTRAINT "CallAttempt_userId_fkey";

-- DropForeignKey
ALTER TABLE "CallSchedule" DROP CONSTRAINT "CallSchedule_userId_fkey";

-- DropForeignKey
ALTER TABLE "LessonSession" DROP CONSTRAINT "LessonSession_callAttemptId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_callAttemptId_fkey";

-- DropIndex
DROP INDEX "LessonSession_callAttemptId_key";

-- AlterTable
ALTER TABLE "LessonSession" DROP COLUMN "callAttemptId",
ADD COLUMN     "occurrenceId" UUID;

-- AlterTable
ALTER TABLE "PushToken" ADD COLUMN     "tokenValue" TEXT;

-- DropTable
DROP TABLE "CallAttempt";

-- DropTable
DROP TABLE "CallSchedule";

-- DropTable
DROP TABLE "NotificationLog";

-- DropEnum
DROP TYPE "CallAttemptStatus";

-- CreateTable
CREATE TABLE "LessonSchedule" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "timezone" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "localTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "preReminderMinutes" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonOccurrence" (
    "id" UUID NOT NULL,
    "scheduleId" UUID,
    "userId" UUID NOT NULL,
    "lessonTemplateId" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "snoozeCount" INTEGER NOT NULL DEFAULT 0,
    "status" "LessonOccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT,

    CONSTRAINT "LessonOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "deviceId" UUID,
    "pushTokenId" UUID,
    "notificationType" "NotificationType" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "actionedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonSchedule_nextRunAt_idx" ON "LessonSchedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "LessonSchedule_userId_enabled_idx" ON "LessonSchedule"("userId", "enabled");

-- CreateIndex
CREATE INDEX "LessonOccurrence_scheduleId_scheduledAt_idx" ON "LessonOccurrence"("scheduleId", "scheduledAt");

-- CreateIndex
CREATE INDEX "LessonOccurrence_userId_status_idx" ON "LessonOccurrence"("userId", "status");

-- CreateIndex
CREATE INDEX "LessonOccurrence_scheduledAt_status_idx" ON "LessonOccurrence"("scheduledAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LessonOccurrence_idempotencyKey_key" ON "LessonOccurrence"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_occurrenceId_createdAt_idx" ON "NotificationDelivery"("occurrenceId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_scheduledFor_idx" ON "NotificationDelivery"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_idempotencyKey_key" ON "NotificationDelivery"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "LessonSession_occurrenceId_key" ON "LessonSession"("occurrenceId");

-- AddForeignKey
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonOccurrence" ADD CONSTRAINT "LessonOccurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "LessonSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonOccurrence" ADD CONSTRAINT "LessonOccurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonOccurrence" ADD CONSTRAINT "LessonOccurrence_lessonTemplateId_fkey" FOREIGN KEY ("lessonTemplateId") REFERENCES "LessonTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonOccurrence" ADD CONSTRAINT "LessonOccurrence_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSession" ADD CONSTRAINT "LessonSession_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "LessonOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "LessonOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_pushTokenId_fkey" FOREIGN KEY ("pushTokenId") REFERENCES "PushToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

