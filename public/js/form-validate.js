// Validación en el navegador (C-VAL, DM-08). Lee el esquema de `data-schema` (JSON), usa el MISMO
// validate.js que el servidor (servido en /js/shared/validate.js) y escribe los mensajes en
// `[data-error-for="campo"]`. Solo usa textContent: nunca HTML construido con datos.
// Sin JavaScript el formulario se envía igual y el servidor valida con las mismas reglas.
import { validate } from '/js/shared/validate.js';

function readSchema(form) {
  try {
    const schema = JSON.parse(form.dataset.schema);
    return schema && typeof schema === 'object' ? schema : null;
  } catch {
    return null;
  }
}

function collectValues(form, schema) {
  const data = new FormData(form);
  const values = {};
  for (const field of Object.keys(schema)) {
    const value = data.get(field);
    values[field] = typeof value === 'string' ? value : '';
  }
  return values;
}

function fieldElement(form, field) {
  return form.elements.namedItem(field);
}

function showErrors(form, field, messages) {
  const holder = form.querySelector(`[data-error-for="${CSS.escape(field)}"]`);
  const control = fieldElement(form, field);
  if (holder) holder.textContent = messages.join(' ');
  if (control && 'setAttribute' in control) {
    if (messages.length > 0) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }
  const wrapper = control?.closest?.('.campo');
  if (wrapper) wrapper.classList.toggle('campo--error', messages.length > 0);
}

function setupForm(form) {
  const schema = readSchema(form);
  if (!schema) return;
  // Con JavaScript los mensajes son los de validate.js, no los del navegador.
  form.noValidate = true;

  function check(onlyField) {
    const { errors } = validate(schema, collectValues(form, schema));
    const fields = onlyField ? [onlyField] : Object.keys(schema);
    for (const field of fields) showErrors(form, field, errors[field] ?? []);
    return errors;
  }

  form.addEventListener('submit', (event) => {
    const errors = check();
    const firstInvalid = Object.keys(schema).find((field) => errors[field]);
    if (firstInvalid) {
      event.preventDefault();
      fieldElement(form, firstInvalid)?.focus();
    }
  });

  // Al salir del campo se valida ese campo; mientras se corrige, el error se actualiza al escribir.
  form.addEventListener('focusout', (event) => {
    const name = event.target?.name;
    if (name && name in schema) check(name);
  });
  form.addEventListener('input', (event) => {
    const name = event.target?.name;
    if (name && name in schema && event.target.getAttribute('aria-invalid') === 'true') check(name);
  });
}

for (const form of document.querySelectorAll('form[data-schema]')) setupForm(form);
