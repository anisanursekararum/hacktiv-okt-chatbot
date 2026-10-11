# PRD – My PA: Personal Assistant Chatbot

**Versi:** 1.0 (Final) · **Tanggal:** 11 Oktober 2026 · **Bahasa:** Indonesia (versi English: `PRD-EN.md`)

---

## 1. Ringkasan & Keputusan Final

My PA adalah asisten pribadi berbasis chat untuk satu pengguna. Kamu menulis apa saja (todo, belanja, pengeluaran, catatan, link, rencana), AI mengenali dan mengelompokkannya, mengirim reminder ke email, dan menjawab pertanyaan tentang riwayatmu. Diakses lewat web responsif dan bisa di-*Add to Home Screen* di iPhone.

| Keputusan | Pilihan final |
| --- | --- |
| Platform | Web responsif + PWA (laptop dan iPhone) |
| Bahasa pemrograman | TypeScript untuk frontend dan backend (tanpa Python) |
| Login | Google OAuth saja, tanpa password |
| Pengguna | 1 user; login di banyak device memakai data dan riwayat yang sama |
| Provider AI | Google Gemini, fokus v1 pada **free tier**; model bisa diganti lewat pengaturan |
| Bahasa | Mengikuti perilaku default model; tanpa penanganan khusus di v1 |
| Riwayat | Disimpan selamanya; item hanya diarsipkan, tidak dihapus permanen |
| Backup | File JSON dikirim ke email, bisa di-import kembali |
| Email pengirim | anisa.arum.work@gmail.com |
| Hosting | Gratis, aman, dan cukup bertenaga (opsi di bagian 13) |
| Ringkasan harian | Tidak otomatis; hanya saat diminta (`/daily-briefing`) |
| Skill | Semua 19 skill di bagian 9 masuk MVP |
| Kategori item | Todo, Belanja, Pengeluaran, Catatan, Rencana, Link, Reminder |

## 2. Tujuan & Non-Tujuan

**Tujuan**
- Satu tempat mencatat apa pun tanpa memilih kategori manual.
- Bertanya ke riwayat sendiri (hari ini, kemarin, deadline) dan mendapat ringkasan atau tanggal detail.
- Reminder email yang andal.
- Data dan riwayat identik di semua device.
- Biaya operasional nol (hosting dan AI di tier gratis).

**Non-Tujuan (v1)**
- Multi-user atau berbagi catatan.
- Aplikasi native iOS/Android.
- Ringkasan atau notifikasi otomatis yang tidak diminta.
- Integrasi kalender dan spreadsheet dua arah.
- Penanganan khusus multi-bahasa.

## 3. Arsitektur

```
        Frontend PWA (Next.js: laptop + iPhone)
                       |
              API Gateway + Auth (Node.js + TypeScript, Google OAuth)
                       |
     +-----------------+------------------+
     |                 |                  |
 Parser multimodal  Memori & konteks   Skill engine
 (Gemini)           (50 pesan +        (19 skill)
     |               ringkasan +             |
     |               hybrid search)          |
     +--------+--------+                     |
              |                              |
   PostgreSQL + pgvector          Scheduler + antrian ---> Email (Gmail SMTP)
              |
   Penyimpanan media (foto, audio, video)
```

## 4. Klasifikasi Otomatis (Fitur Inti)

Setiap pesan dianalisis Gemini dengan *structured output* (JSON schema) untuk mengambil intent dan entitas, lalu disimpan ke tabel yang sesuai. Satu pesan bisa menghasilkan beberapa item.

