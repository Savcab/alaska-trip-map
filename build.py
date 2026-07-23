#!/usr/bin/env python3
"""Build docs/index.html (one self-contained file) + ALASKA_ATTRACTIONS.md from the researched data.

  python3 build.py

Normalizes whatever the research agents produced into the exact schema app.js expects,
so agent drift gets fixed here instead of at runtime."""
import json, os, re, difflib, html, unicodedata, datetime, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data')
SRC = os.path.join(ROOT, 'src')
DOCS = os.path.join(ROOT, 'docs')

CATS = ['national-park', 'glacier', 'wildlife', 'aurora', 'town-city', 'museum-culture', 'native-culture',
        'scenic-drive', 'hike-trail', 'boat-cruise', 'flightseeing', 'hot-springs', 'fishing', 'winter-sport',
        'railroad', 'historic-site', 'food-drink', 'festival-event', 'wilderness-lodge', 'roadside-oddity',
        'volcano-geology', 'ferry-route', 'viewpoint']
ACCESS = ['road', 'rail', 'ferry', 'boat-tour', 'air-only', 'cruise-port', 'trail', 'winter-only']
REGIONS = ['Southcentral', 'Kenai Peninsula', 'Interior', 'Southeast', 'Wrangell-Copper-Valdez',
           'Southwest', 'Arctic', 'Aleutians-Bering']

CAT_FIX = {'park': 'national-park', 'nationalpark': 'national-park', 'nature': 'viewpoint', 'ice': 'glacier',
           'animals': 'wildlife', 'bear': 'wildlife', 'bear-viewing': 'wildlife', 'northern-lights': 'aurora',
           'city': 'town-city', 'town': 'town-city', 'museum': 'museum-culture', 'culture': 'native-culture',
           'drive': 'scenic-drive', 'hike': 'hike-trail', 'trail': 'hike-trail', 'hiking': 'hike-trail',
           'cruise': 'boat-cruise', 'boat': 'boat-cruise', 'kayak': 'boat-cruise', 'flight': 'flightseeing',
           'air': 'flightseeing', 'hotspring': 'hot-springs', 'hotsprings': 'hot-springs', 'ski': 'winter-sport',
           'winter': 'winter-sport', 'dogsledding': 'winter-sport', 'train': 'railroad', 'rail': 'railroad',
           'history': 'historic-site', 'historic': 'historic-site', 'food': 'food-drink', 'brewery': 'food-drink',
           'restaurant': 'food-drink', 'bar': 'food-drink', 'festival': 'festival-event', 'event': 'festival-event',
           'lodge': 'wilderness-lodge', 'oddity': 'roadside-oddity', 'quirky': 'roadside-oddity',
           'volcano': 'volcano-geology', 'geology': 'volcano-geology', 'ferry': 'ferry-route',
           'view': 'viewpoint', 'scenic': 'viewpoint', 'airport': 'town-city', 'visitor-center': 'town-city'}
ACC_FIX = {'car': 'road', 'drive': 'road', 'driving': 'road', 'highway': 'road', 'roadside': 'road',
           'train': 'rail', 'railroad': 'rail', 'amhs': 'ferry', 'boat': 'boat-tour', 'cruise': 'cruise-port',
           'ship': 'cruise-port', 'plane': 'air-only', 'air': 'air-only', 'fly': 'air-only', 'flight': 'air-only',
           'bush-plane': 'air-only', 'floatplane': 'air-only', 'hike': 'trail', 'foot': 'trail',
           'walk': 'trail', 'snowmachine': 'winter-only', 'winter': 'winter-only', 'road/trail': 'trail'}
