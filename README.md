# Albatha Real Estate — Website

Static, multi-page marketing site built from the "Albatha Real Estate – Website – Redesign" Figma file.
HTML5 + Bootstrap 5.3 (CDN) + plain CSS and vanilla JS. No build step.

## Running locally

Open `index.html` directly, or serve the folder (recommended, mirrors production):

```sh
python3 -m http.server 8765
# http://localhost:8765
```

## Structure

```
.
├── index.html                  Home
├── about.html                  Our Story
├── properties-for-sale.html    Collection overview (sale)
├── properties-for-lease.html   Collection overview (lease)
├── residential-projects.html   Category listing
├── commercial-projects.html    Category listing
├── industrial-projects.html    Category listing
├── special-projects.html       Category listing
├── project-details.html        Single property
├── news.html                   News & Insights
├── contact.html                Contact (enquiry form / contact details)
└── assets/
    ├── css/
    │   ├── base.css            Design tokens, element defaults, utilities
    │   ├── layout.css          Header, slide-out menu, footer
    │   ├── components.css      Reusable components (hero, cards, carousels, buttons…) and their hover motion
    │   ├── animations.css      Scroll reveal, parallax headroom and keyframes (see "Motion")
    │   └── pages/              One stylesheet per page/template
    ├── js/
    │   ├── main.js             Site-wide: reveal, parallax, header scroll state, menu, disclosures, carousel progress
    │   ├── components/         Self-initialising components (data-attribute driven)
    │   └── pages/              Page-only behaviour
    ├── icons/                  SVG icons (page-specific ones in sub-folders)
    ├── images/                 Optimised photography, grouped by page
    └── fonts/                  Licensed web fonts (see "Fonts")
```

## Conventions

- **CSS layers**: every page loads `base.css → layout.css → components.css → pages/<page>.css`.
  Use tokens from `base.css` (`--brand`, `--gutter`, `--fs-display`…) rather than raw values.
  Page files must not restyle shared components; promote a pattern to `components.css` once a second page needs it.
- **Naming**: BEM-style (`block__element--modifier`), kebab-case file names.
- **JavaScript**: classic `defer` scripts wrapped in an IIFE, initialised from data attributes
  (`data-scroll-carousel`, `data-peek-carousel`, `data-validate`). Bootstrap's bundle provides the offcanvas menu,
  dropdown and collapse. Pages include only the components they use.
- **Shared markup**: the header, menu and footer are duplicated in each page (no templating in a static build).
  Change them in every page together; in the menu, mark the current page with `aria-current="page"`.
- **Images**: JPEG, resized for their largest rendered size, with `width`/`height`, `alt`, and `loading="lazy"`
  below the fold (`fetchpriority="high"` for the hero).
- **Accessibility**: skip link, landmark elements, one `h1` per page, visible focus styles, keyboard-operable
  carousels/tabs, `prefers-reduced-motion` respected.

## Motion

Slow, soft and editorial; never bouncy. Plain CSS (`animations.css`, plus hover motion next to each component) and
`main.js`.

- **Always visible**: styles that hide content before it reveals only apply under the `.js` class (set inline in
  `<head>`). Everything that moves on its own sits inside `@media (prefers-reduced-motion: no-preference)`; with reduced
  motion `main.js` shows everything at once and skips parallax, header hiding and carousel autoplay.
- **Cheap to render**: only `opacity`, `transform`/`scale`, `clip-path` and (for disclosures) `grid-template-rows` animate.
  Reveals use one IntersectionObserver; parallax and the header share one frame-throttled passive scroll listener.
- **Two easings**: `--ease` (soft ease-out, most motion) and `--ease-inout` (masks, fills, menus).