| Kategori | Contoh input | Aksi sistem |
| --- | --- | --- |
| Todo | Hari ini mau revisi proposal, bayar listrik, beli susu | 3 task `PENDING`, due hari ini |
| Update status | Revisi proposal udah selesai | Cocokkan (fuzzy match) lalu tandai `COMPLETED`; jika ada lebih dari satu kandidat, AI bertanya balik |
| Pengeluaran | Makan siang 45rb / foto struk | Catat `expenses` berstatus `DRAFT`, menunggu konfirmasi |
| Belanja | Beli telur, minyak, deterjen | Item `ACTIVE` di daftar belanja |
| Catatan | Ide project SaaS invoice UMKM | Simpan ke notes + embedding |
| Rencana | Target tabungan akhir tahun | Simpan sebagai note jenis rencana + tanggal target |
| Link | URL artikel | Ambil judul, buat ringkasan, simpan ke bookmarks |
| Reminder | Ingatkan 15 Oktober bayar pajak | Jadwalkan reminder email |

Koreksi kategori bisa lewat chat atau UI dan dipakai sebagai konteks berikutnya. Tanggal relatif (besok, lusa) dihitung memakai zona waktu pengguna (default Asia/Jakarta).

## 5. Tanya Jawab Riwayat

Contoh: *hari ini ngapain aja?*, *besok ada apa?*, *deadline terdekat?*, *kemarin aku ngerjain apa?* Sistem menjalankan query terstruktur ke PostgreSQL untuk rentang tanggal terkait, lalu Gemini menyusun jawaban natural (ringkasan, dengan opsi daftar tanggal detail). Jawaban hanya dari data tersimpan; jika tidak ada, AI menyatakan tidak ditemukan.

## 6. Reminder & Email

- Dibuat lewat chat atau skill `/email-reminder`; dikirim ke email Google yang terdaftar.
- Sekali jalan atau berulang (harian, mingguan, bulanan).
- Status terlihat: terjadwal, terkirim, gagal; yang gagal dicoba ulang otomatis.
- Chat menampilkan konfirmasi saat reminder dibuat dan saat terkirim.
- **Pengirim:** anisa.arum.work@gmail.com lewat Gmail SMTP dengan *App Password* (butuh verifikasi 2 langkah di akun pengirim). Tidak perlu domain sendiri. Batas kirim Gmail jauh di atas kebutuhan pribadi. Kredensial disimpan sebagai environment secret, bukan di repository.
- Reminder dan backup terjadwal adalah satu-satunya hal yang berjalan otomatis.

## 7. Input Multimodal

| Input | Pemrosesan | Hasil |
| --- | --- | --- |
| Teks | Klasifikasi intent + ekstraksi entitas | Record terstruktur atau aksi skill |
| Gambar | Gemini vision (OCR + deteksi objek) | Teks, tag otomatis, parsing struk |
| Audio | Transkripsi native Gemini | Teks lalu diproses seperti pesan teks |
| Video (prioritas rendah) | Gemini membaca video langsung | Ringkasan singkat + poin penting |

Batas ukuran file dan durasi ditetapkan saat implementasi agar tidak menghabiskan kuota gratis.

## 8. Memori & Context Window

Context window hanya batas teks yang dibaca model per panggilan, bukan memori. Batasnya bukan teknis melainkan **kuota, kecepatan, dan relevansi**: mengirim seluruh riwayat setiap kali itu boros dan menurunkan akurasi. Karena itu dipakai memori tiga tingkat:

| Tingkat | Isi | Cara kerja |
| --- | --- | --- |
| 1. Jendela pendek | 50 pesan terakhir utuh | Selalu dikirim agar alur diskusi terjaga |
| 2. Ringkasan bergulir | Poin kunci obrolan lama | Pekerja latar memperbarui ringkasan tiap +20 pesan; selalu masuk system prompt |
| 3. Memori jangka panjang | Seluruh catatan, tugas, dan riwayat | Query terstruktur (tanggal, tipe, status) + hybrid search (pgvector + kata kunci) saat pertanyaan merujuk hal lama |

