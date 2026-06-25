import { existsSync } from "node:fs";

const required = [
  "apps/mobile/src/App.tsx",
  "apps/mobile/ios/AIPhoneEnglish/NotificationModule.swift",
  "apps/mobile/android/app/src/main/java/com/aiphoneenglish/NotificationModule.kt",
  "apps/api/src/main.ts",
  "apps/worker/src/main.ts",
  "apps/admin/app/page.tsx",
  "packages/contracts/src/index.ts",
  "packages/database/prisma/schema.prisma",
  "packages/lesson-engine/src/index.ts",
  "packages/realtime-client/src/index.ts",
  "docker-compose.yml",
  "docs/assumptions.md",
  "docs/architecture.md"
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0) {
  throw new Error(`Missing required project files:\n${missing.join("\n")}`);
}

process.stdout.write(`Architecture check passed for ${required.length} files.\n`);
