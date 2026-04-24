import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TelegramSessionState } from "@/generated/prisma";
import {
  sendMessage,
  answerCallbackQuery,
  editMessageReplyMarkup,
  verifyTelegramSecret,
  type TgUpdate,
  type TgInlineKeyboard,
} from "@/lib/telegram";
import {
  parseAllSocialInputs,
  type ParsedSocialLink,
} from "@/lib/social-link-parser";

// Ensure Node runtime (Prisma needs it) and no caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WELCOME =
  "Hi! Send me an Instagram, YouTube, or TikTok profile link (or an @handle) and I'll queue it as an influencer suggestion for one of our team members.\n\nCommands:\n/start — reset\n/cancel — cancel current suggestion\n/help — show this";

const HELP = WELCOME;

// Roles that show up in the assignee picker.
const ASSIGNABLE_ROLES = ["admin", "manager"] as const;

export async function POST(request: NextRequest) {
  // 1. Verify the request is from Telegram
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyTelegramSecret(secretHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (err) {
    console.error("Telegram webhook error:", err);
    // Still return 200 so Telegram doesn't retry and cascade errors.
  }

  // Always 200 OK — Telegram retries on non-2xx.
  return NextResponse.json({ ok: true });
}

// ============================================================
// Message handling
// ============================================================

async function handleMessage(message: NonNullable<TgUpdate["message"]>) {
  const chatId = String(message.chat.id);
  const text = (message.text ?? "").trim();
  const from = message.from;

  const session = await prisma.telegramSession.upsert({
    where: { chatId },
    update: {
      telegramUserId: from ? String(from.id) : undefined,
      telegramUsername: from?.username ?? undefined,
      firstName: from?.first_name ?? undefined,
    },
    create: {
      chatId,
      state: TelegramSessionState.idle,
      telegramUserId: from ? String(from.id) : null,
      telegramUsername: from?.username ?? null,
      firstName: from?.first_name ?? null,
    },
  });

  if (text === "/start" || text === "/help") {
    await resetSession(chatId);
    await sendMessage({ chatId, text: text === "/help" ? HELP : WELCOME });
    return;
  }

  if (text === "/cancel") {
    await resetSession(chatId);
    await sendMessage({ chatId, text: "Cancelled. Send a new profile link to start again." });
    return;
  }

  // If user is in the note step, any text is the note (unless /skip)
  if (session.state === TelegramSessionState.awaiting_note) {
    if (text === "/skip" || text === "") {
      await finaliseSuggestion(chatId, session, null);
    } else {
      await finaliseSuggestion(chatId, session, text);
    }
    return;
  }

  // Parse the input as a social link / handle
  const parsed = parseAllSocialInputs(text);
  if (parsed.length === 0) {
    await sendMessage({
      chatId,
      text: "I didn't recognise that as a profile link or handle. Try pasting an Instagram, YouTube, or TikTok URL — or just @username.",
    });
    return;
  }

  // If multiple links pasted, only take the first for v1
  const first = parsed[0];
  if (parsed.length > 1) {
    await sendMessage({
      chatId,
      text: `I found ${parsed.length} links — only using the first (${first.platform}${first.handle ? ` @${first.handle}` : ""}). Send them one at a time for the rest.`,
    });
  }

  await prisma.telegramSession.update({
    where: { chatId },
    data: {
      state: TelegramSessionState.awaiting_assignee,
      draftPlatform: first.platform,
      draftProfileUrl: first.url,
      draftHandle: first.handle,
      draftAssigneeId: null,
    },
  });

  await promptAssignee(chatId, first);
}

// ============================================================
// Callback (button tap) handling
// ============================================================

async function handleCallback(cb: NonNullable<TgUpdate["callback_query"]>) {
  if (!cb.message || !cb.data) {
    await answerCallbackQuery(cb.id);
    return;
  }

  const chatId = String(cb.message.chat.id);
  const session = await prisma.telegramSession.findUnique({ where: { chatId } });

  if (!session || session.state !== TelegramSessionState.awaiting_assignee) {
    await answerCallbackQuery(cb.id, "This button has expired. Send a new link to start over.");
    return;
  }

  // callback_data format: "assign:<userId>"
  const [action, userId] = cb.data.split(":");
  if (action !== "assign" || !userId) {
    await answerCallbackQuery(cb.id);
    return;
  }

  const assignee = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, isActive: true },
  });
  if (!assignee || !assignee.isActive) {
    await answerCallbackQuery(cb.id, "That user is no longer available.");
    return;
  }

  // Remove the inline keyboard so it can't be tapped again
  await editMessageReplyMarkup({
    chatId,
    messageId: cb.message.message_id,
  });

  await prisma.telegramSession.update({
    where: { chatId },
    data: {
      state: TelegramSessionState.awaiting_note,
      draftAssigneeId: assignee.id,
    },
  });

  await answerCallbackQuery(cb.id, `Assigned to ${assignee.name}`);
  await sendMessage({
    chatId,
    text: `Assigned to ${assignee.name}. Add a quick note about why you're suggesting this influencer, or send /skip to finish.`,
  });
}

// ============================================================
// Helpers
// ============================================================

async function resetSession(chatId: string) {
  await prisma.telegramSession.update({
    where: { chatId },
    data: {
      state: TelegramSessionState.idle,
      draftPlatform: null,
      draftProfileUrl: null,
      draftHandle: null,
      draftAssigneeId: null,
    },
  });
}

async function promptAssignee(chatId: string, parsed: ParsedSocialLink) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [...ASSIGNABLE_ROLES] },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  if (users.length === 0) {
    await sendMessage({
      chatId,
      text: "No team members are available to assign to right now. Please contact an admin.",
    });
    await resetSession(chatId);
    return;
  }

  // Build keyboard: 1 button per user, one per row for readability
  const keyboard: TgInlineKeyboard = {
    inline_keyboard: users.map((u) => [
      {
        text: `${u.name} (${u.role})`,
        callback_data: `assign:${u.id}`,
      },
    ]),
  };

  const handleStr = parsed.handle ? `@${parsed.handle}` : parsed.url;
  await sendMessage({
    chatId,
    text: `Got it: ${parsed.platform} — ${handleStr}\n\nWho should review this suggestion?`,
    replyMarkup: keyboard,
    disableWebPagePreview: true,
  });
}

async function finaliseSuggestion(
  chatId: string,
  session: { draftPlatform: string | null; draftProfileUrl: string | null; draftHandle: string | null; draftAssigneeId: string | null; telegramUserId: string | null; telegramUsername: string | null; firstName: string | null },
  note: string | null,
) {
  if (
    !session.draftPlatform ||
    !session.draftProfileUrl ||
    !session.draftAssigneeId
  ) {
    await resetSession(chatId);
    await sendMessage({
      chatId,
      text: "Something went wrong — please start over by sending a new link.",
    });
    return;
  }

  const assignee = await prisma.user.findUnique({
    where: { id: session.draftAssigneeId },
    select: { name: true },
  });

  await prisma.influencerSuggestion.create({
    data: {
      source: "telegram",
      telegramUserId: session.telegramUserId,
      telegramUsername: session.telegramUsername,
      submittedByName: session.firstName,
      platform: session.draftPlatform,
      profileUrl: session.draftProfileUrl,
      handle: session.draftHandle,
      note: note ?? undefined,
      assignedToUserId: session.draftAssigneeId,
    },
  });

  await resetSession(chatId);
  await sendMessage({
    chatId,
    text: `Done. ${assignee?.name ?? "The reviewer"} will look at this suggestion. Send another link anytime.`,
  });
}
