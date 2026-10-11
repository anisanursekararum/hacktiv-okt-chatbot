# PRD – My PA: Personal Assistant Chatbot

**Version:** 1.0 (Final) · **Date:** 11 October 2026 · **Language:** English (Indonesian version: `PRD-ID.md`)

---

## 1. Summary & Final Decisions

My PA is a chat-based personal assistant for a single user. You write anything (todos, groceries, expenses, notes, links, plans), the AI recognizes and sorts it, sends reminders by email, and answers questions about your history. It runs as a responsive web app and can be added to the iPhone home screen.

| Decision | Final choice |
| --- | --- |
| Platform | Responsive web + PWA (laptop and iPhone) |
| Programming language | TypeScript for frontend and backend (no Python) |
| Login | Google OAuth only, no passwords |
| Users | 1 user; logging in on multiple devices shows the same data and history |
| AI provider | Google Gemini, v1 focused on the **free tier**; the model can be changed in settings |
| Language | Follows the model's default behavior; no special handling in v1 |
| History | Kept forever; items are archived, never permanently deleted |
| Backup | JSON file emailed to you, re-importable |
| Sender email | anisa.arum.work@gmail.com |
| Hosting | Free, secure, and reasonably powerful (options in section 13) |
| Daily summary | Not automatic; only on request (`/daily-briefing`) |
| Skills | All 19 skills in section 9 are in the MVP |
| Item categories | Todo, Groceries, Expenses, Notes, Plans, Links, Reminders |

## 2. Goals & Non-Goals

**Goals**
- One place to capture anything without choosing a category by hand.
- Ask about your own history (today, yesterday, deadlines) and get a summary or exact dates.
- Reliable email reminders.
- Identical data and history on every device.
- Zero running cost (hosting and AI on free tiers).

**Non-Goals (v1)**
- Multi-user or shared notes.
- Native iOS/Android apps.
- Automatic summaries or notifications you did not ask for.
- Two-way calendar and spreadsheet integrations.
- Special multi-language handling.

## 3. Architecture

```
        Frontend PWA (Next.js: laptop + iPhone)
                       |
              API Gateway + Auth (Node.js + TypeScript, Google OAuth)
                       |
     +-----------------+------------------+
     |                 |                  |
 Multimodal parser  Memory & context    Skill engine
 (Gemini)           (50 messages +      (19 skills)
     |               summary +               |
     |               hybrid search)          |
     +--------+--------+                     |
              |                              |
   PostgreSQL + pgvector          Scheduler + queue ---> Email (Gmail SMTP)
              |
   Media storage (photos, audio, video)
```

## 4. Auto-Classification (Core Feature)

Every message is analyzed by Gemini with structured output (JSON schema) to extract intent and entities, then stored in the matching table. One message can produce several items.

| Category | Example input | System action |
| --- | --- | --- |
| Todo | Today I need to revise the proposal, pay electricity, buy milk | 3 `PENDING` tasks due today |
| Status update | The proposal revision is done | Fuzzy-match, then mark `COMPLETED`; if several candidates match, the AI asks back |
| Expense | Lunch was 45k / receipt photo | Create an `expenses` record as `DRAFT`, awaiting confirmation |
| Groceries | Buy eggs, oil, detergent | `ACTIVE` items in the shopping list |
| Notes | SaaS idea: invoice aggregator for SMEs | Save as a note + embedding |
| Plans | Year-end savings target | Save as a note of kind plan + target date |
| Links | Article URL | Fetch the title, write a summary, save to bookmarks |
| Reminders | Remind me on 15 October to pay property tax | Schedule an email reminder |

Category corrections can be made in chat or the UI and are used as context afterwards. Relative dates (tomorrow, the day after) are resolved in the user's time zone (default Asia/Jakarta).

## 5. History Q&A

Examples: *what did I do today?*, *what is on tomorrow?*, *what is the nearest deadline?*, *what did I work on yesterday?* The system runs structured PostgreSQL queries for the relevant date range, then Gemini writes a natural answer (a summary, with an option for a detailed dated list). Answers come only from stored data; if nothing is found, the AI says so.

## 6. Reminders & Email

- Created in chat or with `/email-reminder`; sent to the registered Google email.
- One-off or recurring (daily, weekly, monthly).
- Visible status: scheduled, sent, failed; failures retry automatically.
- Chat confirms when a reminder is created and when it is sent.
- **Sender:** anisa.arum.work@gmail.com through Gmail SMTP with an *App Password* (requires 2-step verification on the sender account). No custom domain needed. Gmail's sending limits are far above personal needs. Credentials live in environment secrets, not in the repository.
- Reminders and scheduled backups are the only things that run automatically.

