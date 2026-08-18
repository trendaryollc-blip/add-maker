# OMNI — CSS Framework Reference

OMNI uses **one shared design system** across every page. CSS is split across
four files (loaded in this order in each `<head>`):

| File | Purpose |
|---|---|
| `main.css` | Master framework: reset, layout, components, utilities |
| `themes.css` | CSS custom-property tokens for dark (default) & light modes |
| `animations.css` | 12 reusable animation classes |
| `responsive.css` | Media queries: tablet, mobile, landscape, print, touch |

The whole system is token-driven: no hard-coded colors in components — every
rule reads a CSS variable defined in `themes.css`. This is what lets the app
re-theme by toggling a single class on `<html>`.

## Design tokens (`themes.css`)

Dark mode (default, `html.theme-dark` or plain `:root`):

| Token | Value |
|---|---|
| `--bg-primary` | `#0a0a0f` |
| `--bg-secondary` | `#14141e` |
| `--accent` | `#00d4ff` (neon blue) |
| `--accent-2` | `#7b2ffc` (neon purple) |
| `--accent-3` | `#ff2d95` (neon pink) |
| `--success` | `#00ff88` |
| `--text-primary` | `#e0e0ff` |
| `--text-secondary` | `#8080a0` |

Light mode (`html.theme-light`) maps the same tokens to softer, muted
equivalents (no neon glows, soft shadows). Additional helper tokens include
`--border`, `--shadow`, `--glow`, `--gradient-brand`, `--glass-bg`, etc.

Toggling themes is handled by `themes.js` → `window.OmniTheme.toggle()`.
Every `<button class="theme-toggle" data-theme-toggle>` in the topbar is
automatically wired up.

## Components (`main.css`)

- **Layout** — `.topbar`, `.nav`, `.container`, `.section`, `.grid`,
  `.grid-cols-*`, `.col-span-*`
- **Buttons** — `.btn`, `.btn-primary`, `.btn-accent`, `.btn-ghost`,
  `.btn-sm`, `.btn-lg`, `.btn-block`
- **Cards** — `.card`, `.card-glass`, `.card-hover`, `.card-header`,
  `.card-title`
- **Forms** — `.form-group`, `.form-label`, `.form-control`, `.input-group`,
  `.checkbox`, `.toggle`
- **Data** — `.table-wrap`, `table`, `.badge`, `.badge-accent`,
  `.badge-success`, `.alert`, `.progress`, `.progress-bar`
- **Overlays** — `.modal-overlay`, `.modal`, `.toast-container`, `.toast`
- **Misc** — `.metric`, `.code-block`, `.avatar`, `.divider`

## Animations (`animations.css`)

Apply these classes to animate elements:

| Class | Effect |
|---|---|
| `.animate-particle` | floating particles |
| `.animate-glitch` | glitch text (uses `data-text`) |
| `.animate-neon-pulse` | pulsing neon border |
| `.flip-card` / `.animate-flip-card` | 3D flip card |
| `.animate-slide-left/right/up` | slide-in |
| `.animate-bounce` | bounce entrance |
| `.wave-text` | per-letter wave (letters in `<span>`) |
| `.animate-gradient-shift` | animated gradient background |
| `.typewriter` | typewriter caret |
| `.loading-bar` / `.animate-shimmer` | loading bar / shimmer sweep |
| `.animate-hover-glow` | hover scale + glow |
| `.cube-scene` / `.cube` | rotating 3D cube |

All animations respect `prefers-reduced-motion`.

## Responsive (`responsive.css`)

- **Tablet** `768–1024px`
- **Mobile** `480–768px`
- **Small mobile** `< 480px`
- **Landscape** small heights
- **Print** — strips nav/modals/toasts, light layout
- **Touch** — hover-less optimizations

## Using the system

Always prefer shared classes over page-specific CSS. Only add a `<style>`
block in a page when the rule is genuinely unique to that page (hero layouts,
page-specific grids, etc.). Keep everything else in `main.css`.