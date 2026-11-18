import { PROVINCES } from './provinces.js';

export const REGIONS = [
  { key: 'sierra', name: 'Sierra', place: 'Quilotoa', intro: 'Lagunas volcánicas, páramos y comunidades andinas.',
    provinces: ['AZUAY', 'BOLIVAR', 'CANAR', 'CARCHI', 'CHIMBORAZO', 'COTOPAXI', 'IMBABURA', 'LOJA', 'PICHINCHA', 'TUNGURAHUA'] },
  { key: 'costa', name: 'Costa', place: 'Los Frailes', intro: 'Playas, bosque seco y saberes de la costa ecuatoriana.',
    provinces: ['EL_ORO', 'ESMERALDAS', 'GUAYAS', 'LOS_RIOS', 'MANABI', 'SANTA_ELENA', 'SANTO_DOMINGO_DE_LOS_TSACHILAS'] },
  { key: 'amazonia', name: 'Amazonía', place: 'Río Napo', intro: 'Ríos navegables, selva tropical y saberes de las comunidades amazónicas.',
    provinces: ['MORONA_SANTIAGO', 'NAPO', 'ORELLANA', 'PASTAZA', 'SUCUMBIOS', 'ZAMORA_CHINCHIPE'] },
  { key: 'galapagos', name: 'Galápagos', place: 'Bahía Tortuga', intro: 'Costa volcánica, playas y vida silvestre insular.',
    provinces: ['GALAPAGOS'] },
];

export function regionFor(province) {
  return REGIONS.find((region) => region.provinces.includes(province));
}

export function catalogFilters(query) {
  const region = REGIONS.find(({ key }) => key === query.region);
  const provinces = PROVINCES.filter(({ code }) => !region || region.provinces.includes(code));
  const provincia = provinces.find(({ code }) => code === query.provincia)?.code ?? '';
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) ? value : '';
  const desde = date(query.desde);
  const hasta = date(query.hasta);
  const cupo = /^[0-9]{1,4}$/.test(query.cupo) ? Math.max(1, Math.min(1000, Number(query.cupo))) : 1;
  const orden = query.orden === 'cupo' ? 'cupo' : '';
  return { region, provinces, provincia, q, desde, hasta, cupo, orden };
}
