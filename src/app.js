/* ALASKA — interactive trip-planning map.
   Vanilla JS + canvas. Data is inlined at build time by build.py.
   Projection: Alaska Albers Equal Area (EPSG:3338 parameters). */
(function () {
'use strict';

// ══════════════ data (inlined by build.py) ══════════════
const GEO   = /*__BASEMAP__*/{land:[],ctx:[],ice:[],parks:[],lakes:[],rivers:[],roads:[],rail:[],ferry:[],shelf:[],places:[]}/*__END__*/;
const A     = /*__ATTRACTIONS__*/[]/*__END__*/;
const SEASON= /*__SEASON__*/{months:[],windows:[]}/*__END__*/;
const HUBS  = /*__HUBS__*/{hubs:[],drives:[]}/*__END__*/;
const ITIN  = /*__ITIN__*/[]/*__END__*/;
const LOGI  = /*__LOGI__*/{gotchas:[],costs:[],myths:[]}/*__END__*/;
const BUILT = /*__BUILT__*/'—'/*__END__*/;

// ══════════════ constants ══════════════
// Colour says what KIND of day it is (5 families, not 23 hues).
// The glyph says which category. The shape says how much it matters.
const FAM = {
  ice:     ['Ice & high country', '#7fd8ff'],
  wild:    ['Wild Alaska',        '#6ee7a8'],
  night:   ['Aurora, snow & steam','#a78bfa'],
  journey: ['Ways to travel',     '#ffcf5c'],
  people:  ['Towns & culture',    '#ff9e7a'],
};
const CATS = {
  'glacier'         : ['Glacier & ice',    'ice'],
  'volcano-geology' : ['Volcano & geology','ice'],
  'viewpoint'       : ['Viewpoint',        'ice'],
  'hike-trail'      : ['Hike & trail',     'ice'],
  'national-park'   : ['National park',    'wild'],
  'wildlife'        : ['Wildlife',         'wild'],
  'fishing'         : ['Fishing',          'wild'],
  'wilderness-lodge': ['Wilderness lodge', 'wild'],
  'aurora'          : ['Aurora',           'night'],
  'winter-sport'    : ['Winter sport',     'night'],
  'hot-springs'     : ['Hot springs',      'night'],
  'scenic-drive'    : ['Scenic drive',     'journey'],
  'railroad'        : ['Railroad',         'journey'],
  'ferry-route'     : ['Ferry',            'journey'],
  'boat-cruise'     : ['Boat & cruise',    'journey'],
  'flightseeing'    : ['Flightseeing',     'journey'],
  'town-city'       : ['Town & city',      'people'],
  'museum-culture'  : ['Museum',           'people'],
  'native-culture'  : ['Native culture',   'people'],
  'historic-site'   : ['Historic site',    'people'],
  'food-drink'      : ['Food & drink',     'people'],
  'festival-event'  : ['Festival',         'people'],
  'roadside-oddity' : ['Roadside oddity',  'people'],
};
const catFam   = c => (CATS[c] || ['Other', 'ice'])[1];
const catColor = c => FAM[catFam(c)][1];
const catName  = c => (CATS[c] || ['Other'])[0];

const ACCESS = {
  'road':['Drive to it','🚗'], 'rail':['Train','🚆'], 'ferry':['State ferry','⛴'],
  'boat-tour':['Boat tour','🚤'], 'air-only':['Fly-in only','✈'], 'cruise-port':['Cruise port','🛳'],
  'trail':['Hike in','🥾'], 'winter-only':['Winter access','❄'],
};
const TIER = { 1:['Bucket list','#52ffb8'], 2:['Major','#7fd8ff'], 3:['Worth it','#a78bfa'], 4:['If nearby','#7b8ba3'] };
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const REGION_ORDER = ['Southcentral','Kenai Peninsula','Interior','Southeast','Wrangell-Copper-Valdez','Southwest','Arctic','Aleutians-Bering'];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// ══════════════ iconography ══════════════
// 23 glyphs drawn in a 24x24 box. Canvas for pins, memoised data-URIs for the DOM,
// so the map and the sidebar teach the same visual language.
function _l(c, pts, close) {
  c.beginPath();
  pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
  if (close) c.closePath();
  c.stroke();
}
function _d(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
function _o(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }

const ICONS = {
  'national-park': c => { _l(c, [[2.5, 19.5], [21.5, 19.5]]); _l(c, [[4, 19.5], [9.5, 8.5], [13.5, 16]]); _l(c, [[11.5, 19.5], [15.5, 11], [20.5, 19.5]]); },
  'glacier': c => { _l(c, [[12, 4], [4.5, 15], [19.5, 15]], 1); _l(c, [[3, 18.6], [6.5, 20.4], [10, 18.6], [13.5, 20.4], [17, 18.6], [20.5, 20.4]]); },
  'viewpoint': c => { _o(c, 7.5, 15, 3.6); _o(c, 16.5, 15, 3.6); _l(c, [[10.4, 13.5], [13.6, 13.5]]); _l(c, [[6, 11.4], [7.6, 6.5], [10, 6.5]]); _l(c, [[18, 11.4], [16.4, 6.5], [14, 6.5]]); },
  'hike-trail': c => { _d(c, 13, 5.4, 2); _l(c, [[13, 7.8], [10.6, 13.2], [13.4, 16.2]]); _l(c, [[10.6, 13.2], [6.5, 11.2]]); _l(c, [[13.4, 16.2], [10.2, 20.5]]); _l(c, [[13.4, 16.2], [16.4, 20.5]]); _l(c, [[18, 6.5], [18, 20.5]]); },
  'volcano-geology': c => { _l(c, [[3, 20], [9.5, 9], [14.5, 9], [21, 20]], 1); _l(c, [[10.5, 6.5], [12, 3.5], [13.5, 6.5]]); _d(c, 16.5, 4.5, 1.1); _d(c, 8, 5, 1.1); },
  'wildlife': c => { _d(c, 12, 15.6, 4.3); _d(c, 6.4, 11.2, 2.1); _d(c, 9.9, 8.4, 2.1); _d(c, 14.1, 8.4, 2.1); _d(c, 17.6, 11.2, 2.1); },
  'fishing': c => { c.beginPath(); c.moveTo(4, 12); c.bezierCurveTo(8, 6.5, 15, 6.5, 18.5, 12); c.bezierCurveTo(15, 17.5, 8, 17.5, 4, 12); c.closePath(); c.stroke(); _l(c, [[18.5, 12], [22, 8], [22, 16]], 1); _d(c, 8, 11, 1.1); },
  'wilderness-lodge': c => { _l(c, [[2.5, 12], [12, 4.5], [21.5, 12]]); _l(c, [[5, 11], [5, 20], [19, 20], [19, 11]]); _l(c, [[10, 20], [10, 14.5], [14, 14.5], [14, 20]]); },
  'aurora': c => { c.beginPath(); c.moveTo(3, 17); c.quadraticCurveTo(8, 3, 12, 11); c.quadraticCurveTo(16, 19, 21, 6); c.stroke(); c.beginPath(); c.moveTo(4, 21); c.quadraticCurveTo(9, 8, 13, 15); c.quadraticCurveTo(17, 22, 21, 12); c.stroke(); },
  'winter-sport': c => { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; _l(c, [[12 - Math.cos(a) * 8.5, 12 - Math.sin(a) * 8.5], [12 + Math.cos(a) * 8.5, 12 + Math.sin(a) * 8.5]]); } _l(c, [[8.6, 5.4], [12, 7.4], [15.4, 5.4]]); _l(c, [[8.6, 18.6], [12, 16.6], [15.4, 18.6]]); },
  'hot-springs': c => { _l(c, [[3, 18.5], [21, 18.5]]); _l(c, [[3, 21.5], [21, 21.5]]); [7.5, 12, 16.5].forEach(x => { c.beginPath(); c.moveTo(x, 15); c.bezierCurveTo(x - 3, 11, x + 3, 8, x, 3.5); c.stroke(); }); },
  'scenic-drive': c => { _l(c, [[6.5, 21.5], [9.5, 3]]); _l(c, [[17.5, 21.5], [14.5, 3]]); c.save(); c.setLineDash([3.2, 3.4]); _l(c, [[12, 21], [12, 3.5]]); c.restore(); },
  'railroad': c => { _l(c, [[6.5, 21.5], [6.5, 3]]); _l(c, [[17.5, 21.5], [17.5, 3]]); [5, 9.5, 14, 18.5].forEach(y => _l(c, [[3.5, y], [20.5, y]])); },
  'ferry-route': c => { _l(c, [[3, 15], [21, 15], [18, 20], [6, 20]], 1); _l(c, [[7, 15], [7, 9], [17, 9], [17, 15]]); _l(c, [[10, 9], [10, 5], [14, 5]]); },
  'boat-cruise': c => { _l(c, [[4, 15.5], [20, 15.5], [16.5, 20.5], [7.5, 20.5]], 1); _l(c, [[12, 15.5], [12, 3.5]]); _l(c, [[12.8, 5], [18, 13], [12.8, 13]], 1); },
  'flightseeing': c => { _l(c, [[12, 2.5], [13.4, 9.5], [21.5, 14], [21.5, 16], [13.4, 13.8], [12.9, 19], [15.6, 21], [15.6, 22], [12, 20.8], [8.4, 22], [8.4, 21], [11.1, 19], [10.6, 13.8], [2.5, 16], [2.5, 14], [10.6, 9.5]], 1); },
  'town-city': c => { _l(c, [[2.5, 20.5], [21.5, 20.5]]); _l(c, [[4, 20.5], [4, 11], [10, 11], [10, 20.5]]); _l(c, [[10, 20.5], [10, 5], [17, 5], [17, 20.5]]); _d(c, 13.5, 9, 1); _d(c, 13.5, 13.5, 1); _d(c, 7, 15, 1); },
  'museum-culture': c => { _l(c, [[2.5, 9], [12, 3.5], [21.5, 9]]); _l(c, [[2.5, 20.5], [21.5, 20.5]]); [6.5, 12, 17.5].forEach(x => _l(c, [[x, 10], [x, 18.5]])); _l(c, [[4, 18.5], [20, 18.5]]); },
  'native-culture': c => { _l(c, [[9, 3.5], [15, 3.5], [15, 20.5], [9, 20.5]], 1); _l(c, [[9, 9], [12, 11], [15, 9]]); _l(c, [[9, 15], [12, 17], [15, 15]]); _l(c, [[9, 6.5], [3.5, 9]]); _l(c, [[15, 6.5], [20.5, 9]]); },
  'historic-site': c => { _l(c, [[4, 20.5], [15, 8.5]]); c.beginPath(); c.moveTo(10.5, 6.5); c.quadraticCurveTo(16, 2, 21, 7.5); c.stroke(); _l(c, [[13.5, 4.2], [17.5, 11]]); },
  'food-drink': c => { _l(c, [[5, 9], [5, 17.5], [15, 17.5], [15, 9]], 1); c.beginPath(); c.moveTo(15, 10.5); c.quadraticCurveTo(20.5, 10.5, 20.5, 13.5); c.quadraticCurveTo(20.5, 16.5, 15, 16.5); c.stroke(); _l(c, [[7.5, 6.5], [7.5, 3.5]]); _l(c, [[12, 6.5], [12, 3.5]]); },
  'festival-event': c => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; _l(c, [[12 + Math.cos(a) * 3.5, 12 + Math.sin(a) * 3.5], [12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9]]); } _o(c, 12, 12, 2.2); },
  'roadside-oddity': c => { _l(c, [[12, 4], [12, 21]]); _l(c, [[12, 6], [20, 6], [18, 9], [12, 9]], 1); _l(c, [[12, 12.5], [4, 12.5], [6, 15.5], [12, 15.5]], 1); },
};
function drawIcon(c, cat, x, y, size, color, lw) {
  const f = ICONS[cat] || ICONS['viewpoint'];
  c.save();
  c.translate(x - size / 2, y - size / 2);
  c.scale(size / 24, size / 24);
  c.strokeStyle = color; c.fillStyle = color;
  c.lineWidth = (lw || 2) * 24 / size;
  c.lineCap = 'round'; c.lineJoin = 'round';
  f(c);
  c.restore();
}
const _iconCache = {};
function iconURL(cat, color, px) {
  const key = cat + color + px;
  if (_iconCache[key]) return _iconCache[key];
  const cn = document.createElement('canvas');
  cn.width = cn.height = px * 2;
  const c = cn.getContext('2d');
  c.scale(2, 2);
  drawIcon(c, cat, px / 2, px / 2, px * .92, color, 2.1);
  return (_iconCache[key] = cn.toDataURL());
}
const iconImg = (cat, size, color) =>
  '<img class="gly" src="' + iconURL(cat, color || catColor(cat), size || 13) + '" alt="" width="' + (size || 13) + '" height="' + (size || 13) + '">';