Untuk pertanyaan seperti *kemarin ngapain?*, tingkat 3 memakai query SQL (akurat dan murah), bukan pencarian semantik. Pencarian semantik dipakai untuk pertanyaan tanpa tanggal, mis. *catatan soal pajak*. Angka 50 dan 20 adalah titik awal yang bisa disetel. Karena riwayat disimpan selamanya, semua pesan lama tetap bisa dijangkau lewat tingkat 3.

## 9. Skills (Slash Commands)

Skill dipicu dengan `/` (ada autocomplete) atau otomatis saat intent terdeteksi. Setiap eksekusi menampilkan konfirmasi hasil di chat. Skill didefinisikan sebagai konfigurasi (nama, parameter, aksi) agar skill baru mudah ditambah.

| Skill | Fungsi | Contoh |
| --- | --- | --- |
| `/info` (alias `/config`) | Cheat sheet: daftar semua skill dengan contoh singkat, plus model dan parameter yang sedang aktif. `/info <skill>` menampilkan detail satu skill | `/info` · `/info expense` |
| `/send-email` | Ringkas data lalu kirim ke email terdaftar | `/send-email rangkum yang aku kerjakan 9 Oktober 2026` |
| `/email-reminder` | Jadwalkan reminder email | `/email-reminder ingatkan 15 Oktober bayar pajak rumah` |
| `/today` | Ringkasan hari ini: todo, jadwal, deadline | `/today` |
| `/deadline` | Deadline terdekat | `/deadline 7 hari` |
| `/recap` | Rangkuman periode lalu | `/recap kemarin` |
| `/daily-briefing` | Agenda hari ini, todo prioritas, tagihan belum dibayar; **hanya saat diminta** | `/daily-briefing` |
| `/todo` | Tambah atau ubah todo secara eksplisit | `/todo selesai revisi proposal` |
| `/grocery` | Kelola daftar belanja (tambah, centang, bersihkan) | `/grocery tambah telur` |
| `/expense` | Catat pengeluaran dan lihat total harian/bulanan | `/expense makan siang 45rb` |
| `/export-expenses` | Kompilasi pengeluaran ke CSV/Excel untuk spreadsheet report | `/export-expenses bulan ini` |
| `/note` | Simpan catatan bebas dengan tag | `/note ide aplikasi UMKM` |
| `/web-clipper` (alias `/link`) | Simpan link + judul dan ringkasan | `/link https://...` |
| `/plan` | Pecah rencana jangka panjang menjadi langkah + target tanggal | `/plan tabungan akhir tahun` |
| `/remind` | Pengingat yang tampil di aplikasi saja (tanpa email) | `/remind cek stok susu` |
| `/review` (alias `/weekly-report`) | Laporan mingguan: tugas selesai vs tertunda, total pengeluaran, fokus minggu depan | `/review minggu ini` |
| `/search` | Cari di seluruh catatan | `/search pajak rumah` |
| `/undo` | Batalkan aksi terakhir | `/undo` |
| `/backup` | Kirim backup JSON ke email sekarang | `/backup` |

Catatan:
- `/info` dibuat dari konfigurasi skill, tanpa memanggil AI, jadi cepat dan tidak memakai kuota.
- `/send-email` juga menerima kalimat bergaya reminder (mis. *ingatkan aku...*) dan meneruskannya ke `/email-reminder`.
- `/info` dan `/backup` ditambahkan di versi final ini (`/backup` mengikuti keputusan backup lewat email).

## 10. Model AI & Pengaturan