REGION_HINTS = [
    (['juneau', 'ketchikan', 'sitka', 'skagway', 'haines', 'petersburg', 'wrangell', 'glacier bay', 'inside passage',
      'gustavus', 'tongass', 'misty', 'yakutat', 'prince of wales', 'craig', 'klawock', 'hoonah', 'metlakatla',
      'kake', 'angoon', 'tenakee', 'southeast'], 'Southeast'),
    (['seward', 'homer', 'kenai', 'soldotna', 'cooper landing', 'whittier', 'seldovia', 'ninilchik', 'sterling',
      'kachemak', 'resurrection', 'exit glacier', 'portage'], 'Kenai Peninsula'),
    (['mccarthy', 'kennecott', 'valdez', 'chitina', 'glennallen', 'copper', 'wrangell-st', 'wrangell–st',
      'nabesna', 'thompson pass', 'worthington', 'matanuska glacier', 'sheep mountain'], 'Wrangell-Copper-Valdez'),
    (['fairbanks', 'denali', 'talkeetna', 'healy', 'cantwell', 'chena', 'north pole', 'nenana', 'delta junction',
      'tok', 'chicken', 'eagle', 'circle', 'manley', 'interior', 'paxson', 'yukon-charley', 'livengood',
      'central', 'salcha', 'ester', 'fox'], 'Interior'),
    (['barrow', 'utqiag', 'prudhoe', 'deadhorse', 'dalton', 'coldfoot', 'wiseman', 'gates of the arctic',
      'kobuk', 'kotzebue', 'nome', 'brooks range', 'anaktuvuk', 'bettles', 'arctic', 'kaktovik', 'atigun',
      'noatak', 'point hope', 'shishmaref', 'bering land bridge', 'krusenstern'], 'Arctic'),
    (['katmai', 'brooks falls', 'kodiak', 'lake clark', 'bristol', 'king salmon', 'bethel', 'dillingham',
      'iliamna', 'aniakchak', 'wood-tikchik', 'naknek', 'chignik', 'mcneil', 'silver salmon', 'southwest',
      'togiak', 'alaska peninsula'], 'Southwest'),
    (['dutch harbor', 'unalaska', 'aleutian', 'pribilof', 'st. paul', 'st paul', 'saint paul', 'adak', 'attu',
      'kiska', 'cold bay', 'sand point', 'akutan', 'st. lawrence', 'gambell', 'savoonga', 'diomede',
      'bering sea'], 'Aleutians-Bering'),
    (['anchorage', 'girdwood', 'alyeska', 'palmer', 'wasilla', 'mat-su', 'matanuska valley', 'hatcher',
      'eklutna', 'chugach', 'turnagain', 'knik', 'willow', 'big lake', 'eagle river', 'seward highway',
      'southcentral', 'independence mine', 'potter marsh'], 'Southcentral'),
]


