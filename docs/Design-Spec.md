# Grocify Frontend — Design Specification

A UI/UX redesign for a modern-classic look, a dark-by-default theme, Diwali
seasonal theming, a much wider category taxonomy, interactive 360° product
views and quick-access navigation buttons.

> **Nothing in this redesign touches the backend.** No server routes, no
> database fields and no payment code change. The frontend speaks to the
> same `/api/...` endpoints it already used.

## 1. Design principles

- **Modern classic.** Classic feel from a serif display font and antique
  gold accents; modern feel from generous spacing, soft gradients, pill
  buttons and subtle shadows.
- **Dark by default.** New visitors land on dark. Light exists, but only
  people who go to Settings see it. No link, badge or toggle to switch
  theme is visible anywhere on the main site.
- **No green.** The brand green is gone end-to-end. The new palette is
  deep indigo surfaces, antique gold accent, warm cream text and brick red
  for festive highlights.
- **The backend is the source of truth.** The frontend presents a rich
  category taxonomy on top of whatever categories the admin has stocked.

## 2. Color palette (CSS tokens)

Tokens live on `:root` in `src/styles/main.css`. A single
`data-theme="dark|light"` on `<html>` flips the palette.

### Dark (default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0e24` | Page background |
| `--bg-elev` | `#111538` | Navbar, footer, banners |
| `--surface` | `#171a44` | Cards, inputs, tables |
| `--surface-2` | `#1e2256` | Elevated card alternates, row hover |
| `--surface-3` | `#262a66` | Deepest surface |
| `--border` | `rgba(226,213,180,0.12)` | Hairlines |
| `--text` | `#ece4cf` | Body text |
| `--text-strong` | `#ffffff` | Headings |
| `--text-muted` | `#a8a5c6` | Secondary |
| `--primary` | `#d4a24c` | Antique gold accent and CTAs |
| `--primary-hover` | `#e8b865` | Hover state |
| `--primary-ink` | `#1a1326` | Text on gold |
| `--accent` | `#c04b4b` | Brick red for Diwali, warnings |
| `--danger` | `#ef6a7a` | Destructive buttons |
| `--success` | `#86d49b` | Confirmation text |

### Light (opt-in from Settings only)
Warm cream (`#faf6ec`) background, deeper gold primary (`#a0712e`),
darker red accent (`#a53333`), ink text (`#211634`).

## 3. Typography

- **Headings:** Playfair Display, 500–700 weight. Hero headline uses
  italic for the opening line.
- **Body:** Inter, 400–600 weight.
- Both fonts load from Google Fonts in `main.css`.

## 4. Component hierarchy

```
App
├── ThemeProvider           (theme + Diwali state, writes to <html>)
└── BrowserRouter
    ├── AuthProvider
    └── CartProvider
        ├── Navbar
        │   └── CategoryMegaMenu   (sections ▸ categories panel)
        ├── <main class="container">
        │   └── ErrorBoundary
        │       └── AppRoutes      (23+ pages)
        ├── BottomNav               (mobile-only: Home · Category · Order Again · Print)
        └── Footer                  (version · links · Settings link)
```

New shared components:
- `CategoryMegaMenu` — opens from the top-nav "Categories" button; left
  column lists sections, right column shows the active section's
  categories. Closes on outside click or Esc.
- `BottomNav` — fixed to the viewport on screens narrower than 760px.
- `DiwaliBanner` — top-of-page promo strip. Hidden when Diwali is off.
- `ProductViewer360` — drag-to-rotate 360° viewer (see §7).
- `Footer` — same contract as before; adds a "Settings" link.

## 5. Routes

| Path | Page | Notes |
|---|---|---|
| `/` | Home | Hero, Diwali strip, section tiles, live catalogue |
| `/categories` | Categories | All sections as tiles |
| `/s/:slug` | Section | A section's categories |
| `/c/:slug` | CategoryView | A display category's products |
| `/products`, `/products/:id` | ProductList, ProductDetail | Backend-backed list and detail; detail shows the 360° viewer for Electronics-style products |
| `/cart`, `/checkout`, `/payment/:id`, `/orders`, `/orders/:id/confirmation`, `/orders/:id/track`, `/notifications`, `/profile` | Unchanged flows | Same server calls as before |
| `/settings` | Settings | Only place to flip theme and Diwali on/off |
| `/admin/*` | All existing admin screens | Unchanged |

## 6. Category taxonomy

The display taxonomy lives in `src/data/categoryTaxonomy.js`. Each section
groups a long list of categories; each category can declare `match`
keywords. A `CategoryView` page looks up matching backend categories by
name and asks the server for their products. A category with no match
shows a tasteful "coming soon" state — nothing is sent to the server.

Sections shipped (20):

- Grocery & Kitchen · Snacks & Drinks · Beauty & Personal Care · Household
  & Essentials · Electronics · **Diwali Store** · Party · Gifting · Decor ·
  Kids · Fashion · Jewelry · Health & Pharma · Pet Care · Sports · Hobby ·
  Bookstore · Spiritual · Travel Store · Imported.

