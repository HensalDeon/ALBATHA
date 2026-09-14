(() => {
  document.querySelectorAll('form[data-validate]').forEach((form) => {
    const status = form.dataset.status ? document.getElementById(form.dataset.status) : null;

    form.addEventListener('submit', (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        form.classList.add('was-validated');
        form.querySelector(':invalid')?.focus();
        return;
      }

      // Forms without an action have no backend yet: confirm locally instead of reloading the page.
      if (!form.hasAttribute('action')) {
        event.preventDefault();
        form.reset();
        form.classList.remove('was-validated');
        if (status) status.hidden = false;
      }
    });

    form.addEventListener('input', () => {
      if (status) status.hidden = true;
    });
  });
})();