| Attribute | Effect |
| --- | --- |
| `data-reveal="up · down · left · right · fade · zoom"` | Fades in from an offset (1s), once, when it scrolls into view |
| `data-reveal="mask · mask-left"` | Wipes in upward / from the right (1.4s) |
| `data-reveal-delay="150"` | Delay in ms |
| `data-reveal-stagger="120"` (on a parent) | Adds `index × 120ms` to each direct `[data-reveal]` child |
| `data-parallax="0.2"` | Parallax on an absolutely positioned image inside an `overflow: hidden` parent |
| `data-carousel-progress` | Progress bar for a Bootstrap carousel |
| `data-disclosure` (+ `aria-controls`) | Toggles a `.disclosure` panel (menu sub-lists) |

Conventions:

- Section copy cascades with `up`: eyebrow 0 → title 100 → paragraph 200 → button or link 300. Hero copy: title 150,
  text 300, so it plays on load.
- Icons and emblems use `zoom`; large editorial images use `mask`, or `mask-left` beside text.
- Card grids and rows use `data-reveal-stagger="120"` (150 for short rows) with `up` children; each row restarts the
  cascade as it scrolls in. Sliders reveal as one block.
- Parallax speeds: hero `0.2`, full-bleed section backgrounds `0.12`. The layer gets 12% headroom above and below, so an
  image pinned to its top edge needs that much extra image above the subject (see `listings/hero-for-sale.jpg`).
- Once an entrance finishes, `main.js` removes `data-reveal`, so hover lifts, shadows and transitions work normally and
  nothing stays clipped. Don't nest reveals, and don't put one on an element with its own `transform`; reveal a wrapper.
- Nothing loops except `.scroll-cue__icon` and the `.fab` pulse, both ready in `animations.css` but unused because the
  design has no scroll cue or floating button.

## Figma frames

| Page | Figma node |
| --- | --- |
| Home / menu | `2353:227` / `2353:594` |
| About | `2412:557` |
| Properties for sale | `2432:3298` |
| Residential / Commercial / Industrial / Special | `2402:734` / `2459:6436` / `2459:6826` / `2459:7216` |
| Project details | `2420:1199` |
| News & Insights | `2428:2320` |
| Contact (two states) | `2430:3138`, `2519:78` |

`properties-for-lease.html` has no frame of its own; it reuses the sale collection layout so the menu's
"Properties For Lease" entry has a destination.

## Before launch

- **Fonts**: *Univers Next Pro* is served from `assets/fonts/univers-next-pro/` as WOFF2 (Light 300, Regular 400,
  Medium 500, Bold 700, Heavy 800), declared in `base.css`; Regular and Medium are preloaded. Confirm the font licence
  covers web embedding. The full TTF family is kept outside the project in `../albatha-font-sources/univers-next-pro/`
  so it is never committed or deployed. To add a weight, convert its TTF to WOFF2 (e.g. with `fonttools`) and add an
  `@font-face` rule.
- **Forms**: the newsletter and enquiry forms validate in the browser but have no backend. Add an `action`
  (endpoint) to each form to submit for real.
- **Content & links**: copy is placeholder (lorem ipsum) in several sections; social, Albatha Portal, Privacy Policy
  and news article links point to `#`.
- **Arabic**: the language switcher is present, but no Arabic/RTL version exists yet.
- **Maps**: `project-details.html` and `contact.html` embed Google Maps (keyless `output=embed` iframes) pinned to
  Palm Jebel Ali, as in the design. Change the `q=` value in each iframe `src` to the real address or place name.
- **Imagery from the design file**:
  - `listings/hero-commercial.jpg` carries visible "Unsplash+" watermarks — replace with a licensed photo.
  - `about/tower.jpg` only exists at 800×1200 in Figma and looks soft full-width — request a larger original.
## Page notes

- **Contact** selects a panel from the URL hash, so other pages can deep-link:
  `contact.html#general-enquiries`, `#investment-opportunities`, `#leasing-enquiries`, `#corporate-office`, `#contact-details`.
- **About** year timeline and **Contact** options are ARIA tab lists (arrow keys, Home/End).
- **Placeholder copy**: where Figma uses lorem ipsum (news cards, timeline years, project details), the build keeps it
  rather than inventing company facts.
