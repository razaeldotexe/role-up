# 🤖 Discord Automation AI Bot (April 2026 Edition)

Asisten automasi server Discord canggih yang didukung oleh 14 model AI gratis dari 3 provider (Google, OpenRouter, Groq). Bot ini dirancang untuk membantu administrator mengelola role, identitas server, dan automasi lainnya menggunakan bahasa natural.

## ✨ Fitur Utama

- **🚀 Triple-Provider Failover:** Rotasi otomatis antara Google, OpenRouter, dan Groq jika satu provider mengalami gangguan atau limitasi.
- **🔄 Multi-Model Rotation:** Mencoba hingga 14 model berbeda (termasuk seri Gemini 2.5, Gemma 4, dan Llama 4 Scout) untuk memastikan bot tetap gratis dan responsif.
- **🛠️ Server Automation (`/automate`):** 
  - Mengelola hierarki role secara profesional.
  - Mengubah nama server secara instan.
  - Penyesuaian tema warna role secara massal (misal: Tema Fantasi, Minimalis, dll).
  - Identifikasi grup role cerdas (Admin/Staff/Member).
- **🎨 Modern Standards:** Dibangun dengan Discord.js v14 terbaru, ESM (ECMAScript Modules), ESLint, dan Prettier.

## 📋 Prasyarat

- Node.js v18 atau lebih baru.
- Discord Bot Token dengan Intent: `GUILD_MEMBERS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT`.
- API Keys untuk (pilih minimal satu):
  - [Google AI Studio](https://aistudio.google.com/)
  - [OpenRouter](https://openrouter.ai/)
  - [Groq](https://groq.com/)

## 🚀 Instalasi & Setup

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/username/ai-roles-management.git
   cd ai-roles-management
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Copy `.env.example` menjadi `.env` dan isi token Anda:
   ```bash
   cp .env.example .env
   ```

4. **Daftarkan Slash Command:**
   ```bash
   npm run deploy
   ```

5. **Jalankan Bot:**
   ```bash
   npm start
   ```

## 🛠️ Pengembangan

- **Linting:** `npm run lint` untuk mengecek kesalahan kode.
- **Formatting:** `npm run format` untuk merapikan kode secara otomatis.

## 📝 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