// ══════════════ projection: Alaska Albers ══════════════
const RAD = Math.PI / 180, R_KM = 6371;
const P_LAT0 = 50, P_LON0 = -154, P_P1 = 55, P_P2 = 65;
const _n = (Math.sin(P_P1 * RAD) + Math.sin(P_P2 * RAD)) / 2;
const _C = Math.cos(P_P1 * RAD) ** 2 + 2 * _n * Math.sin(P_P1 * RAD);
const _rho0 = Math.sqrt(_C - 2 * _n * Math.sin(P_LAT0 * RAD)) / _n;
function proj(lon, lat) {                    // → [x, y] in earth-radii; y grows north
  if (lon > 0) lon -= 360;                   // Aleutians past the antimeridian
  const th = _n * ((lon - P_LON0) * RAD);
  const rho = Math.sqrt(Math.max(0, _C - 2 * _n * Math.sin(lat * RAD))) / _n;
  return [rho * Math.sin(th), _rho0 - rho * Math.cos(th)];
}
function haversine(a, b) {                   // km
  const dl = (b.lng - a.lng) * RAD, dp = (b.lat - a.lat) * RAD;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dl / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ══════════════ state ══════════════
const cv = $('#map'), ctx2 = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const view = { x: 0, y: 0, k: 1 };           // center in projected units + px per unit
let anim = null;

const F = {
  q: '', cats: new Set(Object.keys(CATS)), tiers: new Set([1, 2, 3, 4]),
  access: new Set(Object.keys(ACCESS)), regions: new Set(REGION_ORDER),
  month: 0, kid: false, nobook: false, maxH: 0, minImp: 0, seasonDim: true, showFiltered: true,
};
const L = { ice: 1, parks: 1, roads: 1, rivers: 1, rail: 1, ferry: 1, places: 1, labels: 1, grid: 1, shelf: 1 };
let sel = null, hov = null, trip = [], sortBy = 'rank', suppressHash = false;

A.forEach(a => { a._p = proj(a.lng, a.lat); a._name = a.name.toLowerCase(); a._hay = (a.name + ' ' + a.region + ' ' + a.cat + ' ' + (a.hub || '') + ' ' + a.blurb).toLowerCase(); });
const byId = Object.fromEntries(A.map(a => [a.id, a]));

// precompute bboxes so offscreen geometry is skipped
function bbox(ring) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, lonMax = -1e9;
  for (const p of ring) {
    const q = proj(p[0], p[1]); p[2] = q[0]; p[3] = q[1];
    if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0];
    if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
    if (p[0] > lonMax) lonMax = p[0];
  }
  return [x0, y0, x1, y1, lonMax];
}
function prep(rings) { return rings.map(r => ({ p: r, b: bbox(r) })); }
const GL = {
  land: prep(GEO.land), ctx: prep(GEO.ctx), ice: prep(GEO.ice), lakes: prep(GEO.lakes),
  rivers: prep(GEO.rivers), rail: prep(GEO.rail), ferry: prep(GEO.ferry), shelf: prep(GEO.shelf),
  roads: GEO.roads.map(r => ({ p: r.g, b: bbox(r.g), n: r.n, r: r.r, c: r.c })),
  parks: GEO.parks.map(p => ({ rings: prep(p.g), n: p.n, c: p.c })),
  places: GEO.places.map(p => ({ ...p, q: proj(p.x, p.y) })),
};

