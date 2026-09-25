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

      // How far the arch must grow to span this viewport. Only a little past it: the white below fills
      // the corners, so the scene stays on screen until the very end of the scroll.
      const sizeWipe = () => {
        const key = `${window.innerWidth}x${window.innerHeight}`;
        if (!wipe || key === viewport) return;
        viewport = key;
        header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
        const scale = Math.max(window.innerWidth / Math.max(1, wipe.offsetWidth),
                               window.innerHeight / Math.max(1, wipe.offsetHeight)) * 1.15;
        section.style.setProperty('--wipe-scale-max', scale.toFixed(2));
      };

      const root = document.documentElement;
      const next = section.nextElementSibling;
      let snapping = null;
      let advanced = false;
      let settling = false; // the hand-off scroll is in flight

      onScroll(() => {
        sizeWipe();
        const distance = section.offsetHeight - window.innerHeight;
        if (distance <= 0) return;

        // The hero sits below the sticky header, so the first ~115px of scrolling only moves the header
        // out of the way. Counting that in means the arch starts on the first pixel of scroll instead of
        // after a stretch where nothing happens.
        const scrolled = -section.getBoundingClientRect().top + header;
        const progress = Math.min(1, Math.max(0, scrolled / distance));
        section.style.setProperty('--scroll-progress', progress.toFixed(4));

        // Snap scrolling would fight the scrubbing, pulling the scroll off mid-animation, so it stays
        // off until the hero has played out — and until the hand-off below has landed, or the browser
        // re-targets that scroll mid-flight and it lurches.
        const wanted = progress < 1 || settling ? 'none' : '';
        if (wanted !== snapping) {
          snapping = wanted;
          root.style.scrollSnapType = wanted;
        }

        // The arch has covered the scene: carry on to the next section rather than leaving the rest of
        // the hero to be scrolled through. Scrolling back up into the hero arms it again.
        if (progress < 0.98) advanced = false;
        if (progress >= 1 && !advanced && next) {
          advanced = true;
          settling = true;
          snapping = 'none';
          root.style.scrollSnapType = 'none';

          // Land where the section's own snap point is, or snapping immediately drags it again.
          window.scrollTo({ top: Math.round(next.getBoundingClientRect().top + window.scrollY - header), behavior: 'smooth' });

          // Hand snapping back once the scroll has come to rest.
          const done = () => {
            settling = false;
            snapping = '';
            root.style.scrollSnapType = '';
          };
          if ('onscrollend' in window) window.addEventListener('scrollend', done, { once: true });
          else setTimeout(done, 800);
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

  /* Header: .is-scrolled after 10px; hides while scrolling down past 400px, returns on scroll up */

  const HEADER_SCROLLED_AT = 10;
  const HEADER_HIDE_AFTER = 400;
  const HEADER_MIN_DELTA = 6;

  const initHeader = () => {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const menu = document.getElementById('site-menu');
    const keepVisible = () => Boolean(
      menu?.classList.contains('show')
      || header.querySelector('.dropdown-menu.show')
      || header.querySelector(':focus-visible'),
    );
    let lastY = window.scrollY;

    onScroll(() => {
      const y = Math.max(0, window.scrollY);
      header.classList.toggle('is-scrolled', y > HEADER_SCROLLED_AT);
      if (reducedMotion) return;

      const delta = y - lastY;
      if (Math.abs(delta) < HEADER_MIN_DELTA) return;
      lastY = y;
      header.classList.toggle('is-hidden', delta > 0 && y > HEADER_HIDE_AFTER && !keepVisible());
    });

    // Keyboard users tabbing into a hidden header bring it back.
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
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
  initHeader();
  initMenu();
  initDisclosures();
  initCarouselProgress();
})();
