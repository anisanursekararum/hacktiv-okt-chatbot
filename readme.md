# Hacktiv8 AI Bootcamp – Repository Overview

> Repositori ini berisi kumpulan modul pembelajaran, eksperimen hands-on, dan **Final Project** personal assistant chatbot berbasis Google Gemini AI.

🌐 **Production Demo (Final Project):** [https://hacktiv-okt-chatbot.vercel.app/](https://hacktiv-okt-chatbot.vercel.app/)

---

## 📂 Struktur Repositori

```text
hacktiv-10-okt/
├── 📁 final-project/          # [MAIN] My PA – Full-Stack Personal Assistant Web App & PWA
├── 📁 chatbot/                # [Modul 1] Eksperimen dasar CLI / Interactive Terminal Chatbot
├── 📁 gemini-chatbot-api/     # [Modul 2] Implementasi Backend API RESTful Chatbot Gemini
├── 📄 readme.md               # Dokumentasi ikhtisar root repositori
└── 📄 .gitignore              # Global git ignore configuration
```

---

## 🚀 Rincian Folder & Modul

### 1. `final-project/` — **My PA (Personal Assistant Chatbot)** ⭐
Aplikasi web full-stack modern dan *Progressive Web App (PWA)* yang berfungsi sebagai asisten pribadi berbasis chat *stream-of-consciousness*.
- **Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Google Gemini 2.5 Flash, Neon PostgreSQL 16 + `pgvector`, Drizzle ORM, Nodemailer (Gmail SMTP).
- **Fitur Unggulan:**
  - Auto-Classification otomatis untuk Todo, Pengeluaran, Groceries, Catatan, dan Reminder.
  - 19 Built-in Skills Engine (Slash commands seperti `/info`, `/today`, `/expense`, `/backup`, `/send-email`, dll).
  - Multi-user authentication & scoping (Google OAuth 2.0).
  - 3-Tier Memory & Hybrid Vector Semantic Search.
  - One-click JSON backup/restore & background SMTP reminder scheduler.
- **Dokumentasi Lengkap:** Silakan buka [final-project/README.md](final-project/README.md) untuk panduan konfigurasi, schema database, dan instalasi detail.

---

### 2. `chatbot/` — **Terminal / CLI Chatbot**
Modul eksperimen awal pembuatan chatbot interaktif melalui antarmuka konsol / terminal menggunakan Google Gemini SDK.
- Berinteraksi langsung dengan model AI via command prompt / PowerShell.
- Mempelajari inisialisasi API key, session chat interaktif, dan prompt engineering dasar.

---

### 3. `gemini-chatbot-api/` — **Gemini REST API Service**
Modul pembuatan layanan web server backend berbasis Express.js / Node.js untuk mengekspos endpoint API chatbot.
- Menyediakan route HTTP POST untuk menerima prompt chat dan mengembalikan respons teks dari Gemini AI.
- Berfungsi sebagai jembatan dasar antara client web dengan API Google Gemini.

---

## 🛠️ Cara Menjalankan Project

Jika kamu ingin menjalankan **Final Project (My PA)**:

```bash
# 1. Masuk ke direktori final-project
cd final-project

# 2. Install dependensi
npm install

# 3. Setup file konfigurasi .env (salin dari .env.example)
cp .env.example .env

# 4. Jalankan server pengembangan lokal
npm run dev
```

Akses aplikasi di browser pada [http://localhost:3000](http://localhost:3000).

---

## 👨‍💻 Penulis / Mahasiswa
Dibuat sebagai bagian dari rangkaian tugas dan Final Project **Hacktiv8 AI Bootcamp** (Oktober 2026).