def slug(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return s[:60] or 'x'


def norm_key(s):
    return re.sub(r'[^a-z0-9]', '', str(s).lower())


def pick(d, *keys, default=None):
    for k in keys:
        if k in d and d[k] not in (None, ''):
            return d[k]
    return default


def fnum(v, default=0.0):
    try:
        return float(str(v).replace(',', '').strip().rstrip('+').split()[0])
    except Exception:
        return default


def fix_cat(c):
    c = str(c or '').strip().lower().replace(' ', '-').replace('_', '-')
    if c in CATS:
        return c
    if c in CAT_FIX:
        return CAT_FIX[c]
    for k, v in CAT_FIX.items():
        if k in c:
            return v
    for c2 in CATS:
        if c2.split('-')[0] in c:
            return c2
    return 'viewpoint'


def fix_acc(a):
    a = str(a or '').strip().lower().replace(' ', '-').replace('_', '-')
    if a in ACCESS:
        return a
    if a in ACC_FIX:
        return ACC_FIX[a]
    for k, v in ACC_FIX.items():
        if k in a:
            return v
    return 'road'


def fix_region(r, name, blurb, hub):
    r = str(r or '').strip()
    for c in REGIONS:
        if norm_key(c) == norm_key(r):
            return c
    hay = ' '.join(str(x).lower() for x in (r, name, hub, blurb))
    for words, canon in REGION_HINTS:
        if any(w in hay for w in words):
            return canon
    return 'Southcentral'


def load(path, default):
    p = os.path.join(DATA, path)
    if not os.path.exists(p):
        print('  ! missing', path)
        return default
    try:
        with open(p) as f:
            return json.load(f)
    except Exception as e:
        print('  ! bad json', path, e)
        return default


# ─────────────────────────── attractions ───────────────────────────
def gather():
    raw = []
    top = load('attractions.json', None)
    if top:
        raw = top.get('attractions', top if isinstance(top, list) else [])
        print('  attractions.json:', len(raw))
    if len(raw) < 60:                       # fall back to the per-region research files
        import glob
        raw = []
        for f in sorted(glob.glob(os.path.join(DATA, 'research', '*.json'))):
            try:
                d = json.load(open(f))
                raw += d.get('attractions', [])
            except Exception as e:
                print('  ! skip', os.path.basename(f), e)
        print('  merged research files:', len(raw))
    return raw


def normalize(raw):
    out, seen_slug, kept = [], {}, []
    for d in raw:
        if not isinstance(d, dict):
            continue
        name = str(pick(d, 'name', 'n', default='')).strip()
        if not name:
            continue
        lat, lng = fnum(pick(d, 'lat', 'la', 'latitude'), 999), fnum(pick(d, 'lng', 'ln', 'lon', 'longitude'), 999)
        if lng > 100:                        # Aleutians written as +172 instead of -188
            lng -= 360
        if not (50 <= lat <= 73.5) or not (-191 <= lng <= -127):
            print('  ! bad coords, dropped:', name, lat, lng)
            continue
        blurb = str(pick(d, 'blurb', 'b', 'description', 'desc', default='')).strip()
        hub = str(pick(d, 'nearest_hub', 'hub', default='')).strip()
        months = pick(d, 'best_months', 'months', 'bm', default=[]) or []
        if isinstance(months, str):
            months = [int(x) for x in re.findall(r'\d+', months)]
        months = sorted({int(m) for m in months if isinstance(m, (int, float, str)) and str(m).strip().isdigit() and 1 <= int(m) <= 12})
        a = {
            'name': name,
            'region': fix_region(pick(d, 'region', 'r'), name, blurb, hub),
            'lat': round(lat, 4), 'lng': round(lng, 4),
            'cat': fix_cat(pick(d, 'category', 'cat', 'c')),
            'imp': int(round(max(1, min(100, fnum(pick(d, 'importance', 'imp', 'i'), 50))))),
            'season': str(pick(d, 'season', 's', default='')).strip()[:120],
            'months': months,
            'hours': round(max(0.25, min(96, fnum(pick(d, 'time_needed_hours', 'hours', 'h'), 2))), 2),
            'access': fix_acc(pick(d, 'access', 'a')),
            'cost': str(pick(d, 'cost', '$', default='')).strip()[:48],
            'hub': hub[:40],
            'blurb': blurb[:180],
            'tip': str(pick(d, 'tip', 'tp', default='')).strip()[:180],
            'crowd': str(pick(d, 'crowd', 'cr', default='medium')).strip().lower()[:8],
            'kid': bool(pick(d, 'kid_friendly', 'kid', 'kf', default=False)),
            'book': bool(pick(d, 'book_ahead', 'book', 'ba', default=False)),
            'url': str(pick(d, 'url', 'u', 'official_url', default='')).strip()[:200],
        }
        if a['url'] and not a['url'].startswith('http'):
            a['url'] = ''
        kept.append(a)

    # dedupe: same slug, or within ~600 m with a similar name
    def close(p, q):
        return abs(p['lat'] - q['lat']) < 0.006 and abs(p['lng'] - q['lng']) < 0.014

    kept.sort(key=lambda x: -x['imp'])
    for a in kept:
        s = slug(a['name'])
        dup = None
        if s in seen_slug:
            dup = seen_slug[s]
        else:
            for b in out:
                if close(a, b) and difflib.SequenceMatcher(None, norm_key(a['name']), norm_key(b['name'])).ratio() > .55:
                    dup = b
                    break
        if dup:
            for k in ('blurb', 'tip', 'cost', 'season', 'hub', 'url'):
                if len(str(a[k])) > len(str(dup[k])):
                    dup[k] = a[k]
            dup['months'] = sorted(set(dup['months']) | set(a['months']))
            dup['kid'] = dup['kid'] or a['kid']
            continue
        a['id'] = s if s not in seen_slug else s + '-' + str(len(out))
        seen_slug[a['id']] = a
        seen_slug.setdefault(s, a)
        out.append(a)

    out.sort(key=lambda x: (-x['imp'], x['name']))
    # Tiers are relative labels, not absolute scores: keep the top of the map legible
    # even if the researchers scored generously or stingily.
    def band(lo, hi, n):
        return max(lo, min(hi, n))
    n1 = band(22, 40, sum(1 for a in out if a['imp'] >= 86))
    n2 = n1 + band(55, 110, sum(1 for a in out if 72 <= a['imp'] < 86))
    n3 = n2 + band(90, 210, sum(1 for a in out if 55 <= a['imp'] < 72))
    for i, a in enumerate(out):
        a['rank'] = i + 1
        a['tier'] = 1 if i < n1 else 2 if i < n2 else 3 if i < n3 else 4
    print('  tiers: %d bucket-list / %d major / %d worth it / %d if nearby'
          % (n1, n2 - n1, n3 - n2, len(out) - n3))
    return out


# ─────────────────────────── support data ───────────────────────────
def norm_season(raw):
    months = []
    src = (raw or {}).get('months', [])
    for i in range(12):
        m = next((x for x in src if int(fnum(x.get('m', x.get('month', 0)), 0)) == i + 1), {}) or {}
        months.append({
            'm': i + 1, 'name': m.get('name') or ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                                                  'August', 'September', 'October', 'November', 'December'][i],
            'dayAnc': round(fnum(pick(m, 'daylight_anchorage_hrs', 'daylight_anchorage', 'dayAnc'), 0), 1),
            'dayFbx': round(fnum(pick(m, 'daylight_fairbanks_hrs', 'daylight_fairbanks', 'dayFbx'), 0), 1),
            'hiAnc': round(fnum(pick(m, 'avg_high_anchorage_f', 'hiAnc'), 0)),
            'hiFbx': round(fnum(pick(m, 'avg_high_fairbanks_f', 'hiFbx'), 0)),
            'hiJnu': round(fnum(pick(m, 'avg_high_juneau_f', 'hiJnu'), 0)),
            'aurora': int(round(fnum(pick(m, 'aurora_score', 'aurora'), 0))),
            'crowd': int(round(fnum(pick(m, 'crowd_score', 'crowd'), 0))),
            'price': int(round(fnum(pick(m, 'price_score', 'price'), 0))),
            'summary': str(m.get('summary', ''))[:160],
            'open': [str(x)[:40] for x in (m.get('open') or [])][:8],
            'closed': [str(x)[:40] for x in (m.get('closed') or [])][:8],
            'highlights': [str(x)[:60] for x in (m.get('highlights') or [])][:6],
        })
    wins = [{'label': str(w.get('label', ''))[:70], 'start': str(w.get('start', ''))[:24],
             'end': str(w.get('end', ''))[:24], 'note': str(w.get('note', ''))[:140]}
            for w in ((raw or {}).get('windows') or []) if w.get('label')]
    return {'months': months, 'windows': wins}


