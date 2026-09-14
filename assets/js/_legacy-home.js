const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-peek-carousel]').forEach((root) => {
  const slides = [...root.querySelectorAll('.peek-slide')];
  const count = slides.length;
  let active = 0;

  const render = () => {
    slides.forEach((slide, i) => {
      let offset = (((i - active) % count) + count) % count;
      if (offset > count / 2) offset -= count;
      const previous = Number(slide.style.getPropertyValue('--offset') || 0);
      // Slides wrapping from one side to the other move instantly instead of sweeping across.
      slide.classList.toggle('is-jumping', Math.abs(offset - previous) > 1);
      slide.style.setProperty('--offset', offset);
      slide.classList.toggle('is-active', offset === 0);
      slide.inert = offset !== 0;
    });
  };

  const go = (index) => {
    active = (index + count) % count;
    render();
  };

  root.querySelector('[data-prev]').addEventListener('click', () => go(active - 1));
  root.querySelector('[data-next]').addEventListener('click', () => go(active + 1));

  let startX = null;
  root.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('a, button')) startX = e.clientX;
  });
  root.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
  });

  render();
});

document.querySelectorAll('[data-scroll-carousel]').forEach((root) => {
  const track = root.querySelector('[data-track]');
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');

  const step = () =>
    track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);

  const scroll = (dir) =>
    track.scrollBy({ left: dir * step(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
  };

  prev.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
});
