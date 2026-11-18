/* Utilidades compartidas: escape HTML, ids, fechas y dinero (formato español). Sin dependencias. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.Trip = root.Trip || {}; root.Trip.utils = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Escape any value for safe insertion into HTML. */
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESC[c]);
  }

  /** Random, collision-resistant id with a readable prefix. */
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  const nowIso = () => new Date().toISOString();

  /* ---------- Dates (stored as 'YYYY-MM-DD', handled in UTC to avoid timezone drift) ---------- */
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function isIsoDate(s) {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function dateMs(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  /** Whole nights between two ISO dates (0 if missing or reversed). */
  function nights(from, to) {
    if (!isIsoDate(from) || !isIsoDate(to)) return 0;
    return Math.max(0, Math.round((dateMs(to) - dateMs(from)) / 86400000));
  }

  /** Suma días a una fecha ISO (UTC). */
  function isoAddDays(iso, n) {
    const d = new Date(dateMs(iso) + n * 86400000);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }

  function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fmtDate(iso, opts) {
    if (!isIsoDate(iso)) return '';
    return new Date(dateMs(iso)).toLocaleDateString('es-ES', Object.assign({ day: 'numeric', month: 'short', timeZone: 'UTC' }, opts || {})).replace('.', '');
  }

  /** Día de la semana abreviado: "mié". */
  function weekday(iso) {
    return fmtDate(iso, { weekday: 'short', day: undefined, month: undefined }).replace(/\./g, '');
  }

  function fmtDateLong(iso) {
    return fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  }

  function fmtRange(from, to) {
    if (!from && !to) return '';
    if (!to) return fmtDate(from);
    return fmtDate(from) + ' – ' + fmtDate(to);
  }

  /* ---------- Money (always integer euro cents internally) ---------- */

  /**
   * Parse user input like "12", "12.5", "12,50", "1.234,56" or "1,234.56" into integer cents.
   * Returns NaN when the input is not a valid non-negative amount.
   */
  function toCents(input) {
    if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : NaN;
    let s = String(input == null ? '' : input).trim().replace(/[€\s]/g, '');
    if (!s) return NaN;
    if (!/^\d[\d.,]*$/.test(s)) return NaN;
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const decPos = Math.max(lastDot, lastComma);
    let intPart = s;
    let decPart = '';
    // A separator followed by 1–2 digits at the end is the decimal separator; anything else is grouping.
    if (decPos !== -1 && s.length - decPos - 1 <= 2) {
      intPart = s.slice(0, decPos);
      decPart = s.slice(decPos + 1);
    }
    intPart = intPart.replace(/[.,]/g, '');
    if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(decPart)) return NaN;
    return parseInt(intPart, 10) * 100 + parseInt((decPart + '00').slice(0, 2), 10);
  }

  /** Céntimos -> texto editable "12,50" (para rellenar formularios). */
  function centsToInput(cents) {
    if (cents == null || !Number.isFinite(cents)) return '';
    return (cents / 100).toFixed(2).replace('.', ',');
  }

  let eurFmt;
  function fmtEUR(cents) {
    if (cents == null || !Number.isFinite(cents)) return '—';
    if (!eurFmt) {
      try { eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, useGrouping: true }); } catch (e) { eurFmt = null; }
    }
    const v = cents / 100;
    return eurFmt ? eurFmt.format(v) : v.toFixed(2).replace('.', ',') + ' €';
  }

  /** Euros enteros sin decimales: "20 €" (para precios estimados). */
  function fmtEURShort(euros) {
    if (euros == null || !Number.isFinite(euros)) return '—';
    return Math.round(euros).toLocaleString('es-ES') + ' €';
  }

  /* ---------- Links ---------- */

  /** Only allow http(s) links (imported JSON could otherwise inject javascript: URLs). */
  function safeUrl(url) {
    if (!url) return '';
    let s = String(url).trim();
    if (!/^https?:\/\//i.test(s) && /^[\w-]+(\.[\w-]+)+/.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
    } catch (e) { return ''; }
  }

  const mapsUrl = (query) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  const mapsDirUrl = (from, to, mode) =>
    'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(from) + '&destination=' + encodeURIComponent(to) + (mode ? '&travelmode=' + mode : '');
  const youtubeSearchUrl = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

  /** Small deterministic string hash (used to rotate leftover cents fairly). */
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  return {
    esc, uid, nowIso, isIsoDate, dateMs, nights, isoAddDays, todayIso, fmtDate, fmtDateLong, weekday, fmtRange,
    toCents, centsToInput, fmtEUR, fmtEURShort, safeUrl, mapsUrl, mapsDirUrl, youtubeSearchUrl, hash,
  };
});
