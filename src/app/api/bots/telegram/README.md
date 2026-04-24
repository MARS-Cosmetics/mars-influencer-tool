# Telegram Bot — Influencer Suggestions

Lets external suggesters send influencer profile links via Telegram and assign each suggestion to a specific internal user for review.

## Flow

1. Suggester opens the bot and sends `/start`
2. Suggester pastes an Instagram / YouTube / TikTok URL or `@handle`
3. Bot shows a list of assignable users (admins + managers) as inline buttons
4. Suggester taps one → bot asks for an optional note
5. Suggester types note (or `/skip`) → suggestion is saved to `influencer_suggestions`
6. Assigned user sees it in the **Suggestions** tab of the dashboard

## One-time setup

### 1. Create the bot

1. In Telegram, search **@BotFather** (verified official account)
2. Send `/newbot`
3. Provide a display name (e.g. *MARS Influencer Suggestions*) and a username ending in `bot` (e.g. `mars_influencer_bot`)
4. Copy the HTTP API token BotFather returns (looks like `7891234567:AAH...`)
5. Send `/setprivacy` → select your bot → **Disable** (so the bot can read all DM messages)
6. Optional: `/setdescription`, `/setcommands` to define `/start`, `/help`, `/cancel`

### 2. Add environment variables

Add to `.env` (and to your deployment provider's secrets):

```
TELEGRAM_BOT_TOKEN=<the token from BotFather>
TELEGRAM_WEBHOOK_SECRET=<a random string you generate, e.g. `openssl rand -hex 32`>
```

`TELEGRAM_WEBHOOK_SECRET` is sent to Telegram when registering the webhook. Telegram returns it as `X-Telegram-Bot-Api-Secret-Token` on every request. We verify this header to reject requests that aren't from Telegram.

### 3. Register the webhook

**Production:**

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "url": "https://your-domain.com/api/bots/telegram/webhook",
  "secret_token": "${TELEGRAM_WEBHOOK_SECRET}",
  "allowed_updates": ["message", "callback_query"]
}
EOF
)"
```

Expected response: `{"ok":true,"result":true,"description":"Webhook was set"}`.

**Local dev** — Telegram requires a public HTTPS URL, so tunnel `localhost:3000`:

```bash
# Install ngrok (https://ngrok.com) then:
ngrok http 3000
# Copy the https:// URL it prints, e.g. https://abc123.ngrok.io
```

Then register the webhook against the ngrok URL:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://abc123.ngrok.io/api/bots/telegram/webhook","secret_token":"'"${TELEGRAM_WEBHOOK_SECRET}"'","allowed_updates":["message","callback_query"]}'
```

### 4. Verify

Send `/start` to your bot from Telegram. You should get the welcome message.

Check webhook status at any time:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

`pending_update_count` should be 0 and `last_error_message` should be empty.

### 5. Remove the webhook (e.g. switching environments)

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook"
```

## Bot commands

| Command  | What it does                                    |
| -------- | ----------------------------------------------- |
| `/start` | Show welcome and reset any in-progress state    |
| `/help`  | Same as `/start`                                |
| `/cancel`| Drop the current suggestion mid-flow            |
| `/skip`  | While being asked for a note, skip it           |

## Data model

- `influencer_suggestions` — one row per submission, with `status` = `pending` / `approved` / `rejected` and optional `promoted_influencer_id` when approved
- `telegram_sessions` — per-chat conversation state (`idle` / `awaiting_assignee` / `awaiting_note`)

## Known trade-offs

- **No rate limiting** in v1. Anyone who knows the bot's username can send suggestions. If spam becomes an issue, add a per-`telegram_user_id` throttle or restrict via a whitelist table.
- **Only one link at a time.** If the suggester pastes multiple URLs, only the first is processed — the bot tells them to send the rest separately.
- **Assignee list = admins + managers only.** Change `ASSIGNABLE_ROLES` in `route.ts` if you want more roles to appear.
- **Approve is a one-click action** that creates an `Influencer` with `status=discovered`, `source=inbound`, and just the handle + name. Fill out the rest of the profile from the Influencer page.
