/**
 * Instala `res.renderPage(view, locals, onError?)`: renderiza `view` y la envuelve en
 * `layout.ejs` (que imprime el resultado con `<%- body %>`; la vista ya escapó sus datos).
 * Sin `onError`, un fallo de plantilla llega al manejador de errores con `next(error)`.
 * Toda página usa esto, de modo que ninguna repite la cabecera ni el pie.
 */
export function renderPage(_req, res, next) {
  res.renderPage = (view, locals = {}, onError = next) => {
    res.render(view, locals, (viewError, body) => {
      if (viewError) return onError(viewError);
      return res.render('layout', { ...locals, body }, (layoutError, html) => {
        if (layoutError) return onError(layoutError);
        return res.send(html);
      });
    });
  };
  next();
}

/** Datos que cualquier vista puede leer: sesión, ruta actual y token CSRF (lo fija `csrf`). */
export function pageLocals(req, res, next) {
  res.locals.principal = req.principal ?? null;
  res.locals.currentPath = req.path;
  next();
}
