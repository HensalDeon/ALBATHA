/* Site-wide behaviour, loaded on every page: smooth scrolling, scroll reveal, parallax, the header's
   scroll state, the slide-out menu, disclosures and carousel progress. Everything is opted into with data attributes in
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

  /* Smooth scrolling: Lenis (https://lenis.dev, loaded from the CDN before this file) eases wheel and
     trackpad scrolling. Touch keeps the device's own scrolling, and with reduced motion the page scrolls
     natively. It writes window.scrollY every frame, so the scroll tasks here run as they would anyway. */

  const initSmoothScroll = () => {
    if (reducedMotion || typeof window.Lenis !== 'function') return;

    const lenis = new window.Lenis({ autoRaf: true });
    window.lenis = lenis; // page scripts scroll through it when it is there (contact.js)

    // Bootstrap locks the page while the menu is open, but a script scroll would still move it.
    const menu = document.getElementById('site-menu');
    menu?.addEventListener('show.bs.offcanvas', () => lenis.stop());
    menu?.addEventListener('hidden.bs.offcanvas', () => lenis.start());
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

      onScroll(() => {
        measure();

        // The stage is pinned a header down from the top and is a screen minus the header tall, so the
        // scroll it is pinned for — the animation's distance — counts that offset on both ends.
        const distance = section.offsetHeight - window.innerHeight + header;
        if (distance <= 0) return;

        const scrolled = -section.getBoundingClientRect().top + header;
        const progress = Math.min(1, Math.max(0, scrolled / distance));
        section.style.setProperty('--scroll-progress', progress.toFixed(4));

        // The copy clears out over the opening, before the arch of light takes the screen.
        const copyOpacity = Math.min(1, Math.max(0, (COPY_FADE_END - progress) / COPY_FADE_SPAN));
        if (copy) {
          section.style.setProperty('--hero-copy-opacity', copyOpacity.toFixed(3));
          copy.inert = copyOpacity < 0.05;
        }
      });
    });
  };

  /* Header: stays put; .is-scrolled past 10px just adds its shadow. It no longer hides on scroll, so
     the offset keeping anchor targets clear of it is a constant (base.css scroll-padding-top). */

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

  initSmoothScroll();
  initReveal();
  initParallax();
  initScrollHero();
  initHeader();
  initMenu();
  initDisclosures();
  initCarouselProgress();
})();