// ══════════════ canvas plumbing ══════════════
function resize() {
  DPR = Math.min(2.5, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  W = r.width; H = r.height;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx2.setTransform(DPR, 0, 0, DPR, 0, 0);
  draw();
}
const sx = px => (px - view.x) * view.k + W / 2;
const sy = py => H / 2 - (py - view.y) * view.k;
const ux = s => (s - W / 2) / view.k + view.x;
const uy = s => view.y - (s - H / 2) / view.k;

function fit(pts, pad) {
  if (!pts.length) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const dx = Math.max(1e-4, x1 - x0), dy = Math.max(1e-4, y1 - y0), m = pad == null ? 0.88 : pad;
  flyTo((x0 + x1) / 2, (y0 + y1) / 2, Math.min(W / dx, H / dy) * m);
}
// default view = the part of Alaska people actually visit; the Aleutian tail is one zoom-out away
function fitAll() {
  const main = GL.land.filter(r => r.b[4] > -170);
  fit(main.flatMap(r => [[r.b[0], r.b[1]], [r.b[2], r.b[3]]]), 0.94);
}
function fitEverything() { fit(GL.land.flatMap(r => [[r.b[0], r.b[1]], [r.b[2], r.b[3]]]), 0.95); }
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function flyTo(x, y, k, instant) {
  k = clamp(k, 180, 60000);
  if (instant || REDUCED) { view.x = x; view.y = y; view.k = k; draw(); return; }
  const s = { x: view.x, y: view.y, k: view.k }, t0 = performance.now(), D = 480;
  cancelAnimationFrame(anim);
  (function step(t) {
    const u = clamp((t - t0) / D, 0, 1), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    view.x = s.x + (x - s.x) * e; view.y = s.y + (y - s.y) * e;
    view.k = Math.exp(Math.log(s.k) + (Math.log(k) - Math.log(s.k)) * e);
    draw();
    if (u < 1) anim = requestAnimationFrame(step);
  })(t0);
}

// ══════════════ rendering ══════════════
function visible(b, pad) {
  pad = pad || 0;
  return sx(b[2]) >= -pad && sx(b[0]) <= W + pad && sy(b[3]) <= H + pad && sy(b[1]) >= -pad;
}
function path(pts, close) {
  ctx2.beginPath();
  let px = NaN, py = NaN;
  for (let i = 0; i < pts.length; i++) {
    const X = sx(pts[i][2]), Y = sy(pts[i][3]);
    if (i && Math.abs(X - px) < .35 && Math.abs(Y - py) < .35 && i !== pts.length - 1) continue;
    i ? ctx2.lineTo(X, Y) : ctx2.moveTo(X, Y);
    px = X; py = Y;
  }
  if (close) ctx2.closePath();
}
function fills(list, style, minPx) {
  ctx2.fillStyle = style;
  for (const r of list) {
    if (!visible(r.b, 4)) continue;
    if (minPx && (r.b[2] - r.b[0]) * view.k < minPx && (r.b[3] - r.b[1]) * view.k < minPx) continue;
    path(r.p, 1); ctx2.fill();
  }
}
function strokes(list, style, w, dash, minPx) {
  ctx2.strokeStyle = style; ctx2.lineWidth = w; ctx2.setLineDash(dash || []);
  ctx2.lineJoin = 'round'; ctx2.lineCap = 'round';
  for (const r of list) {
    if (!visible(r.b, 8)) continue;
    if (minPx && (r.b[2] - r.b[0] + r.b[3] - r.b[1]) * view.k < minPx) continue;
    path(r.p, 0); ctx2.stroke();
  }
  ctx2.setLineDash([]);
}

const labelBoxes = [];
function place(x, y, w, h) {
  for (const b of labelBoxes) if (x < b[2] && x + w > b[0] && y < b[3] && y + h > b[1]) return false;
  labelBoxes.push([x, y, x + w, y + h]); return true;
}
function label(text, x, y, font, color, halo, anchor) {
  ctx2.font = font;
  const w = ctx2.measureText(text).width, h = parseInt(font) + 2;
  const lx = anchor === 'c' ? x - w / 2 : x, ly = y - h + 3;
  if (!place(lx - 2, ly - 1, w + 4, h + 2)) return false;
  ctx2.lineWidth = 3; ctx2.strokeStyle = halo || 'rgba(4,7,13,.92)'; ctx2.lineJoin = 'round';
  ctx2.strokeText(text, lx, y); ctx2.fillStyle = color; ctx2.fillText(text, lx, y);
  return true;
}

function draw() {
  if (!W) return;
  labelBoxes.length = 0;
  const k = view.k;

  // ocean
  const g = ctx2.createLinearGradient(0, 0, W * .3, H);
  g.addColorStop(0, '#04070e'); g.addColorStop(.5, '#050a14'); g.addColorStop(1, '#04080f');
  ctx2.fillStyle = g; ctx2.fillRect(0, 0, W, H);

  if (L.shelf) { fills(GL.shelf, 'rgba(30,70,120,.16)'); }
  if (L.grid) drawGrid();

  fills(GL.ctx, '#0a1119');
  strokes(GL.ctx, 'rgba(120,160,210,.12)', 1);

  // land
  ctx2.save();
  ctx2.shadowColor = 'rgba(80,180,255,.3)'; ctx2.shadowBlur = 20;
  const lg = ctx2.createLinearGradient(0, 0, W * .25, H);
  lg.addColorStop(0, '#18293d'); lg.addColorStop(.55, '#152436'); lg.addColorStop(1, '#111b29');
  fills(GL.land, lg, 2.2);
  ctx2.restore();
  strokes(GL.land, 'rgba(135,205,255,.5)', 1, null, 3);

  if (L.parks) {
    for (const p of GL.parks) {
      const vis = p.rings.filter(r => visible(r.b, 4));
      if (!vis.length) continue;
      ctx2.fillStyle = 'rgba(74,222,128,.075)';
      ctx2.strokeStyle = 'rgba(74,222,128,.42)'; ctx2.lineWidth = 1; ctx2.setLineDash([5, 4]);
      for (const r of vis) { path(r.p, 1); ctx2.fill(); ctx2.stroke(); }
      ctx2.setLineDash([]);
    }
  }
  fills(GL.lakes, '#08111d', 1.5);
  if (L.ice) {
    fills(GL.ice, 'rgba(150,225,255,.17)', 1.2);
    strokes(GL.ice, 'rgba(180,240,255,.3)', .7, null, 6);
  }
  if (L.rivers && k > 700) strokes(GL.rivers, 'rgba(105,165,225,.3)', .8, null, 10);

  if (L.roads) {
    const minC = k > 4500 ? 0 : k > 1800 ? 1 : 2;
    const rd = GL.roads.filter(r => r.c >= minC);
    strokes(rd.filter(r => r.c <= 1), 'rgba(150,170,195,.5)', .9, null, 4);
    strokes(rd.filter(r => r.c === 2), 'rgba(215,170,90,.72)', 1.25);
    strokes(rd.filter(r => r.c >= 3), 'rgba(255,205,110,.92)', 1.7);
  }
  if (L.rail) strokes(GL.rail, 'rgba(167,139,250,.75)', 1.2, [7, 4]);
  if (L.ferry) strokes(GL.ferry, 'rgba(127,216,255,.4)', 1, [2, 5]);

  drawTripRoute();
  if (L.places && k > 1400) drawHubs();

  // dots first, then labels in priority order: attractions ▸ parks ▸ roads ▸ towns
  drawPins();
  ctx2.textBaseline = 'alphabetic';
  if (L.labels) drawPinLabels();
  if (L.labels && k > 700) drawParkLabels();
  if (L.labels && k > 2600) drawRoadLabels();
  if (L.places && k > 2200) drawPlaceLabels();

  drawScale();
  $('#zoomLbl').textContent = (view.k / 900).toFixed(1) + '×';
}

const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif';

function drawParkLabels() {
  for (const p of GL.parks) {
    const r = p.rings.reduce((a, b) => (b.b[2] - b.b[0]) > (a.b[2] - a.b[0]) ? b : a);
    if (!visible(r.b, -20)) continue;
    const cx = sx((r.b[0] + r.b[2]) / 2), cy = sy((r.b[1] + r.b[3]) / 2);
    if (cx < 0 || cx > W || cy < 0 || cy > H) continue;
    label(p.n.replace(' National Park and Preserve', ' NPP').replace(' National Park', ' NP')
      .replace(' National Monument', ' NM').replace(' National Preserve', ' NPRES').toUpperCase(),
      cx, cy, '600 9.5px ' + FONT, 'rgba(120,230,170,.6)', 'rgba(4,7,13,.85)', 'c');
  }
}
function drawRoadLabels() {
  const seen = new Set();
  for (const r of GL.roads) {
    if (!r.n || r.c < 2 || !visible(r.b, -30) || seen.has(r.n)) continue;
    if ((r.b[2] - r.b[0]) + (r.b[3] - r.b[1]) < 0.004) continue;   // skip city streets
    const mid = r.p[Math.floor(r.p.length / 2)];
    const X = sx(mid[2]), Y = sy(mid[3]);
    if (X < 40 || X > W - 40 || Y < 20 || Y > H - 20) continue;
    if (label(r.n, X, Y, '500 9px ' + FONT, 'rgba(255,214,140,.72)', 'rgba(4,7,13,.9)', 'c')) seen.add(r.n);
  }
}
function drawPlaceLabels() {
  for (const p of GL.places) {
    const X = sx(p.q[0]), Y = sy(p.q[1]);
    if (X < 0 || X > W || Y < 0 || Y > H) continue;
    if (p.p < 400 && view.k < 6000) continue;
    ctx2.fillStyle = 'rgba(180,205,235,.4)';
    ctx2.beginPath(); ctx2.arc(X, Y, 1.6, 0, 7); ctx2.fill();
    label(p.n, X + 4, Y + 3, '400 9px ' + FONT, 'rgba(175,200,230,.5)');
  }
}
function drawHubs() {
  for (const h of (HUBS.hubs || [])) {
    if (!h.lat) continue;
    const q = h._p || (h._p = proj(h.lng, h.lat));
    const X = sx(q[0]), Y = sy(q[1]);
    if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;
    ctx2.strokeStyle = 'rgba(200,225,255,.5)'; ctx2.lineWidth = 1;
    ctx2.strokeRect(X - 3, Y - 3, 6, 6);
    if (h.airport && view.k > 2600) {
      ctx2.font = '600 8.5px ' + FONT; ctx2.fillStyle = 'rgba(200,225,255,.55)';
      ctx2.fillText(h.airport, X + 5, Y - 3);
    }
  }
}

function drawGrid() {
  ctx2.strokeStyle = 'rgba(120,170,220,.07)'; ctx2.lineWidth = 1; ctx2.setLineDash([]);
  ctx2.font = '400 9px ' + FONT; ctx2.fillStyle = 'rgba(130,175,225,.3)';
  for (let lat = 52; lat <= 72; lat += 4) {
    ctx2.beginPath();
    for (let lon = -190; lon <= -128; lon += 2) { const p = proj(lon, lat), X = sx(p[0]), Y = sy(p[1]); lon === -190 ? ctx2.moveTo(X, Y) : ctx2.lineTo(X, Y); }
    ctx2.stroke();
  }
  for (let lon = -190; lon <= -128; lon += 8) {
    ctx2.beginPath();
    for (let lat = 50; lat <= 73; lat += 2) { const p = proj(lon, lat), X = sx(p[0]), Y = sy(p[1]); lat === 50 ? ctx2.moveTo(X, Y) : ctx2.lineTo(X, Y); }
    ctx2.stroke();
  }
  // Arctic Circle
  ctx2.strokeStyle = 'rgba(167,139,250,.35)'; ctx2.setLineDash([6, 5]); ctx2.beginPath();
  for (let lon = -190; lon <= -128; lon += 2) { const p = proj(lon, 66.5633), X = sx(p[0]), Y = sy(p[1]); lon === -190 ? ctx2.moveTo(X, Y) : ctx2.lineTo(X, Y); }
  ctx2.stroke(); ctx2.setLineDash([]);
  const ac = proj(-150, 66.5633);
  if (sy(ac[1]) > 12 && sy(ac[1]) < H - 4) {
    ctx2.fillStyle = 'rgba(167,139,250,.6)'; ctx2.font = '600 9px ' + FONT;
    ctx2.fillText('ARCTIC CIRCLE  66°34′N', 10, sy(ac[1]) - 4);
  }
}

function pinR(a) { return a._small ? 2.2 : a.tier === 1 ? 12.5 : a.tier === 2 ? 9 : a.tier === 3 ? 4 : 2.6; }
function pass(a) {
  if (!F.cats.has(a.cat) || !F.tiers.has(a.tier) || !F.regions.has(a.region) || !F.access.has(a.access)) return false;
  if (F.kid && !a.kid) return false;
  if (F.nobook && a.book) return false;
  if (F.maxH && a.hours > F.maxH) return false;
  if (a.imp < F.minImp) return false;
  if (F.q) { const q = F.q.toLowerCase(); if (!a._hay.includes(q)) return false; }
  return true;
}
const inSeason = a => !F.month || !a.months || !a.months.length || a.months.includes(F.month);

function drawPins() {
  const k = view.k, shown = [];
  for (const a of A) {
    a._sx = sx(a._p[0]); a._sy = sy(a._p[1]); a._vis = 0;
    if (a._sx < -30 || a._sx > W + 30 || a._sy < -30 || a._sy > H + 30) continue;
    const ok = pass(a) && (a.tier <= 2 || view.k > (a.tier === 3 ? 800 : 1500));
    if (!ok && !F.showFiltered) continue;
    a._ok = ok; a._season = inSeason(a);
    shown.push(a);
  }
  // declutter: a lower-ranked pin sitting on top of a better one shrinks to a dot
  shown.sort((a, b) => b.imp - a.imp);
  const taken = [];
  for (const a of shown) {
    a._small = 0;
    if (!a._ok) continue;
    const r = pinR(a);
    for (const t of taken) {
      const d = Math.hypot(a._sx - t[0], a._sy - t[1]);
      if (d < (r + t[2]) * .82 + 1.5) { a._small = 1; break; }
    }
    if (!a._small || trip.includes(a.id) || a === sel) { a._small = 0; taken.push([a._sx, a._sy, r]); }
  }
  shown.sort((a, b) => a.imp - b.imp);

  for (const a of shown) {
    const c = catColor(a.cat), off = !a._ok, dim = F.seasonDim && !a._season;
    if (off) {
      ctx2.globalAlpha = .14; ctx2.fillStyle = '#8fa6c2';
      _d(ctx2, a._sx, a._sy, 1.6); ctx2.globalAlpha = 1; continue;
    }
    a._vis = 1;
    ctx2.globalAlpha = dim ? .28 : 1;
    const X = a._sx, Y = a._sy;
    if (a._small) {                                   // decluttered: quiet dot
      ctx2.fillStyle = c; ctx2.globalAlpha = dim ? .2 : .55;
      _d(ctx2, X, Y, 2.2);
    } else if (a.tier === 1) {                        // benchmark disc
      const R = 12.5;
      ctx2.beginPath(); ctx2.arc(X, Y, R + 4, 0, 7);
      ctx2.fillStyle = c + '1c'; ctx2.fill();
      ctx2.beginPath(); ctx2.arc(X, Y, R, 0, 7);
      ctx2.fillStyle = '#080e18'; ctx2.fill();
      ctx2.lineWidth = 1.7; ctx2.strokeStyle = c; ctx2.stroke();
      ctx2.lineWidth = 1; ctx2.strokeStyle = c + '77';   // survey-mark ticks
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI / 4;
        ctx2.beginPath();
        ctx2.moveTo(X + Math.cos(ang) * (R + 1.4), Y + Math.sin(ang) * (R + 1.4));
        ctx2.lineTo(X + Math.cos(ang) * (R + 3.4), Y + Math.sin(ang) * (R + 3.4));
        ctx2.stroke();
      }
      drawIcon(ctx2, a.cat, X, Y, 15, c, 2.1);
    } else if (a.tier === 2) {                        // ringed chip
      const R = 9;
      ctx2.beginPath(); ctx2.arc(X, Y, R, 0, 7);
      ctx2.fillStyle = '#0a111c'; ctx2.fill();
      ctx2.lineWidth = 1.4; ctx2.strokeStyle = c; ctx2.stroke();
      drawIcon(ctx2, a.cat, X, Y, 11, c, 2.4);
    } else if (a.tier === 3) {                        // dot with a hairline
      ctx2.fillStyle = c; ctx2.globalAlpha = dim ? .28 : .82;
      _d(ctx2, X, Y, 4);
      ctx2.globalAlpha = dim ? .28 : 1;
      ctx2.lineWidth = 1; ctx2.strokeStyle = 'rgba(6,11,20,.8)'; _o(ctx2, X, Y, 4);
    } else {                                          // tier 4: texture only
      ctx2.fillStyle = c; ctx2.globalAlpha = dim ? .18 : .45;
      _d(ctx2, X, Y, 2.6);
    }
    ctx2.globalAlpha = 1;
    const ti = trip.indexOf(a.id);
    if (ti >= 0) {
      const R = pinR(a) + 4;
      ctx2.beginPath(); ctx2.arc(X, Y, R, 0, 7);
      ctx2.strokeStyle = '#52ffb8'; ctx2.lineWidth = 1.6; ctx2.setLineDash([]); ctx2.stroke();
      ctx2.font = '700 9px ' + FONT; ctx2.textAlign = 'center';
      ctx2.lineWidth = 3; ctx2.strokeStyle = 'rgba(5,9,16,.9)';
      ctx2.strokeText(ti + 1, X, Y - R - 4); ctx2.fillStyle = '#52ffb8';
      ctx2.fillText(ti + 1, X, Y - R - 4); ctx2.textAlign = 'left';
    }
  }
  if (hov && hov._vis) {
    ctx2.beginPath(); ctx2.arc(hov._sx, hov._sy, pinR(hov) + 5, 0, 7);
    ctx2.strokeStyle = 'rgba(255,255,255,.75)'; ctx2.lineWidth = 1.4; ctx2.stroke();
  }
  // selection pulse
  if (sel) {
    const a = sel, t = (performance.now() % 1600) / 1600;
    ctx2.beginPath(); ctx2.arc(a._sx, a._sy, pinR(a) + 4 + t * 16, 0, 7);
    ctx2.strokeStyle = 'rgba(82,255,184,' + (1 - t) * .8 + ')'; ctx2.lineWidth = 2; ctx2.stroke();
    ctx2.beginPath(); ctx2.arc(a._sx, a._sy, pinR(a) + 3.5, 0, 7);
    ctx2.strokeStyle = '#52ffb8'; ctx2.lineWidth = 2; ctx2.stroke();
    if (!anim) requestAnimationFrame(() => { if (sel) draw(); });
  }
  _shown = shown;
}
let _shown = [];

