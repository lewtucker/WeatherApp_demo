# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

A simple weather web app — built and tested locally, then deployed to a free hosting platform. See `Plan.md` for the full 4-phase build plan.

## Build Status

- [x] Phase 1: Project setup
- [x] Phase 2: Core features
- [x] Phase 3: Polish + map + POIs
- [ ] Phase 4: Deploy to Vercel

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework, no build step)
- **Weather & Geocoding**: OpenWeatherMap API (free tier) — `/geo/1.0/direct` + `/data/2.5/weather`
- **Map**: Leaflet.js + OpenStreetMap tiles (free, no key)
- **POI data**: Overpass API querying OpenStreetMap (free, no key)
- **Local Dev**: `python3 -m http.server 8080`
- **Deployment**: Vercel free tier

## Development Commands

```bash
# Serve locally
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Architecture

Three files, no build step:

- `index.html` — app shell: search bar, city picker, weather card, map section with POI buttons
- `style.css` — light colorful theme; sky-blue→lavender gradient background, frosted glass cards
- `app.js` — all logic (see below)
- `config.js` — API key for local dev (gitignored)

### app.js flow

1. User types a city and searches
2. `searchCity()` calls `/geo/1.0/direct` (geocoding) with `limit=5`
3. If 1 result → `fetchWeatherByCoords(lat, lon)` immediately
4. If 2+ results → `showCityPicker()` renders a list; user picks one → `fetchWeatherByCoords(lat, lon)`
5. `fetchWeatherByCoords()` calls `/data/2.5/weather?lat=&lon=` and renders weather card + map
6. `renderMap()` initializes or recenters the Leaflet map; all POI buttons reset to OFF
7. User clicks a POI button → `fetchPOIs()` queries Overpass API → markers added to that category's `L.layerGroup`

### POI categories

| Button | Overpass query | Marker color |
|--------|---------------|--------------|
| Food & Drink | `amenity~restaurant\|cafe\|bar\|fast_food` | Orange `#f97316` |
| Parks | `leisure~park\|garden` | Green `#22c55e` |
| Culture | `tourism~museum\|attraction` | Purple `#a855f7` |

Search radius: 2000m, capped at 60 results per category.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENWEATHER_API_KEY` | Free key from openweathermap.org — stored in `config.js` locally |

For Vercel deployment the key will need to be set as an environment variable.

## Deployment (Phase 4 — not yet done)

```bash
# First time
vercel

# Production
vercel --prod
```
