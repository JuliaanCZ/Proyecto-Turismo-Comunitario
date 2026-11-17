// Envía la foto solo después de que el servidor validó sesión, origen y CSRF.
for (const form of document.querySelectorAll('form[data-offer-photo]')) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('[data-photo-status]');
    const fileError = form.querySelector('[data-error-for="imageBytes"]');
    const altError = form.querySelector('[data-error-for="altText"]');
    status.hidden = true;
    fileError.textContent = '';
    altError.textContent = '';
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'x-csrf-token': form.dataset.csrfToken, Accept: 'application/json' },
        body: new FormData(form),
      });
      if (response.ok) {
        window.location.assign(response.url);
        return;
      }
      if (response.status === 422) {
        const body = await response.json();
        fileError.textContent = (body.error?.fieldErrors?.imageBytes ?? []).join(' ');
        altError.textContent = (body.error?.fieldErrors?.altText ?? []).join(' ');
      }
      status.textContent = response.status === 422
        ? 'Error: revisa la foto y el texto alternativo.'
        : 'Error: no pudimos guardar la foto. Recarga la página e inténtalo de nuevo.';
      status.hidden = false;
      status.focus();
    } catch {
      status.textContent = 'Error de red: no pudimos guardar la foto. Inténtalo de nuevo.';
      status.hidden = false;
      status.focus();
    } finally {
      button.disabled = false;
    }
  });
}