function drawPinLabels() {
  const k = view.k;
  const cands = _shown.filter(a => a._vis).sort((a, b) => b.imp - a.imp);
  const limit = k > 5000 ? 999 : k > 2200 ? 70 : 38;
  const maxTier = k > 4200 ? 4 : k > 1700 ? 3 : k > 900 ? 2 : 1;
  let n = 0;
  for (const a of cands) {
    if (n >= limit) break;
    if ((a.tier > maxTier || a._small) && a !== sel && !trip.includes(a.id)) continue;
    const r = pinR(a);
    const nm = a.name.length > 34 ? a.name.slice(0, 32) + '…' : a.name;
    if (label(nm, a._sx + r + 3.5, a._sy + 3.4, (a.tier === 1 ? '700 11px ' : '500 10px ') + FONT,
      a.tier === 1 ? '#eaf4ff' : 'rgba(205,222,240,.8)')) n++;
  }
}

function drawTripRoute() {
  if (trip.length < 2) return;
  ctx2.setLineDash([]); ctx2.lineWidth = 2; ctx2.lineJoin = 'round';
  ctx2.strokeStyle = 'rgba(82,255,184,.55)';
  ctx2.beginPath();
  trip.forEach((id, i) => { const a = byId[id]; if (!a) return; const X = sx(a._p[0]), Y = sy(a._p[1]); i ? ctx2.lineTo(X, Y) : ctx2.moveTo(X, Y); });
  ctx2.stroke();
  ctx2.strokeStyle = 'rgba(82,255,184,.16)'; ctx2.lineWidth = 7; ctx2.stroke();
}

function drawScale() {
  const kmpx = R_KM / view.k;
  let target = 120 * kmpx, mag = Math.pow(10, Math.floor(Math.log10(target)));
  const nice = [1, 2, 5, 10].map(m => m * mag).find(v => v >= target * .55) || mag * 10;
  $('#scaleTxt').textContent = nice >= 1 ? nice + ' km' : (nice * 1000) + ' m';
  $('#scaleBar').style.width = Math.round(nice / kmpx) + 'px';
}

// ══════════════ interaction ══════════════
let drag = null;
cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: 0 }; cv.classList.add('drag'); });
window.addEventListener('mouseup', () => { if (drag) cv.classList.remove('drag'); drag = null; });
window.addEventListener('mousemove', e => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    view.x = drag.vx - dx / view.k; view.y = drag.vy + dy / view.k;
    cancelAnimationFrame(anim); anim = null; draw();
    return;
  }
  const r = cv.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { hideTip(); return; }
  const h = hit(e.clientX - r.left, e.clientY - r.top);
  if (h !== hov) { hov = h; h ? showTip(h, e.clientX - r.left, e.clientY - r.top) : hideTip(); cv.style.cursor = h ? 'pointer' : (drag ? 'grabbing' : 'grab'); }
  else if (h) moveTip(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('click', e => {
  if (drag && drag.moved > 5) return;
  const r = cv.getBoundingClientRect();
  const h = hit(e.clientX - r.left, e.clientY - r.top);
  h ? select(h.id, false) : closeDetail();
});
cv.addEventListener('dblclick', e => {
  const r = cv.getBoundingClientRect();
  zoomAt(e.clientX - r.left, e.clientY - r.top, 2);
});
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.deltaMode ? .05 : .0016)));
}, { passive: false });
function zoomAt(px, py, f) {
  const k2 = clamp(view.k * f, 180, 60000);
  const bx = ux(px), by = uy(py);
  view.k = k2;
  view.x = bx - (px - W / 2) / k2; view.y = by + (py - H / 2) / k2;
  cancelAnimationFrame(anim); anim = null; draw();
}
// touch
let tt = null;
cv.addEventListener('touchstart', e => {
  if (e.touches.length === 1) tt = { x: e.touches[0].clientX, y: e.touches[0].clientY, vx: view.x, vy: view.y, moved: 0 };
  else if (e.touches.length === 2) tt = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), k: view.k, pinch: 1 };
}, { passive: true });
cv.addEventListener('touchmove', e => {
  if (!tt) return;
  e.preventDefault();
  if (tt.pinch && e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const r = cv.getBoundingClientRect();
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
    zoomAt(cx, cy, (tt.k * d / tt.d) / view.k);
  } else if (e.touches.length === 1 && !tt.pinch) {
    const dx = e.touches[0].clientX - tt.x, dy = e.touches[0].clientY - tt.y;
    tt.moved += Math.abs(dx) + Math.abs(dy);
    view.x = tt.vx - dx / view.k; view.y = tt.vy + dy / view.k; draw();
  }
}, { passive: false });
cv.addEventListener('touchend', e => {
  if (tt && !tt.pinch && tt.moved < 8) {
    const t = e.changedTouches[0], r = cv.getBoundingClientRect();
    const h = hit(t.clientX - r.left, t.clientY - r.top);
    if (h) select(h.id, false);
  }
  tt = null;
}, { passive: true });

