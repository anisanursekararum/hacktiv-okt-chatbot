# My PA – Personal Assistant Chatbot

> A stream-of-consciousness personal assistant web application and PWA powered by **Google Gemini AI**, **Next.js 14**, and **Neon PostgreSQL + pgvector**.

🌐 **Production Deployment (Live):** [https://hacktiv-okt-chatbot.vercel.app/](https://hacktiv-okt-chatbot.vercel.app/)  
📖 **Product Requirement Documents:** [Indonesian PRD](docs/PRD-ID.md) · [English PRD](docs/PRD-EN.md)

---

## 🏗️ Tech Stack

### Frontend & Application Framework
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
- **Language:** TypeScript 5 (Full-stack end-to-end type safety)
- **Styling & Design System:** [Tailwind CSS](https://tailwindcss.com/) with Custom Glassmorphism, CSS Variables, and Smooth Light/Dark Mode Transitions
- **Icons:** [Lucide React](https://lucide.dev/)
- **PWA Ready:** Web App Manifest, Service Worker compatibility, iPhone safe-area optimization

### Artificial Intelligence & Vector RAG
- **AI Engine:** [Google Gemini 2.5 Flash](https://ai.google.dev/) via official `@google/genai` SDK
- **Intent Extraction:** Structured Outputs with strict JSON Schemas (Zod-aligned)
- **Vector Embeddings:** 768-dimensional embeddings (`text-embedding-004`) for hybrid semantic knowledge retrieval
- **Multi-Modal:** Text, Images (OCR receipts), Audio (voice notes), and Video support

### Database & Storage
- **Primary Database:** [Neon Serverless PostgreSQL 16](https://neon.tech/) with pooled connection
- **Vector Database Extension:** `pgvector` for cosine similarity vector search
- **ORM & Migrations:** [Drizzle ORM](https://orm.drizzle.team/) & `drizzle-kit`
- **Resilient Fallback:** Local JSON storage engine (`data/my_pa_storage.json`) for seamless offline/zero-config operation

### Email & Automated Dispatch
- **Transport:** [Nodemailer](https://nodemailer.com/) via Gmail SMTP + TLS App Passwords
- **Automation:** Background polling runner + REST Cron endpoint for reminder and backup delivery

### Hosting & Infrastructure
- **Production Host:** [Vercel](https://vercel.com/) (Edge-accelerated Next.js deployment)
- **Auth Provider:** Google Cloud OAuth 2.0 (Google Identity Services)

---

## 🌟 Key Features

### 1. 🧠 Stream-of-Consciousness Auto-Classification
Write or speak your thoughts naturally without manually selecting categories. My PA interprets your message and automatically extracts:
- **Tasks & To-Dos:** `PENDING` status, intelligent due date parsing, and fuzzy status matching.
- **Financial Expenses:** Amounts, categories (`food`, `bills`, `transport`, `shopping`), and `DRAFT` status awaiting confirmation.
- **Groceries:** Interactive shopping checklists with quantities.
- **Notes & Ideas:** Markdown-formatted freeform entries with auto-generated tags and vector embeddings.
- **Reminders:** Natural language date/time parsing (e.g., *"remind me today at 7:30 PM to take medicine"*).

### 2. ⚡ Built-in 19 Skills Engine (Slash Commands)
Interactive autocomplete command menu accessible directly in the chat input or top navigation:

| Command | Description | Example Usage |
|---|---|---|
| `/info` (or `/config`) | Instant cheat sheet of all available skills & active AI model configuration | `/info` or `/info expense` |
| `/send-email` | Summarize records and email them to the registered address | `/send-email summarize today's tasks` |
| `/email-reminder` | Schedule an email reminder via Gmail SMTP | `/email-reminder tomorrow 8am check server` |
| `/today` | Overview of today's active tasks, deadlines, and expenses | `/today` |
| `/deadline` | View approaching deadlines within $N$ days (default 7 days) | `/deadline 7 days` |
| `/recap` | Summarize activity from a past period | `/recap yesterday` |
| `/daily-briefing` | Priority agenda, urgent to-dos, and unpaid draft expenses | `/daily-briefing` |
| `/todo` | Explicitly create or update a to-do item | `/todo finish quarterly report` |
| `/grocery` | Manage shopping list items | `/grocery add eggs, olive oil, bread` |
| `/expense` | Record financial transaction and track spend | `/expense lunch 45k` |
| `/export-expenses` | One-click CSV export formatted for spreadsheets | `/export-expenses this month` |
| `/note` | Save knowledge notes with automated tagging | `/note SaaS aggregator idea for SMEs` |
| `/web-clipper` (or `/link`) | Save bookmarked URLs with titles and automated summaries | `/link https://news.ycombinator.com` |
| `/plan` | Break long-term objectives into actionable roadmap milestones | `/plan savings target for December` |
| `/remind` | Quick in-app reminder notification | `/remind check milk stock` |
| `/review` (or `/weekly-report`) | Weekly report of completed tasks vs. pending tasks and expenses | `/review this week` |
| `/search` | Hybrid semantic vector search across notes and knowledge | `/search invoice aggregator` |
| `/undo` | Rollback and archive entries created in the last 10 minutes | `/undo` |
| `/backup` | Trigger instant database backup dispatched directly to your email | `/backup` |

### 3. 🛡️ User Scoping & Security Isolation
- **Dynamic User Authentication:** Multi-device synchronization via Google OAuth 2.0 with separate data isolation per user email.
- **Soft Archiving:** Items are never permanently destroyed without trace; `archived_at` timestamps preserve data integrity.
- **Backup & Portability:** One-click full JSON backup export & re-import with duplicate detection.

### 4. 🎨 UI/UX & Responsive Views
- **Chat View:** Real-time conversation with typing indicators, quick chip suggestions, slash menu, and media upload.
- **Today View:** Daily productivity dashboard featuring quick filters and daily spending totals.
- **Tasks View:** Kanban/list style task tracker with priority tags.
- **Expenses View:** Financial ledger with instant status confirmation and CSV export.
- **Groceries View:** Checklist shopping mode.
- **Notes View:** Grid view with tags filter and detail expansion.
- **Reminders View:** Status monitoring (`SCHEDULED`, `SENT`, `FAILED`).
- **Settings View:** AI hyperparameter tuning (Temperature, Top-P, Top-K sliders) and theme switcher.

---

## 🚀 Getting Started (Local Development)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/anisanursekararum/hacktiv-okt-chatbot.git
cd hacktiv-okt-chatbot/final-project
npm install
```

### 2. Configure Environment Variables
Create `.env` inside the `final-project` directory:
```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# User Authentication (Google OAuth 2.0)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
USER_EMAIL=anisa.arum.work@gmail.com
USER_NAME=Anisa Arum
USER_TIMEZONE=Asia/Jakarta

# Database (Neon PostgreSQL + pgvector)
# Leave empty to use the built-in resilient local JSON store
DATABASE_URL=postgresql://user:password@ep-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# Gmail SMTP Email Dispatcher (App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=anisa.arum.work@gmail.com
SMTP_PASS=your-16-digit-gmail-app-password
SMTP_FROM="My PA Assistant <anisa.arum.work@gmail.com>"
NEXT_PUBLIC_APP_NAME="My PA"
```

### 3. Initialize Database Schema (Neon / PostgreSQL)
If using PostgreSQL, execute the SQL script in Neon's **SQL Editor** or run:
```bash
npx drizzle-kit push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Automated QA & Verification
Run the automated end-to-end test suite:
```bash
node test_qa_suite.mjs
```

---

## 🚢 Deployment (Vercel)

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Import Project** and select `anisanursekararum/hacktiv-okt-chatbot`.
3. Set **Root Directory** to `final-project`.
4. Add all environment variables listed above in Vercel's **Environment Variables** settings.
5. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add `https://hacktiv-okt-chatbot.vercel.app` to **Authorized JavaScript origins** and **Authorized redirect URIs**.
6. Click **Deploy**.

---

## 📄 License
MIT License. Built for Personal Productivity & Hacktiv Assignment.
