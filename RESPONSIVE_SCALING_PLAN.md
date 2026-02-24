# Responsive Scaling — All 3 Portals

## Background

All three portals (Admin, Passenger, TTE) currently use **breakpoint-based** media queries at `768px`, `480px`, and `360px` for responsiveness. This creates abrupt jumps on resize. The user wants **fluid, zoom-like scaling** and fixes for the "three dots" menu wrapping on small screens.

### Root Causes Identified

| Portal | Issue | File(s) |
|---|---|---|
| Admin | `.app-header` uses `flex-wrap: wrap` — the `⋮` menu drops below header text on small screens | `App.css:46–57` |
| Admin | `.landing-header` has similar long title pushing menu | `LandingPage.css:37–47`, `LandingPage.tsx:234` |
| Admin | `.menu-button` uses fixed `36px` dimensions | `UserMenu.css` |
| Passenger | MUI `Tabs` always show labels — overflow on mobile instead of scrolling | `App.tsx:~220` |
| TTE | Toolbar text (`Welcome, {user}`) overflows alongside `⋮` button | `App.tsx:~300` |
| All | `responsive-global.css` uses stepped `font-size` values (`14px`/`13px`/`12px`) instead of fluid `clamp()` | Each portal's `responsive-global.css` |

---

## Proposed Changes

### Phase 1 — Fluid Viewport Scaling CSS

#### [NEW] `frontend/src/styles/viewport-scale.css`
#### [NEW] `passenger-portal/src/styles/viewport-scale.css`
#### [NEW] `tte-portal/src/styles/viewport-scale.css`

Each file applies the same fluid scaling strategy:

```css
/* Root font-size: smoothly scales from 12px at 320px → 16px at 1200px */
html {
  font-size: clamp(0.75rem, 0.625rem + 0.625vw, 1rem);
}

/* Headings scale fluidly */
h1 { font-size: clamp(1.25rem, 1rem + 1.25vw, 1.75rem); }
h2 { font-size: clamp(1.1rem, 0.9rem + 0.8vw, 1.4rem); }
h3 { font-size: clamp(1rem, 0.85rem + 0.6vw, 1.2rem); }

/* Containers get fluid padding */
.app-content, .landing-page, .page, [class*="-page"] {
  padding: clamp(8px, 1vw + 4px, 24px);
}
```

#### [MODIFY] `main.tsx` (all 3 portals)

Add `import './styles/viewport-scale.css';` after the existing `responsive-global.css` import in each portal.

---

### Phase 2 — Fix Header / Three-Dots Menu

#### [MODIFY] `frontend/src/App.css`

- Change `.app-header` from `flex-wrap: wrap` → `flex-wrap: nowrap`
- Add `overflow: hidden` and `min-width: 0` to `.header-content` so long text truncates instead of pushing the menu button
- Add mobile media query to collapse `h2` and `.route` into single-line truncated text

#### [MODIFY] `frontend/src/UserMenu.css`

- Change `.menu-button` from fixed `36px` → `clamp(28px, 3vw, 36px)` for width/height
- Change `font-size: 20px` → `clamp(16px, 1.5vw + 8px, 22px)`
- Add `flex-shrink: 0` to `.user-menu` so it never collapses

#### [MODIFY] `frontend/src/styles/pages/LandingPage.css`

- Add `flex-wrap: nowrap` to `.landing-header`
- Add `min-width: 0` + `overflow: hidden` + `text-overflow: ellipsis` to `.landing-header h1`
- Add `flex-shrink: 0` to `.user-menu`
- Add mobile media query for `.trains-table-header` and `.train-card` to stack or scroll at `≤768px`

#### [MODIFY] `passenger-portal/src/App.tsx`

- Add `variant="scrollable"` and `scrollButtons="auto"` to the MUI `<Tabs>` on mobile (matching TTE portal's existing pattern)
- Add `sx={{ minWidth: 0 }}` to the Typography title to allow flex truncation

#### [MODIFY] `tte-portal/src/App.tsx`

- Add `sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}` to the welcome `Typography`
- Add `flexShrink: 0` to the `.user-menu` wrapper `div`

#### [MODIFY] `tte-portal/src/UserMenu.css`

- Apply same fluid sizing as Admin portal's `UserMenu.css`

---

### Phase 3 — Content Scaling

#### [MODIFY] `frontend/src/styles/pages/LandingPage.css`

- Add responsive grid fallback for `.trains-table-header` and `.train-card` at `≤768px` to switch to a card-style stacked layout instead of a 6-column grid that overflows

---

## Important Notes

> **IMPORTANT:** The `viewport-scale.css` fluid root `font-size` will slightly change text sizes at all viewport widths (the `clamp()` range maps `320px` → `12px` to `1200px` → `16px`). This ensures a smooth zoom-like feel but means text at desktop widths stays at `16px` (standard browser default). Elements using `rem` units will scale automatically; elements using fixed `px` values won't be affected by the root scaling.

> **NOTE:** The existing `responsive-global.css` breakpoint-based rules remain untouched — the new `viewport-scale.css` layers on top. No existing behavior is removed.

---

## Verification Plan

### Existing Playwright E2E Tests

The project has Playwright tests in `frontend/e2e/` with mobile viewport projects (`Pixel 5`, `iPhone 12`) already configured in `playwright.config.ts`.

```bash
cd frontend
npx playwright test --project="Mobile Chrome" --reporter=list
```

### Manual Browser Testing

After implementation, resize the browser window through these widths and check:

| Width | What to Check |
|---|---|
| 1200px+ | Full desktop — everything at normal size |
| 1024px | Tablet — text scales down slightly, headers stay single line |
| 768px | Small tablet — ⋮ menu stays on same line as heading, tabs scroll |
| 480px | Mobile — everything scales proportionally, no overflow |
| 360px | Small mobile — text readable, menu accessible, no horizontal scroll |

**For each portal, specifically verify:**
1. The ⋮ menu button stays on the **same line** as the header title at all widths
2. No horizontal scrollbar appears on the page body
3. Text is readable and not clipped at `360px`
4. Tabs are scrollable on mobile (Passenger + TTE portals)
