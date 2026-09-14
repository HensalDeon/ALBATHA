(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
  };

  document.querySelectorAll('[data-scroll-carousel]').forEach(initScrollCarousel);
})();
