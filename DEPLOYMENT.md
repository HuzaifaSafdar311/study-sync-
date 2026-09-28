# StudySync Deployment Architecture & Guide

This document defines the production deployment topology for StudySync AI.

## Topology Overview

StudySync AI uses a decoupled **two-tier architecture**:

```
 ┌─────────────────────────┐               ┌───────────────────────────────┐
 │     Vercel (Frontend)   │   HTTPS/WSS   │   Container Host (Backend)    │
 │   - Static Vite React   │ ────────────> │   - Node.js / Express API     │
 │   - Global Edge CDN     │               │   - Prisma ORM Engine         │
 │   - SPA /index.html     │               │   - BullMQ / In-Memory Worker │
 └─────────────────────────┘               └──────────────┬────────────────┘
                                                          │
                                     ┌────────────────────┴────────────────────┐
                                     │                                         │
                              PostgreSQL DB                             SMTP (Gmail)
                         (Supabase / Neon / RDS)             (mails.studysync@gmail.com)
```

1. **Frontend (Vercel)**:
   - Hosted as a pure static Single-Page Application (SPA) on Vercel.
   - Built with Vite and React 19.
   - All client-side routes rewrite to `/index.html`.
   - Directly calls the backend API at `VITE_API_URL`.
   - **No backend serverless functions, no `/api` folder, and no Services preset** on Vercel.

2. **Backend (Container Host)**:
   - Hosted on a container or Node.js runtime host such as **Railway**, **Render**, **Fly.io**, **AWS ECS / App Runner**, or **DigitalOcean App Platform**.
   - Runs Express, Prisma ORM, task queues, and background services.
   - Manages database migrations, authentication, WebSocket/event connections, and AI integrations.
   - Configures CORS dynamically from environment variables (`ALLOWED_ORIGINS` and `FRONTEND_URL`).

---

## 1. Frontend Configuration (Vercel)

### Project Settings
- **Framework Preset**: `Vite` (or `Other` / Static) — **DO NOT** select "Services"
- **Root Directory**: `./` (or `frontend` if setting root to subfolder)
- **Install Command**: `cd frontend && npm install`
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/dist`

### Vercel Routing Configuration (`vercel.json`)
```json
{
  "installCommand": "cd frontend && npm install",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Frontend Required Environment Variables
Set these in your Vercel Project Settings under **Environment Variables**:

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | **YES (Mandatory)** | Full URL pointing to your deployed backend API (must include or omit `/api`, automatically normalized). Fails loudly if missing in production. | `https://studysync-api.up.railway.app/api` |

---

## 2. Backend Configuration (Container Host)

### Deployment Commands
- **Build**: `cd backend && npm install && npm run prisma:generate && npm run build` (or `npm run prisma:generate`)
- **Start**: `npm start` (runs `node dist/server.js` or `tsx src/server.ts`)

### Backend Required Environment Variables
Set these on your container host (e.g. Railway, Render, Fly.io, or Docker `.env`):

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | **YES** | Port for Express HTTP server | `5000` (or dynamically assigned by host) |
| `NODE_ENV` | **YES** | Runtime environment | `production` |
| `FRONTEND_URL` | **YES** | Full URL of the deployed Vercel frontend (for CORS & OAuth redirects) | `https://studysync.vercel.app` |
| `ALLOWED_ORIGINS` | **YES** | Comma-separated list of allowed CORS origins | `https://studysync.vercel.app,https://yourcustomdomain.com` |
| `DATABASE_URL` | **YES** | PostgreSQL connection string | `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/studysync?schema=public` |
| `JWT_ACCESS_SECRET` | **YES** | Secret key for signing student JWT access tokens (minimum 32 characters) | `<high-entropy-random-secret>` |
| `JWT_REFRESH_SECRET` | **YES** | Secret key for signing student JWT refresh tokens (minimum 32 characters) | `<high-entropy-random-secret>` |
| `ADMIN_JWT_SECRET` | **YES** | Isolated secret key for signing admin access tokens (never shared with student tokens) | `<high-entropy-random-secret>` |
| `JWT_ACCESS_EXPIRES_IN`| No (Default: 15m) | Expiry duration for access tokens | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| No (Default: 7d) | Expiry duration for refresh tokens | `7d` |
| `SMTP_SERVICE` | **YES** | Email service provider | `gmail` |
| `SMTP_HOST` | **YES** | SMTP host server | `smtp.gmail.com` |
| `SMTP_PORT` | **YES** | SMTP port | `465` (SSL) or `587` (TLS) |
| `SMTP_SECURE` | **YES** | Enable TLS/SSL | `true` |
| `SMTP_USER` | **YES** | Outgoing email address for OTP and notifications | `mails.studysync@gmail.com` |
| `SMTP_PASS` | **YES** | App password for Gmail account | `<16-character-app-password>` |
| `SMTP_FROM` | **YES** | Display name & from header for outgoing emails | `"StudySync AI <mails.studysync@gmail.com>"` |
| `BYOK_ENCRYPTION_SECRET`| **YES** | 32-character AES-256-GCM secret for encrypting student BYOK keys | `<32-character-secret>` |

### Optional / Integration Environment Variables

| Variable | Integration | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth | Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google OAuth 2.0 Web Client Secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth | Google OAuth callback URL (e.g. `https://api.yourdomain.com/api/auth/google/callback`) |
| `GROQ_API_KEY` | Groq AI | LLM inference API key |
| `GEMINI_API_KEY` | Google Gemini | Gemini AI API key |
| `TAVILY_API_KEY` | Tavily Search | Real-time web search API key |
| `SUPABASE_URL` | Supabase | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase | Supabase anon public key |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API | Meta WhatsApp token for bot notifications |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API | Meta WhatsApp Phone Number ID |
| `REDIS_HOST` | BullMQ / Redis | Redis host (defaults to in-memory mode if unset) |
| `REDIS_PORT` | BullMQ / Redis | Redis port (default: `6379`) |
| `REDIS_PASSWORD` | BullMQ / Redis | Redis authentication password |
