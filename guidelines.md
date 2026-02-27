# Elicomp Site Guidelines

## Purpose
This file defines implementation rules for the Elicomp catalog site (`elicomp.ru`) so UI, content, and code stay consistent.

## Product Scope
- Build and maintain only catalog page (`index.html`) and product page (`product.html`).
- No homepage or extra marketing pages unless explicitly requested.

## Tech Stack
- Keep the project as static frontend: `HTML + CSS + vanilla JavaScript`.
- No framework migration (React/Vue/etc.) without explicit approval.
- No backend dependency required for basic rendering.

## Design and Layout
- Prefer desktop-first parity with approved Figma frames, then adapt to tablet/mobile.
- Maintain clean responsive behavior: no horizontal scroll, readable typography, consistent spacing between breakpoints.
- Use `flex`/`grid` by default; use absolute positioning only where design requires exact overlay.
- Keep header, card, and filter spacing visually stable across `index.html` and `product.html`.

## Figma-to-Code Rules
- For Figma tasks, follow strict flow: get design context -> get screenshot -> implement -> visual compare and micro-adjust.
- Aim for 1:1 visual parity for dimensions, spacing, typography (size/weight/line-height), and colors.
- Use project styles and existing classes where possible; avoid duplicate style blocks.

## Content Rules
- Do not include references/links to competitor or external source websites in visible UI unless explicitly requested.
- Keep product and category naming clear and neutral.
- Avoid placeholder marketing text in production pages.

## CSS Rules
- Keep CSS organized by section: header, layout, filters, listing cards, product page, media queries.
- Reuse existing tokens in `:root` where possible.
- Add new variables before introducing hardcoded repeated values.
- Keep mobile adjustments explicit in media queries (`1020px`, `720px` currently used).

## JavaScript Rules
- Keep scripts modular by page responsibility: `app.js` for catalog logic and `product.js` for product page logic.
- Do not mix rendering logic with unrelated utility code.
- Preserve filter/sort URL-state behavior if present.

## Data Rules
- Primary feed lives in `data/catalog-feed.json`.
- Keep structure stable for compatibility with current rendering and filters.
- If schema changes are needed, update rendering and filters in the same change.

## Git Workflow
- Recommended branch model for solo development:
- `main` = production-ready.
- `dev` = integration/testing.
- `feature/*` = short-lived task branches.
- For each change: implement locally, verify in browser, commit with clear message, then push (auto-deploy should run).

## Pre-Deploy Checklist
- `index.html` and `product.html` render without console errors.
- Filters, sorting, and product listing work.
- Header and key spacing look correct on desktop and mobile widths.
- No broken asset paths.
- No accidental external links or debug text.
