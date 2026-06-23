export const databasePackageName = "@aiphone/database";

export { Prisma, PrismaClient } from "@prisma/client";

export type TransactionalOutboxEvent = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  processedAt: string | null;
};