## 7. Multimodal Input

| Input | Processing | Result |
| --- | --- | --- |
| Text | Intent classification + entity extraction | Structured record or skill action |
| Image | Gemini vision (OCR + object detection) | Text, auto-tags, receipt parsing |
| Audio | Native Gemini transcription | Text, then processed like a text message |
| Video (low priority) | Gemini reads the video directly | Short summary + key points |

File size and duration limits are set at implementation time so they do not exhaust the free quota.

## 8. Memory & Context Window

The context window is only the amount of text a model reads per call; it is not memory. The limit is not technical but **quota, speed, and relevance**: sending the whole history every time is wasteful and lowers accuracy. So memory has three tiers:

| Tier | Content | How it works |
| --- | --- | --- |
| 1. Short window | Last 50 messages, in full | Always sent to keep the conversation flowing |
| 2. Rolling summary | Key points of older chat | A background worker updates it every +20 messages; always in the system prompt |
| 3. Long-term memory | All notes, tasks, and history | Structured queries (date, type, status) + hybrid search (pgvector + keywords) when a question refers to something older |

For questions like *what did I do yesterday?*, tier 3 uses SQL queries (accurate and cheap), not semantic search. Semantic search is for questions without a date, such as *my notes about taxes*. The numbers 50 and 20 are starting points to tune. Because history is kept forever, every old message stays reachable through tier 3.

## 9. Skills (Slash Commands)

Skills are triggered with `/` (with autocomplete) or automatically when intent is detected. Every run shows a confirmation in chat. Skills are defined as configuration (name, parameters, action) so new ones are easy to add.

| Skill | Purpose | Example |
| --- | --- | --- |
| `/info` (alias `/config`) | Cheat sheet: all skills with short examples, plus the active model and parameters. `/info <skill>` shows details for one skill | `/info` · `/info expense` |
| `/send-email` | Summarize data and email it to the registered address | `/send-email summarize what I did on 9 October 2026` |
| `/email-reminder` | Schedule an email reminder | `/email-reminder remind me on 15 October to pay property tax` |
| `/today` | Today's summary: todos, schedule, deadlines | `/today` |
| `/deadline` | Nearest deadlines | `/deadline 7 days` |
| `/recap` | Summary of a past period | `/recap yesterday` |
| `/daily-briefing` | Today's agenda, priority todos, unpaid bills; **only on request** | `/daily-briefing` |
| `/todo` | Add or change a todo explicitly | `/todo finish proposal revision` |
| `/grocery` | Manage the shopping list (add, check off, clear) | `/grocery add eggs` |
| `/expense` | Log expenses and view daily/monthly totals | `/expense lunch 45k` |
| `/export-expenses` | Compile expenses to CSV/Excel for the spreadsheet report | `/export-expenses this month` |
| `/note` | Save a free-form note with tags | `/note app idea for SMEs` |
| `/web-clipper` (alias `/link`) | Save a link with title and summary | `/link https://...` |
| `/plan` | Break a long-term plan into steps + target dates | `/plan year-end savings` |
| `/remind` | In-app reminder only (no email) | `/remind check milk stock` |
| `/review` (alias `/weekly-report`) | Weekly report: tasks done vs pending, total spending, next week's focus | `/review this week` |
| `/search` | Search all notes | `/search property tax` |
| `/undo` | Undo the last action | `/undo` |
| `/backup` | Email a JSON backup now | `/backup` |

Notes:
- `/info` is generated from the skill configuration without calling the AI, so it is instant and uses no quota.
- `/send-email` also accepts reminder-style phrasing (such as *remind me...*) and forwards it to `/email-reminder`.
- `/info` and `/backup` were added in this final version (`/backup` follows the decision to back up by email).

## 10. AI Model & Settings

