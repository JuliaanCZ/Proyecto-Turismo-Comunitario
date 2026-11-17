export const PROVINCES = Object.freeze([
  ['AZUAY', 'Azuay'], ['BOLIVAR', 'Bolívar'], ['CANAR', 'Cañar'],
  ['CARCHI', 'Carchi'], ['CHIMBORAZO', 'Chimborazo'], ['COTOPAXI', 'Cotopaxi'],
  ['EL_ORO', 'El Oro'], ['ESMERALDAS', 'Esmeraldas'], ['GALAPAGOS', 'Galápagos'],
  ['GUAYAS', 'Guayas'], ['IMBABURA', 'Imbabura'], ['LOJA', 'Loja'],
  ['LOS_RIOS', 'Los Ríos'], ['MANABI', 'Manabí'], ['MORONA_SANTIAGO', 'Morona Santiago'],
  ['NAPO', 'Napo'], ['ORELLANA', 'Orellana'], ['PASTAZA', 'Pastaza'],
  ['PICHINCHA', 'Pichincha'], ['SANTA_ELENA', 'Santa Elena'],
  ['SANTO_DOMINGO_DE_LOS_TSACHILAS', 'Santo Domingo de los Tsáchilas'],
  ['SUCUMBIOS', 'Sucumbíos'], ['TUNGURAHUA', 'Tungurahua'],
  ['ZAMORA_CHINCHIPE', 'Zamora Chinchipe'],
].map(([code, label]) => Object.freeze({ code, label })));

const LABELS = new Map(PROVINCES.map(({ code, label }) => [code, label]));
export function provinceLabel(code) { return LABELS.get(code) ?? null; }
export function isProvince(code) { return LABELS.has(code); }
