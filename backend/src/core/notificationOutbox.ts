import { redis } from "./redis";

// Durable retry queue for outbound Telegram messages. The happy path sends
// directly (zero added latency — see telegram.ts); only failures land here.
// A plain Redis list + interval worker is deliberate: at tens of orders/day
// a job framework (BullMQ etc.) would be pure overhead.

const RETRY_LIST = "notifications:retry";
const DEAD_LETTER_LIST = "notifications:failed";

// Backoff per attempt already made: fail #1 → retry in 30s, #2 → 2m, ...
const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length;

const WORKER_INTERVAL_MS = 15_000;

export interface NotificationJob {
  chatId: number;
  text: string;
  parseMode?: "HTML";
  replyMarkup?: unknown;
  attempt: number; // send attempts already made
  nextAttemptAt: number; // epoch ms
}

type SendFn = (job: NotificationJob) => Promise<boolean>;

export async function enqueueRetry(job: Omit<NotificationJob, "nextAttemptAt">): Promise<void> {
  const backoff = BACKOFF_MS[Math.min(job.attempt, MAX_ATTEMPTS) - 1] ?? 30_000;
  const withSchedule: NotificationJob = { ...job, nextAttemptAt: Date.now() + backoff };
  await redis.lPush(RETRY_LIST, JSON.stringify(withSchedule));
  console.warn(
    `[notifications] queued retry #${job.attempt} for chat ${job.chatId} in ${Math.round(backoff / 1000)}s`,
  );
}

async function drainOnce(send: SendFn): Promise<void> {
  // Drain the whole list once per tick; jobs not yet due go straight back.
  // Queue depth is bounded by (orders in the outage window × 5 attempts) —
  // trivially small — so the O(n) full drain is fine.
  const size = await redis.lLen(RETRY_LIST);
  for (let i = 0; i < size; i++) {
    const raw = await redis.rPop(RETRY_LIST);
    if (!raw) break;

    let job: NotificationJob;
    try {
      job = JSON.parse(raw) as NotificationJob;
    } catch {
      await redis.lPush(DEAD_LETTER_LIST, raw); // unparseable — keep for inspection
      continue;
    }

    if (job.nextAttemptAt > Date.now()) {
      await redis.lPush(RETRY_LIST, raw);
      continue;
    }

    const ok = await send(job).catch(() => false);
    if (ok) {
      console.log(`[notifications] retry #${job.attempt + 1} delivered to chat ${job.chatId}`);
    } else if (job.attempt + 1 >= MAX_ATTEMPTS) {
      await redis.lPush(DEAD_LETTER_LIST, JSON.stringify({ ...job, failedAt: new Date().toISOString() }));
      console.error(`[notifications] giving up on chat ${job.chatId} after ${MAX_ATTEMPTS} attempts`);
    } else {
      await enqueueRetry({ ...job, attempt: job.attempt + 1 });
    }
  }
}

export function startNotificationWorker(send: SendFn): void {
  setInterval(() => {
    drainOnce(send).catch((err) => console.error("[notifications] worker tick failed:", err));
  }, WORKER_INTERVAL_MS);
}