- **Nama model bisa diubah** di Pengaturan dan disimpan di konfigurasi, bukan di-hardcode. Nama dan paket model Gemini sering berganti; pilih yang tersedia saat implementasi.
- **Fokus v1: Gemini free tier** lewat API key Google AI Studio. Menurut laporan 2026, model kelas Flash/Flash-Lite tersedia gratis, sedangkan model Pro umumnya tidak lagi gratis. Karena itu router dua tingkat tetap ada, tetapi di free tier kedua tingkat default ke model kelas Flash; tingkat "dalam" hanya memakai model berbayar jika kamu mengaktifkannya.
- **Temperature, top_p, top_k** dengan slider, nilai default, dan tombol reset (temperature 0.0–1.0, top_p 0.0–1.0, top_k 1–40). Otomatis rendah (0.0–0.2) untuk parsing terstruktur (todo, pengeluaran, tanggal); 0.3–0.7 untuk percakapan; 0.8–1.0 untuk brainstorming. Tidak semua model menerima ketiga parameter sekaligus; UI hanya menampilkan yang didukung.
- **Kuota free tier kecil** (batas per menit dan per hari, berlaku per project; kelebihan menghasilkan error 429). Strategi: satu panggilan Gemini per pesan (klasifikasi dan jawaban dalam satu structured output), embedding diproses di latar belakang, retry dengan backoff, dan antrian. Jika kuota habis, pesan tetap disimpan dan AI memberi tahu bahwa pemrosesan menunggu.
- **Privasi free tier.** Pada free tier, Google dapat memakai prompt dan output untuk meningkatkan produknya, dan peninjau manusia bisa membacanya. Karena ada data keuangan (struk, nominal), pilihannya:
  1. Terima risiko ini untuk pemakaian pribadi.
  2. Hindari mengirim foto struk dan data yang tidak mau dibagikan.
  3. Aktifkan billing (Tier 1); data paid tier tidak dipakai untuk melatih model, dan biaya per token untuk satu pengguna umumnya kecil.

  Rekomendasi: mulai gratis, jangan masukkan data yang tidak nyaman dibagikan, lalu upgrade bila perlu.

## 11. Autentikasi, Keamanan, Retensi & Backup

- **Login:** Google OAuth 2.0 saja; tabel users tidak menyimpan password. Email Google menjadi tujuan reminder dan backup.
- **Sesi:** access token 15 menit + refresh token 7 hari di cookie `HttpOnly, Secure, SameSite=Strict`; login dari beberapa device diizinkan.
- **Enkripsi:** HTTPS/TLS untuk semua lalu lintas; enkripsi penyimpanan di level volume.
- **Isolasi data:** semua query tetap memakai `WHERE user_id = :current_user_id` walau hanya satu pengguna.
- **Retensi:** riwayat chat dan semua item disimpan selamanya. Menghapus diganti **arsip** (`archived_at`): item disembunyikan dari tampilan tetapi tetap ada di database dan tetap bisa dicari atau dipulihkan.
- **Backup ke email (JSON):**
  - Terjadwal otomatis (default mingguan; bisa harian atau bulanan) dan manual lewat `/backup`.
  - Satu file JSON berisi semua tabel (pesan, tugas, pengeluaran, belanja, catatan, bookmark, reminder, ringkasan, pengaturan) dengan nomor versi skema. Embedding tidak ikut (dibuat ulang saat import); file media tidak ikut, hanya URL-nya.
  - Dikirim sebagai lampiran dari anisa.arum.work@gmail.com ke email terdaftar. Batas lampiran Gmail sekitar 25 MB; jika lebih, file dipecah per tabel atau per tahun.
  - **Import:** Pengaturan → Import backup. Record dengan ID yang sama tidak diduplikasi, dan jumlah record ditampilkan sebagai pratinjau sebelum diterapkan.
  - **Keamanan backup:** file berisi seluruh riwayat dan data keuangan. Aktifkan verifikasi 2 langkah di Gmail; opsional, backup dienkripsi dengan password (disimpan di pengaturan).
  - Backup email bukan satu-satunya lapisan: pakai juga backup bawaan penyedia database jika tersedia.

## 12. Desain Database (PostgreSQL + pgvector)

Semua tabel memuat `user_id`, `created_at`, dan `archived_at`.

