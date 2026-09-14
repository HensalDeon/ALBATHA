(() => {
  const root = document.querySelector('[data-contact-tabs]');
  if (!root) return;

  const section = root.closest('section') ?? root;
  const tablist = root.querySelector('[role="tablist"]');
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
  const form = document.getElementById('enquiry-form');
  const enquiryType = document.getElementById('enquiry-type');
  const dialCode = document.getElementById('phone-code');
  const flag = form?.querySelector('.contact-dial__flag');
  const stackedLayout = window.matchMedia('(max-width: 991.98px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const keyOffsets = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };

  const scrollBehavior = () => (reducedMotion.matches ? 'auto' : 'smooth');
  const activeTab = () => tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabs[0];
  const tabForHash = (hash) => tabs.find((tab) => `#${tab.dataset.hash}` === hash);
  const panelFor = (tab) => document.getElementById(tab.getAttribute('aria-controls'));

  const presetEnquiryType = (tab) => {
    if (enquiryType && tab.dataset.enquiryType) enquiryType.value = tab.dataset.enquiryType;
  };

  const selectTab = (tab, { focus = false, syncHash = true } = {}) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });

    const activePanel = panelFor(tab);
    panels.forEach((panel) => {
      panel.hidden = panel !== activePanel;
    });
    activePanel.setAttribute('aria-labelledby', tab.id);

    presetEnquiryType(tab);
    if (focus) tab.focus();
    if (syncHash) history.replaceState(null, '', `#${tab.dataset.hash}`);
  };

  tablist.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(event.target);
    if (index === -1) return;

    let next;
    if (Object.hasOwn(keyOffsets, event.key)) next = (index + keyOffsets[event.key] + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    selectTab(tabs[next], { focus: true });
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      selectTab(tab);
      // When stacked, the panel sits below all five cards; without scrolling the click looks like it did nothing.
      if (stackedLayout.matches) panelFor(tab).scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    });
  });

  enquiryType?.addEventListener('change', () => {
    const tab = tabs.find((item) => item.dataset.enquiryType === enquiryType.value);
    if (tab) selectTab(tab);
  });

  window.addEventListener('hashchange', () => {
    const tab = tabForHash(location.hash);
    if (!tab) return;
    selectTab(tab, { syncHash: false });
    section.scrollIntoView({ behavior: scrollBehavior() });
  });

  if (form) {
    const controls = Array.from(form.querySelectorAll('input, select, textarea'));

    const syncFlag = () => {
      if (flag && dialCode) flag.hidden = dialCode.value !== '+971';
    };

    const clearInvalid = (control) => {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    };

    const markValidity = (control) => {
      const error = document.getElementById(`${control.id}-error`);
      if (!error) return;
      if (control.validity.valid) {
        clearInvalid(control);
      } else {
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('aria-describedby', error.id);
      }
    };

    dialCode?.addEventListener('change', syncFlag);

    // Capture runs before forms.js focuses the first invalid field, so its error is announced on focus.
    form.addEventListener('submit', () => controls.forEach(markValidity), true);

    form.addEventListener('input', (event) => {
      if (event.target.hasAttribute('aria-invalid')) markValidity(event.target);
    });

    // "reset" fires before fields are restored, so page state has to be re-applied afterwards.
    form.addEventListener('reset', () => {
      setTimeout(() => {
        presetEnquiryType(activeTab());
        syncFlag();
        controls.forEach(clearInvalid);
      });
    });
  }

  const initialTab = tabForHash(location.hash);
  selectTab(initialTab ?? activeTab(), { syncHash: false });
  if (initialTab) section.scrollIntoView();
})();
