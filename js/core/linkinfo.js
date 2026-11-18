/*
 * Lectura de datos de un enlace (título, foto, web y descripción) para "Añadir lugar".
 *
 * Un navegador no puede descargar el HTML de otra web directamente (CORS), así que se usan
 * servicios GRATUITOS sin clave, en este orden:
 *   1. Jina Reader (r.jina.ai) — gratis sin clave (límite ~20 consultas/minuto por dispositivo).
 *   2. Microlink (api.microlink.io) — gratis sin clave con un cupo diario pequeño por dispositivo.
 *   3. Lo que se pueda deducir del propio enlace (p. ej. el nombre en un enlace de Google Maps).
 * Si nada funciona, el formulario queda listo para escribir los datos a mano.
 * Solo se envía el ENLACE pegado, nunca datos del viaje.
 */
(function (root) {
  const T = (root.Trip = root.Trip || {});
  const U = T.utils;

  const BLOCKED = /just a moment|attention required|access denied|are you a robot|verify you are human|captcha|before you continue|antes de ir a google|log ?in|iniciar sesión|inicia sesión|page not found|404|forbidden|security check|cloudflare|isn.t available|no está disponible|not available|página no encontrada/i;
  const GENERIC_DESC = /find local businesses|view maps and get driving directions|busca negocios locales|see instagram photos and videos|mira fotos y vídeos de instagram/i;

  function withTimeout(ms) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), ms);
    return { signal: ctrl ? ctrl.signal : undefined, done: () => clearTimeout(timer) };
  }

  const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max || 400);
  const absolute = (src, base) => { try { return src ? new URL(src, base).href : ''; } catch (e) { return ''; } };

  /** Nombre legible de la web a partir del dominio. */
  function siteFromHost(url) {
    try {
      const h = new URL(url).hostname.replace(/^www\./, '');
      const known = { 'google.com': 'Google Maps', 'maps.google.com': 'Google Maps', 'goo.gl': 'Google Maps', 'maps.app.goo.gl': 'Google Maps', 'instagram.com': 'Instagram',
        'airbnb.com': 'Airbnb', 'airbnb.es': 'Airbnb', 'tripadvisor.com': 'Tripadvisor', 'tripadvisor.es': 'Tripadvisor', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube',
        'tiktok.com': 'TikTok', 'booking.com': 'Booking.com', 'getyourguide.com': 'GetYourGuide', 'timeout.com': 'Time Out', 'wikipedia.org': 'Wikipedia' };
      const k = Object.keys(known).find((d) => h === d || h.endsWith('.' + d));
      if (k) return known[k];
      const parts = h.split('.');
      const core = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2] || h;
      return core.charAt(0).toUpperCase() + core.slice(1);
    } catch (e) { return ''; }
  }

  /** Lo que se puede deducir del enlace sin descargar nada. */
  function fromUrl(url) {
    const out = { url, siteName: siteFromHost(url), title: '', description: '', image: '' };
    try {
      const u = new URL(url);
      const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
      if (place) out.title = decodeURIComponent(place[1].replace(/\+/g, ' '));
      const q = u.searchParams.get('q') || u.searchParams.get('query');
      if (!out.title && /google\./.test(u.hostname) && q) out.title = q;
      if (!out.title) {
        const seg = u.pathname.split('/').filter(Boolean).pop() || '';
        const words = decodeURIComponent(seg).replace(/\.(html?|php|aspx?)$/i, '').replace(/[-_]+/g, ' ').trim();
        if (/[a-záéíóúñü]{3,}\s+[a-záéíóúñü]{3,}/i.test(words) && !/^\d+$/.test(words)) out.title = words.charAt(0).toUpperCase() + words.slice(1);
      }
    } catch (e) { /* ignorar */ }
    return out;
  }

  async function viaJina(url) {
    const t = withTimeout(15000);
    try {
      const res = await fetch('https://r.jina.ai/' + url, { headers: { Accept: 'application/json', 'X-Retain-Images': 'none' }, signal: t.signal });
      if (!res.ok) return null;
      const j = await res.json();
      const d = j && j.data;
      if (!d) return null;
      const m = d.metadata || {};
      const base = d.finalUrl || d.url || url;
      return {
        url: base,
        title: clean(m['og:title'] || m['twitter:title'] || d.title, 160),
        description: clean(m['og:description'] || m.description || m['twitter:description'] || d.description, 400),
        image: absolute(m['og:image'] || m['og:image:url'] || m['twitter:image'] || m['twitter:image:src'], base),
        siteName: clean(m['og:site_name'] || m['application-name'], 60),
      };
    } catch (e) { return null; } finally { t.done(); }
  }

  async function viaMicrolink(url) {
    const t = withTimeout(15000);
    try {
      const res = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url), { signal: t.signal });
      if (!res.ok) return null;
      const j = await res.json();
      if (!j || j.status !== 'success' || !j.data) return null;
      const d = j.data;
      return {
        url: d.url || url,
        title: clean(d.title, 160),
        description: clean(d.description, 400),
        image: d.image && d.image.url ? d.image.url : '',
        siteName: clean(d.publisher, 60),
      };
    } catch (e) { return null; } finally { t.done(); }
  }

  const usable = (r) => r && r.title && !BLOCKED.test(r.title) && !(r.description && /cloudflare|enable javascript|activa javascript/i.test(r.description));

  /**
   * Devuelve { ok, title, description, image, siteName, url, source }.
   * ok = false si no se pudo leer nada útil (el usuario completa el formulario a mano).
   */
  async function lookup(rawUrl) {
    const url = U.safeUrl(String(rawUrl || '').trim());
    if (!url) return { ok: false, error: 'El enlace no es válido (debe empezar por https://).' };
    const guess = fromUrl(url);
    let r = await viaJina(url);
    let source = 'Jina Reader';
    if (!usable(r)) { r = await viaMicrolink(url); source = 'Microlink'; }
    if (usable(r)) {
      // Google Maps: el título de la página suele ser genérico; mejor el nombre del enlace.
      const final = fromUrl(r.url || url);
      const title = final.title && /google maps/i.test(r.title) ? final.title : r.title.replace(/\s*[-|·–]\s*Google Maps$/i, '');
      const image = /staticmap|\/maps\/api\/|favicon/i.test(r.image || '') ? '' : U.safeUrl(r.image);
      return {
        ok: true, source, url,
        title, description: GENERIC_DESC.test(r.description) ? '' : r.description, image,
        siteName: r.siteName || final.siteName || guess.siteName,
      };
    }
    const final = r && r.url ? fromUrl(r.url) : guess;
    return { ok: false, source: 'enlace', url, title: final.title || guess.title, description: '', image: '', siteName: guess.siteName,
      error: 'No se pudo leer la página (la web lo bloquea o el servicio gratuito no responde). Completen los datos a mano.' };
  }

  T.linkInfo = { lookup, fromUrl, siteFromHost };
})(typeof self !== 'undefined' ? self : this);
