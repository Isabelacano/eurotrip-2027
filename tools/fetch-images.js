/*
 * Resuelve las fotos de js/data/places.js usando la API pública de Wikipedia (gratis, sin clave).
 * Solo acepta imágenes con licencia libre alojadas en Wikimedia Commons (pilicense=free).
 * Genera js/data/images.js. Uso:  node tools/fetch-images.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = {};
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data/places.js'), 'utf8'), sandbox);
const { places, cityPhotos } = sandbox.Trip;

const titles = new Set(Object.values(cityPhotos));
Object.values(places).forEach((list) => list.forEach((p) => { if (p[7]) titles.add(p[7]); }));
const all = Array.from(titles);
const UA = 'EuroTrip2027-planner/1.0 (personal, non-commercial trip planner)';

async function batch(list) {
  const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1' +
    '&prop=pageimages&piprop=thumbnail|name|original&pithumbsize=960&pilicense=free&titles=' + encodeURIComponent(list.join('|'));
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error('HTTP ' + res.status);
    const wait = (Number(res.headers.get('retry-after')) || 5 * (attempt + 1)) * 1000;
    console.log('Límite de peticiones; esperando', wait / 1000, 's…');
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error('Demasiados reintentos');
}

(async () => {
  const out = {};
  const missing = [];
  for (let i = 0; i < all.length; i += 40) {
    if (i) await new Promise((r) => setTimeout(r, 1500));
    const chunk = all.slice(i, i + 40);
    const data = await batch(chunk);
    const alias = {};
    (data.query.normalized || []).forEach((n) => { alias[n.to] = n.from; });
    (data.query.redirects || []).forEach((r) => { alias[r.to] = alias[r.from] || r.from; });
    (data.query.pages || []).forEach((pg) => {
      const original = alias[pg.title] || pg.title;
      const src = pg.thumbnail && pg.thumbnail.source;
      if (!src || !src.includes('/wikipedia/commons/')) { missing.push(original); return; }
      // Plantilla de miniatura: Wikimedia solo sirve anchos estándar (330, 500, 960, 1280, 1920).
      const t = src.replace(/\?.*$/, '').replace(/\/\d+px-([^/]+)$/, '/{w}px-$1');
      const w = (pg.original && pg.original.width) || 960;
      const h = (pg.original && pg.original.height) || 640;
      out[original] = { t, w, h, card: t.replace('{w}', '500'), hero: t.replace('{w}', w >= 1280 ? '1280' : '960'), file: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(pg.pageimage || '') };
    });
    chunk.forEach((t) => { if (!out[t] && !missing.includes(t)) missing.push(t); });
  }
  // Mejora de resolución: si la foto del artículo es pequeña (< 1280 px), busca en Wikimedia Commons
  // (todo su contenido tiene licencia libre) una foto del mismo lugar de al menos 1600 px.
  const OVERRIDES = fs.existsSync(path.join(__dirname, 'image-overrides.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'image-overrides.json'), 'utf8')) : {};
  const upgraded = [];
  for (const title of Object.keys(out).concat(missing.slice())) {
    const cur = out[title];
    if (cur && cur.w >= 1280 && !OVERRIDES[title]) continue;
    const q = OVERRIDES[title] ? OVERRIDES[title] : title.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=12' +
      '&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') +
      '&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=960';
    await new Promise((r) => setTimeout(r, 700));
    let data;
    for (let a = 0; a < 5 && !data; a++) {
      try {
        const res = await fetch(api, { headers: { 'User-Agent': UA } });
        if (res.ok) data = await res.json();
        else if (res.status === 429 || res.status >= 500) await new Promise((r) => setTimeout(r, (Number(res.headers.get('retry-after')) || 6 * (a + 1)) * 1000));
        else break;
      } catch (e) { break; }
    }
    if (!data) { console.log('  sin respuesta para', title); continue; }
    const pages = ((data.query && data.query.pages) || []).sort((a, b) => a.index - b.index);
    const pick = pages.find((p) => {
      const ii = p.imageinfo && p.imageinfo[0];
      return ii && ii.mime === 'image/jpeg' && ii.width >= 1600 && ii.width <= ii.height * 2.2 && ii.thumburl;
    });
    if (!pick) continue;
    const ii = pick.imageinfo[0];
    const t = ii.thumburl.replace(/\?.*$/, '').replace(/\/\d+px-([^/]+)$/, '/{w}px-$1');
    out[title] = { t, w: ii.width, h: ii.height, card: t.replace('{w}', '500'), hero: t.replace('{w}', '1280'), file: ii.descriptionurl };
    const mi = missing.indexOf(title);
    if (mi >= 0) missing.splice(mi, 1);
    upgraded.push(title + ' → ' + pick.title + ' (' + ii.width + ' px)');
  }
  console.log('Mejoradas desde Commons:\n  ' + (upgraded.join('\n  ') || 'ninguna'));
  // Las que siguen siendo pequeñas: usar el archivo original (Wikimedia no amplía miniaturas).
  Object.keys(out).forEach((k) => {
    const o = out[k];
    if (o.w < 500) { const orig = o.t.replace('/thumb/', '/').replace(/\/\{w\}px-[^/]+$/, ''); o.card = orig; o.hero = orig; o.t = ''; }
    else if (o.w < 960) o.hero = o.card;
  });
  console.log('Todavía pequeñas (< 960 px):', Object.keys(out).filter((k) => out[k].w < 960).map((k) => k + ' ' + out[k].w).join(' | ') || 'ninguna');
  const header = '/* GENERADO por tools/fetch-images.js — fotos con licencia libre de Wikimedia Commons. No editar a mano. */\n';
  fs.writeFileSync(path.join(root, 'js/data/images.js'), header +
    '(function (root) { (root.Trip = root.Trip || {}).images = ' + JSON.stringify(out, null, 1) + '; })(typeof self !== \'undefined\' ? self : this);\n');
  console.log('Encontradas:', Object.keys(out).length, '/', all.length);
  console.log('Sin foto libre:', missing.join(' | ') || 'ninguna');
})().catch((e) => { console.error(e); process.exit(1); });