function hit(x, y) {
  let best = null, bd = 15 * 15;
  for (const a of A) {
    if (!a._vis) continue;
    const d = (a._sx - x) ** 2 + (a._sy - y) ** 2;
    const rr = Math.max(8, pinR(a) + 4) ** 2;
    if (d < Math.min(bd, rr)) { bd = d; best = a; }
  }
  return best;
}
const tip = $('#tip');
function showTip(a, x, y) {
  tip.innerHTML = '<div class="t" style="color:' + catColor(a.cat) + '">' + iconImg(a.cat, 13) + esc(a.name) + '</div>' +
    '<div class="b">' + esc(a.blurb) + '</div>' +
    '<div class="m">#' + a.rank + ' · ' + esc(catName(a.cat)) + ' · ' + a.imp + '/100' + (a._season ? '' : ' · off-season') + '</div>';
  tip.classList.add('on'); moveTip(x, y);
}
function moveTip(x, y) {
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = clamp(x + 14, 4, W - w - 4) + 'px';
  tip.style.top = clamp(y - h - 12, 4, H - h - 4) + 'px';
}
function hideTip() { tip.classList.remove('on'); hov = null; }

// ══════════════ selection + detail ══════════════
function select(id, keepView) {
  const a = byId[id]; if (!a) return;
  sel = a;
  if (!keepView) {
    const k = Math.max(view.k, 4200);
    flyTo(a._p[0], a._p[1], k);
  } else draw();
  renderDetail(a); renderList(); syncHash();
  const row = $('#list [data-id="' + CSS.escape(id) + '"]');
  if (row) row.scrollIntoView({ block: 'nearest' });
}
function closeDetail() { sel = null; $('#detail').classList.remove('on'); draw(); renderList(); syncHash(); }

function renderDetail(a) {
  const d = $('#detail'), col = catColor(a.cat), t = TIER[a.tier] || TIER[4];
  const near = A.filter(x => x !== a).map(x => ({ x, d: haversine(a, x) })).sort((p, q) => p.d - q.d).slice(0, 5);
  const acc = ACCESS[a.access] || ['—', ''];
  d.innerHTML =
    '<div class="dhead"><button class="x" title="Close">✕</button>' +
    '<h3>' + esc(a.name) + '</h3>' +
    '<div class="sub">' +
    '<span class="pill solid" style="background:' + t[1] + '">#' + a.rank + ' · ' + t[0] + '</span>' +
    '<span class="pill" style="color:' + col + ';border-color:' + col + '66">' + iconImg(a.cat, 11, col) + esc(catName(a.cat)) + '</span>' +
    '<span class="pill">' + esc(a.region) + '</span></div></div>' +
    '<div class="dbody">' +
    '<p class="bl">' + esc(a.blurb) + '</p>' +
    (a.tip ? '<div class="tip"><b>Tip · </b>' + esc(a.tip) + '</div>' : '') +
    '<dl class="kv">' +
    '<dt>Score</dt><dd>' + a.imp + '/100</dd>' +
    '<dt>Access</dt><dd>' + acc[1] + ' ' + acc[0] + '</dd>' +
    '<dt>Time</dt><dd>' + fmtH(a.hours) + '</dd>' +
    '<dt>Cost</dt><dd>' + esc(a.cost || '—') + '</dd>' +
    '<dt>Season</dt><dd>' + esc(a.season || '—') + '</dd>' +
    '<dt>Base</dt><dd>' + esc(a.hub || '—') + '</dd>' +
    '<dt>Crowds</dt><dd>' + esc(a.crowd || '—') + (a.kid ? ' · kid-friendly' : '') + (a.book ? ' · <b style="color:#ffcf5c">book ahead</b>' : '') + '</dd>' +
    '<dt>Coords</dt><dd style="font-family:var(--mono);font-size:10.5px">' + a.lat.toFixed(4) + ', ' + a.lng.toFixed(4) + '</dd>' +
    '</dl>' +
    '<div class="mstrip">' + MON.map((m, i) =>
      '<div class="' + ((!a.months || !a.months.length || a.months.includes(i + 1)) ? 'y ' : '') + (F.month === i + 1 ? 'now' : '') + '">' + m[0] + '</div>').join('') + '</div>' +
    '<div class="dact">' +
    '<button class="prim" data-act="trip">' + (trip.includes(a.id) ? '✓ In trip' : '+ Add to trip') + '</button>' +
    '<a href="https://www.google.com/maps/search/?api=1&query=' + a.lat + ',' + a.lng + '" target="_blank" rel="noopener">Maps ↗</a>' +
    (a.url ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener">Info ↗</a>' : '') +
    '</div>' +
    '<div class="near"><h5>Nearby</h5>' + near.map(n =>
      '<a data-go="' + esc(n.x.id) + '">' + iconImg(n.x.cat, 12) +
      esc(n.x.name) + '<span class="d">' + (n.d < 10 ? n.d.toFixed(1) : Math.round(n.d)) + ' km</span></a>').join('') + '</div>' +
    '</div>';
  d.classList.add('on');
  d.querySelector('.x').onclick = closeDetail;
  d.querySelector('[data-act=trip]').onclick = () => toggleTrip(a.id);
  d.querySelectorAll('[data-go]').forEach(n => n.onclick = () => select(n.dataset.go));
}
function fmtH(h) {
  if (!h) return '—';
  if (h < 1) return Math.round(h * 60) + ' min';
  if (h < 24) return (+h.toFixed(1)) + ' hr';
  const d = +(h / 24).toFixed(1);
  return d + (d === 1 ? ' day' : ' days');
}

// ══════════════ list ══════════════
function filtered() {
  let r = A.filter(pass);
  if (F.month && !F.seasonDim) r = r.filter(inSeason);
  const s = { rank: (a, b) => a.rank - b.rank, name: (a, b) => a.name.localeCompare(b.name),
    time: (a, b) => a.hours - b.hours, region: (a, b) => (REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region)) || a.rank - b.rank,
    cat: (a, b) => a.cat.localeCompare(b.cat) || a.rank - b.rank };
  return r.sort(s[sortBy] || s.rank);
}
function renderList() {
  const r = filtered(), box = $('#list');
  $('#count').textContent = r.length;
  $('#hCount').textContent = r.length;
  if (!r.length) { box.innerHTML = '<div class="empty">Nothing matches.<br>Loosen the filters.</div>'; return; }
  const frag = document.createDocumentFragment();
  let lastRegion = null;
  for (const a of r.slice(0, 400)) {
    if (sortBy === 'region' && a.region !== lastRegion) {
      lastRegion = a.region;
      frag.appendChild(el('div', 'listhead', esc(a.region)));
    }
    const n = el('div', 'item' + (sel === a ? ' sel' : '') + (trip.includes(a.id) ? ' inTrip' : ''));
    n.dataset.id = a.id;
    const off = F.month && !inSeason(a);
    n.innerHTML = '<div class="rk">' + a.rank + '</div><div><div class="nm"' + (off ? ' style="opacity:.5"' : '') + '>' + esc(a.name) +
      (off ? ' <span style="color:var(--salmon);font-size:9px">off-season</span>' : '') + '</div>' +
      '<div class="mt">' + iconImg(a.cat, 12) + esc(catName(a.cat)) +
      ' · ' + esc(a.region) + ' · ' + fmtH(a.hours) + '</div></div>' +
      '<div class="sc" style="color:' + (TIER[a.tier] || TIER[4])[1] + '">' + a.imp + '</div>' +
      '<button class="add" title="Add to trip">' + (trip.includes(a.id) ? '✓' : '+') + '</button>';
    n.onclick = e => { if (e.target.classList.contains('add')) { toggleTrip(a.id); e.stopPropagation(); } else select(a.id); };
    n.onmouseenter = () => { hov = a; draw(); };
    n.onmouseleave = () => { if (hov === a) { hov = null; draw(); } };
    frag.appendChild(n);
  }
  box.innerHTML = ''; box.appendChild(frag);
  if (r.length > 400) box.appendChild(el('div', 'empty', '+' + (r.length - 400) + ' more — narrow the filters'));
}

