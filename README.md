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
    ├── videos/                 Hero video
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
  motion `main.js` shows everything at once and skips parallax, the hero animation and carousel autoplay.
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
| `data-scroll-hero` | Publishes the section's scroll position as `--scroll-progress` (0–1); the section's height is the scroll distance |
| `data-carousel-progress` | Progress bar for a Bootstrap carousel |
| `data-disclosure` (+ `aria-controls`) | Toggles a `.disclosure` panel (menu sub-lists) |
| `data-disclosure="mobile"` | The same, but only on phones; wider screens show the panel open and skip the toggle (footer link groups) |

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
- The home hero animates on scroll from one still (`assets/images/home/hero.jpg`): the section is
  `calc(200svh - var(--header-height))` tall with a stage pinned below the header, one screen minus the header high, and
  `main.js` publishes `--scroll-progress` over exactly that one screen of scroll. A translucent brand arch
  (`assets/images/shared/arch.svg`) rises from below the screen, settles, then zooms until it covers the scene, while
  the photo pushes in and the copy fades over the opening. The next section stays off-screen throughout; once the arch
  has covered the scene, `main.js` scrolls on to it — but only while the hero is still on screen, so arriving further
  down the page (an anchor link, or a reload restoring a scroll position) is not dragged back up to it. Snap scrolling is
  switched off while the hero scrubs (it would pull the scroll off mid-animation) and back on at the end, never while a
  script-driven scroll is in flight — changing it mid-scroll cancels that scroll where it stands. Only `transform`,
  `scale` and `opacity` animate, so there
  is nothing to decode or download beyond the still. Without JS or with reduced motion the hero is simply the still.
- **Snap scrolling** (all pages): `scroll-snap-type: y mandatory` on the root, with every `<section>` inside
  `[data-snap-sections]` (each page's `<main>`) and the footer as snap stops, so scrolling moves section to section.
  Sections taller than the screen stay readable — the browser allows scrolling within an oversized snap area.
  `--header-height` (via `scroll-padding-top`) keeps a snapped section clear of the sticky header.
- **Scrolling up aligns to a section's start.** Because the browser lets the scroll rest anywhere inside an oversized
  snap area, an upward flick would otherwise leave the reader part-way down the previous section. `main.js` waits for the
  upward scroll to come to rest (`scrollend`) and then glides to the nearest section start at or above the top of the
  screen. Downward scrolling is left to CSS. Every script-driven scroll — this and the hero hand-off — goes through one
  helper (`glideTo`) that flags "a script is scrolling", so the two can never correct each other's scrolls. It animates
  the scroll itself, a frame at a time, on `--ease-inout` over `420ms + 0.55ms per pixel` (capped at 1.25s): the
  browser's own `behavior: 'smooth'` is brisk and not adjustable, and read as a snatch after the unhurried scroll it
  follows. Snapping is off for the duration (it would cut the glide short on its first frame) and the reader scrolling
  mid-glide takes it back — a hand-off that never landed arms itself again. The scroll direction is
  read in its own listener, not the shared frame-throttled one: `scrollend` arrives in the same frame as the last scroll
  event, so a direction read a frame later still describes the move before it. One case stays with CSS: at the very
  bottom of a short page the footer's snap point is past the end of the scroll, so mandatory snapping can refuse a small
  upward flick outright — no scroll happens, so there is nothing to correct.
- **The header stays on screen.** It used to hide on scroll-down, which meant the gap above a snapped section kept
  changing and sections read as cut off. It is sticky and always visible, so one constant `scroll-padding-top` lines
  every section up; `main.js` only toggles `.is-scrolled` for its shadow.
- **A "full screen" section is `calc(100svh - var(--header-height))`**, never `100svh`: the header is always there, so a
  whole screen would run under it and read as cut off. The same applies to caps (`.page-hero`'s `min-height`, the
  project gallery's image) and to the hero's own maths in `main.js`. `--header-height` changes on phones (115px → 88px),
  so it is always the variable, never the number.

## Figma frames

| Page | Figma node |
| --- | --- |
| Home / menu | `2353:227` / `2353:594` |
| Home (mobile) | `2291:2835` |
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

- **Home on phones** follows its own Figma frame (`2291:2835`), not a narrowed desktop layout: logo left and menu right
  in the header, a centred hero headline ("Heritage of excellence") with a glass pill, a scroll cue and a floating
  contact button, carousel dots plus a full-width "View All Projects" button under each carousel, the news date hidden,
  the Discover link as a pill on the image, and a footer that leads with the newsletter and collapses its link groups.
  All of it is confined to the ≤575.98px breakpoint; the wider layout is unchanged. The two hero headlines are separate
  spans, so only the visible one is read out.
- **Contact** selects an enquiry type from the URL hash, so other pages can deep-link:
  `contact.html#general-enquiries`, `#investment-opportunities`, `#leasing-enquiries`, `#corporate-office`.
  The contact details (map, phones, email, working hours) are their own block below the enquiry options —
  `#contact-details` is a plain anchor to it — with the map beside the details, stacking under 992px.
- **About** year timeline and **Contact** options are ARIA tab lists (arrow keys, Home/End).
- **Placeholder copy**: where Figma uses lorem ipsum (news cards, timeline years, project details), the build keeps it
  rather than inventing company facts.
