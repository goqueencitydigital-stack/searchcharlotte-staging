#!/usr/bin/env python3
"""Daily Charlotte events refresh.

Sources
  1. assets/data/events-curated.json - events checked by hand on official venue/team/organizer pages.
  2. Ticketmaster Discovery API (licensed feed) - concerts, sports, theater, comedy and family events
     within 40 miles of Uptown Charlotte. Runs when the TM_API_KEY environment variable is set.

Output
  assets/data/events.json - merged, de-duplicated, past events removed, sorted by date.
Only standard-library modules are used so it runs on any GitHub Actions runner.
"""
import json, os, re, sys, time, datetime as dt, urllib.request, urllib.parse, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CURATED = ROOT / 'assets/data/events-curated.json'
OUT = ROOT / 'assets/data/events.json'
DAYS_AHEAD = int(os.environ.get('EVENT_DAYS_AHEAD', '150'))
LAT, LNG, RADIUS = 35.2271, -80.8431, 40
TZ = dt.timezone(dt.timedelta(hours=-5))  # date math only; Charlotte local dates come from the feed

today = dt.datetime.now(TZ).date()
until = today + dt.timedelta(days=DAYS_AHEAD)

SEGMENT_CAT = {'Music': 'concerts', 'Sports': 'sports', 'Arts & Theatre': 'theater', 'Family': 'community', 'Miscellaneous': 'festival', 'Film': 'arts'}
SKIP = re.compile(r'\b(parking|suite|suites|upgrade|vip package|club access|season ticket|gift card|test event|premium seat|hospitality|add[- ]on|tailgate pass|voucher|membership|deposit)\b', re.I)

def norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', (s or '').lower()).strip('-')[:70]

def fmt_time(t):
    if not t: return ''
    h, m = map(int, t.split(':')[:2])
    return f"{(h % 12) or 12}:{m:02d} {'PM' if h >= 12 else 'AM'}"