// ══════════════ filters UI ══════════════
function chipRow(host, entries, set, colorFn, onchange) {
  host.innerHTML = '';
  entries.forEach(([key, lbl, count]) => {
    const c = el('button', 'chip' + (set.has(key) ? ' on' : ''));
    const col = colorFn ? colorFn(key) : '#7fd8ff';
    if (set.has(key)) c.style.background = col;
    c.innerHTML = (colorFn ? '<i class="dot" style="background:' + (set.has(key) ? 'rgba(0,0,0,.45)' : col) + '"></i>' : '') +
      esc(lbl) + '<span class="ct">' + count + '</span>';
    c.onclick = e => {
      if (e.shiftKey || e.metaKey) { set.clear(); set.add(key); }
      else set.has(key) ? set.delete(key) : set.add(key);
      onchange();
    };
    host.appendChild(c);
  });
}
function countBy(f) { const m = {}; A.forEach(a => { const k = f(a); m[k] = (m[k] || 0) + 1; }); return m; }
function buildFilters() {
  const cc = countBy(a => a.cat), rc = countBy(a => a.region), ac = countBy(a => a.access), tc = countBy(a => a.tier);
  const refresh = () => { buildFilters(); apply(); };
  buildCatChips(cc, refresh);
  chipRow($('#fRegions'), REGION_ORDER.filter(k => rc[k]).map(k => [k, k, rc[k]]), F.regions, null, refresh);
  chipRow($('#fAccess'), Object.keys(ACCESS).filter(k => ac[k]).map(k => [k, ACCESS[k][0], ac[k]]), F.access, null, refresh);
  chipRow($('#fTiers'), [1, 2, 3, 4].filter(k => tc[k]).map(k => [k, TIER[k][0], tc[k]]), F.tiers, k => TIER[k][1], refresh);
  $('#tagCats').textContent = F.cats.size + '/' + Object.keys(cc).length;
  $('#tagRegions').textContent = F.regions.size + '/' + Object.keys(rc).length;
}
function buildCatChips(cc, refresh) {
  const host = $('#fCats'); host.innerHTML = '';
  Object.keys(FAM).forEach(fk => {
    const cats = Object.keys(CATS).filter(k => catFam(k) === fk && cc[k]);
    if (!cats.length) return;
    const col = FAM[fk][1], n = cats.reduce((s, k) => s + cc[k], 0);
    const on = cats.every(k => F.cats.has(k));
    const head = el('div', 'famhead');
    head.innerHTML = '<i style="background:' + col + '"></i><b>' + FAM[fk][0] + '</b><span>' + n + '</span>';
    head.title = on ? 'Hide this family' : 'Show this family';
    head.onclick = () => { cats.forEach(k => on ? F.cats.delete(k) : F.cats.add(k)); refresh(); };
    host.appendChild(head);
    const row = el('div', 'chips');
    cats.sort((a, b) => cc[b] - cc[a]).forEach(k => {
      const c = el('button', 'chip' + (F.cats.has(k) ? ' on' : ''));
      if (F.cats.has(k)) c.style.background = col;
      c.innerHTML = iconImg(k, 12, F.cats.has(k) ? '#07101c' : col) + catName(k) + '<span class="ct">' + cc[k] + '</span>';
      c.onclick = e => {
        if (e.shiftKey || e.metaKey) { F.cats.clear(); F.cats.add(k); }
        else F.cats.has(k) ? F.cats.delete(k) : F.cats.add(k);
        refresh();
      };
      row.appendChild(c);
    });
    host.appendChild(row);
  });
}
function buildLegend() {
  $('#legendBody').innerHTML =
    '<h4>What matters</h4>' +
    '<div class="lg"><b class="mk disc"></b>Bucket list — go out of your way</div>' +
    '<div class="lg"><b class="mk chip"></b>Major — worth a half day</div>' +
    '<div class="lg"><b class="mk dot"></b>Worth it / if nearby</div>' +
    '<h4 style="margin-top:9px">Kind of day</h4>' +
    Object.keys(FAM).map(fk => '<div class="lg"><i style="background:' + FAM[fk][1] + '"></i>' + FAM[fk][0] + '</div>').join('') +
    '<h4 style="margin-top:9px">On the ground</h4>' +
    '<div class="lg"><span class="ln" style="border-color:#ffcd6e"></span>Highway</div>' +
    '<div class="lg"><span class="ln" style="border-color:#a78bfa;border-top-style:dashed"></span>Alaska Railroad</div>' +
    '<div class="lg"><span class="ln" style="border-color:#7fd8ff;border-top-style:dotted"></span>Ferry (AMHS)</div>' +
    '<div class="lg"><i style="background:rgba(150,225,255,.5);border-radius:2px"></i>Glacier &amp; icefield</div>' +
    '<div class="lg"><i style="background:rgba(74,222,128,.32);border-radius:2px"></i>National park</div>';
}
function apply() { renderList(); draw(); syncHash(); }

