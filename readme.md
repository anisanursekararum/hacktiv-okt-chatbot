# Hacktiv8 AI Bootcamp – Repository Overview

> This repository contains hands-on learning modules, experiments, and the **Final Project** personal assistant chatbot powered by Google Gemini AI.

🌐 **Production Demo (Final Project):** [https://hacktiv-okt-chatbot.vercel.app/](https://hacktiv-okt-chatbot.vercel.app/)

---

## 📂 Repository Structure

```text
hacktiv-10-okt/
├── 📁 final-project/          # [MAIN] My PA – Full-Stack Personal Assistant Web App & PWA
├── 📁 chatbot/                # [Module 2] Baseline CLI / Interactive Terminal Chatbot
├── 📁 gemini-chatbot-api/     # [Module 3] RESTful Chatbot API Service using Express & Gemini
├── 📄 readme.md               # Root repository documentation overview
└── 📄 .gitignore              # Global git ignore configuration
```

---

## 🚀 Directory & Module Details

### 1. `final-project/` — **My PA (Personal Assistant Chatbot)** ⭐
A modern full-stack web application and *Progressive Web App (PWA)* designed as a stream-of-consciousness personal assistant.
- **Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Google Gemini 2.5 Flash, Neon PostgreSQL 16 + `pgvector`, Drizzle ORM, Nodemailer (Gmail SMTP).
- **Core Features:**
  - Stream-of-consciousness auto-classification for To-Dos, Expenses, Groceries, Notes, and Reminders.
  - Built-in 19 Skills Engine (Slash commands like `/info`, `/today`, `/expense`, `/backup`, `/send-email`, etc.).
  - Multi-user authentication & data isolation (Google OAuth 2.0).
  - 3-Tier Memory Architecture with Hybrid Vector Semantic Search.
  - One-click JSON backup & restore, along with background SMTP email reminder dispatching.
- **Detailed Documentation:** Refer to [final-project/README.md](final-project/README.md) for full configuration, database schemas, and setup instructions.

---

### 2. `chatbot/` — **Interactive Terminal / CLI Chatbot**
Foundational module demonstrating an interactive console chat application using the Google Gemini SDK.
- Direct terminal interactions with the Gemini AI model via command prompt / PowerShell.
- Covers API key initialization, chat session persistence, and basic prompt engineering.

---

### 3. `gemini-chatbot-api/` — **Gemini REST API Service**
Backend web server service built with Express.js / Node.js exposing API endpoints for chatbot integration.
- Provides HTTP POST endpoints to receive prompt payloads and return AI-generated responses.
- Serves as a foundational bridge between frontend client applications and the Google Gemini API.

---

## 🛠️ Getting Started

To run the **Final Project (My PA)** locally:

```bash
# 1. Navigate to the final-project directory
cd final-project

# 2. Install dependencies
npm install

# 3. Create your environment configuration file (.env)
cp .env.example .env

# 4. Start the local development server
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

---

## 👨‍💻 Author & Attribution
Developed as part of the assignments and Final Project curriculum for **Hacktiv8 AI Bootcamp** (October 2026).