def norm_hubs(raw):
    hubs = [{'id': h.get('id') or slug(h.get('name', '')), 'name': h.get('name', ''),
             'lat': fnum(h.get('lat'), 0), 'lng': fnum(h.get('lng'), 0), 'role': str(h.get('role', ''))[:80],
             'airport': str(h.get('airport', ''))[:8], 'note': str(h.get('note', ''))[:120]}
            for h in ((raw or {}).get('hubs') or []) if h.get('name')]
    drives = []
    idn = {h['id']: h['name'] for h in hubs}
    for d in ((raw or {}).get('drives') or []):
        f, t = str(d.get('from', '')), str(d.get('to', ''))
        drives.append({'from': idn.get(f, f), 'to': idn.get(t, t), 'miles': int(fnum(d.get('miles'), 0)),
                       'hours': round(fnum(d.get('hours'), 0), 1), 'road': str(d.get('road', ''))[:48],
                       'mode': d.get('mode', 'drive'), 'note': str(d.get('note', ''))[:110]})
    return {'hubs': hubs, 'drives': [d for d in drives if d['from'] and d['to']]}


def norm_itin(raw, attrs):
    by_norm = {norm_key(a['name']): a['id'] for a in attrs}
    names = list(by_norm.keys())
    out = []
    for t in ((raw or {}).get('itineraries') or raw or []):
        if not isinstance(t, dict) or not t.get('name'):
            continue
        stops, missing = [], []
        for n in (t.get('attractions') or t.get('stops') or []):
            if isinstance(n, dict):
                n = n.get('name', '')
            k = norm_key(n)
            hit = by_norm.get(k)
            if not hit:
                cand = [x for x in names if k and (k in x or x in k)]
                if not cand:
                    cand = difflib.get_close_matches(k, names, n=1, cutoff=.82)
                hit = by_norm[cand[0]] if cand else None
            if hit and hit not in stops:
                stops.append(hit)
            elif not hit:
                missing.append(str(n))
        if len(stops) < 3:
            print('  ! itinerary too thin, skipped:', t.get('name'), 'missing', missing[:5])
            continue
        out.append({'id': slug(t['name']), 'name': str(t['name'])[:60], 'days': int(fnum(t.get('days'), 7)),
                    'season': str(t.get('season', ''))[:32], 'budget': str(t.get('budget', ''))[:12],
                    'style': str(t.get('style', ''))[:32], 'who': str(t.get('who', ''))[:48],
                    'summary': str(t.get('summary', ''))[:150], 'why': str(t.get('why', ''))[:150],
                    'stops': stops})
        if missing:
            print('  ~ %s: %d/%d stops matched (unmatched: %s)' % (t['name'], len(stops), len(stops) + len(missing), ', '.join(missing[:4])))
    return out


