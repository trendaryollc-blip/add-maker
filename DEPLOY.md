# OMNI Ad Engine — Deployment Guide

## Quick Deploy to Vercel

### 1. Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial OMNI deployment"

# Create GitHub repo and push
gh repo create omni-ad-engine --public --source=. --push
```

### 2. Deploy to Vercel

**Option A: Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

**Option B: Vercel Dashboard**
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Framework: **Other**
4. Root directory: **/** (leave as root)
5. Build command: `echo "No build needed"`
6. Output directory: `frontend/public`
7. Click **Deploy**

### 3. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value | Notes |
|---|---|---|
| `MOCK_DATA` | `true` | Set to `false` when adding real API keys |
| `JWT_SECRET` | `<random-64-chars>` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGIN` | `*` | Or your Vercel domain |
| `DATABASE_URL` | `postgresql://...` | Optional: Vercel Postgres, Neon, or Supabase |
| `OPENAI_API_KEY` | `sk-...` | For real AI features |
| `STABILITY_API_KEY` | `sk-...` | For real image generation |
| `ELEVENLABS_API_KEY` | `...` | For real voiceovers |

### 4. Configure Custom Domain (Optional)

In Vercel Dashboard → Settings → Domains, add your domain.

---

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/omni-ad-engine.git
cd omni-ad-engine

# Install backend dependencies
cd backend
npm install

# Create backend .env
cp .env.example .env

# Start backend
npm start
# Backend runs at http://localhost:3001/api
```

### Run Tests

```bash
# From project root
npm test

# Or separately
npm run test:backend
npm run test:frontend

# Validate structure
npm run validate

# QA checks
npm run qa
```

---

## Project Structure

```
omni-ad-engine/
├── api/
│   └── index.js          # Vercel serverless entry point
├── backend/
│   ├── server.js          # HTTP server (entry point)
│   ├── package.json       # Backend dependencies
│   ├── .env.example       # Environment template
│   └── src/
│       ├── config/        # Database, env, Redis
│       ├── controllers/   # Route handlers
│       ├── middleware/     # Auth, CORS, rate limit
│       ├── models/        # Data models (User, Order, Campaign, etc.)
│       ├── routes/        # API route definitions
│       ├── services/      # Business logic (28 services)
│       └── utils/         # HTTP helpers, router
├── frontend/
│   └── public/            # Static frontend (HTML/CSS/JS)
├── scripts/               # Dev scripts (validate, QA, serve)
├── tests/                 # Frontend tests
├── vercel.json            # Vercel deployment config
├── package.json           # Root package.json
└── .github/workflows/     # GitHub Actions CI
```

---

## API Endpoints (40+ endpoints)

### Health
- `GET /api/health` — Health check
- `GET /api/status` — Service status

### Auth
- `POST /api/auth/signup` — Create account
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh token
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user

### Neural Scan
- `POST /api/scan` — Scan product
- `GET /api/scan/history` — Scan history

### Reality Studio
- `GET /api/studio/environments` — List environments
- `POST /api/studio/export` — Export ad
- `POST /api/studio/voiceover` — Generate voiceover

### Ghost Users
- `POST /api/ghost/simulate` — Run simulation
- `POST /api/ghost/personas` — Generate personas
- `POST /api/ghost/heatmap` — Generate heatmap
- `POST /api/ghost/metrics` — Predictive metrics

### Platform Alchemy
- `GET /api/platform/adapt` — Adapt for platform
- `GET /api/platform/adapt/all` — Adapt for all
- `POST /api/platform/captions` — Generate captions
- `GET /api/platform/hashtags` — Generate hashtags
- `GET /api/platform/schedule` — Posting schedule
- `POST /api/platform/brief` — Full content brief

### Live Autopilot
- `GET /api/autopilot/campaigns` — Monitor campaigns
- `POST /api/autopilot/campaigns` — Create campaign
- `POST /api/autopilot/reallocate` — Auto-reallocate
- `POST /api/autopilot/optimize` — Optimize budget
- `GET /api/autopilot/anomalies` — Detect anomalies
- `GET /api/autopilot/report` — Performance report

### Phantom Checkout
- `POST /api/checkout` — Process payment
- `GET /api/checkout/orders` — List orders
- `POST /api/checkout/refund` — Process refund
- `POST /api/checkout/dispute` — Simulate dispute
- `GET /api/checkout/gateways` — Supported gateways
- `POST /api/checkout/validate` — Validate card

---

## Environment Modes

### Mock Mode (Default)
```bash
MOCK_DATA=true
```
All services return realistic mock data. No external API calls. Works immediately.

### Live Mode
```bash
MOCK_DATA=false
OPENAI_API_KEY=sk-...
```
Uses real AI services. Requires API keys. Set keys in Vercel env vars.

---

## Tech Stack

- **Runtime:** Node.js 18+
- **Server:** Node.js HTTP (zero dependencies)
- **Database:** PostgreSQL (optional, falls back to in-memory)
- **Auth:** JWT + bcrypt
- **AI:** OpenAI GPT-4, Stability AI, ElevenLabs
- **Scraping:** Cheerio + Axios
- **Frontend:** Vanilla JS SPA
- **Deployment:** Vercel (serverless)
- **CI/CD:** GitHub Actions
