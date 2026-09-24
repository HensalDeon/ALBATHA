(() => {
  const initPeekCarousel = (root) => {
    const slides = [...root.querySelectorAll('.peek-slide')];
    const count = slides.length;
    let active = 0;

    // Dots: the design shows them on phones; CSS hides them on wider screens.
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dots__dot';
      dot.setAttribute('aria-label', `Show slide ${i + 1} of ${count}`);
      dot.addEventListener('click', () => go(i));
      return dot;
    });

    const dotList = document.createElement('div');
    dotList.className = 'carousel-dots';
    dotList.append(...dots);
    root.append(dotList);

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

      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === active);
        dot.setAttribute('aria-current', String(i === active));
      });
    };

    const go = (index) => {
      active = (index + count) % count;
      render();
    };

    root.querySelector('[data-prev]')?.addEventListener('click', () => go(active - 1));
    root.querySelector('[data-next]')?.addEventListener('click', () => go(active + 1));

    let startX = null;
    root.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('a, button')) startX = event.clientX;
    });
    root.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
    });

    render();
  };

  document.querySelectorAll('[data-peek-carousel]').forEach(initPeekCarousel);
})();
