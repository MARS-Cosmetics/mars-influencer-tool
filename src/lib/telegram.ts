/**
 * Minimal Telegram Bot API client.
 * Docs: https://core.telegram.org/bots/api
 */

const TG_API = "https://api.telegram.org";

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return token;
}

export interface TgInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TgInlineKeyboard {
  inline_keyboard: TgInlineButton[][];
}

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TgChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  username?: string;
  first_name?: string;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  entities?: Array<{ type: string; offset: number; length: number }>;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

interface SendMessageArgs {
  chatId: number | string;
  text: string;
  replyMarkup?: TgInlineKeyboard;
  parseMode?: "HTML" | "MarkdownV2";
  disableWebPagePreview?: boolean;
}

export async function sendMessage(args: SendMessageArgs): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: args.chatId,
    text: args.text,
  };
  if (args.replyMarkup) body.reply_markup = args.replyMarkup;
  if (args.parseMode) body.parse_mode = args.parseMode;
  if (args.disableWebPagePreview) body.disable_web_page_preview = true;

  const res = await fetch(`${TG_API}/bot${getToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Telegram sendMessage failed", res.status, errText);
  }
}

export async function answerCallbackQuery(id: string, text?: string): Promise<void> {
  const body: Record<string, unknown> = { callback_query_id: id };
  if (text) body.text = text;

  const res = await fetch(`${TG_API}/bot${getToken()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Telegram answerCallbackQuery failed", res.status, errText);
  }
}

export async function editMessageReplyMarkup(args: {
  chatId: number | string;
  messageId: number;
  replyMarkup?: TgInlineKeyboard;
}): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: args.chatId,
    message_id: args.messageId,
  };
  if (args.replyMarkup) body.reply_markup = args.replyMarkup;

  const res = await fetch(`${TG_API}/bot${getToken()}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Telegram editMessageReplyMarkup failed", res.status, errText);
  }
}

export function verifyTelegramSecret(headerValue: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;
  return headerValue === expected;
}