// ══════════════ trip planner ══════════════
function toggleTrip(id) {
  const i = trip.indexOf(id);
  i >= 0 ? trip.splice(i, 1) : trip.push(id);
  toast(i >= 0 ? 'Removed from trip' : 'Added to trip · ' + trip.length + ' stops');
  renderTrip(); renderList(); draw(); syncHash();
  if (sel) renderDetail(sel);
}
// Alaska's road network is one connected blob plus two islands you can only reach by
// boat or plane. Mode follows the network, not the activity you do when you get there.
const ROADNET = ['Southcentral', 'Kenai Peninsula', 'Interior', 'Wrangell-Copper-Valdez', 'Arctic'];
function legOf(a, b) {
  const km = haversine(a, b);
  if (km < 1) return { km: 0, h: 0, mode: 'walk', note: '' };
  const flyIn = a.access === 'air-only' || b.access === 'air-only';
  const roadA = ROADNET.includes(a.region), roadB = ROADNET.includes(b.region);
  const bothSE = a.region === 'Southeast' && b.region === 'Southeast';

  if (roadA && roadB && !flyIn) {                       // a known leg beats an estimate
    if (a.hub && b.hub) {
      const key = x => x.toLowerCase().replace(/[^a-z]/g, '');
      const d = (HUBS.drives || []).find(dr =>
        (key(dr.from) === key(a.hub) && key(dr.to) === key(b.hub)) ||
        (key(dr.from) === key(b.hub) && key(dr.to) === key(a.hub)));
      if (d && d.hours) return { km: Math.round(d.miles * 1.609), h: d.hours, mode: d.mode || 'drive', note: d.road || '' };
    }
    return { km: Math.round(km * 1.28), h: +(km * 1.28 / 78).toFixed(1), mode: 'drive', note: '' };
  }
  if (bothSE && !flyIn) return { km: Math.round(km * 1.15), h: +(km * 1.15 / 30 + 1.5).toFixed(1), mode: 'ferry', note: 'ferry or short hop' };
  return { km: Math.round(km), h: +(km / 320 + 2).toFixed(1), mode: 'fly', note: flyIn ? 'bush flight' : 'no road link' };
}
function tripStats() {
  const st = trip.map(id => byId[id]).filter(Boolean);
  let act = 0, trav = 0, km = 0, legs = [];
  st.forEach(a => act += a.hours || 0);
  for (let i = 1; i < st.length; i++) { const l = legOf(st[i - 1], st[i]); legs.push(l); trav += l.h; km += l.km; }
  const days = Math.max(st.length ? 1 : 0, Math.ceil((act + trav) / 9));
  return { st, act, trav, km, legs, days };
}
function renderTrip() {
  const host = $('#tripBody'), { st, act, trav, km, legs, days } = tripStats();
  $('#tripN').textContent = trip.length;
  if (!st.length) {
    host.innerHTML = '<div class="empty">No stops yet.<br><br>Click <b>+</b> on any place, or load a ready-made route below.</div>' + presetHTML();
    wirePresets(); return;
  }
  const warn = [];
  const offs = st.filter(a => F.month && !inSeason(a));
  if (offs.length) warn.push(['Closed / poor in ' + MON[F.month - 1] + ': ' + offs.map(a => a.name).join(', '), 0]);
  const books = st.filter(a => a.book);
  if (books.length) warn.push(['Book well ahead: ' + books.map(a => a.name).join(', '), 0]);
  const flights = legs.filter(l => l.mode === 'fly').length;
  if (flights) warn.push([flights + ' leg' + (flights > 1 ? 's' : '') + ' need a plane or ferry — no road connection.', 0]);
  if (days > 14) warn.push(['That is a ' + days + '-day trip. Most visitors get 7–12.', 0]);
  if (!warn.length) warn.push(['Route looks doable. Add buffer days for weather.', 1]);

  host.innerHTML =
    '<div class="tripsum">' +
    '<div><div class="v">' + st.length + '</div><div class="k">stops</div></div>' +
    '<div><div class="v">' + days + '</div><div class="k">days</div></div>' +
    '<div><div class="v">' + Math.round(km) + '</div><div class="k">km</div></div>' +
    '<div><div class="v">' + Math.round(act + trav) + '</div><div class="k">hours</div></div>' +
    '</div>' +
    warn.map(w => '<div class="warn' + (w[1] ? ' ok' : '') + '">' + esc(w[0]) + '</div>').join('') +
    '<div class="rowbtns" style="margin:8px 0 10px">' +
    '<button class="tbtn" id="btnOpt">Optimize order</button>' +
    '<button class="tbtn" id="btnFitTrip">Zoom to trip</button>' +
    '<button class="tbtn" id="btnExport">Export</button>' +
    '<button class="tbtn" id="btnClear">Clear</button></div>' +
    st.map((a, i) =>
      (i ? '<div class="leg"><span>' + legIcon(legs[i - 1].mode) + ' ' + legs[i - 1].km + ' km · ' + legs[i - 1].h + ' h' +
        (legs[i - 1].note ? ' · ' + esc(legs[i - 1].note) : '') + '</span><span class="l"></span></div>' : '') +
      '<div class="tstop" data-id="' + esc(a.id) + '">' +
      '<div class="n">' + (i + 1) + '</div>' +
      '<div><div class="nm">' + esc(a.name) + '</div><div class="mt">' + esc(catName(a.cat)) + ' · ' + fmtH(a.hours) + ' · ' + esc(a.region) + '</div></div>' +
      '<div class="ops"><button data-up="' + i + '" title="Up">↑</button><button data-dn="' + i + '" title="Down">↓</button>' +
      '<button data-rm="' + i + '" title="Remove">✕</button></div></div>').join('') +
    presetHTML();
  host.querySelectorAll('.tstop').forEach(n => n.onclick = e => { if (!e.target.dataset.up && !e.target.dataset.dn && !e.target.dataset.rm) select(n.dataset.id); });
  host.querySelectorAll('[data-up]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.up; if (i) { [trip[i - 1], trip[i]] = [trip[i], trip[i - 1]]; renderTrip(); draw(); syncHash(); } });
  host.querySelectorAll('[data-dn]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.dn; if (i < trip.length - 1) { [trip[i + 1], trip[i]] = [trip[i], trip[i + 1]]; renderTrip(); draw(); syncHash(); } });
  host.querySelectorAll('[data-rm]').forEach(b => b.onclick = e => { e.stopPropagation(); trip.splice(+b.dataset.rm, 1); renderTrip(); renderList(); draw(); syncHash(); });
  $('#btnOpt').onclick = optimize;
  $('#btnFitTrip').onclick = () => fit(st.map(a => a._p), .72);
  $('#btnExport').onclick = exportTrip;
  $('#btnClear').onclick = () => { trip = []; renderTrip(); renderList(); draw(); syncHash(); };
  wirePresets();
}
const legIcon = m => ({ drive: '🚗', fly: '✈', ferry: '⛴', walk: '·' }[m] || '→');
function optimize() {
  if (trip.length < 3) return;
  const st = trip.map(id => byId[id]);
  const out = [st.shift()];
  while (st.length) {
    let bi = 0, bd = 1e9;
    st.forEach((a, i) => { const d = haversine(out[out.length - 1], a); if (d < bd) { bd = d; bi = i; } });
    out.push(st.splice(bi, 1)[0]);
  }
  trip = out.map(a => a.id);
  renderTrip(); draw(); syncHash(); toast('Reordered by nearest hop');
}
function presetHTML() {
  if (!ITIN.length) return '';
  return '<div style="margin-top:14px"><div class="listhead" style="padding-left:0;border:0">Ready-made routes</div><div class="presets">' +
    ITIN.map((t, i) => '<button class="preset" data-itin="' + i + '"><div class="nm">' + esc(t.name) +
      '<span class="d">' + t.days + 'd</span></div><div class="ds">' + esc(t.summary) +
      ' <span style="color:var(--tx3)">· ' + esc(t.season) + ' · ' + t.stops.length + ' stops</span></div></button>').join('') +
    '</div></div>';
}
function wirePresets() {
  $$('[data-itin]').forEach(b => b.onclick = () => {
    const t = ITIN[+b.dataset.itin];
    trip = t.stops.filter(id => byId[id]);
    renderTrip(); renderList(); draw(); syncHash();
    fit(trip.map(id => byId[id]._p), .7);
    toast(t.name + ' loaded · ' + trip.length + ' stops');
  });
}
function exportTrip() {
  const { st, act, trav, km, legs, days } = tripStats();
  let md = '# Alaska trip — ' + st.length + ' stops · ~' + days + ' days · ' + Math.round(km) + ' km\n\n';
  st.forEach((a, i) => {
    if (i) md += '   ↓ ' + legs[i - 1].mode + ' ' + legs[i - 1].km + ' km / ' + legs[i - 1].h + ' h\n';
    md += (i + 1) + '. **' + a.name + '** (' + a.region + ') — ' + catName(a.cat) + ', ' + fmtH(a.hours) + ', ' + (a.cost || '—') + '\n';
    md += '   ' + a.blurb + '\n';
    if (a.tip) md += '   > ' + a.tip + '\n';
    md += '   ' + a.lat.toFixed(4) + ', ' + a.lng.toFixed(4) + ' · https://www.google.com/maps/search/?api=1&query=' + a.lat + ',' + a.lng + '\n';
  });
  md += '\nActivity time ' + Math.round(act) + ' h · travel ' + Math.round(trav) + ' h\n';
  md += '\nShare link: ' + location.origin + location.pathname + '#' + hashStr() + '\n';
  openModal('<h2>Export trip</h2><p>Markdown — copy anywhere.</p><textarea id="expArea" spellcheck="false">' + esc(md) + '</textarea>' +
    '<div class="dact" style="margin-top:10px"><button class="prim" id="cpBtn">Copy</button>' +
    '<button id="cpLink">Copy share link</button></div>');
  $('#cpBtn').onclick = () => { $('#expArea').select(); document.execCommand('copy'); toast('Copied'); };
  $('#cpLink').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(location.origin + location.pathname + '#' + hashStr()); toast('Link copied'); };
}

// ══════════════ month bar / season ══════════════
function renderMonths() {
  const host = $('#months'); host.innerHTML = '';
  const all = el('button', 'm' + (F.month === 0 ? ' on' : ''), 'All');
  all.onclick = () => setMonth(0); host.appendChild(all);
  MON.forEach((m, i) => {
    const s = SEASON.months[i] || {};
    const b = el('button', 'm' + (F.month === i + 1 ? ' on' : ''), m + '<span class="bar" style="width:' + ((s.aurora || 0) * 10) + '%"></span>');
    b.title = (s.summary || '');
    b.onclick = () => setMonth(i + 1);
    host.appendChild(b);
  });
  renderMonthInfo();
}
function setMonth(m) { F.month = m; renderMonths(); renderList(); renderTrip(); renderPlan(); draw(); if (sel) renderDetail(sel); syncHash(); }
function renderMonthInfo() {
  const box = $('#minfo');
  if (!F.month) {
    const n = A.filter(a => a._ok !== false).length;
    box.innerHTML = '<b>' + A.length + '</b> places mapped<span class="sep"></span><span>Pick a month to see what is actually open</span>';
    return;
  }
  const s = SEASON.months[F.month - 1] || {};
  const open = A.filter(a => inSeason(a)).length;
  box.innerHTML =
    '<span>☀ <b>' + (s.dayAnc != null ? s.dayAnc + 'h' : '—') + '</b> daylight</span><span class="sep"></span>' +
    '<span>🌡 <b>' + (s.hiAnc != null ? s.hiAnc + '°F' : '—') + '</b> ANC</span><span class="sep"></span>' +
    '<span>🟣 aurora <b>' + (s.aurora != null ? s.aurora + '/10' : '—') + '</b></span><span class="sep"></span>' +
    '<span>📍 <b>' + open + '</b> in season</span>' +
    '<span class="sum">' + esc(s.summary || '') + '</span>';
}

// ══════════════ plan pane ══════════════
function renderPlan() {
  const host = $('#planBody');
  const s = SEASON.months[(F.month || 7) - 1] || {};
  const bar = (lb, v, col) => '<div class="barrow"><span class="lb">' + esc(lb) + '</span><span class="bg"><span class="fl" style="width:' + (v * 10) + '%;background:' + col + '"></span></span><span class="vv">' + v + '</span></div>';
  host.innerHTML =
    '<div class="card"><div class="t">' + (F.month ? MON[F.month - 1] : 'July') + ' at a glance</div>' +
    '<div class="b">' + esc(s.summary || '') + '</div><div class="bars">' +
    bar('Aurora', s.aurora || 0, '#a78bfa') + bar('Crowds', s.crowd || 0, '#ff7a6b') + bar('Prices', s.price || 0, '#ffcf5c') +
    '</div><div class="b" style="margin-top:7px"><b style="color:var(--aurora)">Open:</b> ' + esc((s.open || []).join(', ') || '—') + '</div>' +
    '<div class="b"><b style="color:var(--salmon)">Closed:</b> ' + esc((s.closed || []).join(', ') || '—') + '</div>' +
    (s.highlights && s.highlights.length ? '<div class="b"><b style="color:var(--gold)">Events:</b> ' + esc(s.highlights.join(' · ')) + '</div>' : '') +
    '</div>' +
    sect('Season windows', (SEASON.windows || []).map(w =>
      '<div class="costrow"><span>' + esc(w.label) + '</span><span class="p" style="color:var(--ice)">' + esc(w.start) + ' → ' + esc(w.end) + '</span>' +
      (w.note ? '<span class="n2">' + esc(w.note) + '</span>' : '') + '</div>').join('')) +
    sect('Gotchas that ruin trips', (LOGI.gotchas || []).map(g =>
      '<div class="card"><div class="t"><i class="sev" style="background:' + ({ high: '#ff7a6b', medium: '#ffcf5c' }[g.sev] || '#7fd8ff') + '"></i>' +
      esc(g.title) + '</div><div class="b">' + esc(g.body) + '</div></div>').join('')) +
    sect('What things cost', (LOGI.costs || []).map(c =>
      '<div class="costrow"><span>' + esc(c.item) + '</span><span class="p">' + esc(c.typical) + '</span>' +
      (c.note ? '<span class="n2">' + esc(c.note) + '</span>' : '') + '</div>').join('')) +
    sect('Myths', (LOGI.myths || []).map(m =>
      '<div class="card myth"><div class="t">✕ ' + esc(m.claim) + '</div><div class="b">' + esc(m.reality) + '</div></div>').join('')) +
    sect('Hubs & drive legs', (HUBS.drives || []).slice().sort((a, b) => (a.hours || 0) - (b.hours || 0)).map(d =>
      '<div class="costrow"><span>' + esc(d.from) + ' → ' + esc(d.to) + '</span>' +
      '<span class="p" style="color:' + (d.mode === 'air' ? 'var(--violet)' : d.mode === 'ferry' ? 'var(--ice)' : 'var(--aurora)') + '">' +
      (d.miles ? d.miles + ' mi · ' : '') + (d.hours || '?') + ' h</span>' +
      (d.road || d.note ? '<span class="n2">' + esc([d.road, d.note].filter(Boolean).join(' — ')) + '</span>' : '') + '</div>').join(''));
}
function sect(title, inner) {
  if (!inner) return '';
  return '<details class="sec" open style="border:0"><summary>' + esc(title) + '</summary><div class="body" style="padding:0">' + inner + '</div></details>';
}

// ══════════════ data pane ══════════════
function renderData() {
  const rc = countBy(a => a.region), cc = countBy(a => a.cat), tc = countBy(a => a.tier);
  const mx = Math.max(...Object.values(rc));
  const mc = Math.max(...Object.values(cc));
  const bar = (lb, v, m, col) => '<div class="barrow"><span class="lb">' + esc(lb) + '</span><span class="bg"><span class="fl" style="width:' +
    (v / m * 100) + '%;background:' + col + '"></span></span><span class="vv">' + v + '</span></div>';
  $('#dataBody').innerHTML =
    '<div class="card"><div class="t">' + A.length + ' places · ' + Object.keys(rc).length + ' regions · ' + Object.keys(cc).length + ' categories</div>' +
    '<div class="b">Ranked 1–' + A.length + ' by a single importance score for a first-time visitor. Tier 1 = ' +
    (tc[1] || 0) + ' bucket-list entries.</div></div>' +
    sect('By region', REGION_ORDER.filter(r => rc[r]).map(r => bar(r, rc[r], mx, '#7fd8ff')).join('')) +
    sect('By category', Object.keys(cc).sort((a, b) => cc[b] - cc[a]).map(c => bar(catName(c), cc[c], mc, catColor(c))).join('')) +
    sect('Top 25', A.slice().sort((a, b) => a.rank - b.rank).slice(0, 25).map(a =>
      '<div class="costrow" style="cursor:pointer" data-go="' + esc(a.id) + '"><span style="color:var(--tx3);font-family:var(--mono);font-size:10px">' +
      String(a.rank).padStart(2, '0') + '</span><span>' + esc(a.name) + '</span><span class="p" style="color:' + (TIER[a.tier] || TIER[4])[1] + '">' + a.imp + '</span></div>').join('')) +
    '<div class="card" style="margin-top:10px"><div class="b" style="font-size:10.5px;color:var(--tx3)">' +
    'Basemap: Natural Earth 10m (coast, glaciers, NPS units, lakes, rivers, bathymetry) + OpenStreetMap (highways). ' +
    'Projection: Alaska Albers Equal Area. Attraction data: researched + coordinate-verified ' + esc(BUILT) + '. ' +
    'Everything runs client-side in one HTML file.</div></div>';
  $$('#dataBody [data-go]').forEach(n => n.onclick = () => { tab('explore'); select(n.dataset.go); });
}

// ══════════════ modal / toast ══════════════
function openModal(html) { $('#modalBox').innerHTML = '<button class="x">✕</button>' + html; $('#modal').classList.add('on'); $('#modalBox .x').onclick = closeModal; }
function closeModal() { $('#modal').classList.remove('on'); }
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1900); }

