/* =========================================================
   譜めくり — 楽譜ビューア PWA
   対象: iPadOS 16 Safari 以降 / iPhone / Android Chrome
   ========================================================= */
(() => {
'use strict';
if (window.__fmkUnsupported) return; // index.html shows the "please update" message
const VERSION = '1.3.1';

/* ---------- Utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const DAY = 86400000;
const fmtMB = b => (b / 1048576).toFixed(b < 10 * 1048576 ? 1 : 0) + ' MB';
const rel = t => { if (!t) return '未表示'; const d = Math.floor((Date.now() - t) / DAY); return d < 1 ? '今日' : d < 2 ? '昨日' : `${d}日前`; };
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const safeName = s => (String(s || '楽譜').replace(/[\\/:*?"<>|]/g, '_').trim() || '楽譜');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const u8ToAb = u => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
function abToB64(buf) { const u = new Uint8Array(buf); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); }
function b64ToAb(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function rng(seed) { let s = 2166136261; for (const c of seed) s = Math.imul(s ^ c.charCodeAt(0), 16777619) >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function freeCanvas(c) { if (c) { c.width = 0; c.height = 0; } }

/* ---------- Icons ---------- */
const I = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  share: '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11v8a1 1 0 001 1h10a1 1 0 001-1v-8"/>',
  pdf: '<path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5"/><path d="M12 11v6"/><path d="M9.5 14.5L12 17l2.5-2.5"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  file: '<path d="M7 3h7l5 5v12H5V3z"/><path d="M14 3v5h5"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  folder: '<path d="M3 7a1 1 0 011-1h5l2 2h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h1M4 12h1M4 18h1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  eraser: '<path d="M14.5 4.5l5 5L10 19H5l-2-2z"/><path d="M9 10l5 5"/><path d="M10 19h10"/>',
  marker: '<path d="M9 14l-3 3v3h3l3-3"/><path d="M9 14l7-9 4 4-9 7z"/>',
  stamp: '<path d="M5 20h14"/><path d="M7 16h10l-1-4H8z"/><circle cx="12" cy="7" r="3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  rotate: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  group: '<circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0112 0"/><circle cx="17" cy="8" r="2.5"/><path d="M15.5 13.5A5 5 0 0121 18"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  box: '<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5V20"/>',
  wand: '<path d="M4 20L15 9"/><path d="M14 4v3M17.5 5.5l-2 2M19 9h-3M12.5 5.5l2 2"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  move: '<path d="M3 7a1 1 0 011-1h5l2 2h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M10 13h6M13.5 10.5L16 13l-2.5 2.5"/>',
  select: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12l3 3 5-6"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${n === 'more' ? 'fill' : ''} ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

/* ---------- Toast ---------- */
let toastT;
function toast(m, ms = 2600) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
function fail(e, what) { console.error(e); const quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || '')); toast(quota ? '保存容量が足りません。使わない楽譜を削除してください' : `${what}できませんでした${e && e.message ? '：' + e.message : ''}`, 4200); }

/* ---------- IndexedDB ---------- */
const DB = (() => {
  let dbp;
  function open() {
    return dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('fumekuri', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('scores', { keyPath: 'id' }); d.createObjectStore('files'); d.createObjectStore('ann'); d.createObjectStore('kv'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }
  async function tx(store, mode, fn) {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), req = fn(t.objectStore(store));
      let out;
      if (req) req.onsuccess = () => { out = req.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('保存が中断されました'));
    });
  }
  return {
    get: (st, k) => tx(st, 'readonly', s => s.get(k)),
    put: (st, v, k) => tx(st, 'readwrite', s => (k === undefined ? s.put(v) : s.put(v, k))),
    del: (st, k) => tx(st, 'readwrite', s => s.delete(k)),
    all: st => tx(st, 'readonly', s => s.getAll()),
    clear: st => tx(st, 'readwrite', s => s.clear()),
  };
})();

/* ---------- State ---------- */
const DEFAULT_SETTINGS = { tapTurn: true, tapZone: 30, swipe: true, spread: true, autoHide: true, keepAwake: true };
const S = {
  scores: [], folders: [], setlists: [], settings: Object.assign({}, DEFAULT_SETTINGS),
  stack: [{ name: 'library', params: { folder: 'all' } }],
  search: '', sort: 'recent', newId: null, online: navigator.onLine, usage: null, persisted: false,
  selecting: false, selected: new Set(),
};
async function loadAll() {
  S.scores = (await DB.all('scores')) || [];
  S.folders = (await DB.get('kv', 'folders')) || [];
  S.setlists = (await DB.get('kv', 'setlists')) || [];
  Object.assign(S.settings, (await DB.get('kv', 'settings')) || {});
}
const saveScore = s => DB.put('scores', s);
const saveFolders = () => DB.put('kv', S.folders, 'folders');
const saveSetlists = () => DB.put('kv', S.setlists, 'setlists');
const saveSettings = () => DB.put('kv', S.settings, 'settings');
const byId = id => S.scores.find(s => s.id === id);
const folderName = id => (S.folders.find(f => f.id === id) || {}).name || '';
const totalSize = () => S.scores.reduce((a, s) => a + (s.size || 0), 0);

async function refreshUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) S.usage = await navigator.storage.estimate();
    if (navigator.storage && navigator.storage.persisted) S.persisted = await navigator.storage.persisted();
  } catch (e) { /* not supported */ }
}
async function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist && !S.persisted) S.persisted = await navigator.storage.persist(); } catch (e) { /* ignore */ }
}

/* ---------- Page setup (per score) ---------- */
const firstP = s => Math.max(0, Math.min(s.first == null ? 0 : s.first, s.pages - 1));
const lastP = s => Math.max(firstP(s), Math.min(s.last == null ? s.pages - 1 : s.last, s.pages - 1));
const hasRange = s => firstP(s) !== 0 || lastP(s) !== s.pages - 1;
const aspect = (s, i) => (s.aspects && s.aspects[i]) || 1.414;
/* odd start: [1,2][3,4]…  even start: [1][2,3][4,5]…  (absolute page numbers, clipped to the range) */
const pairKey = (start, i) => (start === 'even' ? (i + 1) >> 1 : i >> 1);
function pageGroups(sc, spread, cfg) {
  cfg = cfg || { first: firstP(sc), last: lastP(sc), spreadStart: sc.spreadStart };
  const out = [];
  let key = null;
  for (let i = cfg.first; i <= cfg.last; i++) {
    const k = spread ? pairKey(cfg.spreadStart, i) : i;
    if (k !== key) { out.push([]); key = k; }
    out[out.length - 1].push(i);
  }
  return out;
}

/* ---------- PDF (pdf.js) ---------- */
const pdfjs = window.pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
const PDF_OPTS = {
  cMapUrl: new URL('vendor/cmaps/', location.href).href, cMapPacked: true,
  standardFontDataUrl: new URL('vendor/standard_fonts/', location.href).href,
  isEvalSupported: false,
};
const openPdf = buf => pdfjs.getDocument(Object.assign({}, PDF_OPTS, { data: new Uint8Array(buf.slice(0)) })).promise;

let rq = Promise.resolve();
function queued(fn) { const p = rq.then(fn); rq = p.catch(() => {}); return p; }

async function renderToCanvas(doc, i, cssW, maxPx = 5e6) {
  const page = await doc.getPage(i + 1);
  const vp1 = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let scale = cssW * dpr / vp1.width;
  if (vp1.width * vp1.height * scale * scale > maxPx) scale = Math.sqrt(maxPx / (vp1.width * vp1.height));
  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(vp.width)); c.height = Math.max(1, Math.floor(vp.height));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  page.cleanup();
  return c;
}
async function thumbOf(doc, i, w = 260) { const c = await renderToCanvas(doc, i, w / Math.min(window.devicePixelRatio || 1, 2)); const u = c.toDataURL('image/jpeg', 0.78); freeCanvas(c); return u; }

/* Read a PDF and collect what the library needs; nothing is stored yet */
async function analyzePdf(buf, name) {
  const doc = await openPdf(buf);
  try {
    const n = doc.numPages, aspects = [];
    for (let i = 1; i <= n; i++) { const p = await doc.getPage(i); const vp = p.getViewport({ scale: 1 }); aspects.push(+(vp.height / vp.width).toFixed(4)); p.cleanup(); }
    const thumb = await thumbOf(doc, 0);
    let title = String(name || '').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim();
    try { const meta = await doc.getMetadata(); const t = meta && meta.info && meta.info.Title; if (!title && t) title = t; } catch (e) { /* no metadata */ }
    return { buf, pages: n, aspects, thumb, title: title || '無題の楽譜' };
  } finally { doc.destroy(); }
}
async function storeScore(a, meta) {
  const s = {
    id: uid(), title: meta.title || a.title, composer: meta.composer || '', folder: meta.folder || '',
    source: meta.source || 'pdf', pages: a.pages, aspects: a.aspects, thumb: a.thumb, size: a.buf.byteLength,
    added: Date.now(), lastOpened: 0, spreadStart: meta.spreadStart || 'odd', first: 0, last: a.pages - 1, annCount: 0,
  };
  await DB.put('files', a.buf, s.id);
  await saveScore(s);
  S.scores.push(s);
  requestPersist();
  return s;
}

/* ---------- Router ---------- */
const FULL = ['viewer', 'importInfo', 'scanReview'];
const cur = () => S.stack[S.stack.length - 1];
function go(name, params = {}) { S.stack.push({ name, params }); render(); }
function back() { if (S.stack.length > 1) S.stack.pop(); render(); }
function setRoot(name, params = {}) { S.stack = [{ name, params }]; render(); }
function replaceTop(name, params = {}) { S.stack[S.stack.length - 1] = { name, params }; render(); }
function render() {
  closeSheet();
  if (V) closeViewer();
  const top = cur(), full = FULL.indexOf(top.name) > -1;
  $('#app').hidden = full;
  $('#full').hidden = !full;
  if (!full) { $('#full').innerHTML = ''; $('#full').className = ''; renderSidebar(); renderTabbar(); SCREENS[top.name](top.params); }
  else SCREENS[top.name](top.params);
}

/* ---------- Sidebar / Tabbar ---------- */
function libCount(id) {
  if (id === 'all') return S.scores.length;
  if (id === 'scan') return S.scores.filter(s => s.source === 'scan').length;
  if (id === 'none') return S.scores.filter(s => !s.folder || !folderName(s.folder)).length;
  return S.scores.filter(s => s.folder === id).length;
}
function renderSidebar() {
  const t = cur(), f = t.name === 'library' ? t.params.folder : null;
  const item = (nav, icon, label, active, n) => `<button class="nav-item ${active ? 'active' : ''}" data-nav="${esc(nav)}">${ic(icon)}<span>${esc(label)}</span>${n != null ? `<span class="n">${n}</span>` : ''}</button>`;
  const used = S.usage && S.usage.usage ? S.usage.usage : totalSize();
  const quota = S.usage && S.usage.quota ? S.usage.quota : 1024 * 1048576;
  $('#sidebar').innerHTML = `
    <div class="brand"><b>譜めくり</b></div>
    <div class="nav-group">
      <div class="nav-label">ライブラリ</div>
      ${item('library:all', 'music', 'すべての楽譜', f === 'all', libCount('all'))}
      ${item('library:recent', 'clock', '最近開いた楽譜', f === 'recent')}
      ${item('library:scan', 'camera', 'スキャンした楽譜', f === 'scan', libCount('scan'))}
    </div>
    <div class="nav-group">
      <div class="nav-label">フォルダ</div>
      ${S.folders.map(x => item('library:' + x.id, 'folder', x.name, f === x.id, libCount(x.id))).join('')}
      ${S.folders.length ? item('library:none', 'folder', 'フォルダなし', f === 'none', libCount('none')) : ''}
      <button class="nav-item add" data-act="newFolder">${ic('plus')}<span>新しいフォルダ</span></button>
    </div>
    <div class="nav-group">
      <div class="nav-label">セットリスト</div>
      ${S.setlists.map(l => item('setlist:' + l.id, 'list', l.name, t.name === 'setlist' && t.params.id === l.id, l.items.length)).join('')}
      <button class="nav-item add" data-act="newSetlist">${ic('plus')}<span>新しいセットリスト</span></button>
    </div>
    <div class="side-foot">
      ${item('settings', 'gear', '設定', t.name === 'settings')}
      <div class="storage">
        <div class="row2"><span>この端末に保存中</span><span>${fmtMB(used)}</span></div>
        <div class="bar"><i style="width:${Math.min(100, used / quota * 100).toFixed(1)}%"></i></div>
        <span class="net ${S.online ? '' : 'off'}">${S.online ? 'オンライン' : 'オフライン（楽譜はすべて使えます）'}</span>
      </div>
    </div>`;
}
function renderTabbar() {
  const n = cur().name;
  const tab = (nav, icon, label, on) => `<button data-nav="${nav}" class="${on ? 'active' : ''}">${ic(icon)}<span>${label}</span></button>`;
  $('#tabbar').innerHTML = tab('library:all', 'music', 'ライブラリ', n === 'library') + tab('setlists', 'list', 'セットリスト', n === 'setlists' || n === 'setlist') + tab('settings', 'gear', '設定', n === 'settings');
}

/* ---------- Screens ---------- */
const SCREENS = {};
const thumbHTML = s => `<div class="thumb">${s && s.thumb ? `<img src="${s.thumb}" alt="">` : ''}</div>`;