| Tabel | Kolom utama |
| --- | --- |
| `users` | email (unik), google_sub, full_name, timezone (default Asia/Jakarta) |
| `chat_messages` | role, content, media_url, media_type (text/image/audio/video) |
| `tasks` | title, category, status (PENDING/COMPLETED/CANCELLED), due_date, completed_at, source_message_id |
| `expenses` | amount NUMERIC(12,2), category, description, transaction_date, status (DRAFT/CONFIRMED), receipt_url |
| `groceries` | item, quantity, status (ACTIVE/BOUGHT) |
| `notes` | kind (note/plan/idea), title, content, tags[], target_date, embedding VECTOR |
| `bookmarks` | url, title, summary, embedding VECTOR |
| `reminders` | payload, trigger_time, recurrence, channel (email/in_app), status (SCHEDULED/SENT/FAILED), attempts |
| `summaries` | scope (conversation/daily/weekly), period, content |
| `user_settings` | model_name, temperature, top_p, top_k, model_router, backup_frequency, backup_encrypt |

Dimensi vector mengikuti model embedding yang dipilih.

## 13. Tech Stack & Hosting Gratis

| Layer | Pilihan | Catatan |
| --- | --- | --- |
| Frontend | Next.js (App Router), Tailwind, shadcn/ui, PWA | Versi stabil terbaru saat mulai |
| Backend | Node.js + TypeScript (Fastify; Hono jika memilih Cloudflare) | Satu bahasa dengan frontend; validasi skema dengan Zod; ORM Drizzle (mendukung pgvector) |
| Scheduler | BullMQ + Redis | Pada opsi hosting tanpa server menetap: endpoint yang dipanggil cron eksternal |
| Database | PostgreSQL + pgvector | |
| AI | Gemini API (SDK `@google/genai`), free tier | Nama model di konfigurasi; skema structured output dari Zod |
| Email | Gmail SMTP + App Password (Nodemailer) | Pengirim anisa.arum.work@gmail.com; tanpa domain |
| Media | Cloudflare R2 (tier gratis) | Foto, voice note, video |
| Auth | Google OAuth 2.0 (mis. Auth.js) | |

**Opsi hosting gratis.** Syarat paket gratis sering berubah; cek lagi saat mulai.

| Opsi | Susunan | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| A. Satu VM gratis | VM gratis (mis. Oracle Cloud Always Free, ARM) menjalankan Docker Compose: Next.js, API Node.js, Postgres+pgvector, Redis, worker BullMQ; Cloudflare di depan (DNS, TLS, WAF gratis) | Selalu menyala sehingga reminder tepat waktu; tenaga besar; semua di satu tempat | Kamu mengurus patch dan keamanan server; pendaftaran perlu verifikasi kartu; kapasitas bisa penuh; instance yang idle bisa diambil kembali |
| B. Layanan terkelola gratis | Vercel (Next.js) + Neon atau Supabase (Postgres+pgvector) + backend di host gratis (mis. Render, Koyeb) + Cloudflare R2 | Minim perawatan server; TLS otomatis | Backend gratis bisa tidur saat idle sehingga reminder terlambat (perlu cron eksternal); database gratis bisa pause atau berkapasitas kecil; banyak komponen |
| C. Cloudflare penuh | Workers (Hono) + Cron Triggers + Queues + R2 + penyimpanan vektor Cloudflare | Gratis, global, cron tiap menit, TypeScript native | Beberapa library Node (mis. BullMQ, Nodemailer/SMTP) tidak jalan di Workers sehingga scheduler dan pengiriman email perlu pendekatan berbeda; ada batas CPU per request di paket gratis |

**Rekomendasi:** opsi A jika nyaman dengan Linux dasar (paling andal untuk reminder); opsi B jika ingin minim perawatan, dengan scheduler dijaga lewat cron eksternal.

**Pengamanan minimum (semua opsi):** HTTPS wajib, hanya Google OAuth untuk masuk, secret di environment variable, firewall hanya port 80/443 (SSH hanya dengan key, pada opsi A), pembaruan keamanan otomatis, dan rate limit di API.

