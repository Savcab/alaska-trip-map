# Alaska, ranked and mapped

An interactive map + trip planner for Alaska. **[Open the map →](https://savcab.github.io/alaska-trip-map/)**

Every place worth going, scored 0–100 for a first-time visitor, plotted on a real projected map
with the coastline, icefields, national park boundaries, highways, rail and ferry routes.
Filter by season, category, region and how you get there — then build a route and export it.

- **[ALASKA_ATTRACTIONS.md](ALASKA_ATTRACTIONS.md)** — the same data as a ranked document.
- The whole app is one self-contained HTML file. No servers, no CDN, no API keys, no tracking.

## What's in it

| | |
|---|---|
| Places | ranked 1–N by a single importance score, tiered bucket-list → if-nearby |
| Map | Alaska Albers Equal Area, hand-rolled canvas renderer, pan/zoom/declutter |
| Layers | coastline, glaciers & icefields, 13 NPS units, named highways, Alaska Railroad, AMHS ferry lanes, rivers, lakes, sea shelf, graticule + Arctic Circle |
| Season | month selector: daylight, temps, aurora odds, crowds, prices, what's open/closed |
| Trip | add stops, auto-order, drive/fly leg estimates, day count, closure + booking warnings, markdown export, shareable URL |
| Plan | season windows, gotchas, typical 2026 costs, myths, hub-to-hub drive legs |

## Build

```
python3 build.py     # data/*.json + src/* → docs/index.html + ALASKA_ATTRACTIONS.md
```

`build.py` normalizes the researched data (categories, regions, coordinates, months),
dedupes by name and proximity, re-ranks, and inlines everything into the page.

## Data

- Attractions: researched per region and per theme, coordinate-verified, deduped, then scored on one scale.
- Basemap: [Natural Earth](https://www.naturalearthdata.com/) 10m (coast, glaciated areas, NPS units, lakes, rivers, bathymetry) and [OpenStreetMap](https://www.openstreetmap.org/copyright) (named highways), simplified with Douglas–Peucker.

Scores are judgment calls. Drive times assume summer pavement. Verify permits, ferry schedules
and park bus tickets with the operator before booking.
