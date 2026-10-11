# My PA – Personal Assistant Chatbot

> A stream-of-consciousness personal assistant web application and PWA engineered according to [PRD-EN.md](docs/PRD-EN.md).

---

## 🌟 Key Features Implemented

1. **Stream-of-Consciousness Auto-Classification**:
   - Write or speak your thoughts naturally without choosing categories manually.
   - My PA leverages **Google Gemini** with structured output schemas to automatically extract and create items across:
     - **Tasks / To-Dos** (`PENDING`, `COMPLETED`, fuzzy-match status updates)
     - **Financial Expenses** (`DRAFT` status awaiting confirmation, categories, amounts, receipts)
     - **Groceries** (interactive shopping checklist)
     - **Notes & Long-Term Plans** (with milestones and vector embeddings)
     - **Reminders** (date/time parsing, recurring options, email & in-app channels)

2. **3-Tier Memory & RAG Architecture**:
   - **Tier 1 (Short-term window):** Last 50 messages preserved in active dialog.
   - **Tier 2 (Rolling summary):** Background worker updates conversational summaries every 20 messages.
   - **Tier 3 (Long-term memory):** Structured SQL date queries for historical lookups (*"what did I do today?"*, *"what is my nearest deadline?"*) + Vector cosine similarity on 768-dim embeddings for knowledge queries.

3. **Built-in 19 Skills Engine (Slash Commands)**:
   - Full autocomplete dropdown in chat input with keyboard navigation and click-to-fill:
     - `/info` (alias `/config`): Instant cheat sheet of skills and active model parameters.
     - `/send-email`: Summarize data and send to registered email.
     - `/email-reminder`: Schedule an email reminder via Gmail SMTP.
     - `/today`: Today's agenda, pending todos, and daily spending.
     - `/deadline`: Nearest deadlines within specified days (default 7 days).
     - `/recap`: Summary of past period (e.g., yesterday).
     - `/daily-briefing`: Agenda, priority todos, and pending bills.
     - `/todo`: Explicitly manage or add a task.
     - `/grocery`: Add or view shopping items.
     - `/expense`: Log expenses and view totals.
     - `/export-expenses`: One-click CSV export for spreadsheets.
     - `/note`: Save free-form note with tags.
     - `/web-clipper` (alias `/link`): Save bookmarks with title & summary.
     - `/plan`: Break long-term plans into actionable roadmap steps.
     - `/remind`: In-app reminder.
     - `/review` (alias `/weekly-report`): Weekly performance review.
     - `/search`: Hybrid semantic search across notes.
     - `/undo`: 10-minute rollback for mistaken entries.
     - `/backup`: Dispatch JSON backup via email.

4. **UI/UX Aesthetics & Theming**:
   - Modern glassmorphism dashboard design with Tailwind CSS.
   - Built-in **Light & Dark Theme Toggle** with smooth transition.
   - 100% English UI labels, badges, and tooltips.
   - Responsive layout: Desktop two-panel sidebar navigation + Mobile bottom navigation drawer (PWA ready).
   - Multi-modal support: Text, images (OCR & receipts), audio (voice recording), and video.

5. **Authentication, Backup & Storage**:
   - Google OAuth 2.0 single-user architecture (`anisa.arum.work@gmail.com`).
   - Indefinite retention with soft-archiving (`archived_at`).
   - One-click JSON backup download & re-import with conflict prevention.
   - Gmail SMTP automated dispatch for reminders and backups.
   - Dual-mode database layer: PostgreSQL + `pgvector` schema with seamless resilient local fallback.

---

## 🚀 Getting Started

### 1. Environment Configuration (`.env.local`)
Create `.env.local` inside project directory:
```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# User Profile
USER_EMAIL=anisa.arum.work@gmail.com
USER_NAME=Anisa Arum
USER_TIMEZONE=Asia/Jakarta

# Database (PostgreSQL + pgvector or leave empty for local store)
DATABASE_URL=

# Gmail SMTP Email Dispatcher
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=anisa.arum.work@gmail.com
SMTP_PASS=
```

### 2. Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Run
```bash
npm run build
npm run start
```