function help() {
  openModal('<h2>Alaska, mapped</h2>' +
    '<p>' + A.length + ' places worth your time, ranked 1–' + A.length + ' by a single importance score. ' +
    'Everything is client-side: the coastline, the icefields, the park boundaries and the highways are real geometry, ' +
    'projected in Alaska Albers.</p>' +
    '<h3>Reading the map</h3><ul>' +
    '<li><b>Shape is how much it matters.</b> A ringed disc is bucket-list, a small ringed chip is major, a plain dot is worth-it-if-nearby. Dots appear as you zoom in.</li>' +
    '<li><b>Colour is what kind of day it is</b> — ice &amp; high country, wild Alaska, aurora &amp; snow, ways to travel, towns &amp; culture.</li>' +
    '<li><b>The glyph is the category</b> — bear paw, iceberg, plane, totem, pickaxe. The same glyphs label the filters and the list.</li>' +
    '<li>When two places sit on top of each other the lower-ranked one shrinks to a dot. Zoom in and it comes back.</li></ul>' +
    '<h3>Use it like this</h3><ul>' +
    '<li>Filter by <b>category / tier / region / access</b> — shift-click a chip to isolate it.</li>' +
    '<li>Pick a <b>month</b> at the bottom: off-season places dim, daylight and aurora odds update.</li>' +
    '<li>Hit <b>+</b> on anything to build a trip. The planner estimates drive/fly legs, total days, and warns you about closures and things you must book.</li>' +
    '<li>Load a <b>ready-made route</b> in the Trip tab, then edit it.</li>' +
    '<li>Your trip lives in the URL — copy the link to share it.</li></ul>' +
    '<h3>Keyboard</h3><div class="kgrid">' +
    '<kbd>/</kbd><span>search</span><kbd>1–4</kbd><span>toggle tier</span><kbd>F</kbd><span>fit Alaska</span>' +
    '<kbd>+ / −</kbd><span>zoom</span><kbd>M</kbd><span>cycle month</span><kbd>T</kbd><span>trip tab</span>' +
    '<kbd>L</kbd><span>labels on/off</span><kbd>Esc</kbd><span>close</span><kbd>?</kbd><span>this</span></div>' +
    '<h3>Honest caveats</h3><p>Scores are judgment calls, not gospel. Drive times assume summer pavement and no construction. ' +
    'Verify permits, ferry schedules and bus tickets with the operator before you book anything.</p>');
}

// ══════════════ tabs / layers ══════════════
function tab(name) {
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + name));
  if (name === 'plan') renderPlan();
  if (name === 'data') renderData();
  if (window.innerWidth <= 860) $('aside').classList.add('open');
}
function buildLayers() {
  const host = $('#layers'); host.innerHTML = '';
  const items = [['ice', 'Glaciers & icefields'], ['parks', 'National parks'], ['roads', 'Highways'], ['rail', 'Alaska Railroad'],
  ['ferry', 'Ferry routes'], ['rivers', 'Rivers'], ['places', 'Towns'], ['labels', 'Labels'], ['grid', 'Graticule'], ['shelf', 'Sea shelf']];
  items.forEach(([k, lbl]) => {
    const l = el('label', 'switch', '<input type="checkbox" ' + (L[k] ? 'checked' : '') + '><span>' + lbl + '</span>');
    l.querySelector('input').onchange = e => { L[k] = e.target.checked ? 1 : 0; draw(); };
    host.appendChild(l);
  });
}

// ══════════════ URL state ══════════════
function hashStr() {
  const p = [];
  if (trip.length) p.push('t=' + trip.join(','));
  if (F.month) p.push('m=' + F.month);
  if (sel) p.push('s=' + sel.id);
  return p.join('&');
}
function syncHash() { if (suppressHash) return; const h = hashStr(); history.replaceState(null, '', h ? '#' + h : location.pathname); }
function readHash() {
  const h = location.hash.slice(1); if (!h) return;
  const p = Object.fromEntries(h.split('&').map(s => s.split('=')));
  if (p.t) trip = p.t.split(',').filter(id => byId[id]);
  if (p.m) F.month = clamp(+p.m | 0, 0, 12);
  if (p.s && byId[p.s]) setTimeout(() => select(p.s), 250);
}

// ══════════════ aurora header ══════════════
function auroraHeader() {
  const c = $('#auroraCanvas'), x = c.getContext('2d');
  if (REDUCED) return;
  let t = 0, w, h;
  const rs = () => { const r = c.getBoundingClientRect(); w = c.width = r.width * 2; h = c.height = r.height * 2; };
  rs(); window.addEventListener('resize', rs);
  (function loop() {
    x.clearRect(0, 0, w, h);
    for (let b = 0; b < 3; b++) {
      const g = x.createLinearGradient(0, 0, w, 0);
      const cols = [['rgba(82,255,184,0)', 'rgba(82,255,184,.34)'], ['rgba(127,216,255,0)', 'rgba(127,216,255,.26)'], ['rgba(167,139,250,0)', 'rgba(167,139,250,.22)']][b];
      g.addColorStop(0, cols[0]); g.addColorStop(.5, cols[1]); g.addColorStop(1, cols[0]);
      x.strokeStyle = g; x.lineWidth = 26 - b * 6; x.beginPath();
      for (let i = 0; i <= w; i += 12) {
        const y = h / 2 + Math.sin(i / 190 + t + b * 1.7) * (h / 3.4) + Math.sin(i / 61 - t * 1.6 + b) * (h / 9);
        i ? x.lineTo(i, y) : x.moveTo(i, y);
      }
      x.stroke();
    }
    t += .0075;
    requestAnimationFrame(loop);
  })();
}

// ══════════════ boot ══════════════
function boot() {
  $$('.tabs button').forEach(b => b.onclick = () => tab(b.dataset.tab));
  $('#hHelp').onclick = help;
  $('#mobToggle').onclick = () => $('aside').classList.toggle('open');
  $('#zoomIn').onclick = () => zoomAt(W / 2, H / 2, 1.7);
  $('#zoomOut').onclick = () => zoomAt(W / 2, H / 2, 1 / 1.7);
  $('#zoomFit').onclick = () => { view.k > 400 ? fitAll() : fitEverything(); };
  $('#layerBtn').onclick = () => { const p = $('#layerPop'); p.style.display = p.style.display === 'block' ? 'none' : 'block'; };
  $('#q').oninput = e => { F.q = e.target.value.trim(); renderList(); draw(); };
  $('#q').onkeydown = e => { if (e.key === 'Enter') { const r = filtered(); if (r.length) select(r[0].id); } };
  $('#sortSel').onchange = e => { sortBy = e.target.value; renderList(); };
  $('#swKid').onchange = e => { F.kid = e.target.checked; apply(); };
  $('#swBook').onchange = e => { F.nobook = e.target.checked; apply(); };
  $('#swDim').onchange = e => { F.seasonDim = e.target.checked; apply(); };
  $('#swGhost').onchange = e => { F.showFiltered = e.target.checked; draw(); };
  $('#impR').oninput = e => { F.minImp = +e.target.value; e.target.style.setProperty('--pct', F.minImp + '%'); $('#impV').textContent = F.minImp ? F.minImp + '+' : 'any'; apply(); };
  $('#hourR').oninput = e => {
    const v = +e.target.value; F.maxH = v >= 48 ? 0 : v;
    e.target.style.setProperty('--pct', (v / 48 * 100) + '%');
    $('#hourV').textContent = F.maxH ? '≤' + F.maxH + ' h' : 'any';
    apply();
  };
  $('#btnAllCats').onclick = () => { F.cats = new Set(Object.keys(CATS)); F.regions = new Set(REGION_ORDER); F.access = new Set(Object.keys(ACCESS)); F.tiers = new Set([1, 2, 3, 4]); F.minImp = 0; F.maxH = 0; F.q = ''; $('#q').value = ''; $('#impR').value = 0; $('#hourR').value = 48; $('#impV').textContent = 'any'; $('#hourV').textContent = 'any'; buildFilters(); apply(); };
  $('#btnT1').onclick = () => { F.tiers = new Set([1]); buildFilters(); apply(); fitAll(); };

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') { if (e.key === 'Escape') e.target.blur(); return; }
    const k = e.key.toLowerCase();
    if (k === '/') { e.preventDefault(); $('#q').focus(); }
    else if (k === 'escape') { closeModal(); closeDetail(); }
    else if (k === 'f') fitAll();
    else if (k === '?') help();
    else if (k === 'l') { L.labels = 1 - L.labels; draw(); }
    else if (k === 't') tab('trip');
    else if (k === 'm') setMonth((F.month + 1) % 13);
    else if (k === '+' || k === '=') zoomAt(W / 2, H / 2, 1.6);
    else if (k === '-') zoomAt(W / 2, H / 2, 1 / 1.6);
    else if ('1234'.includes(k)) { const t = +k; F.tiers.has(t) ? F.tiers.delete(t) : F.tiers.add(t); buildFilters(); apply(); }
    else if (k === 'arrowleft') { view.x -= 60 / view.k; draw(); }
    else if (k === 'arrowright') { view.x += 60 / view.k; draw(); }
    else if (k === 'arrowup') { view.y += 60 / view.k; draw(); }
    else if (k === 'arrowdown') { view.y -= 60 / view.k; draw(); }
  });
  window.addEventListener('resize', resize);

  suppressHash = true; readHash(); suppressHash = false;
  buildFilters(); buildLegend(); buildLayers(); renderMonths(); renderList(); renderTrip();
  $('#hTotal').textContent = A.length;
  auroraHeader();
  resize(); fitAll();
  if (!location.hash && !localStorage.getItem('ak_seen')) { help(); localStorage.setItem('ak_seen', '1'); }
}
boot();
})();