- **The model name can be changed** in Settings and is stored in configuration, not hardcoded. Gemini model names and plans change often; choose what is available at implementation time.
- **v1 focus: Gemini free tier** through a Google AI Studio API key. According to 2026 reports, Flash and Flash-Lite class models are free, while Pro models generally no longer are. So the two-tier router stays, but on the free tier both tiers default to a Flash-class model; the "deep" tier uses a paid model only if you enable it.
- **Temperature, top_p, top_k** with sliders, defaults, and a reset button (temperature 0.0–1.0, top_p 0.0–1.0, top_k 1–40). Automatically low (0.0–0.2) for structured parsing (todos, expenses, dates); 0.3–0.7 for conversation; 0.8–1.0 for brainstorming. Not every model accepts all three at once; the UI shows only what is supported.
- **Free-tier quota is small** (per-minute and per-day limits, applied per project; going over returns a 429 error). Strategy: one Gemini call per message (classification and reply in a single structured output), embeddings processed in the background, retry with backoff, and a queue. If the quota runs out, the message is still saved and the AI says processing is waiting.
- **Free-tier privacy.** On the free tier, Google may use prompts and outputs to improve its products, and human reviewers may read them. Because financial data is involved (receipts, amounts), your options are:
  1. Accept this for personal use.
  2. Avoid sending receipt photos and anything you do not want shared.
  3. Enable billing (Tier 1); paid-tier data is not used for training, and per-token cost for one user is usually small.

  Recommendation: start free, do not enter anything you are uncomfortable sharing, and upgrade if needed.

## 11. Authentication, Security, Retention & Backup

- **Login:** Google OAuth 2.0 only; the users table stores no password. The Google email is the destination for reminders and backups.
- **Sessions:** 15-minute access token + 7-day refresh token in `HttpOnly, Secure, SameSite=Strict` cookies; logging in from several devices is allowed.
- **Encryption:** HTTPS/TLS for all traffic; volume-level storage encryption.
- **Data isolation:** every query still uses `WHERE user_id = :current_user_id`, even with a single user.
- **Retention:** chat history and all items are kept forever. Deleting is replaced by **archiving** (`archived_at`): items are hidden from view but remain in the database, searchable and restorable.
- **Backup by email (JSON):**
  - Scheduled automatically (default weekly; can be daily or monthly) and manually via `/backup`.
  - One JSON file with all tables (messages, tasks, expenses, groceries, notes, bookmarks, reminders, summaries, settings) and a schema version number. Embeddings are not included (rebuilt on import); media files are not included, only their URLs.
  - Sent as an attachment from anisa.arum.work@gmail.com to the registered email. Gmail's attachment limit is about 25 MB; if larger, the file is split by table or by year.
  - **Import:** Settings → Import backup. Records with the same ID are not duplicated, and record counts are shown as a preview before applying.
  - **Backup security:** the file contains your full history and financial data. Enable 2-step verification on Gmail; optionally encrypt the backup with a password (kept in settings).
  - Email backup is not the only layer: also use the database provider's built-in backups where available.

## 12. Database Design (PostgreSQL + pgvector)

Every table has `user_id`, `created_at`, and `archived_at`.

| Table | Main columns |
| --- | --- |
| `users` | email (unique), google_sub, full_name, timezone (default Asia/Jakarta) |
| `chat_messages` | role, content, media_url, media_type (text/image/audio/video) |
| `tasks` | title, category, status (PENDING/COMPLETED/CANCELLED), due_date, completed_at, source_message_id |
| `expenses` | amount NUMERIC(12,2), category, description, transaction_date, status (DRAFT/CONFIRMED), receipt_url |
| `groceries` | item, quantity, status (ACTIVE/BOUGHT) |
| `notes` | kind (note/plan/idea), title, content, tags[], target_date, embedding VECTOR |
| `bookmarks` | url, title, summary, embedding VECTOR |
| `reminders` | payload, trigger_time, recurrence, channel (email/in_app), status (SCHEDULED/SENT/FAILED), attempts |
| `summaries` | scope (conversation/daily/weekly), period, content |
| `user_settings` | model_name, temperature, top_p, top_k, model_router, backup_frequency, backup_encrypt |

The vector dimension follows the chosen embedding model.

## 13. Tech Stack & Free Hosting

| Layer | Choice | Note |
| --- | --- | --- |
| Frontend | Next.js (App Router), Tailwind, shadcn/ui, PWA | Latest stable version at start |
| Backend | Node.js + TypeScript (Fastify; Hono if you choose Cloudflare) | Same language as the frontend; schema validation with Zod; Drizzle ORM (supports pgvector) |
| Scheduler | BullMQ + Redis | On hosting without a persistent server: an endpoint called by an external cron |
| Database | PostgreSQL + pgvector | |
| AI | Gemini API (`@google/genai` SDK), free tier | Model name in configuration; structured-output schemas from Zod |
| Email | Gmail SMTP + App Password (Nodemailer) | Sender anisa.arum.work@gmail.com; no domain needed |
| Media | Cloudflare R2 (free tier) | Photos, voice notes, video |
| Auth | Google OAuth 2.0 (e.g. Auth.js) | |

**Free hosting options.** Free-plan terms change often; recheck at the start.

