# 🚀 OMNI — The Autonomous Ad Engine

### *"From Product to Profit in 60 Seconds"*

![OMNI Banner](https://via.placeholder.com/1200x300/0a0a0f/00d4ff?text=OMNI+-+The+Autonomous+Ad+Engine)

OMNI understands your product, creates an immersive 4D ad, tests it on AI
shoppers, and optimizes live campaigns — **autonomously**.

This repository is the **frontend implementation** of the OMNI platform. It is a
dependency-free Vanilla JS SPA: open it, serve it, or run the bundled dev
server and it works against realistic mock data (drop in real API keys later).

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Development](#development)
- [Configuration](#configuration)
- [Testing & Validation](#testing--validation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 🌟 Overview

**OMNI** is the world's first **Autonomous Ad Engine** — it thinks, creates,
optimizes, and executes advertising campaigns without human intervention. Unlike
tools that only generate visuals, OMNI is a complete pipeline:

- 🧠 **Understand** your product better than you do
- 🎬 **Create** immersive 4D ads that captivate audiences
- 👻 **Test** on 500 AI ghost users before spending a dollar
- 🤖 **Optimize** campaigns in real time while you sleep
- 🛒 **Convert** viewers into buyers without leaving the ad

> **Note:** this repo contains the working frontend with simulated data.
> Live AI/ads/payments integrations are wired via `config.js` feature flags and
> planned backend services — see [Configuration](#configuration).

---

## 🎯 Vision

**"Democratizing professional advertising for every e-commerce brand."**

Every business, regardless of size or budget, deserves access to
Hollywood-grade advertising technology. OMNI puts a full ad agency into a
single, autonomous platform.

---

## ✨ Features

### 🧠 Neural Product Scan
Paste any product URL — OMNI extracts its emotional DNA, competitive landscape,
and winning marketing angles.

### 🌌 4D Reality Studio
Build photorealistic 3D product ads in a virtual world: environments, lighting,
animations, voice-overs and multi-platform export.

### 👻 Hive-Mind Ghost Users
Simulate 500 AI personas reacting to your ad. Preview CTR, CPC and conversion
rate before you spend a cent.

### 🤖 Live Autopilot Engine
Monitor live campaign status, auto-reallocate budget away from underperformers,
generate fresh variants and produce daily/weekly reports.

### 🛒 Phantom Checkout
A frictionless, in-ad checkout with real card validation and order receipts.

---

## 🛠️ Tech Stack

**Frontend (this repo)**
- HTML5 semantic markup
- CSS3 custom properties, animations, responsive media queries
- Vanilla JavaScript — no runtime frameworks or build step
- Optional Three.js (CDN) with an automatic canvas fallback
- Canvas API for the lightweight 3D studio mode

**Backend (this repo) — `backend/`**
- Zero-dependency Node.js REST API: HTTP mini-router, CORS, JWT-style signed tokens
- Six feature services mirroring the frontend modules (product analysis, ghost simulation, video, platform, autopilot, checkout)
- Integration-tested end-to-end via `node:test`

**Planned backend additions** (per `BLUEPRINT.md`)
- PostgreSQL + MongoDB + Redis, real JWT/refresh auth, live AI providers, Stripe & ad-platform APIs

---

## 📁 Project Structure

The project intentionally keeps the **view layer** (`public/`) separate from the
**logic layer** (`src/js/`), and pushes business logic into feature modules so
pages stay thin. A senior-level pattern: *views → page controllers → modules →
shared services*.

```text
.
├── README.md                  # You are here
├── BLUEPRINT.md               # Feature source of truth (this project's spec)
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                    # MIT
├── package.json               # npm scripts (serve / test / validate)
├── .env.example               # Env var template (copy to .env)
├── .gitignore
│
├── frontend/
│   ├── public/                # All 8 HTML pages (markup only)
│   │   ├── index.html         #   Dashboard (mission control)
│   │   ├── login.html         #   Authentication
│   │   ├── neural-scan.html   #   Product analysis
│   │   ├── reality-studio.html#   4D ad creation
│   │   ├── ghost-users.html   #   AI audience simulation
│   │   ├── autopilot.html     #   Campaign management
│   │   ├── analytics.html     #   Performance analytics
│   │   └── checkout.html      #   Phantom checkout
│   │
│   └── src/
│       ├── css/
│       │   ├── main.css       # Master framework (tokens, components, utilities)
│       │   ├── themes.css     # Dark/Light design tokens (CSS variables)
│       │   ├── animations.css # 12 reusable animations
│       │   └── responsive.css # Breakpoints, print, touch
│       │
│       └── js/
│           ├── config.js      # OMNI_CONFIG (keys, env, settings, flags)
│           ├── themes.js      # OmniTheme (toggle + persistence)
│           ├── store.js       # OMNI_STORE (reactive, persisted)
│           ├── router.js      # OMNI_ROUTER (hash SPA)
│           ├── app.js         # Orchestrator → window.App / window.OMNI
│           ├── modules/        # Six feature modules (pure logic)
│           ├── pages/          # One controller per HTML page
│           └── utils/helpers.js # Shared utilities
│
├── backend/                     # REST API (zero-dependency Node.js)
│   ├── server.js                #   HTTP entry point
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── config/env.js        #   env + safe defaults
│   │   ├── middleware/          #   cors.js, auth.js (JWT-style tokens)
│   │   ├── services/            #   the six feature services
│   │   ├── controllers/         #   HTTP handlers per feature area
│   │   ├── routes/index.js      #   router assembly
│   │   └── utils/               #   http helpers + mini router
│   └── tests/api.test.js        #   integration tests
│
├── scripts/
│   ├── serve.js               # Zero-dependency static dev server
│   └── validate.js            # Structural + syntax checks
│
├── tests/
│   └── core.test.js           # Frontend unit tests (node:test)
│
└── docs/
    ├── ARCHITECTURE.md        # How the frontend fits together
    └── CSS_FRAMEWORK.md       # Design-system reference
```

---

## 💻 Quick Start

**Prerequisites:** a modern browser, and Node.js ≥ 16 if you want the dev
server / tests.

### Option A — Dev server (recommended, no installs)

```bash
npm start
# OMNI dev server
# App:      http://localhost:3000/
```

> `npm start` runs the dependency-free server in `scripts/serve.js`. There is
> nothing to `npm install`.

### Option B — Open the files directly

Open `frontend/public/index.html` in a browser (all assets resolve via relative
paths, so `file://` works for most pages).

### Option C — VS Code Live Server

1. Install the **Live Server** extension.
2. Right-click the **`frontend`** folder → *Open with Live Server* (the web root must
   be `frontend`, not `frontend/public`, so the `../src/...` references resolve).
3. Open `http://localhost:5500/public/index.html`.

> The Reality Studio page loads Three.js from a CDN in 3D mode. Offline it
> automatically falls back to a Canvas-based studio (no broken experience).

---

## 🎮 Usage

1. **Login** — open `login.html`, submit the demo form (any email shaped input).
2. **Dashboard** (`index.html`) — hero overview; the four-pillar pipeline.
3. **Neural Scan** (`neural-scan.html`) — paste any product URL (or leave blank
   for a sample), hit **Scan**. OMNI returns an emotional profile, target
   audience, competitor table and recommended hooks.
4. **Reality Studio** (`reality-studio.html`) — choose an environment, tweak a
   voice-over, animate the product and export for TikTok / IG / Facebook /
   YouTube / GIF.
5. **Ghost Users** (`ghost-users.html`) — pick a pool size & ad length, then
   **Run simulation**. Watch predicted CTR/CPC, the emotional journey and the
   persona reaction grid.
6. **Autopilot** (`autopilot.html`) — enable the master switch to see live
   campaign polling; reallocate budget, generate variants and produce reports.
7. **Analytics** (`analytics.html`) — weekly revenue bars, a performance
   heatmap, platform ROAS and optimal posting times.
8. **Checkout** (`checkout.html`) — enter any valid Luhn card
   (`4242 4242 4242 4242` works) to watch validation, payment, order id and
   receipt simulation end-to-end.

> Every page has a **theme toggle** (☀/☾) that persists your choice across
> visits and honors your OS preference on first load.

---

## 🛠️ Development

### npm scripts

| Command | Description |
|---|---|
| `npm start` / `npm run serve` | Run the zero-dependency frontend dev server on `:3000` |
| `npm run server` / `npm run start:backend` | Run the OMNI REST API on `:3001` (from `backend/`) |
| `npm test` | Run **all** tests: frontend unit + backend integration |
| `npm run test:backend` | Run only the backend integration tests |
| `npm run validate` | Structural + `node --check` syntax validation across all JS |

### Where things live

- **Page logic** → `frontend/src/js/pages/<page>.js` (one controller per page)
- **Business logic** → `frontend/src/js/modules/<module>.js` (six modules)
- **Shared services** → `config.js`, `store.js`, `router.js`, `themes.js`,
  `utils/helpers.js`
- **Routing** → registered in `app.js` → `registerRoutes()`

See `docs/ARCHITECTURE.md` for the load order, module APIs and how to add pages.

### Adding a feature

1. Add pure logic to the relevant module (and its JSDoc + a test).
2. Call it from the page controller and render the result.
3. Run `npm run validate` and `npm test`.

---

## 🔌 Backend API

The `backend/` folder is a zero-dependency Node.js REST API (no `npm install`
needed). Boot it with `npm run server`, then hit `http://localhost:3001/api`.

- **Auth** — `POST /api/auth/login { email }` returns a signed token
  (`Authorization: Bearer <token>`). Autopilot & checkout routes require it.
- **Health** — `GET /api/health`
- **Neural Scan** — `POST /api/scan { url }`
- **Reality Studio** — `GET /api/studio/environments`,
  `POST /api/studio/environment { type }`, `POST /api/studio/export { format }`,
  `POST /api/studio/voiceover { text, style }`
- **Ghost Users** — `POST /api/ghost/simulate { ghostCount, duration }`
- **Platform Alchemy** — `GET /api/platform/adapt?platform=`,
  `POST /api/platform/captions`, `GET /api/platform/hashtags?product=&platform=`,
  `GET /api/platform/schedule?platform=`
- **Autopilot** 🔒 — `GET /api/autopilot/campaigns`,
  `POST /api/autopilot/reallocate`, `GET /api/autopilot/report`
- **Checkout** 🔒 — `POST /api/checkout { cardNumber, expMonth, expYear, amount, ... }`

All routes return JSON envelopes `{ ...data }` / `{ error: true, message }`.
Configuration lives in `backend/src/config/env.js` (override via
`backend/.env`, template in `backend/.env.example`).

---

## ⚙️ Configuration

All runtime configuration lives in **`frontend/src/js/config.js`**
(`window.OMNI_CONFIG`), organized as:

- `API_KEYS.*` — **placeholder** secrets. Never ship real keys. In production
  these are injected server-side (see `.env.example`).
- `ENV` — detected environment (development/staging/production), debug flag,
  and whether mock mode is enabled.
- `APP` — defaults for platform, currency, budget, locale, polling interval.
- `FEATURES.*` — feature flags; toggle individual modules on/off.
- `PLATFORMS.*` — per-platform specs (dimensions, ratio, tone, CTA).
- `TIERS` — pricing/business tiers.

Placeholders are safe to use: `OMNI_CONFIG.isConfigured('OPENAI')` returns
`false` until a real key is set, and modules fall back to realistic mock data.

---

## 🧪 Testing & Validation

```bash
npm run validate   # 1. structure + syntax (node --check) across all JS
npm test           # 2. all behavioral tests (frontend unit + backend integration)
```

- `tests/core.test.js` — frontend unit tests (Neural Scan pipeline, Ghost-User
  simulation bounds, platform specs, Luhn card validation, autopilot reports).
- `backend/tests/api.test.js` — boots the real API and exercises every
  endpoint, including auth, protected routes and payment flow.

Add a test whenever you touch logic.

---

## 🗺️ Roadmap

**Phase 1 — Foundation** ✅ *Completed*
- Project structure, HTML for all pages, design system, Vanilla JS core,
  mock interactions, navigation/routing.

**Phase 2 — Neural Scan** 🔄 *In progress*
- E-commerce API connections, review scraping, competitor analysis, real AI.

**Phases 3–7** ⏳ *Upcoming*
- Reality Studio (Three.js depth, physics, video gen)
- Ghost Users (real persona AI, tracking, prediction)
- Platform Alchemy (per-platform adaptation, audio, posting)
- Live Autopilot (real campaign/API management)
- Phantom Checkout (real payments, inventory, order tracking)

**Phase 8 — Integration & polish**
- Connect modules, mobile app, team collaboration, production deployment.

---

## 🤝 Contributing

We welcome contributions! Please read **`CONTRIBUTING.md`** first, then:

1. **Report bugs** — open an issue with repro steps and screenshots.
2. **Suggest features** — open an issue explaining the value to OMNI.
3. **Submit pull requests** — fork → branch (`feat/your-feature`) → PR.
4. **Improve docs** — fix typos, add examples, translate.

Run `npm run validate` and `npm test` before opening a PR.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

## 📞 Contact

- 📧 Email: `team@omni.ai`
- 🐦 Twitter/X: [@omni_engine](https://twitter.com/omni_engine)
- 💼 LinkedIn: OMNI Autonomous Ad Engine
- 🌐 Website: https://omni.ai

## 🙏 Acknowledgments

All contributors and early adopters; the open-source community; our AI partners
(OpenAI, Anthropic, Stability AI, ElevenLabs); and every e-commerce brand daring
to innovate.

---

*"The future belongs to those who build it."*

Made with ❤️ by the OMNI Team