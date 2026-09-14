(() => {
  const hero = document.getElementById('project-hero');
  if (hero && window.bootstrap) {
    bootstrap.Carousel.getOrCreateInstance(hero, { interval: false, ride: false });
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