def norm_logi(raw):
    r = raw or {}
    return {
        'gotchas': [{'title': str(g.get('title', ''))[:70], 'body': str(g.get('body', ''))[:220],
                     'sev': str(g.get('severity', g.get('sev', 'medium'))).lower()[:6], 'tag': str(g.get('tag', ''))[:14]}
                    for g in (r.get('gotchas') or []) if g.get('title')],
        'costs': [{'item': str(c.get('item', ''))[:60], 'typical': str(c.get('typical', c.get('cost', '')))[:24],
                   'note': str(c.get('note', ''))[:100]} for c in (r.get('costs') or []) if c.get('item')],
        'myths': [{'claim': str(m.get('claim', ''))[:90], 'reality': str(m.get('reality', ''))[:200]}
                  for m in (r.get('myths') or []) if m.get('claim')],
    }


# ─────────────────────────── emit ───────────────────────────
def inject(js, token, obj):
    payload = json.dumps(obj, separators=(',', ':'), ensure_ascii=False).replace('<', '\\u003c')
    pat = re.compile(r'/\*__' + token + r'__\*/.*?/\*__END__\*/', re.S)
    if not pat.search(js):
        raise SystemExit('placeholder __%s__ not found' % token)
    return pat.sub(lambda _: payload, js, count=1)


def main():
    print('▸ loading data')
    attrs = normalize(gather())
    print('  normalized attractions:', len(attrs))
    season = norm_season(load('seasonal-calendar.json', {}))
    hubs = norm_hubs(load('hubs-and-drives.json', {}))
    itin = norm_itin(load('itineraries.json', {}), attrs)
    logi = norm_logi(load('logistics.json', {}))
    base = load('basemap.json', {})
    built = datetime.date.today().isoformat()
    print('  season months %d · windows %d · hubs %d · drives %d · itineraries %d · gotchas %d · costs %d · myths %d'
          % (len(season['months']), len(season['windows']), len(hubs['hubs']), len(hubs['drives']),
             len(itin), len(logi['gotchas']), len(logi['costs']), len(logi['myths'])))

    js = open(os.path.join(SRC, 'app.js')).read()
    js = inject(js, 'BASEMAP', base)
    js = inject(js, 'ATTRACTIONS', attrs)
    js = inject(js, 'SEASON', season)
    js = inject(js, 'HUBS', hubs)
    js = inject(js, 'ITIN', itin)
    js = inject(js, 'LOGI', logi)
    js = inject(js, 'BUILT', built)
    css = open(os.path.join(SRC, 'app.css')).read()
    page = open(os.path.join(SRC, 'index.html')).read().replace('/*__CSS__*/', css).replace('/*__JS__*/', js)

    os.makedirs(DOCS, exist_ok=True)
    out = os.path.join(DOCS, 'index.html')
    open(out, 'w').write(page)
    open(os.path.join(DOCS, '.nojekyll'), 'w').write('')
    print('▸ wrote %s  (%.1f MB)' % (out, os.path.getsize(out) / 1e6))

    write_doc(attrs, season, hubs, itin, logi, built)


