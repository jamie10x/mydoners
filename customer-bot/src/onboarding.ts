import { env } from "./config/env";

type Step = "first_name" | "last_name" | "phone" | "location";
interface OnboardingState {
  step: Step;
  firstName?: string;
}

// In-memory by design — if the bot restarts mid-conversation, worst case the
// customer just gets asked again next time; nothing's been lost, since each
// answer is written straight to the backend as it comes in (see below), not
// batched until the end.
const state = new Map<number, OnboardingState>();

async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.backendUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.customerBotApiKey}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

async function isProfileComplete(telegramId: number): Promise<boolean> {
  try {
    const res = await backendFetch(`/users/${telegramId}`);
    if (!res.ok) return false;
    const body = (await res.json()) as { user?: { isProfileComplete?: boolean } };
    return Boolean(body.user?.isProfileComplete);
  } catch {
    return false;
  }
}

const phoneKeyboard = {
  keyboard: [[{ text: "📱 Telefon raqamni ulashish", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const locationKeyboard = {
  keyboard: [[{ text: "📍 Joylashuvimni ulashish", request_location: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export function isOnboarding(telegramId: number): boolean {
  return state.has(telegramId);
}

/** Called from /start. Returns true if it started the conversation (caller should skip the normal welcome message). */
export async function maybeStartOnboarding(telegramId: number, reply: (text: string) => Promise<unknown>): Promise<boolean> {
  if (state.has(telegramId)) return true; // already mid-conversation — don't restart it
  if (await isProfileComplete(telegramId)) return false;

  state.set(telegramId, { step: "first_name" });
  await reply(
    "Birinchi buyurtmadan oldin profilingizni to'ldiraylik — atigi 20 soniya vaqt oladi. Istalgan qadamni \"skip\" deb yozib o'tkazib yuborishingiz mumkin.\n\nIsmingiz nima?",
  );
  return true;
}

interface ReplyFns {
  reply: (text: string, replyMarkup?: unknown) => Promise<unknown>;
}

/** message:text handler for an in-progress onboarding. Returns true if it handled the message. */
export async function handleOnboardingText(telegramId: number, text: string, ctx: ReplyFns): Promise<boolean> {
  const current = state.get(telegramId);
  if (!current) return false;

  const trimmed = text.trim();
  const skip = trimmed.toLowerCase() === "skip";

  if (current.step === "first_name") {
    if (!skip) current.firstName = trimmed;
    current.step = "last_name";
    await ctx.reply(skip ? "Mayli. Familiyangiz-chi?" : "Tanishganimizdan xursandmiz! Familiyangiz nima?");
    return true;
  }

  if (current.step === "last_name") {
    const lastName = skip ? undefined : trimmed;
    if (current.firstName || lastName) {
      await backendFetch(`/users/${telegramId}/profile`, {
        method: "PUT",
        body: JSON.stringify({ firstName: current.firstName, lastName }),
      }).catch(() => {});
    }
    current.step = "phone";
    await ctx.reply("Endi quyidagi tugma orqali telefon raqamingizni ulashing yoki \"skip\" deb yozing.", phoneKeyboard);
    return true;
  }

  if (current.step === "phone" && skip) {
    current.step = "location";
    await ctx.reply(
      "Mayli. Oxirgi qadam — qayerga yetkazishimizni bilishimiz uchun joylashuvingizni ulashing yoki \"skip\" deb yozing.",
      locationKeyboard,
    );
    return true;
  }

  if (current.step === "location" && skip) {
    state.delete(telegramId);
    await ctx.reply("Hammasi tayyor! Buyurtma bermoqchi bo'lganingizda quyidagi tugmani bosing.", { remove_keyboard: true });
    return true;
  }

  return false;
}

/** message:contact handler. Returns true if it handled the message. */
export async function handleOnboardingContact(
  telegramId: number,
  phoneNumber: string,
  ctx: ReplyFns,
): Promise<boolean> {
  const current = state.get(telegramId);
  if (!current || current.step !== "phone") return false;

  await backendFetch(`/users/${telegramId}/profile`, {
    method: "PUT",
    body: JSON.stringify({ phoneNumber }),
  }).catch(() => {});

  current.step = "location";
  await ctx.reply(
    "Qabul qilindi! Oxirgi qadam — qayerga yetkazishimizni bilishimiz uchun joylashuvingizni ulashing yoki \"skip\" deb yozing.",
    locationKeyboard,
  );
  return true;
}

/** message:location handler. Returns true if it handled the message (as onboarding, not the checkout fallback). */
export async function handleOnboardingLocation(
  telegramId: number,
  latitude: number,
  longitude: number,
  ctx: ReplyFns,
): Promise<boolean> {
  const current = state.get(telegramId);
  if (!current || current.step !== "location") return false;

  await backendFetch(`/users/${telegramId}/addresses`, {
    method: "POST",
    body: JSON.stringify({ label: "Home", latitude, longitude, landmarkAddress: "Shared via Telegram" }),
  }).catch(() => {});

  state.delete(telegramId);
  await ctx.reply("Hammasi tayyor! Buyurtma bermoqchi bo'lganingizda quyidagi tugmani bosing.", { remove_keyboard: true });
  return true;
}
