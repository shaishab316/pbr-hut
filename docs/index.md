---
layout: home

hero:
  name: PBR Hut Backend
  text: Documentation
  tagline: Restaurant ordering API — architecture, auth flows, and developer guides
  actions:
    - theme: brand
      text: Architecture
      link: /architecture
    - theme: alt
      text: Auth module
      link: /auth/auth

features:
  - title: Markdown-first
    details: Write and edit files under docs/ — they become pages automatically when you build or run the dev server.
  - title: GitBook-style UI
    details: Sidebar navigation, local search, and mobile-friendly layout via VitePress.
  - title: GitHub Pages
    details: Push to the default branch — CI builds the site and deploys to GitHub Pages.
---

## Adding pages

1. Add a `.md` file anywhere under `docs/` (for example `docs/api/orders.md`).
2. Register it in `docs/.vitepress/config.ts` under `themeConfig.nav` and `themeConfig.sidebar` so it appears in the menu.
3. Run `pnpm docs:dev` to preview locally.

## Local preview

```bash
pnpm docs:dev
```

Build a production bundle (same as CI):

```bash
pnpm docs:build
```

Optional — match GitHub Pages URL (replace `your-repo`):

```bash
DOCS_BASE=/your-repo/ pnpm docs:build
```
