(() => {
  const STEP_KEYS = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };

  const initTimeline = (root) => {
    const tablist = root.querySelector('[role="tablist"]');
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    const peek = root.querySelector('[data-timeline-peek]');
    const peekYear = peek?.querySelector('[data-peek-year]');
    const peekTitle = peek?.querySelector('[data-peek-title]');
    const vertical = window.matchMedia('(min-width: 992px)');
    if (!tablist || !tabs.length || panels.includes(null)) return;

    const renderPeek = (index) => {
      if (!peek) return;
      const next = panels[index + 1];
      peek.hidden = !next;
      if (!next) return;
      peekYear.textContent = next.querySelector('.about-timeline__year').textContent;
      peekTitle.textContent = next.querySelector('.about-timeline__title').textContent;
    };

    const select = (index, { focus = false } = {}) => {
      tabs.forEach((tab, i) => {
        const selected = i === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[i].hidden = !selected;
      });
      if (focus) tabs[index].focus();
      renderPeek(index);
    };

    const syncOrientation = () => {
      tablist.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        select(i);
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });

    tablist.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;

      let index;
      if (Object.hasOwn(STEP_KEYS, event.key)) index = (current + STEP_KEYS[event.key] + tabs.length) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;

      event.preventDefault();
      select(index, { focus: true });
    });

    vertical.addEventListener('change', syncOrientation);
    syncOrientation();
    select(Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true')));
  };

  document.querySelectorAll('[data-timeline]').forEach(initTimeline);
})();