/* search key: full/half width unified, katakana folded to hiragana, lower case */
const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function libList(folder) {
  let list = S.scores.filter(s => {
    if (folder === 'all') return true;
    if (folder === 'recent') return s.lastOpened && Date.now() - s.lastOpened < 14 * DAY;
    if (folder === 'scan') return s.source === 'scan';
    if (folder === 'none') return !s.folder || !folderName(s.folder);
    return s.folder === folder;
  });
  const q = S.search.trim();
  if (q) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    list = list.filter(s => { const t = norm(s.title + ' ' + s.composer); return words.every(w => t.indexOf(w) > -1); });
  }
  const sorters = {
    recent: (a, b) => (b.lastOpened || b.added) - (a.lastOpened || a.added),
    title: (a, b) => a.title.localeCompare(b.title, 'ja'),
    added: (a, b) => b.added - a.added,
  };
  list.sort(folder === 'recent' ? sorters.recent : sorters[S.sort]);
  return { list, q };
}
function libSubText(list, q) { return `${list.length}曲${q ? `（「${q}」で絞り込み）` : ''}`; }
function libBodyHTML(list, q) {
  let body;
  if (!S.scores.length) {
    body = `<section class="welcome">
      <div><h2>最初の楽譜を追加しましょう</h2><p>取り込んだ楽譜はこの端末の中に保存され、インターネットにつながっていなくても開けます。</p></div>
      <div class="opts">
        <button class="opt" data-act="pickPdf"><span class="oi">${ic('file')}</span><span class="grow"><b>PDFを取り込む</b><small>ファイルアプリから選ぶ</small></span></button>
        <button class="opt" data-act="scanCamera"><span class="oi">${ic('camera')}</span><span class="grow"><b>紙の楽譜をスキャン</b><small>カメラで撮影して補正</small></span></button>
        <button class="opt" data-act="sample"><span class="oi">${ic('music')}</span><span class="grow"><b>サンプルで試す</b><small>練習用の楽譜を1曲追加</small></span></button>
      </div></section>`;
  } else if (list.length) {
    body = `<div class="grid">${list.map(cardHTML).join('')}</div>`;
  } else {
    body = `<div class="empty">${ic('music')}<p>${q ? '該当する楽譜がありません。別の言葉で検索してください。' : 'ここにはまだ楽譜がありません。'}</p>${q ? '' : `<button class="btn primary" data-act="add">${ic('plus')}楽譜を追加</button>`}</div>`;
  }
  return body + (S.selecting ? selbarHTML(list) : '');
}
SCREENS.library = ({ folder = 'all' }) => {
  const names = { all: 'すべての楽譜', recent: '最近開いた楽譜', scan: 'スキャンした楽譜', none: 'フォルダなし' };
  S.folders.forEach(f => { names[f.id] = f.name; });
  if (!names[folder]) folder = 'all';
  const { list, q } = libList(folder);
  const isUserFolder = !!S.folders.find(f => f.id === folder);
  const chips = [['all', 'すべて'], ['recent', '最近'], ['scan', 'スキャン']].concat(S.folders.map(f => [f.id, f.name]));
  let hintDismissed = false;
  try { hintDismissed = !!localStorage.getItem('fmk-install-hint'); } catch (e) { hintDismissed = true; }
  const showInstall = !isStandalone() && /iPad|iPhone|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document && !hintDismissed;

  $('#view').innerHTML = `
    ${showInstall ? `<div class="note" style="margin-bottom:18px;display:flex;gap:10px;align-items:flex-start"><span style="flex:1">Safariの共有ボタン ${ic('share')} から「ホーム画面に追加」すると、全画面で使えて、保存した楽譜も消えにくくなります。</span><button class="iconbtn" data-act="hideInstall" aria-label="閉じる">${ic('close')}</button></div>` : ''}
    <div class="page-head">
      <div><p class="eyebrow">ライブラリ</p><div class="title-row"><h1>${esc(names[folder])}</h1>${isUserFolder ? `<button class="iconbtn" data-act="folderMenu" data-id="${folder}" aria-label="フォルダのメニュー">${ic('more')}</button>` : ''}</div><p class="sub" id="libSub">${esc(libSubText(list, q))}</p></div>
      <div class="head-actions">
        <label class="search">${ic('search')}<span class="sr">楽譜を検索</span><input id="q" type="search" placeholder="曲名・作曲者で検索" value="${esc(S.search)}" autocomplete="off"></label>
        <select class="sel" id="sort" aria-label="並び順" ${folder === 'recent' ? 'disabled' : ''}>
          <option value="recent" ${S.sort === 'recent' ? 'selected' : ''}>最近開いた順</option>
          <option value="title" ${S.sort === 'title' ? 'selected' : ''}>曲名順</option>
          <option value="added" ${S.sort === 'added' ? 'selected' : ''}>追加した順</option>
        </select>
        ${S.scores.length ? `<button class="btn ${S.selecting ? 'primary' : ''}" data-act="selToggle">${ic('select')}${S.selecting ? '選択を終了' : '選択'}</button>` : ''}
        ${S.selecting ? '' : `<button class="btn primary" data-act="add">${ic('plus')}楽譜を追加</button>`}
      </div>
    </div>
    <div class="chips">${chips.map(([id, n]) => `<button class="chip ${folder === id ? 'active' : ''}" data-nav="library:${id}">${esc(n)}</button>`).join('')}<button class="chip" data-act="newFolder">＋ フォルダ</button></div>
    <div id="libBody">${libBodyHTML(list, q)}</div>`;
  // update only the results while typing, so the input (and Japanese IME composition) is never rebuilt
  const qi = $('#q');
  let composing = false;
  const refresh = () => { S.search = qi.value; const r = libList(folder); $('#libSub').textContent = libSubText(r.list, r.q); $('#libBody').innerHTML = libBodyHTML(r.list, r.q); };
  qi.addEventListener('compositionstart', () => { composing = true; });
  qi.addEventListener('compositionend', () => { composing = false; refresh(); });
  qi.addEventListener('input', e => { if (composing || e.isComposing) return; refresh(); });
  qi.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) qi.blur(); });
  $('#sort').addEventListener('change', e => { S.sort = e.target.value; SCREENS.library({ folder }); });
  if (S.newId) { const el = $(`.card[data-id="${S.newId}"]`); if (el) el.scrollIntoView({ block: 'center' }); S.newId = null; }
};
function selbarHTML(list) {
  const n = S.selected.size, ids = Array.from(S.selected).join(',');
  const allOn = list.length && list.every(s => S.selected.has(s.id));
  return `<div class="selbar">
    <span class="selcount">${n ? `${n}曲を選択中` : '楽譜をタップして選んでください'}</span>
    <button class="btn sm ghost" data-act="selAll" data-ids="${list.map(s => s.id).join(',')}" data-on="${allOn ? '0' : '1'}">${allOn ? '選択を解除' : 'すべて選択'}</button>
    <span class="grow"></span>
    <button class="btn sm" data-act="moveAsk" data-ids="${ids}" ${n ? '' : 'disabled'}>${ic('move')}フォルダに移動</button>
    <button class="btn sm" data-act="dupMany" data-ids="${ids}" ${n ? '' : 'disabled'}>${ic('copy')}複製</button>
    <button class="btn sm danger" data-act="delManyAsk" data-ids="${ids}" ${n ? '' : 'disabled'}>${ic('trash')}削除</button>
  </div>`;
}
function cardHTML(s) {
  const sel = S.selecting, on = sel && S.selected.has(s.id);
  return `<article class="card ${S.newId === s.id ? 'is-new' : ''} ${sel ? 'sel-mode' : ''} ${on ? 'selected' : ''}" data-id="${s.id}">
    <button class="card-open" ${sel ? `data-sel="${s.id}" aria-pressed="${on}"` : `data-open="${s.id}"`} aria-label="${esc(s.title)}${sel ? 'を選択' : 'を開く'}">${thumbHTML(s)}${sel ? `<span class="selmark">${on ? ic('check') : ''}</span>` : ''}</button>
    <div class="card-body">
      <div class="card-text">
        <h3>${esc(s.title)}</h3>
        <p class="composer">${esc(s.composer) || '&nbsp;'}</p>
        <div class="meta">${s.source === 'scan' ? '<span class="badge scan">スキャン</span>' : '<span class="badge">PDF</span>'}${s.annCount ? '<span class="badge ann">書き込み</span>' : ''}<span>${hasRange(s) ? `${firstP(s) + 1}–${lastP(s) + 1}/${s.pages}` : s.pages}ページ · ${rel(s.lastOpened)}</span></div>
      </div>
      ${sel ? '' : `<button class="iconbtn more" data-more="${s.id}" aria-label="${esc(s.title)}のメニュー">${ic('more')}</button>`}
    </div>
  </article>`;
}

SCREENS.setlists = () => {
  $('#view').innerHTML = `
    <div class="page-head"><div><p class="eyebrow">セットリスト</p><h1>本番・練習の曲順</h1><p class="sub">曲順どおりに続けてめくれます</p></div>
      <div class="head-actions"><button class="btn primary" data-act="newSetlist">${ic('plus')}新しいセットリスト</button></div></div>
    ${S.setlists.length ? `<div class="setlist-cards">${S.setlists.map(l => {
      const items = l.items.map(byId).filter(Boolean);
      return `<button class="sl-card" data-nav="setlist:${l.id}">
        <div class="stack">${items.slice(0, 4).map(thumbHTML).join('')}</div>
        <div><h3>${esc(l.name)}</h3><small>${esc(l.date)}</small></div>
        <p style="font-size:13px">${items.length}曲 · 計${items.reduce((a, s) => a + lastP(s) - firstP(s) + 1, 0)}ページ</p>
      </button>`; }).join('')}</div>` : `<div class="empty">${ic('list')}<p>まだセットリストがありません。本番や練習の曲順を作っておくと、続けてめくれます。</p></div>`}`;
};

SCREENS.setlist = ({ id }) => {
  const l = S.setlists.find(x => x.id === id);
  if (!l) { setRoot('setlists'); return; }
  l.items = l.items.filter(byId);
  $('#view').innerHTML = `
    <div class="page-head"><div><p class="eyebrow">セットリスト</p><div class="title-row"><h1>${esc(l.name)}</h1><button class="iconbtn" data-act="setlistMenu" data-id="${l.id}" aria-label="セットリストのメニュー">${ic('more')}</button></div><p class="sub">${esc(l.date)} · ${l.items.length}曲</p></div>
      <div class="head-actions">
        <button class="btn" data-act="pickForSetlist" data-id="${l.id}">${ic('plus')}曲を追加</button>
        <button class="btn primary" data-act="playSetlist" data-id="${l.id}" ${l.items.length ? '' : 'disabled'}>${ic('play')}最初から通す</button>
      </div></div>
    ${l.items.length ? `<div class="list">${l.items.map((sid, i) => { const s = byId(sid); return `
      <div class="row">
        <span class="num">${i + 1}</span>
        <button class="mini" data-act="playSetlist" data-id="${l.id}" data-idx="${i}" aria-label="${esc(s.title)}から開く">${thumbHTML(s)}</button>
        <button class="grow" data-act="playSetlist" data-id="${l.id}" data-idx="${i}"><b>${esc(s.title)}</b><small>${esc(s.composer)}${s.composer ? ' · ' : ''}${lastP(s) - firstP(s) + 1}ページ</small></button>
        <div class="tools">
          <button class="iconbtn" data-act="slMove" data-id="${l.id}" data-idx="${i}" data-dir="-1" aria-label="上へ" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button>
          <button class="iconbtn" data-act="slMove" data-id="${l.id}" data-idx="${i}" data-dir="1" aria-label="下へ" ${i === l.items.length - 1 ? 'disabled' : ''}>${ic('down')}</button>
          <button class="iconbtn" data-act="slRemove" data-id="${l.id}" data-idx="${i}" aria-label="セットリストから外す">${ic('close')}</button>
        </div>
      </div>`; }).join('')}</div>` : `<div class="empty">${ic('list')}<p>まだ曲がありません。「曲を追加」から選んでください。</p></div>`}`;
};

