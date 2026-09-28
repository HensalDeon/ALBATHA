/* Site-wide behaviour, loaded on every page: scroll reveal, parallax, the header's scroll state, the
   slide-out menu, disclosures and carousel progress. Everything is opted into with data attributes in
   the markup (see README "Motion"). */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* A single passive scroll listener, throttled to one run per frame, shared by every scroll task. */

  const scrollTasks = [];
  let scrollQueued = false;

  const runScrollTasks = () => {
    scrollQueued = false;
    scrollTasks.forEach((task) => task());
  };

  const queueScrollTasks = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(runScrollTasks);
  };

  const onScroll = (task) => {
    if (!scrollTasks.length) {
      window.addEventListener('scroll', queueScrollTasks, { passive: true });
      window.addEventListener('resize', queueScrollTasks);
    }
    scrollTasks.push(task);
    task();
  };

  /* Script-driven scrolls all go through here, so the tasks that react to where the scroll comes to rest
     can tell a glide of ours from the reader moving. */

  /* The browser's own `behavior: 'smooth'` is brisk and not adjustable, which read as a snatch after the
     unhurried scroll it follows. These are ours: long enough to be one movement the eye can follow, eased
     like everything else on the site (--ease-inout), and scaled to how far there is to go. */

  const GLIDE_BASE_MS = 420; // even a short hop takes its time; the site's reveals run a full second
  const GLIDE_MS_PER_PX = 0.55;
  const GLIDE_MAX_MS = 1250;
  const GLIDE_INTERRUPT = 6; // the scroll moved on its own: the reader has taken over
  const GLIDE_QUIET_MS = 220; // each frame of a glide ends in a scrollend of its own; ignore that wake
  const SCROLL_REST_MS = 140; // for browsers without scrollend
  const glide = { busy: false, run: 0, endedAt: 0 };

  // A glide is under way, or has only just finished: what the scroll is doing is ours, not the reader's.
  const glideOwnsScroll = () => glide.busy || performance.now() - glide.endedAt < GLIDE_QUIET_MS;

  // cubic-bezier(0.65, 0, 0.35, 1), the token the CSS uses for masks and fills
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const glideTo = (top, after) => {
    const run = ++glide.run; // whatever was running gives way to this
    const from = window.scrollY;
    const target = Math.round(top);
    const span = target - from;

    // `after` is told whether the glide actually arrived, so a caller that was counting on it (the hero's
    // hand-off) can arm itself again instead of believing it is done.
    const settle = (arrived) => {
      glide.busy = false;
      glide.endedAt = performance.now();
      if (after) after(arrived);
      queueScrollTasks(); // anything a task held back while the glide was in flight applies now
    };

    // Nothing to travel, or no appetite for motion: be there already.
    if (Math.abs(span) <= 1 || reducedMotion) {
      if (Math.abs(span) > 1) window.scrollTo({ top: target, behavior: 'instant' });
      settle(true);
      return;
    }

    const root = document.documentElement;
    const snapWas = root.style.scrollSnapType;
    root.style.scrollSnapType = 'none'; // snapping would cut the glide short on its first frame

    let duration = 0;
    let started = 0;
    let base = from;
    let travel = span;
    let wrote = from;

    const stop = (arrived) => {
      root.style.scrollSnapType = snapWas;
      settle(arrived);
    };

    const step = (now) => {
      if (glide.run !== run) return; // a newer glide has taken the scroll over

      if (!started) {
        // The scroll may still have been moving when the glide was asked for, so the first frame — not the
        // call — is where it starts from.
        started = now;
        base = window.scrollY;
        travel = target - base;
        if (Math.abs(travel) <= 1) {
          stop(true);
          return;
        }
        // Timed off the real distance left, which the browser may already have shortened by snapping.
        duration = Math.min(GLIDE_MAX_MS, GLIDE_BASE_MS + Math.abs(travel) * GLIDE_MS_PER_PX);
      } else if (Math.abs(window.scrollY - wrote) > GLIDE_INTERRUPT) {
        stop(false); // the reader took the scroll over mid-glide: it is theirs
        return;
      }

      const t = Math.min(1, (now - started) / duration);
      wrote = Math.round(base + travel * easeInOut(t));
      window.scrollTo({ top: wrote, behavior: 'instant' }); // per frame: 'smooth' here would fight itself

      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      stop(true);
    };

    glide.busy = true;
    requestAnimationFrame(step);
  };

  const onScrollEnd = (task) => {
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', task);
      return;
    }
    let timer;
    onScroll(() => {
      clearTimeout(timer);
      timer = setTimeout(task, SCROLL_REST_MS);
    });
  };

  /* Scroll reveal: data-reveal, data-reveal-delay, data-reveal-stagger */

  const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';
  const REVEAL_FALLBACK_MS = 1600; // longest entrance (mask, 1.4s) plus a margin

  const delayOf = (el) => parseFloat(el.style.getPropertyValue('--reveal-delay')) || 0;

  // Once the entrance has played, hand the element back to its own styles so hover transforms, shadows
  // and transitions behave normally and nothing stays clipped.
  const settleReveal = (el) => {
    el.removeAttribute('data-reveal');
    el.classList.remove('is-revealed');
    el.style.removeProperty('--reveal-delay');
  };

  const playReveal = (el) => {
    let timer;
    const onEnd = (event) => {
      if (event.target === el && (event.propertyName === 'opacity' || event.propertyName === 'clip-path')) finish();
    };
    const finish = () => {
      clearTimeout(timer);
      el.removeEventListener('transitionend', onEnd);
      settleReveal(el);
    };

    el.addEventListener('transitionend', onEnd);
    timer = setTimeout(finish, delayOf(el) + REVEAL_FALLBACK_MS);
    el.classList.add('is-revealed');
  };

  const initReveal = () => {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (reducedMotion) {
      items.forEach(settleReveal);
      return;
    }

    items.forEach((el) => {
      if (el.dataset.revealDelay) el.style.setProperty('--reveal-delay', `${Number(el.dataset.revealDelay) || 0}ms`);
    });

    document.querySelectorAll('[data-reveal-stagger]').forEach((group) => {
      const step = Number(group.dataset.revealStagger) || 0;
      group.querySelectorAll(':scope > [data-reveal]').forEach((child, index) => {
        child.style.setProperty('--reveal-delay', `${index * step + (Number(child.dataset.revealDelay) || 0)}ms`);
      });
    });

    const observer = new IntersectionObserver((entries) => {
      // Elements already above the viewport (a reload part-way down, an anchor jump) reveal as well,
      // otherwise they would stay hidden when scrolling back up.
      const ready = entries.filter((entry) => entry.isIntersecting || entry.boundingClientRect.bottom < 0);

      // Later rows of a staggered grid enter on their own; restart the cascade from the first item in
      // this batch so they don't wait out the delays of the rows above.
      const groupStart = new Map();
      ready.forEach(({ target }) => {
        const group = target.parentElement;
        if (group?.hasAttribute('data-reveal-stagger')) {
          groupStart.set(group, Math.min(groupStart.get(group) ?? Infinity, delayOf(target)));
        }
      });

      ready.forEach(({ target }) => {
        observer.unobserve(target);
        const start = groupStart.get(target.parentElement);
        if (start) target.style.setProperty('--reveal-delay', `${delayOf(target) - start}ms`);
        playReveal(target);
      });
    }, { rootMargin: REVEAL_ROOT_MARGIN, threshold: 0 });

    items.forEach((el) => observer.observe(el));
  };

  /* Parallax: data-parallax="speed" */

  const PARALLAX_LIMIT = 0.1; // share of the parent's height; the CSS headroom is 12%

  const initParallax = () => {
    if (reducedMotion) return;

    const layers = [...document.querySelectorAll('[data-parallax]')]
      .map((el) => ({ el, frame: el.parentElement, speed: Number(el.dataset.parallax) || 0 }))
      .filter(({ frame, speed }) => frame && speed);
    if (!layers.length) return;

    onScroll(() => {
      const viewport = window.innerHeight;

      // Read every rect before writing any transform to avoid layout thrashing.
      const offsets = layers.map(({ frame, speed }) => {
        const rect = frame.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewport) return null;
        const limit = rect.height * PARALLAX_LIMIT;
        const offset = (rect.top + rect.height / 2 - viewport / 2) * -speed;
        return Math.max(-limit, Math.min(limit, offset));
      });

      layers.forEach(({ el }, i) => {
        if (offsets[i] !== null) el.style.transform = `translate3d(0, ${offsets[i].toFixed(1)}px, 0)`;
      });
    });
  };

  /* Hero scroll: publishes the section's scroll position for the CSS to animate from */

  const COPY_FADE_END = 0.14; // scroll progress at which the hero copy has fully faded
  const COPY_FADE_SPAN = 0.1;

  const initScrollHero = () => {
    if (reducedMotion) return; // the still hero stands in

    document.querySelectorAll('[data-scroll-hero]').forEach((section) => {
      const copy = section.querySelector('.hero-copy');
      const wipe = section.querySelector('.home-hero__wipe');
      let viewport = '';
      let header = 0;

      // Re-measured only when the viewport changes: the header height the stage is offset by, and how
      // far the arch must grow to span the stage. Only a little past it: the white below fills the
      // corners, so the scene stays on screen until the very end of the scroll.
      const measure = () => {
        const key = `${window.innerWidth}x${window.innerHeight}`;
        if (key === viewport) return;
        viewport = key;
        header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
        if (!wipe) return;

        const scale = Math.max(window.innerWidth / Math.max(1, wipe.offsetWidth),
                               (window.innerHeight - header) / Math.max(1, wipe.offsetHeight)) * 1.15;
        section.style.setProperty('--wipe-scale-max', scale.toFixed(2));
      };

      const root = document.documentElement;
      const next = section.nextElementSibling;
      let snapping = null;
      let advanced = false;
      let settling = false; // the hand-off scroll is in flight

      onScroll(() => {
        measure();

        // The stage is pinned a header down from the top and is a screen minus the header tall, so the
        // scroll it is pinned for — the animation's distance — counts that offset on both ends.
        const distance = section.offsetHeight - window.innerHeight + header;
        if (distance <= 0) return;

        const scrolled = -section.getBoundingClientRect().top + header;
        const progress = Math.min(1, Math.max(0, scrolled / distance));
        section.style.setProperty('--scroll-progress', progress.toFixed(4));

        // Snap scrolling would fight the scrubbing, pulling the scroll off mid-animation, so it stays
        // off until the hero has played out — and until the hand-off below has landed, or the browser
        // re-targets that scroll mid-flight and it lurches. Switching it while a glide is in flight
        // cancels that glide where it stands, so the change waits for the scroll to rest.
        const wanted = progress < 1 || settling ? 'none' : '';
        if (wanted !== snapping && !glide.busy) {
          snapping = wanted;
          root.style.scrollSnapType = wanted;
        }

        // The arch has covered the scene: carry on to the next section rather than leaving the rest of
        // the hero to be scrolled through. Scrolling back up into the hero arms it again.
        if (progress < 0.98) advanced = false;

        // Only while the hero is still on screen: arriving further down the page (an anchor link, or the
        // browser restoring a scroll position on reload) must not drag the reader back up to it.
        const inView = section.getBoundingClientRect().bottom > 0;
        if (progress >= 1 && !advanced && inView && next) {
          advanced = true;
          settling = true;
          snapping = 'none';
          root.style.scrollSnapType = 'none';

          // Land where the section's own snap point is — below the header, like every other section —
          // or snapping immediately drags it again. Snapping comes back once the scroll has rested.
          glideTo(next.getBoundingClientRect().top + window.scrollY - header, (arrived) => {
            settling = false;
            snapping = '';
            root.style.scrollSnapType = '';
            if (!arrived) advanced = false; // it never landed; let the next scroll try again
          });
        }

        // The copy clears out over the opening, before the arch of light takes the screen.
        const copyOpacity = Math.min(1, Math.max(0, (COPY_FADE_END - progress) / COPY_FADE_SPAN));
        if (copy) {
          section.style.setProperty('--hero-copy-opacity', copyOpacity.toFixed(3));
          copy.inert = copyOpacity < 0.05;
        }
      });
    });
  };

  /* Scrolling up: land on the start of the section above, not its bottom. CSS snapping lets the scroll
     rest anywhere inside a section taller than the screen, so scrolling up out of one section leaves the
     reader part-way down the previous one. Once an upward scroll has come to rest, glide on to that
     section's start — the same snap point, under the header, that everything else lines up with. */

  const SNAP_SLACK = 4; // this close to a section's start counts as being there

  const initUpwardSnap = () => {
    const host = document.querySelector('[data-snap-sections]');
    if (!host) return;

    const stops = [...host.querySelectorAll('section:not(:has(section))')];
    const footer = document.querySelector('.site-footer');
    if (footer) stops.push(footer);
    if (!stops.length) return;

    let lastY = window.scrollY;
    let up = false;

    // Its own listener rather than the shared frame-throttled one: scrollend arrives in the same frame as
    // the last scroll event, so a direction read one frame late would still describe the move before it.
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 1) up = y < lastY;
      lastY = y;
    }, { passive: true });

    onScrollEnd(() => {
      if (!up || glideOwnsScroll()) return;

      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;

      // The start the reader has most recently scrolled past: the lowest snap point still at or above
      // the top of the screen. Its offset is negative, so gliding by it moves back up to it.
      let offset = null;
      stops.forEach((stop) => {
        const start = stop.getBoundingClientRect().top - header;
        if (start <= SNAP_SLACK && (offset === null || start > offset)) offset = start;
      });

      if (offset === null || offset > -SNAP_SLACK) return; // already resting on a start
      glideTo(window.scrollY + offset);
    });
  };

  /* Header: stays put; .is-scrolled past 10px just adds its shadow. It no longer hides on scroll, so
     the offset keeping snapped sections clear of it is a constant (base.css scroll-padding-top). */

  const HEADER_SCROLLED_AT = 10;

  const initHeader = () => {
    const header = document.querySelector('.site-header');
    if (!header) return;

    onScroll(() => {
      header.classList.toggle('is-scrolled', window.scrollY > HEADER_SCROLLED_AT);
    });
  };

  /* Slide-out menu (Bootstrap offcanvas): aria-expanded, inert while closed, close on link click.
     Bootstrap already closes it on Esc and locks page scrolling while it is open. */

  const initMenu = () => {
    const menu = document.getElementById('site-menu');
    if (!menu) return;

    const openers = document.querySelectorAll(`[data-bs-toggle="offcanvas"][data-bs-target="#${menu.id}"]`);
    const setOpen = (open) => {
      openers.forEach((button) => button.setAttribute('aria-expanded', String(open)));
      menu.inert = !open;
    };

    // Stagger index for the entrance of the menu items (layout.css).
    [...menu.querySelectorAll('.site-menu__list > li'), menu.querySelector('.site-menu__social')]
      .filter(Boolean)
      .forEach((item, i) => item.style.setProperty('--i', i));

    menu.addEventListener('show.bs.offcanvas', () => setOpen(true));
    menu.addEventListener('hidden.bs.offcanvas', () => setOpen(false));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a[href]')) window.bootstrap?.Offcanvas.getInstance(menu)?.hide();
    });

    setOpen(menu.classList.contains('show'));
  };

  /* Disclosure: <button data-disclosure aria-expanded aria-controls> toggling a .disclosure panel */

  const initDisclosures = () => {
    // data-disclosure="mobile" only collapses on phones; wider screens show the panel as a plain list.
    const phone = window.matchMedia('(max-width: 575.98px)');

    document.querySelectorAll('[data-disclosure]').forEach((toggle) => {
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!panel) return;

      const phoneOnly = toggle.dataset.disclosure === 'mobile';
      const openByDefault = toggle.getAttribute('aria-expanded') !== 'false';
      let open = openByDefault;

      const render = () => {
        const interactive = !phoneOnly || phone.matches;
        const shown = interactive ? open : true;
        toggle.setAttribute('aria-expanded', String(shown));
        toggle.tabIndex = interactive ? 0 : -1;
        panel.classList.toggle('is-collapsed', !shown);
        panel.inert = !shown;
      };

      toggle.addEventListener('click', () => {
        if (!phoneOnly || phone.matches) {
          open = !open;
          render();
        }
      });

      if (phoneOnly) {
        phone.addEventListener('change', () => { open = openByDefault; render(); });
      }
      render();
    });
  };

  /* Carousel progress: [data-carousel-progress] inside a Bootstrap carousel */

  const initCarouselProgress = () => {
    document.querySelectorAll('[data-carousel-progress]').forEach((progress) => {
      const carousel = progress.closest('.carousel');
      const slides = carousel ? [...carousel.querySelectorAll('.carousel-item')] : [];
      if (!slides.length) return;

      progress.style.setProperty('--count', slides.length);
      progress.style.setProperty('--index', Math.max(0, slides.findIndex((slide) => slide.classList.contains('active'))));
      carousel.addEventListener('slide.bs.carousel', (event) => progress.style.setProperty('--index', event.to));
    });
  };

  initReveal();
  initParallax();
  initScrollHero();
  initUpwardSnap();
  initHeader();
  initMenu();
  initDisclosures();
  initCarouselProgress();
})();
