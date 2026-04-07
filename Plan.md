# Weather App — Build Plan

## Phase 1: Project Setup ✅
1. ~~Create `index.html`, `style.css`, `app.js`~~
2. ~~Create `config.js` (gitignored) for local API key storage~~
3. ~~Create `.gitignore` and `.env.example`~~

## Phase 2: Core Features ✅
4. ~~Search by city name~~
5. ~~Display current conditions: temperature, weather description, humidity, wind speed, weather icon~~
6. ~~Toggle Fahrenheit / Celsius~~
7. ~~Handle errors gracefully (city not found, network failure)~~

## Phase 3: Polish ✅
8. ~~Light, colorful responsive UI — works on mobile and desktop~~
9. ~~Loading state while fetching~~
10. ~~City disambiguation picker — if multiple cities match (e.g. "Paris"), show a list to choose from~~
11. ~~Map via Leaflet.js + OpenStreetMap centered on the searched city~~
12. ~~POI buttons (Food & Drink, Parks, Culture) — click to load color-coded markers from Overpass API~~

## Phase 4: Deploy
13. Initialize git repo and push to GitHub
14. Link repo to Vercel (`vercel` CLI or vercel.com import)
15. Set `OPENWEATHER_API_KEY` as a Vercel environment variable
16. Deploy to production — get a live public URL (`vercel --prod`)

---

## Prerequisites ✅

- OpenWeatherMap API key — stored in `config.js` (gitignored)