def fetch_json(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'SearchCharlotte-events/1.0'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                time.sleep(2 + i * 2); continue
            raise
        except Exception:
            if i < tries - 1: time.sleep(2); continue
            raise

def ticketmaster(key):
    out = []
    base = 'https://app.ticketmaster.com/discovery/v2/events.json'
    start = dt.datetime.combine(today, dt.time(0, 0)).strftime('%Y-%m-%dT%H:%M:%SZ')
    end = dt.datetime.combine(until, dt.time(23, 59)).strftime('%Y-%m-%dT%H:%M:%SZ')
    for seg in ['Music', 'Sports', 'Arts & Theatre', 'Family', 'Miscellaneous']:
        page = 0
        while True:
            q = dict(apikey=key, latlong=f'{LAT},{LNG}', radius=RADIUS, unit='miles', startDateTime=start, endDateTime=end,
                     size=199, page=page, sort='date,asc', classificationName=seg, locale='*')
            d = fetch_json(base + '?' + urllib.parse.urlencode(q))
            evs = (d.get('_embedded') or {}).get('events') or []
            for e in evs:
                out.append((seg, e))
            pg = d.get('page') or {}
            page += 1
            time.sleep(0.25)  # stay well under 5 requests/second
            if page >= pg.get('totalPages', 0) or (page + 1) * 199 > 1000:
                break
    return out

def from_tm(seg, e):
    name = (e.get('name') or '').strip()
    if not name or SKIP.search(name): return None
    st = ((e.get('dates') or {}).get('status') or {}).get('code', '')
    if st in ('cancelled', 'canceled', 'offsale') : return None
    s = (e.get('dates') or {}).get('start') or {}
    day = s.get('localDate')
    if not day: return None
    v = ((e.get('_embedded') or {}).get('venues') or [{}])[0]
    loc = v.get('location') or {}
    try: lat, lng = float(loc.get('latitude')), float(loc.get('longitude'))
    except (TypeError, ValueError): return None
    cls = (e.get('classifications') or [{}])[0]
    genre = ((cls.get('genre') or {}).get('name') or '')
    cat = SEGMENT_CAT.get(seg, 'community')
    if cat == 'theater' and genre.lower() in ('fine art', 'visual arts'): cat = 'arts'
    imgs = sorted([i for i in (e.get('images') or []) if i.get('ratio') == '16_9' and 500 <= (i.get('width') or 0) <= 1300],
                  key=lambda i: abs((i.get('width') or 0) - 1024))
    addr = ', '.join(x for x in [((v.get('address') or {}).get('line1')), ((v.get('city') or {}).get('name')),
                                  ' '.join(x for x in [((v.get('state') or {}).get('stateCode')), v.get('postalCode')] if x)] if x)
    sub = ' · '.join(x for x in [genre if genre and genre.lower() not in ('undefined', 'other') else '', (cls.get('subGenre') or {}).get('name') if (cls.get('subGenre') or {}).get('name', '').lower() not in ('', 'undefined', 'other') else ''] if x)
    return {
        'id': 'tm-' + e.get('id', slug(name + day)),
        'title': name,
        'category': cat,
        'genre': sub or None,
        'start': day, 'end': day,
        'time': fmt_time(s.get('localTime')) if not s.get('timeTBA') and not s.get('noSpecificTime') else 'Time TBA',
        'venue': v.get('name') or '', 'address': addr,
        'lat': lat, 'lng': lng, 'coord_precision': 'venue',
        'url': e.get('url') or '', 'source_name': 'Ticketmaster', 'feed': 'ticketmaster',
        'verified_on': today.isoformat(),
        'description': f"{(sub + (' show' if cat == 'concerts' else ' event')) if sub else ('Live show' if cat == 'concerts' else 'Event')} at {v.get('name') or 'a Charlotte-area venue'}.",
        'img': imgs[0]['url'] if imgs else None,
        'status': 'rescheduled' if st == 'rescheduled' else ('postponed' if st == 'postponed' else None),
        'dates_approximate': False, 'date_text': None, 'recurring': None,
    }

def main():
    cur = json.loads(CURATED.read_text())
    meta = dict(cur['meta'])
    curated = [dict(e, feed='curated') for e in cur['events'] if e.get('end', e['start']) >= today.isoformat()]
    feed, err = [], None
    key = os.environ.get('TM_API_KEY', '').strip()
    if key:
        try:
            for seg, e in ticketmaster(key):
                x = from_tm(seg, e)
                if x: feed.append(x)
        except Exception as ex:  # keep the last good file if the feed fails
            err = f'{type(ex).__name__}'
            print('Ticketmaster fetch failed:', err, file=sys.stderr)
            if OUT.exists():
                old = json.loads(OUT.read_text())
                feed = [e for e in old.get('events', []) if e.get('feed') == 'ticketmaster' and e['end'] >= today.isoformat()]
    # de-duplicate: same title on the same day, and curated wins over feed for same venue+day+similar title
    seen, merged = set(), []
    for e in curated + feed:
        k = (norm(e['title'])[:40], e['start'])
        kv = (norm(e['venue'])[:20], e['start'], norm(e['title']).split(' ')[0] if e['title'] else '')
        if k in seen or kv in seen: continue
        seen.add(k); seen.add(kv); merged.append(e)
    # collapse multi-night runs of the same show at the same venue into one listing
    runs = {}
    for e in merged:
        if e.get('feed') == 'ticketmaster':
            rk = (norm(e['title']), norm(e['venue']))
            if rk in runs:
                r = runs[rk]; r['end'] = max(r['end'], e['end']); r['start'] = min(r['start'], e['start']); r['_n'] = r.get('_n', 1) + 1; e['_drop'] = True
            else: runs[rk] = e
    merged = [e for e in merged if not e.pop('_drop', False)]
    for e in merged:
        n = e.pop('_n', 0)
        if n > 1: e['time'] = f'{n} performances'
    merged.sort(key=lambda e: (e['start'] if e['start'] >= today.isoformat() else '0000', e['title']))
    meta.update({
        'title': "Charlotte events & concerts",
        'window': [today.isoformat(), until.isoformat()],
        'updated': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'feeds': {'curated': len(curated), 'ticketmaster': len([e for e in merged if e.get('feed') == 'ticketmaster'])},
        'feed_status': 'error' if err else ('live' if key else 'curated_only'),
        'categories': {**meta.get('categories', {}), 'concerts': 'Concerts', 'sports': 'Sports', 'theater': 'Theater & comedy'},
    })
    OUT.write_text(json.dumps({'meta': meta, 'events': merged}, ensure_ascii=False, indent=1))
    print(f"events: {len(merged)} (curated {meta['feeds']['curated']}, ticketmaster {meta['feeds']['ticketmaster']}) status={meta['feed_status']}")

if __name__ == '__main__':
    main()
