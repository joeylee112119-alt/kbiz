import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { MockPushProvider } from "@aiphone/notification";
import type { CallAttempt } from "@aiphone/contracts";

const pushProvider = new MockPushProvider();
const locks = new Set<string>();

async function runScheduledCall(scheduleId: string): Promise<CallAttempt> {
  if (locks.has(scheduleId)) {
    throw new Error(`duplicate schedule execution blocked: ${scheduleId}`);
  }
  locks.add(scheduleId);
  try {
    const now = new Date();
    const callAttempt: CallAttempt = {
      id: randomUUID(),
      scheduleId,
      status: "CREATED",
      startsAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 45_000).toISOString(),
      tutorId: "tutor-emma",
      topicKo: "호텔 체크인"
    };
    await pushProvider.sendReminder(callAttempt);
    callAttempt.status = "PUSH_SENT";
    await pushProvider.sendIncomingCall(callAttempt);
    callAttempt.status = "RINGING";
    return callAttempt;
  } finally {
    locks.delete(scheduleId);
  }
}

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "worker" }));
    return;
  }
  if (req.url?.startsWith("/mock/run-schedule")) {
    const callAttempt = await runScheduledCall("mock-schedule");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: callAttempt }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(Number(process.env.WORKER_PORT ?? "4001"));