| Option | Setup | Pros | Cons |
| --- | --- | --- | --- |
| A. One free VM | A free VM (e.g. Oracle Cloud Always Free, ARM) running Docker Compose: Next.js, Node.js API, Postgres+pgvector, Redis, BullMQ worker; Cloudflare in front (free DNS, TLS, WAF) | Always on, so reminders are on time; plenty of power; everything in one place | You handle server patches and security; signup needs card verification; capacity can be unavailable; idle instances can be reclaimed |
| B. Free managed services | Vercel (Next.js) + Neon or Supabase (Postgres+pgvector) + backend on a free host (e.g. Render, Koyeb) + Cloudflare R2 | Little server upkeep; automatic TLS | Free backends can sleep when idle, delaying reminders (needs an external cron); free databases may pause or be small; many moving parts |
| C. All Cloudflare | Workers (Hono) + Cron Triggers + Queues + R2 + Cloudflare vector storage | Free, global, per-minute cron, TypeScript-native | Some Node libraries (e.g. BullMQ, Nodemailer/SMTP) do not run on Workers, so the scheduler and email sending need a different approach; CPU-per-request limits on the free plan |

**Recommendation:** option A if you are comfortable with basic Linux (most reliable for reminders); option B if you want minimal upkeep, keeping the scheduler alive with an external cron.

**Minimum security (all options):** mandatory HTTPS, Google OAuth only for sign-in, secrets in environment variables, firewall limited to ports 80/443 (SSH by key only, for option A), automatic security updates, and API rate limiting.

## 14. UI/UX

- Responsive: two panels on laptop (chat + item list), single column on iPhone with bottom navigation.
- Pages: **Chat**, **Today**, **Notes** (filter by category), **Expenses**, **Reminders**, **Settings** (model, parameters, backup, import).
- PWA: manifest, icons, standalone mode, iPhone safe areas, input not hidden by the keyboard.
- Skill autocomplete when typing `/`; `/info` is always available as the cheat sheet.
- Clear AI status (streaming/loading) and error messages, including when the free quota runs out.
- Draft expenses show confirm/edit buttons.
- Dark and light mode.

## 15. Non-Functional Requirements & Metrics

| Aspect | Initial target |
| --- | --- |
| On-time reminders | ≥ 99% delivered, tolerance ≤ 1 minute, retry on failure |
| Classification accuracy | ≥ 90% without manual correction |
| Chat response | Streaming starts within a few seconds |
| Data consistency | A change on one device appears quickly on the others |
| AI quota | Monitored daily; stays within free-tier limits |
| Database capacity | Monitored against the free quota because history is kept forever (text is small; media lives in R2) |
| Backup | Delivered on schedule; test an import at least once before relying on it |
| Answer accuracy | No invention; history answers come from stored data |

## 16. Release Plan

All skills are in the MVP. Build order:

1. **Foundation:** hosting, Google login, text chat, database, responsive PWA, model settings, `/info`.
2. **Core:** auto-classification, todo/groceries/notes lists, history Q&A, three-tier memory.
3. **Reminders & email:** scheduler, Gmail SMTP, `/send-email`, `/email-reminder`, `/remind`.
4. **Backup:** scheduled JSON export, `/backup`, import.
5. **Remaining skills:** `/expense`, `/export-expenses`, `/grocery`, `/plan`, `/review`, `/daily-briefing`, `/search`, `/undo`, `/web-clipper`.
6. **Multimodal:** images (receipts), audio, then video.

## 17. Risks

- **Free-tier quota runs out:** one call per message, a queue, retries, and clear error messages.
- **Google uses free-tier data:** see the options in section 10.
- **Late reminders because the server sleeps:** choose option A, or keep option B alive with an external cron.
- **Backup email contains sensitive data:** Gmail 2-step verification and the encryption option.
- **Wrong classification or wrong date:** confirmation for ambiguous items, draft expenses, and `/undo`.
- **Gemini model changes or retirements:** model name in configuration.
- **Gmail SMTP policy changes or spam filtering:** test delivery early and keep an alternative email provider ready.
- **Free database fills up:** monitor size and keep media in R2.
- **Limited PWA push notifications on iPhone:** v1 uses email.

## 18. Open Questions

- Which hosting option (A, B, or C)?
- Default backup frequency (daily, weekly, monthly), and should the backup file be encrypted?
- Will you later move to paid Gemini (Tier 1) for privacy and quota?
- Is the `/config` alias for `/info` fine, or is one name enough?
- Weather in `/daily-briefing` is left out of v1 (it needs an extra service); agreed?
