import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AdminController } from "../routes/admin.controller.js";
import { AuthController } from "../routes/auth.controller.js";
import { DevicesController } from "../routes/devices.controller.js";
import { LessonOccurrencesController } from "../routes/lesson-occurrences.controller.js";
import { LessonsController } from "../routes/lessons.controller.js";
import { NotificationsController } from "../routes/notifications.controller.js";
import { OnboardingController } from "../routes/onboarding.controller.js";
import { ProgressController } from "../routes/progress.controller.js";
import { RealtimeController } from "../routes/realtime.controller.js";
import { ReviewController } from "../routes/review.controller.js";
import { SchedulesController } from "../routes/schedules.controller.js";
import { TutorsController } from "../routes/tutors.controller.js";
import { AppService } from "../services/app.service.js";
import { PrismaService } from "../services/prisma.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])
  ],
  controllers: [
    AdminController,
    AuthController,
    DevicesController,
    LessonOccurrencesController,
    LessonsController,
    NotificationsController,
    OnboardingController,
    ProgressController,
    RealtimeController,
    ReviewController,
    SchedulesController,
    TutorsController
  ],
  providers: [PrismaService, AppService],
  exports: [AppService]
})
export class AppModule {}
