(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.getElementById('project-hero');

  if (hero && window.bootstrap) {
    // Slow crossfade every 6s, paused on hover and while keyboard focus is inside. No autoplay with
    // reduced motion.
    const carousel = bootstrap.Carousel.getOrCreateInstance(hero, {
      interval: reducedMotion ? false : 6000,
      ride: reducedMotion ? false : 'carousel',
      pause: 'hover',
    });

    hero.addEventListener('focusin', () => carousel.pause());
    hero.addEventListener('focusout', (event) => {
      if (!reducedMotion && !hero.contains(event.relatedTarget)) carousel.cycle();
    });
  }

  document.querySelectorAll('[data-scroll-carousel] [data-proxy]').forEach((proxy) => {
    const root = proxy.closest('[data-scroll-carousel]');
    const target = root.querySelector(`[data-${proxy.dataset.proxy}]`);
    if (!target) return;

    const sync = () => { proxy.disabled = target.disabled; };
    proxy.addEventListener('click', () => target.click());
    new MutationObserver(sync).observe(target, { attributes: true, attributeFilter: ['disabled'] });
    sync();
  });
})();
