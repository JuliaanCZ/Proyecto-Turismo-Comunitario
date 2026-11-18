const form = document.querySelector('[data-gallery-form]');
if (form) {
  const previews = [...form.querySelectorAll('[data-gallery-slot]')];
  const alert = form.querySelector('[data-gallery-status]');
  const button = form.querySelector('button[type=submit]');
  for (const slot of previews) {
    const input = slot.querySelector('input[type=file]');
    const alt = slot.querySelector('input[type=text]');
    const preview = slot.querySelector('img');
    let url;
    input.addEventListener('change', () => {
      if (url) window.URL.revokeObjectURL(url);
      const file = input.files[0];
      url = file ? window.URL.createObjectURL(file) : null;
      if (url) preview.src = url;
      else preview.removeAttribute('src');
      preview.hidden = !url;
      alt.required = Boolean(url);
    });
  }
  form.querySelector('[data-add-gallery-slot]').addEventListener('click', (event) => {
    const next = previews.find((slot) => slot.hidden);
    if (next) { next.hidden = false; next.querySelector('input').focus(); }
    event.currentTarget.hidden = !previews.some((slot) => slot.hidden);
  });
  form.addEventListener('submit', async (event) => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    const data = new FormData(form);
    for (const [key, value] of [...data]) {
      if (value instanceof window.File && !value.name) data.delete(key);
    }
    alert.hidden = true;
    button.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: 'POST', body: data, headers: { 'x-csrf-token': data.get('_csrf'), Accept: 'application/json' },
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('No se pudo guardar la oferta. Revisa tu sesión y vuelve a intentar.');
      }
      const result = await response.json();
      if (response.ok) window.location.assign(result.url);
      else throw new Error(Object.values(result.error.fieldErrors ?? {}).flat().join(' ') || result.error.message);
    } catch (error) {
      alert.textContent = error.message || 'La oferta no pudo guardarse. Intenta otra vez.';
      alert.hidden = false;
      alert.focus();
    } finally { button.disabled = false; }
  });
}