## 14. UI/UX

- Responsif: dua panel di laptop (chat + daftar item), satu kolom di iPhone dengan navigasi bawah.
- Halaman: **Chat**, **Hari Ini**, **Catatan** (filter per kategori), **Pengeluaran**, **Reminder**, **Pengaturan** (model, parameter, backup, import).
- PWA: manifest, ikon, mode standalone, *safe area* iPhone, input tidak tertutup keyboard.
- Autocomplete skill saat mengetik `/`; `/info` selalu tersedia sebagai cheat sheet.
- Status AI (streaming/loading) dan pesan error yang jelas, termasuk saat kuota gratis habis.
- Pengeluaran berstatus draft ditampilkan dengan tombol konfirmasi/ubah.
- Mode gelap/terang.

## 15. Non-Fungsional & Metrik

| Aspek | Target awal |
| --- | --- |
| Reminder tepat waktu | ≥ 99% terkirim, toleransi ≤ 1 menit, retry saat gagal |
| Akurasi klasifikasi | ≥ 90% tanpa koreksi manual |
| Respons chat | Streaming mulai dalam beberapa detik |
| Konsistensi data | Perubahan di satu device muncul di device lain dengan cepat |
| Kuota AI | Dipantau per hari; tidak melewati batas free tier |
| Kapasitas database | Dipantau terhadap kuota gratis karena riwayat disimpan selamanya (teks kecil; media di R2) |
| Backup | Terkirim sesuai jadwal; uji import minimal sekali sebelum diandalkan |
| Akurasi jawaban | Tidak mengarang; jawaban riwayat dari data tersimpan |

## 16. Rencana Rilis

Semua skill masuk MVP. Urutan pengerjaan:

1. **Fondasi:** hosting, Google login, chat teks, database, PWA responsif, pengaturan model, `/info`.
2. **Inti:** klasifikasi otomatis, daftar todo/belanja/catatan, tanya jawab riwayat, memori 3 tingkat.
3. **Reminder & email:** scheduler, Gmail SMTP, `/send-email`, `/email-reminder`, `/remind`.
4. **Backup:** ekspor JSON terjadwal, `/backup`, import.
5. **Skill sisanya:** `/expense`, `/export-expenses`, `/grocery`, `/plan`, `/review`, `/daily-briefing`, `/search`, `/undo`, `/web-clipper`.
6. **Multimodal:** gambar (struk), audio, lalu video.

## 17. Risiko

- **Kuota free tier habis:** satu panggilan per pesan, antrian, retry, dan pesan error jelas.
- **Data dipakai Google di free tier:** lihat pilihan di bagian 10.
- **Reminder terlambat karena server tidur:** pilih opsi A, atau jaga opsi B dengan cron eksternal.
- **Backup di email berisi data sensitif:** 2FA Gmail dan opsi enkripsi.
- **Salah klasifikasi atau salah tanggal:** konfirmasi untuk item ambigu, pengeluaran berstatus draft, dan `/undo`.
- **Model Gemini berganti atau dihentikan:** nama model di konfigurasi.
- **Gmail SMTP berubah kebijakan atau menandai email sebagai spam:** uji pengiriman awal dan siapkan alternatif penyedia email.
- **Database gratis penuh:** pantau ukuran, pindahkan media ke R2.
- **Push notification iPhone via PWA terbatas:** v1 memakai email.

## 18. Pertanyaan Terbuka

- Opsi hosting mana (A, B, atau C)?
- Frekuensi backup default (harian, mingguan, bulanan) dan apakah file backup dienkripsi?
- Apakah nanti ingin pindah ke Gemini berbayar (Tier 1) demi privasi dan kuota?
- Alias `/config` untuk `/info` sudah sesuai, atau cukup satu nama?
- Cuaca di `/daily-briefing` tidak dimasukkan di v1 (butuh layanan tambahan); setuju?