def write_doc(attrs, season, hubs, itin, logi, built):
    L = []
    W = L.append
    W('# Alaska — everything worth seeing, ranked\n')
    W('*%d places, coordinate-verified, scored 1–100 for a first-time visitor. Generated %s.*\n' % (len(attrs), built))
    W('Interactive map: **[the map](https://savcab.github.io/alaska-trip-map/)** — filter by season, category and access, then build a route.\n')
    W('## How the score works\n')
    W('One number, 0–100, answering: *if you only had time for one more thing, how much would you regret skipping this?*')
    W('Anchors — Denali NP 98, Kenai Fjords day cruise 93, Brooks Falls 92, Mendenhall 88, Talkeetna 74, Anchorage Museum 70, a good brewery 35, a roadside pullout 25.\n')
    W('| Tier | Score | Meaning | Count |')
    W('|---|---|---|---|')
    for t, lab, rng in ((1, 'Bucket list', '88–100'), (2, 'Major', '72–87'), (3, 'Worth it', '50–71'), (4, 'If nearby', '<50')):
        W('| %d | %s | %s | %d |' % (t, rng, lab, sum(1 for a in attrs if a['tier'] == t)))
    W('')
    W('## The top 50\n')
    W('| # | Place | Region | What | Score | Time | Season | Access |')
    W('|--:|---|---|---|--:|---|---|---|')
    for a in attrs[:50]:
        W('| %d | **%s** | %s | %s | %d | %s | %s | %s |' % (
            a['rank'], a['name'], a['region'], a['cat'], a['imp'],
            ('%gh' % a['hours']) if a['hours'] < 24 else '%gd' % round(a['hours'] / 24, 1),
            ','.join(str(m) for m in a['months']) or 'any', a['access']))
    W('')
    W('## Everything, by region\n')
    for r in REGIONS:
        rows = [a for a in attrs if a['region'] == r]
        if not rows:
            continue
        W('### %s  *(%d)*\n' % (r, len(rows)))
        for a in rows:
            bits = ['**#%d %s**' % (a['rank'], a['name']), '`%d`' % a['imp'], a['cat']]
            W('- ' + ' · '.join(bits))
            W('  - %s' % a['blurb'])
            if a['tip']:
                W('  - *Tip:* %s' % a['tip'])
            W('  - %s · %s · %s · months %s · `%.4f, %.4f`%s' % (
                ('%gh' % a['hours']) if a['hours'] < 24 else '%gd' % round(a['hours'] / 24, 1),
                a['cost'] or 'cost n/a', a['access'],
                ','.join(str(m) for m in a['months']) or 'any', a['lat'], a['lng'],
                ' · **book ahead**' if a['book'] else ''))
        W('')
    if season['months']:
        W('## Month by month\n')
        W('| Month | Daylight ANC | High ANC °F | Aurora | Crowds | Price | Notes |')
        W('|---|--:|--:|--:|--:|--:|---|')
        for m in season['months']:
            W('| %s | %sh | %s | %d/10 | %d/10 | %d/10 | %s |' % (m['name'][:3], m['dayAnc'], m['hiAnc'],
                                                                  m['aurora'], m['crowd'], m['price'], m['summary']))
        W('')
    if season['windows']:
        W('## Season windows\n')
        for w in season['windows']:
            W('- **%s** — %s → %s%s' % (w['label'], w['start'], w['end'], (' · ' + w['note']) if w['note'] else ''))
        W('')
    if itin:
        W('## Ready-made routes\n')
        for t in itin:
            W('### %s — %d days · %s\n' % (t['name'], t['days'], t['season']))
            W('%s\n' % t['summary'])
            W('%s\n' % ' → '.join(next(a['name'] for a in attrs if a['id'] == s) for s in t['stops']))
    if logi['gotchas']:
        W('## Gotchas\n')
        for g in logi['gotchas']:
            W('- **%s** *(%s)* — %s' % (g['title'], g['sev'], g['body']))
        W('')
    if logi['costs']:
        W('## What things cost\n')
        W('| Item | Typical | Note |')
        W('|---|--:|---|')
        for c in logi['costs']:
            W('| %s | %s | %s |' % (c['item'], c['typical'], c['note']))
        W('')
    if logi['myths']:
        W('## Myths\n')
        for m in logi['myths']:
            W('- ~~%s~~ — %s' % (m['claim'], m['reality']))
        W('')
    if hubs['drives']:
        W('## Drive legs\n')
        W('| From | To | Miles | Hours | Road |')
        W('|---|---|--:|--:|---|')
        for d in sorted(hubs['drives'], key=lambda x: -x['miles']):
            W('| %s | %s | %s | %s | %s |' % (d['from'], d['to'], d['miles'] or '—', d['hours'] or '—', d['road'] or d['mode']))
        W('')
    W('---\n')
    W('Basemap: Natural Earth 10m + OpenStreetMap. Projection: Alaska Albers Equal Area.')
    p = os.path.join(ROOT, 'ALASKA_ATTRACTIONS.md')
    open(p, 'w').write('\n'.join(L))
    print('▸ wrote %s  (%d lines)' % (p, len(L)))


if __name__ == '__main__':
    main()
