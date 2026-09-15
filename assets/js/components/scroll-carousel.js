(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DRAG_THRESHOLD = 5;

  // Mouse drag-to-scroll. Touch and pen already scroll natively.
  const initDragScroll = (track) => {
    let drag = null;

    const swallowClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
    });

    track.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;

      if (!drag.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        drag.moved = true;
        // Snapping and smooth scrolling would fight the pointer, so .is-dragging turns both off.
        track.classList.add('is-dragging');
        track.setPointerCapture(drag.id);
      }

      track.scrollLeft = drag.left - dx;
    });

    const endDrag = () => {
      if (!drag) return;
      const { moved } = drag;
      drag = null;
      if (!moved) return;

      track.classList.remove('is-dragging');
      // The click that ends a drag must not follow the link under the pointer. It fires straight after
      // pointerup, so the guard is dropped on the next task in case no click arrives.
      track.addEventListener('click', swallowClick, { capture: true, once: true });
      setTimeout(() => track.removeEventListener('click', swallowClick, { capture: true }));
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('dragstart', (event) => event.preventDefault());
  };

  const initScrollCarousel = (root) => {
    const track = root.querySelector('[data-track]');
    const prev = root.querySelector('[data-prev]');
    const next = root.querySelector('[data-next]');
    const thumb = root.querySelector('[data-thumb]');
    if (!track) return;

    const step = () => {
      const item = track.firstElementChild;
      if (!item) return track.clientWidth;
      return item.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    };

    const scrollByStep = (direction) => {
      track.scrollBy({ left: direction * step(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 1;
      if (next) next.disabled = track.scrollLeft >= max - 1;

      if (thumb) {
        const ratio = Math.min(1, track.clientWidth / track.scrollWidth);
        const progress = max > 0 ? track.scrollLeft / max : 0;
        thumb.style.width = `${ratio * 100}%`;
        thumb.style.transform = `translateX(${progress * (1 / ratio - 1) * 100}%)`;
      }
    };

    prev?.addEventListener('click', () => scrollByStep(-1));
    next?.addEventListener('click', () => scrollByStep(1));
    track.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(track);
    initDragScroll(track);
  };

  document.querySelectorAll('[data-scroll-carousel]').forEach(initScrollCarousel);
})();
