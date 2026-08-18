# Contributing to OMNI

Thank you for helping build the Autonomous Ad Engine 🚀. Please take a moment
to read these guidelines so we can collaborate smoothly.

## Code of conduct

Be kind, respectful, and constructive. Harassment or discrimination of any kind
is not tolerated in issues, PRs, or discussions.

## How to contribute

1. **Fork** the repository and clone it locally.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Make focused, well-documented changes.
4. Add or update tests under `tests/` for any logic you change.
5. Validate locally before submitting:
   ```bash
   npm run validate   # syntax + smoke checks on all JS
   npm test           # runs the node:test unit suite
   ```
6. Push and open a Pull Request describing **what** you changed and **why**.

## What we look for

- **Consistency** — follow existing naming and module patterns (`window.X` UMD-style
  modules that expose functions on a single namespace).
- **No framework lock-in** — this project is intentionally Vanilla JS. Please keep
  the frontend dependency-free.
- **Mock-first** — new features should fall back to realistic mock data when no API
  key is configured (`config.js` / `OMNI_CONFIG.isConfigured()`).
- **JSDoc** — document public functions and the shape of returned objects.
- **Accessibility** — semantic HTML, labels on inputs, and `prefers-reduced-motion`
  respect. Use `main.css` utility/component classes rather than page-specific CSS
  unless truly needed.

## Coding style

- 2-space indentation, single quotes, semicolons.
- Prefer named helper functions over deep nesting.
- Keep modules focused; extract shared utilities into `utils/`.

## Commit messages

Use short, imperative summaries. Example: `feat(autopilot): reallocate stalled budget automatically`.

## Licensing

By contributing, you agree that your contributions are licensed under the MIT
License (see `LICENSE`).