SCREENS.settings = () => {
  const s = S.settings;
  const sw = (id, on) => `<label class="switch"><input type="checkbox" id="set-${id}" data-set="${id}" ${on ? 'checked' : ''}><span></span></label>`;
  const used = S.usage && S.usage.usage ? S.usage.usage : totalSize();
  const quota = S.usage && S.usage.quota;
  const wake = 'wakeLock' in navigator;
  $('#view').innerHTML = `
    <div class="page-head"><div><p class="eyebrow">設定</p><h1>設定</h1></div></div>
    <div class="settings">
      <section class="set-sec"><h2>ページめくり</h2><div class="list">
        <div class="set-row"><div class="grow"><b>画面の端をタップしてめくる</b><small>右端で次へ、左端で前へ。中央をタップするとメニューを表示</small></div>${sw('tapTurn', s.tapTurn)}</div>
        <div class="set-row"><div class="grow"><b>タップする範囲</b><small>画面の左右それぞれ何％をめくる範囲にするか</small></div>
          <select class="sel" id="set-tapZone" data-set="tapZone">${[20, 30, 40].map(v => `<option value="${v}" ${s.tapZone === v ? 'selected' : ''}>左右 ${v}%</option>`).join('')}</select></div>
        <div class="set-row"><div class="grow"><b>左右にスワイプしてめくる</b><small>指で左にはらうと次のページ</small></div>${sw('swipe', s.swipe)}</div>
        <div class="set-row"><div class="grow"><b>Bluetoothペダル・キーボード</b><small>次へ：<span class="kbd">→</span> <span class="kbd">↓</span> <span class="kbd">PageDown</span> <span class="kbd">Space</span>　前へ：<span class="kbd">←</span> <span class="kbd">↑</span> <span class="kbd">PageUp</span></small>
          <p class="pedal-out" id="pedalOut"></p></div>
          <button class="btn sm" data-act="pedalTest">ペダルをテスト</button></div>
      </div></section>
      <section class="set-sec"><h2>表示</h2><div class="list">
        <div class="set-row"><div class="grow"><b>横向きのとき見開きで表示</b><small>iPadを横にすると2ページ並べて表示します。組み方は楽譜ごとの「ページ設定」で選べます</small></div>${sw('spread', s.spread)}</div>
        <div class="set-row"><div class="grow"><b>演奏中はメニューを隠す</b><small>ページをめくるとメニューが自動で消えます。中央をタップすると戻ります</small></div>${sw('autoHide', s.autoHide)}</div>
        <div class="set-row"><div class="grow"><b>楽譜を開いている間は画面を消灯させない</b><small>${wake ? '楽譜を開いている間はスリープしません' : 'この端末のブラウザでは使えません（iPadOS 16.4以降で対応）。本番前は「設定」アプリの自動ロックを「なし」にしてください'}</small></div>${sw('keepAwake', s.keepAwake)}</div>
      </div></section>
      <section class="set-sec"><h2>保存とバックアップ</h2><div class="list">
        <div class="set-row"><div class="grow"><b>この端末の保存容量</b><small>${S.scores.length}曲・楽譜ファイル ${fmtMB(totalSize())}${quota ? `（アプリ全体 ${fmtMB(used)} / 上限の目安 ${fmtMB(quota)}）` : ''}</small>
          ${quota ? `<div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, used / quota * 100).toFixed(1)}%"></i></div>` : ''}</div></div>
        <div class="set-row"><div class="grow"><b>データの保護</b><small>${S.persisted ? '保護されています。端末の空き容量が少なくなっても自動では削除されません' : (isStandalone() ? 'ホーム画面から使っているため、通常は自動で削除されません。定期的なバックアップをおすすめします' : 'Safariのタブで使っていると、しばらく使わないうちにデータが消えることがあります。ホーム画面に追加して使ってください')}</small></div>
          ${S.persisted ? '' : `<button class="btn sm" data-act="persist">保護を申請</button>`}</div>
        <div class="set-row"><div class="grow"><b>すべての楽譜をバックアップ</b><small>楽譜・書き込み・フォルダ・セットリストを1つのファイルに書き出します。ホーム画面のアイコンを削除する前や、機種変更の前に実行してください</small></div><button class="btn sm" data-act="backup" ${S.scores.length ? '' : 'disabled'}>書き出す</button></div>
        <div class="set-row"><div class="grow"><b>バックアップから復元</b><small>書き出したファイル（.fmkbackup）を読み込みます。今ある楽譜はそのまま残ります</small></div><button class="btn sm" data-act="restore">ファイルを選ぶ</button></div>
        <div class="set-row"><div class="grow"><b>すべてのデータを削除</b><small>この端末の楽譜・書き込み・セットリストをすべて削除します</small></div><button class="btn sm danger" data-act="wipeAsk">削除…</button></div>
      </div></section>
      <section class="set-sec"><h2>このアプリについて</h2><div class="list">
        <div class="set-row"><div class="grow"><b>譜めくり ${VERSION}</b><small>${isStandalone() ? 'ホーム画面から起動中' : 'ブラウザで表示中'} · ${S.online ? 'オンライン' : 'オフライン'}</small></div><button class="btn sm" data-act="checkUpdate" ${S.online ? '' : 'disabled'}>アップデートを確認</button></div>
        <div class="set-row"><div class="grow"><b>プライバシーポリシーとご利用にあたって</b><small>楽譜は端末の中だけに保存され、外部には送られません</small></div><a class="btn sm" href="policy.html">開く</a></div>
        <div class="set-row"><div class="grow"><b>ライセンス表示</b><small>使用しているオープンソースソフトウェアとフォント</small></div><a class="btn sm" href="licenses.html">開く</a></div>
        <div class="set-row"><div class="grow"><b>不具合の報告・ご意見</b><small>GitHub の Issues で受け付けています（GitHub アカウントが必要）</small></div><a class="btn sm" href="https://github.com/satorun-run/fumekuri/issues" target="_blank" rel="noopener">開く</a></div>
        <div class="set-row"><div class="grow"><small>© 2026 satorun-run · グループでの共有は今後のバージョンで対応予定です。今は「共有」から、AirDrop・メール・LINEなどで楽譜ファイルを送れます。</small></div></div>
      </div></section>
    </div>`;
};

/* ---------- Import: PDF ---------- */
let PENDING = null;
async function handleImportFiles(files) {
  files = Array.from(files || []);
  if (!files.length) return;
  const pdfs = files.filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  const jsons = files.filter(f => /\.json$/i.test(f.name) || f.type === 'application/json');
  const other = files.length - pdfs.length - jsons.length;
  let added = 0, lastId = null;
  for (const f of jsons) {
    try { const s = await importFmk(f); added++; lastId = s.id; } catch (e) { fail(e, `「${f.name}」を取り込み`); }
  }
  if (pdfs.length === 1 && !jsons.length) {
    toast('PDFを読み込んでいます…', 8000);
    try {
      const buf = await pdfs[0].arrayBuffer();
      PENDING = await analyzePdf(buf, pdfs[0].name);
      toast('', 1);
      go('importInfo', {});
    } catch (e) { fail(e, 'PDFを読み込み'); }
    return;
  }
  for (let k = 0; k < pdfs.length; k++) {
    toast(`取り込み中… ${k + 1} / ${pdfs.length}`, 60000);
    try {
      const a = await analyzePdf(await pdfs[k].arrayBuffer(), pdfs[k].name);
      const s = await storeScore(a, { title: a.title, folder: currentFolderForImport() });
      added++; lastId = s.id;
    } catch (e) { fail(e, `「${pdfs[k].name}」を取り込み`); await new Promise(r => setTimeout(r, 1500)); }
  }
  if (added) { S.newId = lastId; setRoot('library', { folder: 'all' }); toast(`${added}曲を追加しました${other ? `（PDF以外の${other}件は取り込めませんでした）` : ''}`); }
  else if (other) toast('PDFファイルを選んでください');
}
function currentFolderForImport() { const t = S.stack[0]; return t.name === 'library' && S.folders.find(f => f.id === t.params.folder) ? t.params.folder : ''; }

SCREENS.importInfo = () => {
  if (!PENDING) { setRoot('library', { folder: 'all' }); return; }
  const a = PENDING, full = $('#full');
  full.className = '';
  full.innerHTML = `
    <header class="v-top"><button class="tbtn" data-act="importCancel">キャンセル</button><div class="v-title"><b class="plain">楽譜の情報</b><small>${a.pages}ページ · ${fmtMB(a.buf.byteLength)}</small></div>
      <button class="btn primary sm" data-act="importSave">ライブラリに追加</button></header>
    <div class="panel"><div class="panel-in">
      <div class="form">
        ${thumbHTML(a)}
        <div class="fields">${infoFields(a.title, '', currentFolderForImport())}
          <div class="field"><label>見開きの組み方</label><div class="radio-row" data-name="spreadStart">
            <button class="on" data-act="radio" data-v="odd">1・2ページから（ふつう）</button>
            <button data-act="radio" data-v="even">1ページ目は単独（表紙つき）</button></div>
            <small class="help">あとから「ページ設定」で、表示するページの範囲と一緒に変えられます。</small></div>
        </div>
      </div>
      <p class="note">取り込んだPDFはこの端末の中に保存され、オフラインでも開けます。</p>
    </div></div>`;
};
function infoFields(title, composer, folder) {
  return `<div class="field"><label for="fTitle">曲名</label><input id="fTitle" value="${esc(title)}" autocomplete="off"></div>
    <div class="field"><label for="fComposer">作曲者</label><input id="fComposer" value="${esc(composer)}" autocomplete="off"></div>
    <div class="field"><label for="fFolder">フォルダ</label><select id="fFolder"><option value="">フォルダなし</option>${S.folders.map(x => `<option value="${x.id}" ${x.id === folder ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`;
}
const radioVal = (name, root = document) => { const b = $(`.radio-row[data-name="${name}"] button.on`, root); return b ? b.dataset.v : null; };

/* ---------- Share file format (.fumekuri.json) ---------- */
async function buildFmk(sc) {
  const buf = await DB.get('files', sc.id);
  const ann = (V && V.sc.id === sc.id ? V.ann : await DB.get('ann', sc.id)) || {};
  const pick = {};
  ['title', 'composer', 'source', 'pages', 'aspects', 'thumb', 'spreadStart', 'first', 'last'].forEach(k => { pick[k] = sc[k]; });
  const data = { format: 'fumekuri-score', version: 1, score: pick, ann, pdf: abToB64(buf) };
  return new File([JSON.stringify(data)], safeName(sc.title) + '.fumekuri.json', { type: 'application/json' });
}
async function importFmk(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { throw new Error('ファイルの形式が正しくありません'); }
  if (!data || data.format !== 'fumekuri-score' || !data.pdf) throw new Error('譜めくりの楽譜ファイルではありません');
  const buf = b64ToAb(data.pdf);
  const ann = data.ann || {};
  const count = Object.keys(ann).reduce((a, k) => a + (ann[k] || []).length, 0);
  const sc = data.score || {};
  let a = { pages: sc.pages, aspects: sc.aspects, thumb: sc.thumb };
  if (!a.pages || !a.thumb) a = await analyzePdf(buf, sc.title);
  const s = {
    id: uid(), title: sc.title || '無題の楽譜', composer: sc.composer || '', folder: currentFolderForImport(), source: sc.source === 'scan' ? 'scan' : 'pdf',
    pages: a.pages, aspects: a.aspects, thumb: a.thumb, size: buf.byteLength, added: Date.now(), lastOpened: 0,
    spreadStart: sc.spreadStart === 'even' ? 'even' : 'odd', first: sc.first || 0, last: sc.last == null ? a.pages - 1 : sc.last, annCount: count,
  };
  await DB.put('files', buf, s.id);
  await DB.put('ann', ann, s.id);
  await saveScore(s);
  S.scores.push(s);
  requestPersist();
  return s;
}

/* ---------- Export PDF (with annotations) ---------- */
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
async function drawAnnPdf(out, page, items, fonts) {
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  const cb = page.getCropBox();
  const sideways = rot === 90 || rot === 270;
  const dispW = sideways ? cb.height : cb.width, dispH = sideways ? cb.width : cb.height;
  // displayed (u,v), v downward → unrotated PDF user space
  const map = (u, v) => rot === 90 ? [cb.x + v * cb.width, cb.y + u * cb.height]
    : rot === 180 ? [cb.x + (1 - u) * cb.width, cb.y + v * cb.height]
    : rot === 270 ? [cb.x + (1 - v) * cb.width, cb.y + (1 - u) * cb.height]
    : [cb.x + u * cb.width, cb.y + (1 - v) * cb.height];
  for (const it of items) {
    if (it.t === 'stamp') {
      const num = /^\d$/.test(it.text);
      const font = num ? (fonts.num || (fonts.num = await out.embedFont(PDFLib.StandardFonts.HelveticaBold))) : (fonts.it || (fonts.it = await out.embedFont(PDFLib.StandardFonts.TimesRomanBoldItalic)));
      const size = (num ? 0.03 : 0.045) * dispW;
      const tw = font.widthOfTextAtSize(it.text, size);
      const [x, y] = map(it.x - tw / 2 / dispW, it.y + size * 0.33 / dispH);
      page.drawText(it.text, { x, y, size, font, color: hexToRgb(it.color), rotate: PDFLib.degrees(rot) });
    } else {
      const pts = it.pts.length === 1 ? [it.pts[0], [it.pts[0][0] + 0.0005, it.pts[0][1]]] : it.pts;
      const d = pts.map((q, k) => { const [X, Y] = map(q[0], q[1]); return (k ? 'L' : 'M') + X.toFixed(2) + ' ' + (-Y).toFixed(2); }).join(' ');
      const avgP = it.tool === 'pen' ? pts.reduce((a, q) => a + (q[2] || 0.5), 0) / pts.length : 0.5;
      page.drawSvgPath(d, {
        x: 0, y: 0, borderColor: hexToRgb(it.color), borderWidth: it.w * dispW * (it.tool === 'pen' ? 0.55 + avgP : 1),
        borderOpacity: it.tool === 'marker' ? 0.38 : 1, borderLineCap: PDFLib.LineCapStyle.Round,
      });
    }
  }
}
async function buildExport(sc, opt, onProgress) {
  const buf = await DB.get('files', sc.id);
  if (!buf) throw new Error('楽譜ファイルが見つかりません');
  const ann = (V && V.sc.id === sc.id ? V.ann : await DB.get('ann', sc.id)) || {};
  let idx;
  if (opt.range === 'all') idx = Array.from({ length: sc.pages }, (_, i) => i);
  else if (opt.range === 'current' && V && V.sc.id === sc.id) idx = visiblePages().slice();
  else idx = pageGroups(sc, false).reduce((a, g) => a.concat(g), []);
  const withAnn = opt.withAnn && idx.some(i => ann[i] && ann[i].length);
  let bytes;
  if (!withAnn && idx.length === sc.pages) bytes = buf;
  else {
    const src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
    const out = await PDFLib.PDFDocument.create();
    const copied = await out.copyPages(src, idx);
    const fonts = {};
    for (let k = 0; k < idx.length; k++) {
      const pg = out.addPage(copied[k]);
      if (withAnn && ann[idx[k]] && ann[idx[k]].length) await drawAnnPdf(out, pg, ann[idx[k]], fonts);
      if (onProgress) onProgress((k + 1) / idx.length);
    }
    out.setTitle(sc.title);
    bytes = await out.save();
  }
  return new File([bytes], safeName(opt.name || sc.title).replace(/\.pdf$/i, '') + '.pdf', { type: 'application/pdf' });
}

/* ---------- Share / save a file ---------- */
async function shareFile(file) {
  if (navigator.canShare && navigator.share) {
    let ok = false;
    try { ok = navigator.canShare({ files: [file] }); } catch (e) { ok = false; }
    if (ok) {
      try { await navigator.share({ files: [file], title: file.name }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast(`${file.name} を保存しました`);
}
let READY = null;
function sheetReady(file, title, note) {
  READY = file;
  openSheet(`${sheetHead(title, `${esc(file.name)}（${fmtMB(file.size)}）`)}
    ${note ? `<p class="help">${note}</p>` : ''}
    <div class="sheet-foot"><button class="btn" data-act="closeSheet">閉じる</button><button class="btn primary" data-act="shareReady">${ic('share')}送る・保存する…</button></div>`);
}

/* ---------- Backup ---------- */
async function buildBackup(onProgress) {
  const parts = [], scores = [];
  let off = 0;
  for (let k = 0; k < S.scores.length; k++) {
    const s = S.scores[k];
    const buf = await DB.get('files', s.id);
    if (!buf) continue;
    const ann = (await DB.get('ann', s.id)) || {};
    scores.push({ meta: s, ann, off, len: buf.byteLength });
    parts.push(new Blob([buf]));
    off += buf.byteLength;
    if (onProgress) onProgress((k + 1) / S.scores.length);
  }
  const enc = new TextEncoder();
  const manifest = enc.encode(JSON.stringify({ format: 'fumekuri-backup', version: 1, app: VERSION, created: Date.now(), folders: S.folders, setlists: S.setlists, settings: S.settings, scores }));
  const header = enc.encode(`FMKRBK1\n${manifest.length}\n`);
  return new File([header, manifest].concat(parts), `fumekuri-backup-${today()}.fmkbackup`, { type: 'application/octet-stream' });
}
async function restoreBackup(file) {
  const dec = new TextDecoder();
  const head = dec.decode(await file.slice(0, 64).arrayBuffer());
  const m = /^FMKRBK1\n(\d+)\n/.exec(head);
  if (!m) throw new Error('譜めくりのバックアップファイルではありません');
  const hlen = m[0].length, mlen = +m[1];
  const man = JSON.parse(dec.decode(await file.slice(hlen, hlen + mlen).arrayBuffer()));
  const base = hlen + mlen;
  let added = 0, skipped = 0;
  for (const e of man.scores || []) {
    if (byId(e.meta.id)) { skipped++; continue; }
    toast(`復元中… ${added + skipped + 1} / ${man.scores.length}`, 60000);
    const buf = await file.slice(base + e.off, base + e.off + e.len).arrayBuffer();
    await DB.put('files', buf, e.meta.id);
    await DB.put('ann', e.ann || {}, e.meta.id);
    await saveScore(e.meta);
    S.scores.push(e.meta);
    added++;
  }
  (man.folders || []).forEach(f => { if (!S.folders.find(x => x.id === f.id)) S.folders.push(f); });
  (man.setlists || []).forEach(l => { if (!S.setlists.find(x => x.id === l.id)) S.setlists.push(l); });
  await saveFolders(); await saveSetlists();
  requestPersist();
  return { added, skipped };
}

/* ---------- Sample score (drawn with pdf-lib) ---------- */
async function makeSamplePdf() {
  const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
  const pdf = await PDFDocument.create();
  const fB = await pdf.embedFont(StandardFonts.TimesRomanBold), fI = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic), fR = await pdf.embedFont(StandardFonts.TimesRoman), fM = await pdf.embedFont(StandardFonts.Courier);
  const W = 595.28, H = 841.89, k = W / 600, ink = rgb(0.1, 0.1, 0.1);
  const X = x => x * k, Y = y => H - y * k;
  const ctext = (pg, t, font, size, y) => pg.drawText(t, { x: W / 2 - font.widthOfTextAtSize(t, size) / 2, y: Y(y), size, font, color: ink });
  const line = (pg, x1, y1, x2, y2, t) => pg.drawLine({ start: { x: X(x1), y: Y(y1) }, end: { x: X(x2), y: Y(y2) }, thickness: t * k, color: ink });
  pdf.setTitle('Sample Etude');
  let pg = pdf.addPage([W, H]);
  pg.drawRectangle({ x: X(40), y: Y(808), width: 520 * k, height: 768 * k, borderColor: ink, borderWidth: 1.2 });
  pg.drawRectangle({ x: X(50), y: Y(798), width: 500 * k, height: 748 * k, borderColor: ink, borderWidth: 0.5 });
  ctext(pg, 'Sample Etude', fB, 40, 310); ctext(pg, 'for Piano', fR, 17, 356); ctext(pg, 'Fumekuri Practice Edition', fR, 16, 434); ctext(pg, 'COVER PAGE', fM, 10, 752);
  const r = rng('fumekuri-sample');
  const g = 7, L = 52, R = 556;
  let bar = 1;
  for (let p = 1; p <= 4; p++) {
    pg = pdf.addPage([W, H]);
    let y = 64;
    if (p === 1) { ctext(pg, 'Sample Etude', fB, 26, 82); pg.drawText('Fumekuri', { x: X(R) - fR.widthOfTextAtSize('Fumekuri', 12), y: Y(130), size: 12, font: fR, color: ink }); pg.drawText('Moderato', { x: X(L), y: Y(152), size: 13, font: fI, color: ink }); y = 172; }
    else pg.drawText('Sample Etude', { x: X(R) - fR.widthOfTextAtSize('Sample Etude', 10), y: Y(38), size: 10, font: fR, color: ink });
    let sys = 0;
    while (y + 96 < 848 - 56) {
      const staves = [y, y + 68];
      staves.forEach(sy => { for (let l = 0; l < 5; l++) line(pg, L, sy + l * g, R, sy + l * g, 0.8); });
      line(pg, L, y, L, y + 96, 1.6);
      if (p === 1 && sys === 0) staves.forEach(sy => { pg.drawText('4', { x: X(L + 28), y: Y(sy + 2 * g - 1), size: 15, font: fB, color: ink }); pg.drawText('4', { x: X(L + 28), y: Y(sy + 4 * g - 1), size: 15, font: fB, color: ink }); });
      pg.drawText(String(bar), { x: X(L), y: Y(y - 8), size: 7, font: fR, color: ink });
      const startX = L + (p === 1 && sys === 0 ? 46 : 20), mW = (R - startX) / 4;
      for (let m = 0; m < 4; m++) {
        const mx = startX + m * mW;
        line(pg, mx + mW, y, mx + mW, y + 96, 0.9);
        staves.forEach(sy => {
          const n = [2, 3, 4, 4, 4, 8][Math.floor(r() * 6)];
          const xs = [], ys = [], st = [];
          for (let q = 0; q < n; q++) {
            const nx = mx + 10 + q * ((mW - 18) / n);
            let s = Math.round(r() * 11) - 2;
            if (q && Math.abs(s - st[q - 1]) > 4) s = st[q - 1] + (r() > 0.5 ? 2 : -2);
            const ny = sy + s * g / 2;
            xs.push(nx); ys.push(ny); st.push(s);
            for (let l = -2; l >= s; l -= 2) line(pg, nx - 7, sy + l * g / 2, nx + 7, sy + l * g / 2, 0.8);
            for (let l = 10; l <= s; l += 2) line(pg, nx - 7, sy + l * g / 2, nx + 7, sy + l * g / 2, 0.8);
            const opts = { x: X(nx), y: Y(ny), xScale: 4.4 * k, yScale: 3.2 * k, rotate: degrees(22) };
            pg.drawEllipse(n === 2 ? Object.assign(opts, { borderColor: ink, borderWidth: 1.3 }) : Object.assign(opts, { color: ink }));
          }
          if (n === 8) {
            for (let q = 0; q < n; q += 2) {
              const down = (st[q] + st[q + 1]) / 2 < 4;
              const x1 = down ? xs[q] - 4 : xs[q] + 4, x2 = down ? xs[q + 1] - 4 : xs[q + 1] + 4;
              const by = down ? Math.max(ys[q], ys[q + 1]) + 24 : Math.min(ys[q], ys[q + 1]) - 24;
              line(pg, x1, ys[q], x1, by, 1); line(pg, x2, ys[q + 1], x2, by, 1); line(pg, x1, by, x2, by, 4);
            }
          } else xs.forEach((nx, q) => { const d = st[q] < 4; const sx = d ? nx - 4 : nx + 4; line(pg, sx, ys[q], sx, ys[q] + (d ? 24 : -24), 1); });
        });
      }
      if (r() < 0.4) pg.drawText(['p', 'mf', 'f', 'cresc.', 'dim.'][Math.floor(r() * 5)], { x: X(startX + Math.floor(r() * 3) * mW + 8), y: Y(y + 56), size: 13, font: fI, color: ink });
      y += 142; sys++; bar += 4;
    }
    const pn = String(p + 1);
    pg.drawText(pn, { x: W / 2 - fR.widthOfTextAtSize(pn, 10) / 2, y: Y(822), size: 10, font: fR, color: ink });
  }
  return u8ToAb(await pdf.save());
}

/* ---------- Viewer ---------- */
let V = null;
const PEN_COLORS = [['#1A1A1A', '黒'], ['#6B6B6B', '灰'], ['#C3362B', '赤'], ['#E07B00', 'オレンジ'], ['#2E7D4F', '緑'], ['#1D3F8F', '青'], ['#7B3FA0', '紫']];
const MARKER_COLORS = [['#F2C230', '黄'], ['#7ED957', '緑'], ['#5BC0EB', '水色'], ['#FF7EB6', 'ピンク'], ['#FFA94D', 'オレンジ']];
const STAMPS = ['p', 'mf', 'f', 'cresc.', 'V', '1', '2', '3', '4', '5'];
const WIDTHS = [['細', 0.0025], ['中', 0.004], ['太', 0.007]];
let wakeLock = null;
async function setWake(on) {
  try {
    if (on && S.settings.keepAwake && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    else if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { /* not allowed */ }
}

SCREENS.viewer = ({ scoreId, page = null, setlist = null, idx = 0 }) => {
  const sc = byId(scoreId);
  if (!sc) { setRoot('library', { folder: 'all' }); toast('楽譜が見つかりません'); return; }
  sc.lastOpened = Date.now(); saveScore(sc);
  V = {
    sc, page: Math.max(firstP(sc), Math.min(lastP(sc), page == null ? firstP(sc) : page)), setlist, idx,
    edit: false, tool: 'pen', color: S.settings.penColor || '#C3362B', markerColor: S.settings.markerColor || '#F2C230', width: 0.004, stamp: 'p', chrome: true, thumbs: false,
    undo: [], drawing: null, doc: null, ann: {}, cache: new Map(), thumbUrls: new Map(), token: 0, dirty: false, penSeen: false, swipe: null,
  };
  const l = setlist && S.setlists.find(x => x.id === setlist);
  const full = $('#full');
  full.className = 'viewer';
  full.innerHTML = `
    <header class="v-top">
      <button class="tbtn" data-act="back">${ic('back')}<span class="lbl">${l ? 'セットリスト' : 'ライブラリ'}</span></button>
      <div class="v-title"><b>${esc(sc.title)}</b><small>${esc(sc.composer)}${l ? `<span class="sl-chip">${esc(l.name)} ${idx + 1}/${l.items.length}</span>` : ''}</small></div>
      <div class="v-actions">
        <button class="tbtn" data-act="vEdit" id="vEditBtn">${ic('pen')}<span class="lbl">書き込み</span></button>
        <button class="tbtn" data-act="vThumbs">${ic('grid')}<span class="lbl">ページ一覧</span></button>
        <button class="tbtn" data-act="pageSetup" data-id="${sc.id}">${ic('book')}<span class="lbl">ページ設定</span></button>
        <button class="tbtn" data-act="share" data-id="${sc.id}">${ic('share')}<span class="lbl">共有</span></button>
        <button class="tbtn" data-act="export" data-id="${sc.id}">${ic('pdf')}<span class="lbl">PDF出力</span></button>
      </div>
    </header>
    <div class="v-stage" id="stage">
      <div class="spread" id="spread"><div class="loading" style="color:var(--ink-2)">読み込み中…</div></div>
      <div class="zone-flash l" id="flashL"></div><div class="zone-flash r" id="flashR"></div>
    </div>
    <footer class="v-bottom" id="vBottom"></footer>
    <div class="thumbs" id="vThumbs" hidden></div>`;
  const stage = $('#stage');
  stage.addEventListener('click', onStageClick);
  stage.addEventListener('pointerdown', e => { if (!V || V.edit || e.pointerType === 'mouse') return; V.swipe = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  stage.addEventListener('pointerup', e => {
    if (!V || !V.swipe) return;
    const dx = e.clientX - V.swipe.x, dy = e.clientY - V.swipe.y, fast = Date.now() - V.swipe.t < 700;
    V.swipe = null;
    if (S.settings.swipe && fast && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const v = V; v.swiped = true; setTimeout(() => { v.swiped = false; }, 400); // swallow the click that may follow
      turn(dx < 0 ? 1 : -1);
    }
  });
  renderBottom();
  setWake(true);
  const my = V;
  Promise.all([DB.get('files', sc.id), DB.get('ann', sc.id)]).then(async ([buf, ann]) => {
    if (V !== my) return;
    if (!buf) throw new Error('楽譜ファイルが見つかりません');
    my.ann = ann || {};
    const doc = await openPdf(buf);
    if (V !== my) { doc.destroy(); return; }
    my.doc = doc;
    await nextFrame();
    renderPages(0);
  }).catch(e => { if (V === my) { $('#spread').innerHTML = `<div class="empty" style="color:var(--ink-2)">${ic('info')}<p>この楽譜を開けませんでした。${esc(e.message || '')}</p></div>`; } });
};
function closeViewer() {
  const v = V;
  V = null;
  clearTimeout(annTimer);
  if (v.dirty) persistAnn(v.sc, v.ann);
  v.cache.forEach(c => freeCanvas(c));
  v.cache.clear();
  if (v.doc) v.doc.destroy();
  setWake(false);
}
function isSpread() { const st = $('#stage'); if (!st) return false; const r = st.getBoundingClientRect(); return S.settings.spread && r.width > r.height * 1.15 && lastP(V.sc) > firstP(V.sc); }
function viewGroups() { return pageGroups(V.sc, isSpread()); }
function groupIndex(groups) { const k = groups.findIndex(g => g.indexOf(V.page) > -1); return k < 0 ? 0 : k; }
function visiblePages() { const g = viewGroups(); return g[groupIndex(g)]; }
function layoutFor(pages) {
  const r = $('#stage').getBoundingClientRect(), pad = 12, gap = pages.length > 1 ? 6 : 0;
  const inv = pages.reduce((a, i) => a + 1 / aspect(V.sc, i), 0);
  let h = r.height - pad * 2;
  if (h * inv + gap > r.width - pad * 2) h = (r.width - pad * 2 - gap) / inv;
  return pages.map(i => ({ i, w: Math.max(10, Math.floor(h / aspect(V.sc, i))), h: Math.max(10, Math.floor(h)) }));
}
async function pageCanvas(i, w) {
  const v = V, key = i + ':' + w;
  if (v.cache.has(key)) { const c = v.cache.get(key); v.cache.delete(key); v.cache.set(key, c); return c; }
  const c = await queued(() => (V === v ? renderToCanvas(v.doc, i, w) : Promise.reject(new Error('closed'))));
  if (V !== v) { freeCanvas(c); throw new Error('closed'); }
  v.cache.set(key, c);
  for (const [k, cv] of v.cache) { if (v.cache.size <= 8) break; if (!cv.isConnected) { freeCanvas(cv); v.cache.delete(k); } }
  return c;
}
async function renderPages(dir) {
  if (!V || !V.doc) return;
  const v = V, token = ++v.token;
  v.stageH = $('#stage').clientHeight;
  const pages = visiblePages(), lay = layoutFor(pages);
  const el = $('#spread');
  el.className = 'spread';
  el.innerHTML = lay.map(p => `<div class="page" style="width:${p.w}px;height:${p.h}px" data-p="${p.i}"><div class="loading">${p.i + 1}ページ</div><canvas class="ann"></canvas></div>`).join('');
  if (dir) { void el.offsetWidth; el.classList.add(dir > 0 ? 'next' : 'prev'); }
  $$('.page', el).forEach(pg => setupAnnCanvas(pg, +pg.dataset.p));
  updateIndicator();
  if (v.thumbs) renderThumbs();
  try {
    for (const p of lay) {
      const c = await pageCanvas(p.i, p.w);
      if (token !== v.token || V !== v) return;
      const pg = el.querySelector(`.page[data-p="${p.i}"]`);
      if (!pg) return;
      c.className = 'pdf';
      const ld = pg.querySelector('.loading'); if (ld) ld.remove();
      pg.insertBefore(c, pg.firstChild);
    }
    // prefetch the neighbouring spreads so the next turn is instant
    const groups = viewGroups(), gi = groupIndex(groups);
    for (const k of [gi + 1, gi - 1]) {
      if (k < 0 || k >= groups.length) continue;
      for (const p of layoutFor(groups[k])) { if (token !== v.token || V !== v) return; await pageCanvas(p.i, p.w); }
    }
  } catch (e) { if (e.message !== 'closed') console.warn(e); }
}
function updateIndicator() {
  if (!V) return;
  const pages = visiblePages();
  const pg = $('#pgLabel'); if (pg) pg.textContent = `${pages.map(p => p + 1).join('–')} / ${V.sc.pages}`;
  const rg = $('#pgRange'); if (rg) rg.value = V.page + 1;
}
function renderBottom() {
  const b = $('#vBottom');
  if (!V.edit) {
    const many = lastP(V.sc) > firstP(V.sc);
    b.innerHTML = `
      <button class="iconbtn" data-act="vPrev" aria-label="前のページ">${ic('back')}</button>
      <span class="pg" id="pgLabel"></span>
      <input type="range" id="pgRange" min="${firstP(V.sc) + 1}" max="${lastP(V.sc) + 1}" value="${V.page + 1}" aria-label="ページ" ${many ? '' : 'disabled'}>
      <span class="hint">端をタップ／スワイプ／ペダルでめくる</span>
      <button class="iconbtn" data-act="vNext" aria-label="次のページ">${ic('next')}</button>`;
    $('#pgRange').addEventListener('input', e => { V.page = +e.target.value - 1; renderPages(0); });
    updateIndicator();
  } else {
    b.innerHTML = `<div class="penbar">
      <div class="grp pnav">
        <button class="tool" data-act="vPrev" aria-label="前のページ">${ic('back')}</button>
        <span class="pg" id="pgLabel"></span>
        <button class="tool" data-act="vNext" aria-label="次のページ">${ic('next')}</button>
      </div>
      <div class="grp">
        ${[['pen', 'pen', 'ペン'], ['marker', 'marker', '蛍光ペン'], ['eraser', 'eraser', '消しゴム'], ['stamp', 'stamp', '記号']].map(([t, i, n]) => `<button class="tool ${V.tool === t ? 'on' : ''}" data-act="vTool" data-tool="${t}">${ic(i)}<span class="lbl">${n}</span></button>`).join('')}
      </div>
      ${V.tool === 'pen' || V.tool === 'stamp' ? `<div class="grp">${PEN_COLORS.map(([c, n]) => `<button class="dot ${V.color === c ? 'on' : ''}" style="background:${c}" data-act="vColor" data-color="${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>` : ''}
      ${V.tool === 'marker' ? `<div class="grp">${MARKER_COLORS.map(([c, n]) => `<button class="dot ${V.markerColor === c ? 'on' : ''}" style="background:${c}" data-act="vMColor" data-color="${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>` : ''}
      ${V.tool === 'pen' ? `<div class="grp">${WIDTHS.map(([n, w]) => `<button class="tool ${V.width === w ? 'on' : ''}" data-act="vWidth" data-w="${w}">${n}</button>`).join('')}</div>` : ''}
      ${V.tool === 'stamp' ? `<div class="grp">${STAMPS.map(s => `<button class="stamp ${/\d/.test(s) ? 'num' : ''} ${V.stamp === s ? 'on' : ''}" data-act="vStamp" data-stamp="${s}">${s}</button>`).join('')}</div>` : ''}
      <button class="tool" data-act="vUndo" ${V.undo.length ? '' : 'disabled'}>${ic('undo')}<span class="lbl">元に戻す</span></button>
      <button class="btn primary sm" data-act="vEdit">${ic('check')}完了</button>
    </div>`;
    updateIndicator();
  }
  // the toolbar can change height (e.g. the stamp row); re-fit the pages when it does
  const st = $('#stage');
  if (st && V.doc && V.stageH != null && Math.abs(st.clientHeight - V.stageH) > 2) renderPages(0);
}
function turn(d) {
  if (!V) return;
  const groups = viewGroups(), ng = groupIndex(groups) + d;
  flash(d);
  const l = V.setlist && S.setlists.find(x => x.id === V.setlist);
  if (ng >= groups.length) {
    if (l && V.idx < l.items.length - 1) {
      const next = byId(l.items[V.idx + 1]);
      if (next) { replaceTop('viewer', { scoreId: next.id, setlist: l.id, idx: V.idx + 1 }); toast(`次の曲：${next.title}`); return; }
    }
    toast(l ? 'セットリストの最後の曲です' : '最後のページです'); return;
  }
  if (ng < 0) {
    if (l && V.idx > 0) {
      const prev = byId(l.items[V.idx - 1]);
      if (prev) { replaceTop('viewer', { scoreId: prev.id, setlist: l.id, idx: V.idx - 1, page: lastP(prev) }); toast(`前の曲：${prev.title}`); return; }
    }
    toast('最初のページです'); return;
  }
  V.page = groups[ng][0];
  if (S.settings.autoHide && V.chrome && !V.edit) setChrome(false);
  renderPages(d);
}
function flash(d) { const f = $(d > 0 ? '#flashR' : '#flashL'); if (!f) return; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
function setChrome(on) {
  V.chrome = on;
  $('#full').classList.toggle('chrome-off', !on);
  if (!on && V.thumbs) { V.thumbs = false; $('#vThumbs').hidden = true; }
}
function onStageClick(e) {
  if (!V || V.edit) return;
  if (V.swiped) { V.swiped = false; return; }
  const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, z = S.settings.tapZone / 100;
  if (S.settings.tapTurn && x < z) turn(-1);
  else if (S.settings.tapTurn && x > 1 - z) turn(1);
  else { setChrome(!V.chrome); renderPages(0); }
}
function renderThumbs() {
  const t = $('#vThumbs'), vis = visiblePages(), v = V;
  const pages = pageGroups(v.sc, false).reduce((a, g) => a.concat(g), []);
  t.innerHTML = pages.map(i => `<button class="${vis.indexOf(i) > -1 ? 'cur' : ''}" data-act="vJump" data-p="${i}"><div class="thumb" style="aspect-ratio:1/${aspect(v.sc, i)}">${v.thumbUrls.has(i) ? `<img src="${v.thumbUrls.get(i)}" alt="">` : ''}</div>${i + 1}</button>`).join('');
  const curBtn = t.querySelector('.cur'); if (curBtn) curBtn.scrollIntoView({ inline: 'center', block: 'nearest' });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const i = +en.target.dataset.p;
      if (v.thumbUrls.has(i)) return;
      queued(() => (V === v && v.doc ? thumbOf(v.doc, i, 150) : null)).then(u => {
        if (!u || V !== v) return;
        v.thumbUrls.set(i, u);
        const box = en.target.querySelector('.thumb'); if (box) box.innerHTML = `<img src="${u}" alt="">`;
      }).catch(() => {});
    });
  }, { root: t });
  $$('button', t).forEach(b => io.observe(b));
}

/* annotations */
let annTimer;
const annList = i => (V.ann[i] || (V.ann[i] = []));
let annSaving = Promise.resolve();
function persistAnn(sc, ann) {
  annSaving = (async () => {
    try {
      const count = Object.keys(ann).reduce((a, k) => a + ann[k].length, 0);
      await DB.put('ann', ann, sc.id);
      if (sc.annCount !== count) { sc.annCount = count; await saveScore(sc); }
    } catch (e) { fail(e, '書き込みを保存'); }
  })();
  return annSaving;
}
function saveAnnSoon() { V.dirty = true; clearTimeout(annTimer); const sc = V.sc, ann = V.ann, v = V; annTimer = setTimeout(() => { persistAnn(sc, ann); v.dirty = false; }, 700); }
function setupAnnCanvas(pg, i) {
  const c = pg.querySelector('canvas.ann'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(pg.clientWidth * dpr); c.height = Math.round(pg.clientHeight * dpr);
  drawAnn(c, i);
  const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5]; };
  c.addEventListener('pointerdown', e => {
    if (!V || !V.edit) return;
    if (e.pointerType === 'pen') V.penSeen = true;
    else if (V.penSeen && e.pointerType === 'touch') return; // palm rejection once Apple Pencil has been used
    e.preventDefault(); e.stopPropagation();
    try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const p = pt(e), list = annList(i);
    if (V.tool === 'stamp') { const it = { t: 'stamp', text: V.stamp, x: p[0], y: p[1], color: V.color }; list.push(it); V.undo.push({ i, it, op: 'add' }); drawAnn(c, i); saveAnnSoon(); renderBottom(); return; }
    if (V.tool === 'eraser') { V.drawing = { erase: true, id: e.pointerId }; eraseAt(i, p, c); return; }
    const it = { t: 'stroke', tool: V.tool, color: V.tool === 'marker' ? V.markerColor : V.color, w: V.tool === 'marker' ? 0.022 : V.width, pts: [p] };
    list.push(it); V.undo.push({ i, it, op: 'add' }); V.drawing = { it, id: e.pointerId };
    drawAnn(c, i);
  });
  c.addEventListener('pointermove', e => {
    if (!V || !V.edit || !V.drawing || V.drawing.id !== e.pointerId) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (V.drawing.erase) { eraseAt(i, pt(e), c); return; }
    (evs.length ? evs : [e]).forEach(ev => V.drawing.it.pts.push(pt(ev)));
    drawAnn(c, i);
  });
  const end = e => { if (V && V.drawing && V.drawing.id === e.pointerId) { V.drawing = null; saveAnnSoon(); renderBottom(); } };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  c.addEventListener('click', e => { if (V && V.edit) e.stopPropagation(); });
}
function eraseAt(i, p, c) {
  const list = annList(i), R = 0.025;
  for (let k = list.length - 1; k >= 0; k--) {
    const it = list[k];
    const hit = it.t === 'stamp' ? Math.hypot(it.x - p[0], (it.y - p[1]) * 1.414) < R * 1.4 : it.pts.some(q => Math.hypot(q[0] - p[0], (q[1] - p[1]) * 1.414) < R);
    if (hit) { list.splice(k, 1); V.undo.push({ i, it, op: 'remove', k }); }
  }
  drawAnn(c, i);
}
function drawAnn(c, i) {
  const ctx = c.getContext('2d'), W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  for (const it of annList(i)) {
    ctx.save();
    if (it.t === 'stamp') {
      ctx.fillStyle = it.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const num = /^\d$/.test(it.text);
      ctx.font = num ? `700 ${W * 0.03}px Helvetica, Arial, sans-serif` : `italic 700 ${W * 0.045}px "Times New Roman", Times, serif`;
      ctx.fillText(it.text, it.x * W, it.y * H);
    } else {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = it.color;
      const pts = it.pts;
      if (it.tool === 'marker') {
        ctx.globalAlpha = 0.38; ctx.lineWidth = it.w * W; ctx.beginPath();
        pts.forEach((q, k) => (k ? ctx.lineTo(q[0] * W, q[1] * H) : ctx.moveTo(q[0] * W, q[1] * H)));
        if (pts.length === 1) ctx.lineTo(pts[0][0] * W + 0.1, pts[0][1] * H);
        ctx.stroke();
      } else {
        if (pts.length === 1) { ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(pts[0][0] * W, pts[0][1] * H, it.w * W / 2, 0, 7); ctx.fill(); }
        for (let k = 1; k < pts.length; k++) {
          ctx.lineWidth = it.w * W * (0.55 + (pts[k][2] || 0.5));
          ctx.beginPath(); ctx.moveTo(pts[k - 1][0] * W, pts[k - 1][1] * H); ctx.lineTo(pts[k][0] * W, pts[k][1] * H); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}
function redrawVisible() { $$('#spread .page').forEach(pg => drawAnn(pg.querySelector('canvas.ann'), +pg.dataset.p)); }

/* ---------- Scan: image processing ---------- */
const SCAN = { shots: [], cur: 0, tab: 'adjust' };
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('画像を読み込めませんでした')); };
    img.src = url;
  });
}
async function fileToCanvas(file, max) {
  const img = await loadImage(file);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
/* find the sheet of paper: the largest bright region, then its four extreme corners */
function detectQuad(src) {
  const fallback = [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96], [0.04, 0.96]];
  try {
    const k = 256 / Math.max(src.width, src.height), w = Math.max(8, Math.round(src.width * k)), h = Math.max(8, Math.round(src.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.drawImage(src, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data, n = w * h, g = new Uint8Array(n), hist = new Array(256).fill(0);
    for (let i = 0; i < n; i++) { const v = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 | 0; g[i] = v; hist[v]++; }
    // Otsu threshold
    let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sB = 0, wB = 0, best = 0, th = 128;
    for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, between = wB * wF * (mB - mF) * (mB - mF); if (between > best) { best = between; th = t; } }
    const lab = new Int32Array(n).fill(-1), stack = new Int32Array(n);
    let bestLab = -1, bestSize = 0, labN = 0;
    for (let i = 0; i < n; i++) {
      if (lab[i] !== -1 || g[i] <= th) continue;
      let sp = 0, size = 0; stack[sp++] = i; lab[i] = labN;
      while (sp) {
        const p = stack[--sp]; size++;
        const x = p % w, y = (p / w) | 0;
        if (x > 0 && lab[p - 1] === -1 && g[p - 1] > th) { lab[p - 1] = labN; stack[sp++] = p - 1; }
        if (x < w - 1 && lab[p + 1] === -1 && g[p + 1] > th) { lab[p + 1] = labN; stack[sp++] = p + 1; }
        if (y > 0 && lab[p - w] === -1 && g[p - w] > th) { lab[p - w] = labN; stack[sp++] = p - w; }
        if (y < h - 1 && lab[p + w] === -1 && g[p + w] > th) { lab[p + w] = labN; stack[sp++] = p + w; }
      }
      if (size > bestSize) { bestSize = size; bestLab = labN; }
      labN++;
    }
    if (bestSize < n * 0.12) return fallback;
    let tl = [0, 0, Infinity], tr = [0, 0, -Infinity], br = [0, 0, -Infinity], bl = [0, 0, Infinity];
    for (let i = 0; i < n; i++) {
      if (lab[i] !== bestLab) continue;
      const x = i % w, y = (i / w) | 0;
      if (x + y < tl[2]) tl = [x, y, x + y];
      if (x + y > br[2]) br = [x, y, x + y];
      if (x - y > tr[2]) tr = [x, y, x - y];
      if (x - y < bl[2]) bl = [x, y, x - y];
    }
    const nm = p => [Math.min(1, Math.max(0, (p[0] + 0.5) / w)), Math.min(1, Math.max(0, (p[1] + 0.5) / h))];
    return [nm(tl), nm(tr), nm(br), nm(bl)];
  } catch (e) { return fallback; }
}
function homography(from, to) {
  const A = [], b = [];
  for (let k = 0; k < 4; k++) {
    const [u, v] = from[k], [x, y] = to[k];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    const piv = A[c][c] || 1e-12;
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / piv;
      if (!f) continue;
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => v / (A[i][i] || 1e-12));
}
function warp(src, corners, maxSide) {
  const sw = src.width, sh = src.height;
  const P = corners.map(([x, y]) => [x * sw, y * sh]), [tl, tr, br, bl] = P;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let W = Math.max(dist(tl, tr), dist(bl, br)), H = Math.max(dist(tl, bl), dist(tr, br));
  const k = Math.min(1, maxSide / Math.max(W, H));
  W = Math.max(10, Math.round(W * k)); H = Math.max(10, Math.round(H * k));
  const h = homography([[0, 0], [W, 0], [W, H], [0, H]], P);
  const sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const octx = out.getContext('2d'), od = octx.createImageData(W, H), o = od.data;
  let j = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++, j += 4) {
      const den = h[6] * x + h[7] * y + 1, sx = (h[0] * x + h[1] * y + h[2]) / den, sy = (h[3] * x + h[4] * y + h[5]) / den;
      const x0 = sx | 0, y0 = sy | 0;
      if (sx < 0 || sy < 0 || x0 >= sw - 1 || y0 >= sh - 1) { o[j] = o[j + 1] = o[j + 2] = o[j + 3] = 255; continue; }
      const fx = sx - x0, fy = sy - y0, i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      o[j] = sd[i00] * w00 + sd[i10] * w10 + sd[i01] * w01 + sd[i11] * w11;
      o[j + 1] = sd[i00 + 1] * w00 + sd[i10 + 1] * w10 + sd[i01 + 1] * w01 + sd[i11 + 1] * w11;
      o[j + 2] = sd[i00 + 2] * w00 + sd[i10 + 2] * w10 + sd[i01 + 2] * w01 + sd[i11 + 2] * w11;
      o[j + 3] = 255;
    }
  }
  octx.putImageData(od, 0, 0);
  return out;
}
/* even out shadows: divide by an estimate of the paper brightness around each pixel */
function background(g, w, h) {
  const B = Math.max(8, Math.round(Math.max(w, h) / 48)), gw = Math.ceil(w / B), gh = Math.ceil(h / B);
  let grid = new Float32Array(gw * gh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = ((y / B) | 0) * gw + ((x / B) | 0); if (g[y * w + x] > grid[k]) grid[k] = g[y * w + x]; }
  for (let pass = 0; pass < 2; pass++) {
    const n2 = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) { s += grid[yy * gw + xx]; c++; } }
      n2[y * gw + x] = s / c;
    }
    grid = n2;
  }
  return (x, y) => {
    const gx = Math.min(gw - 1.001, Math.max(0, x / B - 0.5)), gy = Math.min(gh - 1.001, Math.max(0, y / B - 0.5));
    const x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1);
    return grid[y0 * gw + x0] * (1 - fx) * (1 - fy) + grid[y0 * gw + x1] * fx * (1 - fy) + grid[y1 * gw + x0] * (1 - fx) * fy + grid[y1 * gw + x1] * fx * fy;
  };
}
function applyFilter(c, mode) {
  if (mode === 'color') return c;
  const ctx = c.getContext('2d'), w = c.width, h = c.height, id = ctx.getImageData(0, 0, w, h), d = id.data, n = w * h;
  const g = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) g[i] = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000;
  const bg = mode === 'gray' ? null : background(g, w, h);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    let v = g[i];
    if (bg) {
      v = v / Math.max(bg(x, y), 1) * 255;
      if (mode === 'bw') v = v < 170 ? 0 : 255;
      else { let t = (v - 45) / 190; t = t < 0 ? 0 : t > 1 ? 1 : t; v = Math.pow(t, 1.6) * 255; }
    }
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}
function rotateCanvas(c, deg) {
  if (!deg) return c;
  const o = document.createElement('canvas'), side = deg === 90 || deg === 270;
  o.width = side ? c.height : c.width; o.height = side ? c.width : c.height;
  const ctx = o.getContext('2d');
  ctx.translate(o.width / 2, o.height / 2); ctx.rotate(deg * Math.PI / 180); ctx.drawImage(c, -c.width / 2, -c.height / 2);
  freeCanvas(c);
  return o;
}
function processShot(src, shot, maxSide) { return rotateCanvas(applyFilter(warp(src, shot.corners, maxSide), shot.filter), shot.rot); }
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('画像を作成できませんでした'))), type, q));

async function addShots(files) {
  files = Array.from(files || []).filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|heic|heif)$/i.test(f.name));
  if (!files.length) return;
  toast('写真を読み込んでいます…', 20000);
  for (const f of files) {
    try {
      const disp = await fileToCanvas(f, 1400);
      const corners = detectQuad(disp);
      const t = document.createElement('canvas'), k = 120 / Math.max(disp.width, disp.height);
      t.width = Math.round(disp.width * k); t.height = Math.round(disp.height * k); t.getContext('2d').drawImage(disp, 0, 0, t.width, t.height);
      SCAN.shots.push({ file: f, disp, corners, auto: corners.map(c => c.slice()), filter: 'auto', rot: 0, preview: null, thumb: t.toDataURL('image/jpeg', 0.7) });
      freeCanvas(t);
    } catch (e) { fail(e, '写真を読み込み'); }
  }
  toast('', 1);
  if (!SCAN.shots.length) return;
  SCAN.cur = SCAN.shots.length - 1; SCAN.tab = 'adjust';
  if (cur().name === 'scanReview') SCREENS.scanReview(); else go('scanReview');
}
function resetScan() { SCAN.shots.forEach(s => { freeCanvas(s.disp); freeCanvas(s.preview); }); SCAN.shots = []; SCAN.cur = 0; }

SCREENS.scanReview = () => {
  const full = $('#full');
  full.className = '';
  if (!SCAN.shots.length) { setRoot('library', { folder: 'all' }); return; }
  const s = SCAN.shots[SCAN.cur];
  const names = { auto: '自動補正', bw: '白黒', gray: 'グレー', color: 'カラー' };
  full.innerHTML = `
    <header class="v-top"><button class="tbtn" data-act="scanCancel">キャンセル</button>
      <div class="v-title"><b class="plain">紙の楽譜を取り込む</b><small>${SCAN.cur + 1} / ${SCAN.shots.length}ページ</small></div>
      <button class="btn primary sm" data-act="scanSaveForm">保存…</button></header>
    <div class="review">
      <div class="rv-main">
        <div class="rv-tabs"><button class="${SCAN.tab === 'adjust' ? 'on' : ''}" data-act="rvTab" data-tab="adjust">範囲を調整</button><button class="${SCAN.tab === 'result' ? 'on' : ''}" data-act="rvTab" data-tab="result">仕上がり</button></div>
        <div class="rv-area" id="rvArea"></div>
      </div>
      <aside class="rv-side">
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="scanCamera">${ic('camera')}撮り足す</button><button class="btn sm" data-act="scanPhotos">${ic('photo')}写真を追加</button></div>
        <div><h3>四隅</h3><p class="help" style="margin:6px 0 10px">緑の丸をドラッグして、楽譜の角に合わせます。</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="rvAuto">${ic('wand')}自動検出</button><button class="btn sm" data-act="rvWhole">写真全体</button></div></div>
        <div><h3>色の補正</h3><div class="seg" style="margin-top:8px">${Object.keys(names).map(k => `<button class="${s.filter === k ? 'on' : ''}" data-act="rvFilter" data-f="${k}">${names[k]}</button>`).join('')}</div>
          <p class="help" style="margin-top:6px">自動補正は影を取り除き、紙を白く整えます。</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="rvRotate">${ic('rotate')}回転</button><button class="btn sm danger" data-act="rvDelete">${ic('trash')}このページを削除</button></div>
        <div><h3>ページ</h3><div class="rv-pages" style="margin-top:8px">${SCAN.shots.map((x, k) => `<button class="${k === SCAN.cur ? 'cur' : ''}" data-act="rvPage" data-k="${k}"><div class="thumb"><img src="${x.thumb}" alt=""></div>${k + 1}</button>`).join('')}</div></div>
      </aside>
    </div>`;
  requestAnimationFrame(rvLayout);
};
function rvLayout() {
  const area = $('#rvArea'); if (!area) return;
  const s = SCAN.shots[SCAN.cur];
  const r = area.getBoundingClientRect(), aw = r.width - 48, ah = r.height - 34;
  if (SCAN.tab === 'adjust') {
    const k = Math.min(aw / s.disp.width, ah / s.disp.height);
    const w = Math.floor(s.disp.width * k), h = Math.floor(s.disp.height * k);
    area.innerHTML = `<div class="rv-photo" id="rvPhoto" style="width:${w}px;height:${h}px">
      <svg class="quad" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon id="quad" fill="rgba(79,209,193,.14)" stroke="#4FD1C1" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
      ${s.corners.map((c, k) => `<div class="handle" data-k="${k}" style="left:${c[0] * 100}%;top:${c[1] * 100}%" role="slider" aria-label="角${k + 1}"></div>`).join('')}</div>`;
    const ph = $('#rvPhoto');
    s.disp.style.width = w + 'px'; s.disp.style.height = h + 'px';
    ph.insertBefore(s.disp, ph.firstChild);
    drawQuad(); bindHandles();
  } else {
    area.innerHTML = '<div class="rv-busy">仕上がりを作成しています…</div>';
    setTimeout(() => {
      if (!s.preview) s.preview = processShot(s.disp, s, 1400);
      if (SCAN.tab !== 'result' || SCAN.shots[SCAN.cur] !== s || !$('#rvArea')) return;
      const k = Math.min(aw / s.preview.width, ah / s.preview.height);
      s.preview.style.width = Math.floor(s.preview.width * k) + 'px'; s.preview.style.height = Math.floor(s.preview.height * k) + 'px';
      s.preview.style.boxShadow = '0 6px 20px rgba(0,0,0,.4)';
      area.innerHTML = '';
      area.appendChild(s.preview);
    }, 30);
  }
}
function drawQuad() { const s = SCAN.shots[SCAN.cur], q = $('#quad'); if (q) q.setAttribute('points', s.corners.map(c => `${c[0] * 100},${c[1] * 100}`).join(' ')); }
function bindHandles() {
  const photo = $('#rvPhoto');
  $$('.handle', photo).forEach(h => {
    h.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const k = +h.dataset.k, s = SCAN.shots[SCAN.cur];
      const move = ev => {
        const r = photo.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
        s.corners[k] = [x, y]; h.style.left = x * 100 + '%'; h.style.top = y * 100 + '%'; drawQuad();
      };
      const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); freeCanvas(s.preview); s.preview = null; };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
  });
}
async function saveScan(meta, onProgress) {
  const pdf = await PDFLib.PDFDocument.create();
  for (let k = 0; k < SCAN.shots.length; k++) {
    const s = SCAN.shots[k];
    const src = await fileToCanvas(s.file, 2600);
    const out = processShot(src, s, 2200);
    freeCanvas(src);
    const blob = await toBlob(out, 'image/jpeg', 0.85);
    const ow = out.width, oh = out.height;
    freeCanvas(out);
    const img = await pdf.embedJpg(await blob.arrayBuffer());
    const w = 595.28, h = w * oh / ow;
    pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
    onProgress((k + 1) / (SCAN.shots.length + 1));
  }
  pdf.setTitle(meta.title);
  const buf = u8ToAb(await pdf.save());
  const a = await analyzePdf(buf, meta.title);
  onProgress(1);
  return storeScore(a, Object.assign({ source: 'scan' }, meta));
}

/* ---------- Sheets ---------- */
function openSheet(html, onMount) {
  const root = $('#sheet-root');
  root.hidden = false;
  root.innerHTML = `<div class="backdrop" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  if (onMount) onMount(root.querySelector('.sheet'));
}
function closeSheet() { const r = $('#sheet-root'); r.hidden = true; r.innerHTML = ''; }
const sheetHead = (title, sub) => `<div class="sheet-head"><h2>${title}${sub ? `<p>${sub}</p>` : ''}</h2><button class="iconbtn" data-act="closeSheet" aria-label="閉じる">${ic('close')}</button></div>`;
function progressSheet(title) {
  openSheet(`${sheetHead(title)}<div class="progress"><i id="prBar"></i></div><p class="help" id="prText">準備しています…</p>`);
  return (f, text) => { const b = $('#prBar'); if (b) b.style.width = Math.round(f * 100) + '%'; const t = $('#prText'); if (t && text) t.textContent = text; };
}

function sheetAdd() {
  openSheet(`${sheetHead('楽譜を追加', '取り込んだ楽譜はこの端末の中に保存され、オフラインでも使えます')}
    <div class="opts">
      <button class="opt" data-act="pickPdf"><span class="oi">${ic('file')}</span><span class="grow"><b>PDFを取り込む</b><small>ファイルアプリやiCloud Driveから選びます。複数まとめて選べます</small></span></button>
      <button class="opt" data-act="scanCamera"><span class="oi">${ic('camera')}</span><span class="grow"><b>紙の楽譜をスキャン</b><small>カメラで1ページずつ撮影します。傾き・影は自動で補正します</small></span></button>
      <button class="opt" data-act="scanPhotos"><span class="oi">${ic('photo')}</span><span class="grow"><b>写真から取り込む</b><small>撮影済みの楽譜の写真を選んで補正します</small></span></button>
    </div>
    <p class="help">メールやLINEで届いたPDFは、いったん「ファイル」に保存してから選んでください。譜めくりから送られた楽譜ファイル（.fumekuri.json）も同じ方法で取り込めます。</p>`);
}
function sheetMore(id) {
  const s = byId(id);
  openSheet(`${sheetHead(esc(s.title), esc(s.composer))}
    <div class="menu">
      <button data-open="${id}">${ic('music')}開く</button>
      <button data-act="share" data-id="${id}">${ic('share')}共有</button>
      <button data-act="export" data-id="${id}">${ic('pdf')}PDFで書き出す</button>
      <button data-act="pageSetup" data-id="${id}">${ic('book')}ページ設定（見開き・表示範囲）</button>
      <button data-act="toSetlist" data-id="${id}">${ic('list')}セットリストに追加</button>
      <button data-act="moveAsk" data-ids="${id}">${ic('move')}フォルダに移動${folderName(s.folder) ? `（今：${esc(folderName(s.folder))}）` : ''}</button>
      <button data-act="dupAsk" data-id="${id}">${ic('copy')}複製（コピーを作る）</button>
      <button data-act="info" data-id="${id}">${ic('info')}情報を編集</button>
      <button class="danger" data-act="delAsk" data-id="${id}">${ic('trash')}削除</button>
    </div>`);
}
function sheetShare(id) {
  const s = byId(id);
  openSheet(`${sheetHead(`「${esc(s.title)}」を共有`, '送る方法を選んでください')}
    <div class="opts">
      <button class="opt" data-act="sharePdf" data-id="${id}"><span class="oi">${ic('pdf')}</span><span class="grow"><b>PDFとして送る</b><small>AirDrop・メール・LINEなど。書き込みも印刷された状態で届きます</small></span></button>
      <button class="opt" data-act="shareFmk" data-id="${id}"><span class="oi">${ic('box')}</span><span class="grow"><b>譜めくり形式で送る</b><small>相手も譜めくりを使っている場合。書き込みを消したり直したりできる状態で届きます</small></span></button>
      <button class="opt" disabled><span class="oi">${ic('group')}</span><span class="grow"><b>グループに共有</b><small>今後のバージョンで対応予定です</small></span></button>
    </div>
    <p class="warn">${ic('info')}<span>市販の楽譜は、著作権者に認められた範囲で共有してください。</span></p>`);
}
function sheetExport(id) {
  const s = byId(id);
  const inViewer = V && V.sc.id === id;
  openSheet(`${sheetHead('PDFで書き出す', esc(s.title))}
    <div class="field"><label>ページ</label><div class="radio-row" data-name="range">
      ${hasRange(s) ? `<button class="on" data-act="radio" data-v="range">表示範囲（${firstP(s) + 1}〜${lastP(s) + 1}ページ）</button>` : ''}
      <button class="${hasRange(s) ? '' : 'on'}" data-act="radio" data-v="all">すべて（${s.pages}ページ）</button>
      ${inViewer ? '<button data-act="radio" data-v="current">表示中のページ</button>' : ''}</div></div>
    <div class="field"><label>書き込み</label><div class="radio-row" data-name="ann"><button class="${s.annCount ? 'on' : ''}" data-act="radio" data-v="1">含める</button><button class="${s.annCount ? '' : 'on'}" data-act="radio" data-v="0">含めない</button></div></div>
    <div class="field"><label for="exName">ファイル名</label><input id="exName" value="${esc(safeName(s.title))}.pdf" autocomplete="off"></div>
    <div class="sheet-foot"><button class="btn" data-act="closeSheet">キャンセル</button><button class="btn primary" data-act="exportDo" data-id="${id}">${ic('pdf')}書き出す</button></div>`);
}
function sheetInfo(id) {
  const s = byId(id);
  openSheet(`${sheetHead('楽譜の情報')}
    <div class="fields">${infoFields(s.title, s.composer, s.folder)}</div>
    <dl class="kv"><dt>ページ数</dt><dd>${s.pages}ページ</dd><dt>表示範囲</dt><dd>${firstP(s) + 1}〜${lastP(s) + 1}ページ・${s.spreadStart === 'even' ? '偶数' : '奇数'}ページから見開き</dd><dt>取り込み方法</dt><dd>${s.source === 'scan' ? '紙の楽譜をスキャン' : 'PDFを取り込み'}</dd><dt>ファイルサイズ</dt><dd>${fmtMB(s.size || 0)}</dd><dt>追加した日</dt><dd>${new Date(s.added).toLocaleDateString('ja-JP')}</dd><dt>書き込み</dt><dd>${s.annCount ? s.annCount + '件' : 'なし'}</dd></dl>
    <div class="sheet-foot"><button class="btn" data-act="closeSheet">キャンセル</button><button class="btn primary" data-act="infoSave" data-id="${id}">保存</button></div>`);
}
let PS = null;
function sheetPageSetup(id) {
  const s = byId(id);
  PS = { id, spreadStart: s.spreadStart || 'odd', first: firstP(s), last: lastP(s) };
  const opts = sel => Array.from({ length: s.pages }, (_, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${i + 1}ページ</option>`).join('');
  openSheet(`${sheetHead('ページ設定', esc(s.title) + `（全${s.pages}ページ）`)}
    <div class="field"><label>見開きの組み方</label>
      <div class="radio-row">
        <button class="${PS.spreadStart === 'odd' ? 'on' : ''}" data-act="psStart" data-v="odd">奇数ページから（1・2 / 3・4 …）</button>
        <button class="${PS.spreadStart === 'even' ? 'on' : ''}" data-act="psStart" data-v="even">偶数ページから（1 / 2・3 / 4・5 …）</button>
      </div>
      <small class="help">1ページ目が表紙のPDFは「偶数ページから」にすると、印刷した楽譜と同じ見開きになります。</small>
    </div>
    <div class="field"><label>表示するページ</label>
      <div class="range-row">
        <label class="sr" for="psFirst">最初のページ</label><span>最初</span><select class="sel" id="psFirst">${opts(PS.first)}</select>
        <span>〜</span>
        <label class="sr" for="psLast">最後のページ</label><span>最後</span><select class="sel" id="psLast">${opts(PS.last)}</select>
        <button class="btn sm ghost" data-act="psReset">すべて表示に戻す</button>
      </div>
      <small class="help">表紙・解説・白紙のページを飛ばせます。範囲外のページは削除されず、あとから戻せます。</small>
    </div>
    <div class="field"><label>見開きの確認</label><div class="ps-prev" id="psPrev"></div><small class="help" id="psSum"></small></div>
    <div class="sheet-foot"><button class="btn" data-act="closeSheet">キャンセル</button><button class="btn primary" data-act="psSave">保存</button></div>`, sh => {
    sh.classList.add('wide');
    $('#psFirst', sh).addEventListener('change', e => { PS.first = +e.target.value; if (PS.last < PS.first) { PS.last = PS.first; $('#psLast').value = PS.last; } psPreview(); });
    $('#psLast', sh).addEventListener('change', e => { PS.last = +e.target.value; if (PS.first > PS.last) { PS.first = PS.last; $('#psFirst').value = PS.first; } psPreview(); });
    psPreview();
  });
}
function psPreview() {
  const s = byId(PS.id), off = i => i < PS.first || i > PS.last;
  const mini = i => `<div class="ps-p ${off(i) ? 'off' : ''}"><i style="aspect-ratio:1/${aspect(s, i)}"></i><span>${i + 1}</span></div>`;
  const groups = []; let key = null;
  for (let i = 0; i < s.pages; i++) { const k = pairKey(PS.spreadStart, i); if (k !== key) { groups.push([]); key = k; } groups[groups.length - 1].push(i); }
  $('#psPrev').innerHTML = groups.map(g => `<div class="ps-g ${g.every(off) ? 'off' : ''}">${g.map(mini).join('')}</div>`).join('');
  const shown = pageGroups(s, true, PS);
  const list = shown.length > 12 ? shown.slice(0, 12).map(g => g.map(i => i + 1).join('・')).join(' / ') + ' …' : shown.map(g => g.map(i => i + 1).join('・')).join(' / ');
  $('#psSum').textContent = `${PS.first + 1}〜${PS.last + 1}ページを表示（${PS.last - PS.first + 1}ページ）。見開きでは ${list} の順にめくります。`;
}
function sheetMove(ids) {
  const one = ids.length === 1 ? byId(ids[0]) : null;
  const curF = one ? (folderName(one.folder) ? one.folder : '') : null;
  const row = (fid, name) => `<button data-act="moveDo" data-f="${fid}" data-ids="${ids.join(',')}" ${curF === fid ? 'disabled' : ''}>${ic(curF === fid ? 'check' : 'folder')}<span>${esc(name)}${curF === fid ? '（今ここ）' : ''}</span></button>`;
  openSheet(`${sheetHead('フォルダに移動', one ? esc(one.title) : `${ids.length}曲`)}
    <div class="menu">${row('', 'フォルダなし')}${S.folders.map(f => row(f.id, f.name)).join('')}</div>
    <div class="sheet-foot"><button class="btn" data-act="newFolder" data-move="${ids.join(',')}">${ic('plus')}新しいフォルダを作って移動</button></div>`);
}
async function moveScores(ids, folderId) {
  for (const id of ids) { const s = byId(id); if (s) { s.folder = folderId; await saveScore(s); } }
}
function sheetDup(id) {
  const s = byId(id);
  openSheet(`${sheetHead('複製（コピーを作る）', esc(s.title))}
    <div class="fields">${infoFields(s.title + '（コピー）', s.composer, folderName(s.folder) ? s.folder : '')}</div>
    <div class="field"><label>書き込み</label><div class="radio-row" data-name="dupAnn">
      <button class="${s.annCount ? 'on' : ''}" data-act="radio" data-v="1">書き込みもコピー</button>
      <button class="${s.annCount ? '' : 'on'}" data-act="radio" data-v="0">書き込みなし（きれいな楽譜）</button></div></div>
    <p class="help">ページ設定（見開き・表示範囲）もそのままコピーします。コピーは元の楽譜とは別に保存されるので、片方に書き込んでももう片方は変わりません（保存容量を${fmtMB(s.size || 0)}使います）。</p>
    <div class="sheet-foot"><button class="btn" data-act="closeSheet">キャンセル</button><button class="btn primary" data-act="dupDo" data-id="${id}">${ic('copy')}複製する</button></div>`);
}
async function duplicateScore(s, meta) {
  await annSaving;
  const buf = await DB.get('files', s.id);
  if (!buf) throw new Error('楽譜ファイルが見つかりません');
  const ann = meta.withAnn ? ((await DB.get('ann', s.id)) || {}) : {};
  const n = Object.assign({}, s, {
    id: uid(), title: meta.title, composer: meta.composer, folder: meta.folder,
    aspects: (s.aspects || []).slice(), added: Date.now(), lastOpened: 0, annCount: meta.withAnn ? (s.annCount || 0) : 0,
  });
  await DB.put('files', buf, n.id);
  if (meta.withAnn) await DB.put('ann', ann, n.id);
  await saveScore(n);
  S.scores.push(n);
  return n;
}
async function deleteScore(id) {
  await DB.del('files', id); await DB.del('ann', id); await DB.del('scores', id);
  S.scores = S.scores.filter(x => x.id !== id);
  S.setlists.forEach(l => { l.items = l.items.filter(x => x !== id); });
  S.selected.delete(id);
}

function sheetToSetlist(id) {
  const s = byId(id);
  openSheet(`${sheetHead('セットリストに追加', esc(s.title))}
    ${S.setlists.length ? `<div class="opts">${S.setlists.map(l => { const inL = l.items.indexOf(id) > -1; return `<button class="opt" data-act="toSetlistDo" data-l="${l.id}" data-id="${id}" ${inL ? 'disabled' : ''}><span class="oi">${ic(inL ? 'check' : 'list')}</span><span class="grow"><b>${esc(l.name)}</b><small>${inL ? '追加済み' : `${l.items.length}曲 · ${esc(l.date)}`}</small></span></button>`; }).join('')}</div>` : '<p class="help">まだセットリストがありません。</p>'}
    <div class="sheet-foot"><button class="btn" data-act="newSetlist" data-with="${id}">${ic('plus')}新しいセットリストを作って追加</button></div>`);
}
function sheetPickForSetlist(lid) {
  const l = S.setlists.find(x => x.id === lid);
  const rest = S.scores.filter(s => l.items.indexOf(s.id) < 0).sort((a, b) => a.title.localeCompare(b.title, 'ja'));
  openSheet(`${sheetHead('曲を追加', esc(l.name))}
    <div class="menu">${rest.map(s => `<button data-act="toSetlistDo" data-l="${lid}" data-id="${s.id}" data-stay="1"><span class="mthumb">${thumbHTML(s)}</span><span><b style="display:block;font-size:14px">${esc(s.title)}</b><small style="color:var(--ink-2)">${esc(s.composer)}</small></span></button>`).join('') || '<p style="padding:14px;color:var(--ink-2)">追加できる曲がありません</p>'}</div>`);
}
function sheetName(title, label, value, act, extra = '') {
  openSheet(`${sheetHead(title)}
    <div class="field"><label for="nmInput">${label}</label><input id="nmInput" value="${esc(value)}" autocomplete="off"></div>${extra}
    <div class="sheet-foot"><button class="btn" data-act="closeSheet">キャンセル</button><button class="btn primary" ${act}>保存</button></div>`, sh => { setTimeout(() => { const i = $('#nmInput', sh); if (i) i.focus(); }, 50); });
}
function sheetConfirm(title, sub, btnLabel, act) {
  openSheet(`${sheetHead(title, sub)}<div class="sheet-foot"><button class="btn" data-act="closeSheet">キャンセル</button><button class="btn danger-fill" ${act}>${btnLabel}</button></div>`);
}

/* ---------- Actions ---------- */
const ACT = {
  back: () => back(),
  closeSheet: () => closeSheet(),
  hideInstall: () => { try { localStorage.setItem('fmk-install-hint', '1'); } catch (e) { /* ignore */ } render(); },
  add: () => sheetAdd(),
  pickPdf: () => { closeSheet(); const i = $('#inPdf'); i.value = ''; i.click(); },
  scanCamera: () => { closeSheet(); const i = $('#inCam'); i.value = ''; i.click(); },
  scanPhotos: () => { closeSheet(); const i = $('#inPhotos'); i.value = ''; i.click(); },
  sample: async () => {
    try {
      toast('サンプル楽譜を作成しています…', 10000);
      const a = await analyzePdf(await makeSamplePdf(), 'サンプル：練習曲');
      const s = await storeScore(a, { title: 'サンプル：練習曲', composer: '譜めくり', spreadStart: 'even' });
      s.first = 1; await saveScore(s);
      S.newId = s.id; setRoot('library', { folder: 'all' });
      toast('サンプルを追加しました。1ページ目の表紙は「ページ設定」で表示範囲から外してあります', 4500);
    } catch (e) { fail(e, 'サンプルを作成'); }
  },
  importCancel: () => { PENDING = null; back(); },
  importSave: async () => {
    const a = PENDING; if (!a) return;
    try {
      const s = await storeScore(a, { title: $('#fTitle').value.trim() || a.title, composer: $('#fComposer').value.trim(), folder: $('#fFolder').value, spreadStart: radioVal('spreadStart') || 'odd' });
      PENDING = null; S.newId = s.id;
      setRoot('library', { folder: 'all' }); toast(`「${s.title}」を追加しました`);
    } catch (e) { fail(e, '楽譜を保存'); }
  },
  radio: (d, el) => { $$('button', el.parentElement).forEach(b => b.classList.toggle('on', b === el)); },

  /* scan */
  scanCancel: () => sheetConfirm('取り込みをやめますか？', `撮影した${SCAN.shots.length}ページは保存されません`, 'やめる', 'data-act="scanDiscard"'),
  scanDiscard: () => { resetScan(); back(); },
  rvTab: d => { SCAN.tab = d.tab; SCREENS.scanReview(); },
  rvFilter: d => { const s = SCAN.shots[SCAN.cur]; s.filter = d.f; freeCanvas(s.preview); s.preview = null; SCAN.tab = 'result'; SCREENS.scanReview(); },
  rvRotate: () => { const s = SCAN.shots[SCAN.cur]; s.rot = (s.rot + 90) % 360; freeCanvas(s.preview); s.preview = null; SCAN.tab = 'result'; SCREENS.scanReview(); },
  rvAuto: () => { const s = SCAN.shots[SCAN.cur]; s.corners = s.auto.map(c => c.slice()); freeCanvas(s.preview); s.preview = null; SCAN.tab = 'adjust'; SCREENS.scanReview(); },
  rvWhole: () => { const s = SCAN.shots[SCAN.cur]; s.corners = [[0, 0], [1, 0], [1, 1], [0, 1]]; freeCanvas(s.preview); s.preview = null; SCAN.tab = 'adjust'; SCREENS.scanReview(); },
  rvPage: d => { SCAN.cur = +d.k; SCREENS.scanReview(); },
  rvDelete: () => {
    const [s] = SCAN.shots.splice(SCAN.cur, 1); freeCanvas(s.disp); freeCanvas(s.preview);
    if (!SCAN.shots.length) { back(); toast('ページがなくなったため、取り込みをやめました'); return; }
    SCAN.cur = Math.min(SCAN.cur, SCAN.shots.length - 1); SCREENS.scanReview();
  },
  scanSaveForm: () => openSheet(`${sheetHead('スキャンした楽譜を保存', `${SCAN.shots.length}ページ`)}
    <div class="fields">${infoFields('', '', currentFolderForImport())}</div>
    <div class="sheet-foot"><button class="btn" data-act="closeSheet">戻る</button><button class="btn primary" data-act="scanSave">ライブラリに追加</button></div>`),
  scanSave: async () => {
    const meta = { title: $('#fTitle').value.trim() || `スキャン ${new Date().toLocaleDateString('ja-JP')}`, composer: $('#fComposer').value.trim(), folder: $('#fFolder').value };
    const prog = progressSheet('楽譜を作成しています');
    try {
      const s = await saveScan(meta, f => prog(f, `${Math.min(SCAN.shots.length, Math.ceil(f * SCAN.shots.length))} / ${SCAN.shots.length}ページを補正中…`));
      resetScan(); S.newId = s.id; setRoot('library', { folder: 'all' });
      toast(`「${s.title}」を追加しました（${s.pages}ページ）`);
    } catch (e) { closeSheet(); fail(e, '楽譜を保存'); }
  },

  /* share & export */
  share: d => sheetShare(d.id),
  sharePdf: async d => {
    const s = byId(d.id), prog = progressSheet('PDFを作成しています');
    try { const f = await buildExport(s, { range: hasRange(s) ? 'range' : 'all', withAnn: true }, p => prog(p, 'ページを書き出しています…')); sheetReady(f, 'PDFができました', '「送る・保存する」から、AirDrop・メール・LINE・ファイルへの保存などを選べます。'); }
    catch (e) { closeSheet(); fail(e, 'PDFを作成'); }
  },
  shareFmk: async d => {
    const s = byId(d.id); progressSheet('ファイルを作成しています');
    try { const f = await buildFmk(s); sheetReady(f, '楽譜ファイルができました', '受け取った人は、ファイルを「ファイル」に保存してから、譜めくりの「楽譜を追加」→「PDFを取り込む」で選びます。'); }
    catch (e) { closeSheet(); fail(e, 'ファイルを作成'); }
  },
  shareReady: () => { if (READY) shareFile(READY); },
  export: d => sheetExport(d.id),
  exportDo: async d => {
    const s = byId(d.id), opt = { range: radioVal('range') || 'all', withAnn: radioVal('ann') === '1', name: $('#exName').value.trim() };
    const prog = progressSheet('PDFを作成しています');
    try { const f = await buildExport(s, opt, p => prog(p, 'ページを書き出しています…')); sheetReady(f, 'PDFができました'); }
    catch (e) { closeSheet(); fail(e, 'PDFを作成'); }
  },

  /* score menu */
  info: d => sheetInfo(d.id),
  infoSave: async d => {
    const s = byId(d.id);
    s.title = $('#fTitle').value.trim() || s.title; s.composer = $('#fComposer').value.trim(); s.folder = $('#fFolder').value;
    await saveScore(s); closeSheet(); render(); toast('保存しました');
  },
  pageSetup: d => sheetPageSetup(d.id),
  psStart: (d, el) => { PS.spreadStart = d.v; ACT.radio(d, el); psPreview(); },
  psReset: () => { const s = byId(PS.id); PS.first = 0; PS.last = s.pages - 1; $('#psFirst').value = 0; $('#psLast').value = PS.last; psPreview(); },
  psSave: async () => {
    const s = byId(PS.id);
    s.spreadStart = PS.spreadStart; s.first = PS.first; s.last = PS.last;
    await saveScore(s);
    closeSheet();
    if (V && V.sc.id === s.id) { V.page = Math.max(s.first, Math.min(s.last, V.page)); renderBottom(); renderPages(0); }
    else render();
    toast(`ページ設定を保存しました（${s.first + 1}〜${s.last + 1}ページ・${s.spreadStart === 'even' ? '偶数' : '奇数'}ページから見開き）`);
  },
  delAsk: d => { const s = byId(d.id); sheetConfirm(`「${esc(s.title)}」を削除しますか？`, '書き込みも一緒に削除されます。元に戻せません', '削除', `data-act="delDo" data-id="${d.id}"`); },
  delDo: async d => {
    const s = byId(d.id);
    try {
      await deleteScore(s.id); await saveSetlists();
      render(); refreshUsage().then(renderSidebar); toast(`「${s.title}」を削除しました`);
    } catch (e) { fail(e, '削除'); }
  },

  /* select mode, move, duplicate */
  selToggle: () => { S.selecting = !S.selecting; S.selected.clear(); render(); },
  selAll: d => { d.ids.split(',').filter(Boolean).forEach(id => (d.on === '1' ? S.selected.add(id) : S.selected.delete(id))); SCREENS.library(cur().params); },
  moveAsk: d => { const ids = (d.ids || '').split(',').filter(Boolean); if (ids.length) sheetMove(ids); },
  moveDo: async d => {
    const ids = d.ids.split(',').filter(Boolean), name = d.f ? folderName(d.f) : 'フォルダなし';
    try {
      await moveScores(ids, d.f);
      S.selecting = false; S.selected.clear(); render();
      toast(ids.length === 1 ? `「${byId(ids[0]).title}」を「${name}」に移動しました` : `${ids.length}曲を「${name}」に移動しました`);
    } catch (e) { fail(e, '移動'); }
  },
  dupAsk: d => sheetDup(d.id),
  dupDo: async d => {
    const s = byId(d.id);
    const meta = { title: $('#fTitle').value.trim() || s.title + '（コピー）', composer: $('#fComposer').value.trim(), folder: $('#fFolder').value, withAnn: radioVal('dupAnn') === '1' };
    progressSheet('複製しています');
    try { const n = await duplicateScore(s, meta); S.newId = n.id; render(); refreshUsage().then(renderSidebar); toast(`「${n.title}」を作りました`); }
    catch (e) { closeSheet(); fail(e, '複製'); }
  },
  dupMany: async d => {
    const ids = d.ids.split(',').filter(Boolean), prog = progressSheet('複製しています');
    try {
      for (let k = 0; k < ids.length; k++) {
        const s = byId(ids[k]);
        await duplicateScore(s, { title: s.title + '（コピー）', composer: s.composer, folder: s.folder, withAnn: true });
        prog((k + 1) / ids.length, `${k + 1} / ${ids.length}曲`);
      }
      S.selecting = false; S.selected.clear(); render(); refreshUsage().then(renderSidebar);
      toast(`${ids.length}曲を複製しました（書き込みもコピー）`);
    } catch (e) { closeSheet(); fail(e, '複製'); }
  },
  delManyAsk: d => { const ids = d.ids.split(',').filter(Boolean); sheetConfirm(`${ids.length}曲を削除しますか？`, '書き込みも一緒に削除されます。元に戻せません', '削除', `data-act="delManyDo" data-ids="${ids.join(',')}"`); },
  delManyDo: async d => {
    const ids = d.ids.split(',').filter(Boolean);
    try {
      for (const id of ids) await deleteScore(id);
      await saveSetlists();
      S.selecting = false; S.selected.clear(); render(); refreshUsage().then(renderSidebar);
      toast(`${ids.length}曲を削除しました`);
    } catch (e) { fail(e, '削除'); }
  },

  /* folders */
  newFolder: d => sheetName('新しいフォルダ', 'フォルダ名', '', `data-act="newFolderDo" data-move="${(d && d.move) || ''}"`),
  newFolderDo: async d => {
    const name = $('#nmInput').value.trim(); if (!name) { toast('名前を入力してください'); return; }
    const f = { id: 'f' + uid(), name }; S.folders.push(f); await saveFolders();
    const ids = (d.move || '').split(',').filter(Boolean);
    if (ids.length) { await moveScores(ids, f.id); S.selecting = false; S.selected.clear(); }
    setRoot('library', { folder: f.id });
    toast(ids.length ? `フォルダ「${name}」を作って${ids.length}曲を移動しました` : `フォルダ「${name}」を作りました`);
  },
  folderMenu: d => {
    const f = S.folders.find(x => x.id === d.id);
    openSheet(`${sheetHead(esc(f.name), 'フォルダ')}<div class="menu"><button data-act="folderRename" data-id="${f.id}">${ic('pen')}名前を変更</button><button class="danger" data-act="folderDelAsk" data-id="${f.id}">${ic('trash')}フォルダを削除</button></div>`);
  },
  folderRename: d => { const f = S.folders.find(x => x.id === d.id); sheetName('フォルダ名を変更', 'フォルダ名', f.name, `data-act="folderRenameDo" data-id="${f.id}"`); },
  folderRenameDo: async d => { const f = S.folders.find(x => x.id === d.id); const n = $('#nmInput').value.trim(); if (!n) return; f.name = n; await saveFolders(); render(); },
  folderDelAsk: d => { const f = S.folders.find(x => x.id === d.id); sheetConfirm(`フォルダ「${esc(f.name)}」を削除しますか？`, '中の楽譜は削除されず、「フォルダなし」に移ります', '削除', `data-act="folderDelDo" data-id="${f.id}"`); },
  folderDelDo: async d => {
    S.folders = S.folders.filter(x => x.id !== d.id); await saveFolders();
    for (const s of S.scores) if (s.folder === d.id) { s.folder = ''; await saveScore(s); }
    setRoot('library', { folder: 'all' }); toast('フォルダを削除しました');
  },

  /* setlists */
  newSetlist: d => sheetName('新しいセットリスト', '名前', '', `data-act="newSetlistDo" data-with="${d.with || ''}"`, '<div class="field"><label for="slDate">日付・メモ</label><input id="slDate" placeholder="例：2026年12月20日（日）" autocomplete="off"></div>'),
  newSetlistDo: async d => {
    const name = $('#nmInput').value.trim(); if (!name) { toast('名前を入力してください'); return; }
    const l = { id: 'L' + uid(), name, date: $('#slDate').value.trim(), items: d.with ? [d.with] : [] };
    S.setlists.push(l); await saveSetlists();
    if (d.with) { closeSheet(); renderSidebar(); toast(`「${name}」を作って追加しました`); }
    else { setRoot('setlist', { id: l.id }); toast('セットリストを作りました'); }
  },
  setlistMenu: d => {
    const l = S.setlists.find(x => x.id === d.id);
    openSheet(`${sheetHead(esc(l.name), 'セットリスト')}<div class="menu"><button data-act="setlistRename" data-id="${l.id}">${ic('pen')}名前と日付を変更</button><button class="danger" data-act="setlistDelAsk" data-id="${l.id}">${ic('trash')}セットリストを削除</button></div>`);
  },
  setlistRename: d => { const l = S.setlists.find(x => x.id === d.id); sheetName('セットリストを編集', '名前', l.name, `data-act="setlistRenameDo" data-id="${l.id}"`, `<div class="field"><label for="slDate">日付・メモ</label><input id="slDate" value="${esc(l.date)}" autocomplete="off"></div>`); },
  setlistRenameDo: async d => { const l = S.setlists.find(x => x.id === d.id); const n = $('#nmInput').value.trim(); if (!n) return; l.name = n; l.date = $('#slDate').value.trim(); await saveSetlists(); render(); },
  setlistDelAsk: d => { const l = S.setlists.find(x => x.id === d.id); sheetConfirm(`「${esc(l.name)}」を削除しますか？`, '楽譜そのものは削除されません', '削除', `data-act="setlistDelDo" data-id="${l.id}"`); },
  setlistDelDo: async d => { S.setlists = S.setlists.filter(x => x.id !== d.id); await saveSetlists(); setRoot('setlists'); toast('セットリストを削除しました'); },
  toSetlist: d => sheetToSetlist(d.id),
  toSetlistDo: async d => {
    const l = S.setlists.find(x => x.id === d.l); l.items.push(d.id); await saveSetlists();
    if (d.stay) { render(); sheetPickForSetlist(l.id); toast(`「${byId(d.id).title}」を追加しました`); return; }
    closeSheet(); render(); toast(`「${l.name}」に追加しました`);
  },
  pickForSetlist: d => sheetPickForSetlist(d.id),
  playSetlist: d => { const l = S.setlists.find(x => x.id === d.id); const i = +(d.idx || 0); if (l.items[i]) go('viewer', { scoreId: l.items[i], setlist: l.id, idx: i }); },
  slMove: async d => { const l = S.setlists.find(x => x.id === d.id), i = +d.idx, j = i + +d.dir; [l.items[i], l.items[j]] = [l.items[j], l.items[i]]; await saveSetlists(); render(); },
  slRemove: async d => { const l = S.setlists.find(x => x.id === d.id); const [id] = l.items.splice(+d.idx, 1); await saveSetlists(); render(); const s = byId(id); if (s) toast(`「${s.title}」を外しました`); },

  /* settings */
  pedalTest: () => { S.pedalTest = true; $('#pedalOut').textContent = 'ペダルを踏むか、キーを押してください…'; },
  persist: async () => { await requestPersist(); await refreshUsage(); render(); toast(S.persisted ? 'データが保護されました' : '保護は認められませんでした。ホーム画面に追加して使ってください'); },
  backup: async () => {
    const prog = progressSheet('バックアップを作成しています');
    try { const f = await buildBackup(p => prog(p, `${Math.round(p * S.scores.length)} / ${S.scores.length}曲`)); sheetReady(f, 'バックアップができました', '「送る・保存する」から「"ファイル"に保存」を選び、iCloud Driveなどに保存してください。'); }
    catch (e) { closeSheet(); fail(e, 'バックアップを作成'); }
  },
  restore: () => { const i = $('#inRestore'); i.value = ''; i.click(); },
  wipeAsk: () => sheetConfirm('すべてのデータを削除しますか？', `${S.scores.length}曲の楽譜・書き込み・フォルダ・セットリストが削除されます。元に戻せません`, 'すべて削除', 'data-act="wipeDo"'),
  wipeDo: async () => {
    try {
      await Promise.all(['scores', 'files', 'ann', 'kv'].map(s => DB.clear(s)));
      S.scores = []; S.folders = []; S.setlists = []; S.settings = Object.assign({}, DEFAULT_SETTINGS);
      await refreshUsage(); setRoot('library', { folder: 'all' }); toast('すべてのデータを削除しました');
    } catch (e) { fail(e, '削除'); }
  },
  checkUpdate: async () => {
    if (!('serviceWorker' in navigator)) { toast('この環境ではアップデートを確認できません'); return; }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { toast('最新の状態です'); return; }
      await reg.update();
      if (reg.installing || reg.waiting) { toast('新しいバージョンを読み込んでいます。まもなく再読み込みします'); setTimeout(() => location.reload(), 2500); }
      else toast(`最新の状態です（${VERSION}）`);
    } catch (e) { fail(e, 'アップデートを確認'); }
  },

  /* viewer */
  vPrev: () => turn(-1), vNext: () => turn(1),
  vEdit: () => {
    V.edit = !V.edit;
    $('#full').classList.toggle('editing', V.edit); $('#vEditBtn').classList.toggle('on', V.edit);
    if (V.edit) { setChrome(true); V.thumbs = false; $('#vThumbs').hidden = true; V.undo = []; }
    else if (V.dirty || V.undo.length) { clearTimeout(annTimer); persistAnn(V.sc, V.ann); V.dirty = false; toast('書き込みを保存しました'); }
    renderBottom();
    renderPages(0);
  },
  vThumbs: () => { V.thumbs = !V.thumbs; $('#vThumbs').hidden = !V.thumbs; if (V.thumbs) renderThumbs(); },
  vJump: d => { V.page = +d.p; renderPages(0); },
  vTool: d => { V.tool = d.tool; renderBottom(); },
  vColor: d => { V.color = d.color; S.settings.penColor = d.color; saveSettings(); renderBottom(); },
  vMColor: d => { V.markerColor = d.color; S.settings.markerColor = d.color; saveSettings(); renderBottom(); },
  vWidth: d => { V.width = +d.w; renderBottom(); },
  vStamp: d => { V.stamp = d.stamp; renderBottom(); },
  vUndo: () => {
    const u = V.undo.pop(); if (!u) return;
    const list = annList(u.i);
    if (u.op === 'add') { const k = list.lastIndexOf(u.it); if (k > -1) list.splice(k, 1); } else list.splice(u.k, 0, u.it);
    redrawVisible(); saveAnnSoon(); renderBottom();
  },
};

/* ---------- Global events ---------- */
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    const parts = nav.dataset.nav.split(':'), name = parts[0], arg = parts[1];
    const keepSel = S.selecting && name === 'library';
    if (!keepSel) { S.selecting = false; S.selected.clear(); }
    if (name === 'library') { S.search = ''; setRoot('library', { folder: arg }); }
    else if (name === 'setlist') setRoot('setlist', { id: arg });
    else setRoot(name);
    $('#view').scrollTop = 0;
    return;
  }
  const sel = e.target.closest('[data-sel]');
  if (sel) { const id = sel.dataset.sel; if (S.selected.has(id)) S.selected.delete(id); else S.selected.add(id); const sc = $('#view').scrollTop; SCREENS.library(cur().params); $('#view').scrollTop = sc; return; }
  const op = e.target.closest('[data-open]');
  if (op) { go('viewer', { scoreId: op.dataset.open }); return; }
  const more = e.target.closest('[data-more]');
  if (more) { sheetMore(more.dataset.more); return; }
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act] && !a.disabled) { e.stopPropagation(); ACT[a.dataset.act](a.dataset, a); }
});
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  S.settings[k] = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
  saveSettings();
  SCREENS.settings();
  toast('設定を変更しました', 1400);
});
document.addEventListener('keydown', e => {
  const NEXT = ['ArrowRight', 'PageDown', ' ', 'ArrowDown'], PREV = ['ArrowLeft', 'PageUp', 'ArrowUp'];
  if (S.pedalTest && cur().name === 'settings') {
    e.preventDefault();
    const out = $('#pedalOut');
    if (out) out.textContent = `受信したキー：${e.key === ' ' ? 'Space' : e.key} → ${NEXT.indexOf(e.key) > -1 ? '次のページ' : PREV.indexOf(e.key) > -1 ? '前のページ' : '割り当てなし'}`;
    S.pedalTest = false; return;
  }
  const sheetOpen = !$('#sheet-root').hidden;
  if (e.key === 'Escape' && sheetOpen) { closeSheet(); return; }
  if (!V || sheetOpen || /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return;
  if (NEXT.indexOf(e.key) > -1) { e.preventDefault(); turn(1); }
  else if (PREV.indexOf(e.key) > -1) { e.preventDefault(); turn(-1); }
  else if (e.key === 'Escape') { if (V.edit) ACT.vEdit(); else back(); }
});
let rz;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    if (V) { V.cache.forEach(c => { if (!c.isConnected) freeCanvas(c); }); V.cache.clear(); renderPages(0); }
    if (cur().name === 'scanReview') rvLayout();
  }, 150);
});
window.addEventListener('online', () => { S.online = true; if (FULL.indexOf(cur().name) < 0) render(); });
window.addEventListener('offline', () => { S.online = false; if (FULL.indexOf(cur().name) < 0) render(); toast('オフラインになりました。楽譜はそのまま使えます'); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (V) setWake(true); }
  else if (V && V.dirty) { clearTimeout(annTimer); persistAnn(V.sc, V.ann); V.dirty = false; }
});
window.addEventListener('pagehide', () => { if (V && V.dirty) persistAnn(V.sc, V.ann); });

$('#inPdf').addEventListener('change', e => handleImportFiles(e.target.files));
$('#inCam').addEventListener('change', e => addShots(e.target.files));
$('#inPhotos').addEventListener('change', e => addShots(e.target.files));
$('#inRestore').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  try { const r = await restoreBackup(f); await refreshUsage(); setRoot('library', { folder: 'all' }); toast(`${r.added}曲を復元しました${r.skipped ? `（すでにある${r.skipped}曲はそのまま）` : ''}`, 4000); }
  catch (err) { fail(err, '復元'); }
});

/* drag & drop (iPad Split View / desktop) */
let dragDepth = 0;
document.addEventListener('dragenter', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') > -1) { dragDepth++; $('#drop').hidden = false; } });
document.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#drop').hidden = true; });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault(); dragDepth = 0; $('#drop').hidden = true;
  const files = e.dataTransfer && e.dataTransfer.files;
  if (!files || !files.length) return;
  const imgs = Array.from(files).filter(f => /^image\//.test(f.type));
  if (imgs.length === files.length) addShots(imgs); else handleImportFiles(files);
});

/* ---------- Boot ---------- */
async function boot() {
  try { await loadAll(); }
  catch (e) {
    $('#view').innerHTML = `<div class="empty">${ic('info')}<p>保存領域を開けませんでした。プライベートブラウズでは使えません。通常のSafariで開き直してください。</p></div>`;
    console.error(e); return;
  }
  await refreshUsage();
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'activated' && navigator.serviceWorker.controller) toast('新しいバージョンを準備しました。アプリを開き直すと反映されます', 5000); });
      });
    }).catch(e => console.warn('SW', e));
  }
}
boot();
})();