Individual categories cover everything requested in the brief, including
Beauty, Cosmetics, Skin, Hair, Baby Care, Feminine Hygiene, Bath & Body,
Instant Food, Drinks & Juice, Ice Cream, Chips, Sweets, Chocolates, Dry
Fruits, Vegetables & Fruits, Biscuits, Bakery, Pharma, Ayurveda, Sexual
Wellness (shown discreetly), Vitamins, Headphones/Phones/Watches/Speakers
(all with 3D viewer support), and many more.

## 7. Interactive 360° product viewer

File: `src/components/ProductViewer360.jsx`. Appears automatically on
product-detail pages for products whose name contains headphone, phone,
watch, speaker, camera or laptop.

**How it works today.** Six CSS 3D faces arranged 60° apart. Dragging
rotates the group around the Y axis (0.6° per pixel) with mouse OR touch.
A badge shows the current angle and the hint text says "Drag to rotate".
No external library is loaded.

**How to add real photography later.** The component accepts a `faces`
prop of six image URLs:

```jsx
<ProductViewer360
  label="Studio Headphones"
  faces={['/i/hp/0.jpg', '/i/hp/60.jpg', '/i/hp/120.jpg', '/i/hp/180.jpg', '/i/hp/240.jpg', '/i/hp/300.jpg']}
/>
```

A fuller frame-sequence (24 or 36 shots) can be added by expanding the
component to lerp between frames; the structure is ready for it. If
real 3D models (`.glb`) are ever supplied, swap the body for a `<model-viewer>`
element from Google's web component.

## 8. Diwali theme

- A thin, slowly moving string of coloured lights sits at the top of every
  page (`body::before`).
- Pages that invite shopping show a `DiwaliBanner` strip: a warm brick
  gradient, flickering diyas, title and quick chips for Gifting, Lights,
  Decor, Sweets and Dry Fruits.
- A dedicated `Diwali Store` section links to Diwali Gifting, Diwali
  Lights, Diwali Decor, Rangoli, Pooja Thali, Sweets and Dry Fruits.
- Turn off in Settings: this hides the light string and the banner. The
  Diwali Store section and the hero's "Diwali Store" button stay, since
  they are normal catalogue navigation.

## 9. Navigation buttons

The brief asked for Category, Home, Order Again and Print. On phones
(under 760px) all four sit in a bottom bar on every customer page. On
wider screens Home and Categories are in the top bar, and Order Again and
Print appear on the pages where they apply:

- **Home** — bottom nav + top navbar.
- **Category** — opens the mega menu (top navbar) or jumps to the all-sections page (bottom nav).
- **Order Again** — bottom nav button. Opens `/orders?reorder=1`, which
  scrolls to the most recent paid order and shows an "Order Again" button
  on each one. Order-Again adds every item of the past order into the
  cart via existing `/cart/items` calls — no new server route needed.
- **Print** — bottom nav button; also on the product detail page, the
  order history and the payment confirmation. Triggers `window.print()`;
  the print stylesheet hides navigation and renders a clean receipt.

## 10. Accessibility and performance

- The `color-scheme` property follows the chosen theme, so form controls
  and scrollbars match it. (The site deliberately ignores the device's
  light/dark preference: dark is the default for everyone.)
- All interactive elements keep visible focus outlines (`outline: 2px solid var(--primary)`).
- The mega menu is keyboard-reachable: Tab opens the button; Esc closes.
- `<meta name="theme-color">` matches the dark palette so the browser
  chrome on Android goes dark.
- A `<script>` block in `index.html` reads the stored theme before React
  renders, so there is no flash of light theme on reload.
- The 360° viewer uses pure CSS transforms; no WebGL, no extra bundle.

## 11. What was NOT changed (on purpose)

- `server/*` — untouched. Zero files modified.
- Backend routes, payment logic, data model, Firestore rules, logging
  configuration, tests — all untouched.
- The 45 automated backend tests still pass (confirmed by `npm test`).
- Existing API calls used by the frontend: unchanged. Verified by
  grepping `api.(get|post|put|patch|del)('/...'`.

## 12. Files added or changed

**Added (10):**
`src/context/ThemeContext.jsx`, `src/data/categoryTaxonomy.js`,
`src/components/CategoryMegaMenu.jsx`,
`src/components/BottomNav.jsx`,
`src/components/DiwaliBanner.jsx`,
`src/components/ProductViewer360.jsx`,
`src/pages/customer/Categories.jsx`,
`src/pages/customer/Section.jsx`,
`src/pages/customer/CategoryView.jsx`,
`src/pages/customer/Settings.jsx`,
`docs/Design-Spec.md` (this file).

**Updated (8):**
`src/styles/main.css` (full theme rewrite),
`src/components/Navbar.jsx`,
`src/components/Footer.jsx`,
`src/App.jsx`,
`src/routes/AppRoutes.jsx`,
`src/pages/customer/Home.jsx`,
`src/pages/customer/ProductDetail.jsx`,
`src/pages/customer/OrderHistory.jsx`,
`src/pages/customer/PaymentConfirmation.jsx`,
`index.html`.
