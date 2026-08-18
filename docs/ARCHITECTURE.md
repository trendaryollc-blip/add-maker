# OMNI — Frontend Architecture

This document describes how the OMNI frontend is structured and how the
pieces fit together. It is written for developers contributing to the project.

## 1. High-level flow

```
HTML page (public/*.html)
   └─ pages/*.js        (controller: binds user actions → modules)
        └─ modules/*.js (domain logic: returns data / promises)
             └─ utils, config, store   (shared services)
```

- **Views** (`frontend/public/*.html`) hold markup only. They include the CSS
  design system and load scripts in a strict order (see below).
- **Page controllers** (`frontend/src/js/pages/*.js`) attach behaviour to a
  page's elements. One file per page, initialised on `DOMContentLoaded`.
- **Feature modules** (`frontend/src/js/modules/*.js`) contain pure(ish)
  business logic. They never touch the DOM. They are mock-data capable and
  exposed as globals (`window.NeuralScan`, `window.GhostUsers`, …).

## 2. Script load order (important)

HTML pages load scripts in this exact order at the end of `<body>`:

1. `config.js`       — global `OMNI_CONFIG`
2. `themes.js`       — `OmniTheme` (also sets theme before first paint)
3. `store.js`        — `OMNI_STORE` (reactive, persisted)
4. `utils/helpers.js`- `OMNI_UTILS`
5. `modules/*.js`    — the six feature modules (only those the page needs)
6. `router.js`       — `OMNI_ROUTER` (hash SPA)
7. `app.js`          — boots everything, exposes `window.App` / `window.OMNI`
8. `pages/<page>.js` — this page's controller

`app.js` should load after the modules so it can collect them into
`OMNI.modules`.

## 3. Modules and their public APIs

| Module | Global | Key functions |
|---|---|---|
| Neural Scan | `window.NeuralScan` | `scanProduct(url)`, `extractEmotionalTriggers(reviews)`, `analyzeCompetitors(product)`, `generateRecommendations(data)` |
| Reality Studio | `window.RealityStudio` | `initThreeJS(container)`, `generateEnvironment(type)`, `animateProduct()`, `exportAd(format)`, `generateVoiceover(text, style)` |
| Ghost Users | `window.GhostUsers` | `generatePersonas(count)`, `simulateReactions(adData)`, `analyzeEmotionalJourney()`, `calculatePerformanceMetrics()` |
| Platform Alchemy | `window.PlatformAlchemy` | `adaptForPlatform(ad, platform)`, `generateCaptions(ad, platform)`, `generateHashtags(product, platform)`, `optimizePostingTime(platform)` |
| Live Autopilot | `window.LiveAutopilot` | `monitorCampaigns()`, `detectAnomalies(data)`, `reallocateBudget(campaigns)`, `generateNewVariant(ad)`, `generateReport()` |
| Phantom Checkout | `window.PhantomCheckout` | `processPayment(details)`, `validateCard(number)`, `generateOrderId()`, `sendConfirmation(email, order)` |

## 4. Global services

- **`OMNI_CONFIG`** — readonly config: API-key placeholders, environment,
  app settings, feature flags, platform profiles. See `README` → Configuration.
- **`OMNI_STORE`** — a tiny reactive store. `get/set/update/remove` plus
  `on/emit` for pub/sub. A subset of keys persists to `localStorage`.
- **`OMNI_ROUTER`** — hash router. `register(routes)`, `navigate(path)`,
  `handle()`, `start()`. Highlights active nav links automatically.
- **`window.App`** — orchestrator exposing `app.config`, `app.store`,
  `app.router`, `app.session`, `app.modules`, `app.toast()`.

## 5. Theming

`themes.css` defines CSS custom properties for dark (default) and light modes.
`themes.js` sets the `theme-dark`/`theme-light` class on `<html>` based on
`localStorage` (or `prefers-color-scheme` on first visit). Every component in
`main.css`, `animations.css` and `responsive.css` reads these variables, so
themes switch by changing one class.

## 6. Adding a new page

1. Add `frontend/public/<name>.html` using the shared design-system classes
   and copy the topbar/scripts pattern from an existing page.
2. Create `frontend/src/js/pages/<name>.js` (wrap in an IIFE, guard element
   lookups, init on `DOMContentLoaded`).
3. Register a route in `app.js` → `registerRoutes()`.
4. If the page introduces new business logic, add a module under
   `frontend/src/js/modules/` and cover it in `tests/core.test.js`.

## 7. Running checks

```bash
npm run validate   # structural + syntax checks (frontend + backend)
npm test           # frontend unit tests + backend integration tests
```

## 8. Backend (REST API)

The `backend/` folder is a **zero-dependency Node.js HTTP server** that mirrors
the frontend modules as REST endpoints. It follows the same layered pattern:

```
routes (src/routes/index.js)
   └─ controllers (src/controllers/*)   → parse request, call service
        └─ services (src/services/*)     → business logic (mock-first)
             ├─ middleware (auth, cors)
             └─ config (env)
```

- **Auth**: `src/middleware/auth.js` issues HMAC-SHA256-signed tokens
  (JWT-style). Autopilot and checkout routes are protected via `requireAuth`.
- **Mini router**: `src/utils/router.js` matches `method + path` (with `:param`
  support) and runs a chain of handlers until the response ends — this is the
  middleware mechanism.
- **Tests**: `backend/tests/api.test.js` boots the real server on an ephemeral
  port and asserts each endpoint.
- **Run**: `npm run server` → `http://localhost:3001/api`.