# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- **Backend REST API** — zero-dependency Node.js server in `backend/`
  (CORS, JWT-style token auth, six feature services, controllers, mini router).
- **Backend integration tests** — `backend/tests/api.test.js` (15 tests),
  wired into root `npm test` and `npm run validate`.
- Root `npm run server` / `npm run start:backend` / `npm run test:backend` scripts.

## [1.0.0] - 2026-08-15
### Added
- **Frontend foundation** — 8 HTML pages under `frontend/public/` sharing one design system.
- **Design system** — `main.css` (components), `themes.css` (dark/light via CSS variables),
  `animations.css` (12 reusable animations), `responsive.css` (breakpoints, print, touch).
- **Theme engine** — `themes.js` with `localStorage` persistence and
  `prefers-color-scheme` detection (`window.OmniTheme`).
- **Core JS** — `config.js`, `store.js`, `router.js` (hash SPA), `app.js` orchestrator,
  and shared `utils/helpers.js`.
- **Modules** — `neural-scan.js`, `reality-studio.js`, `ghost-users.js`,
  `platform-alchemy.js`, `live-autopilot.js`, `phantom-checkout.js` (all mock-data capable).
- **Per-page controllers** — `frontend/src/js/pages/*.js` wiring each view to its modules.
- **Tooling** — dependency-free static server (`scripts/serve.js`), syntax/smoke validation
  (`scripts/validate.js`), and a `node:test` unit suite (`tests/`).
- **Docs & meta** — `README.md`, `CONTRIBUTING.md`, `.env.example`, `LICENSE` (MIT).