const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// On Vercel, CONFIG is undefined — use server-side proxy functions.
// Locally, CONFIG is set by config.js and we call OpenWeatherMap directly.
const USE_PROXY = typeof CONFIG === 'undefined';

const input          = document.getElementById('city-input');
const searchBtn      = document.getElementById('search-btn');
const cityPicker     = document.getElementById('city-picker');
const errorEl        = document.getElementById('error');
const loadingEl      = document.getElementById('loading');
const weatherCard    = document.getElementById('weather-card');
const mapSection     = document.getElementById('map-section');
const resizeHandleEl = document.getElementById('resize-handle');
const contentRow     = document.querySelector('.content-row');

const cityNameEl    = document.getElementById('city-name');
const weatherDescEl = document.getElementById('weather-desc');
const weatherIconEl = document.getElementById('weather-icon');
const temperatureEl = document.getElementById('temperature');
const feelsLikeEl   = document.getElementById('feels-like');
const humidityEl    = document.getElementById('humidity');
const windEl        = document.getElementById('wind');
const unitToggleBtn = document.getElementById('unit-toggle');
const localTimeEl   = document.getElementById('local-time');

let currentData = null;
let unit = 'C';
let map = null;
let timeInterval = null;

const layers = { food: null, park: null, culture: null };
const POI_COLORS = { food: '#f97316', park: '#22c55e', culture: '#a855f7' };

const OVERPASS_QUERIES = {
  food:    (lat, lon) => `node["amenity"~"restaurant|cafe|bar|fast_food"](around:2000,${lat},${lon});`,
  park:    (lat, lon) => `node["leisure"~"park|garden"](around:2000,${lat},${lon});`,
  culture: (lat, lon) => `node["tourism"~"museum|attraction"](around:2000,${lat},${lon});`,
};

function kelvinTo(k, u) {
  return u === 'C'
    ? (k - 273.15).toFixed(1) + '°C'
    : ((k - 273.15) * 9 / 5 + 32).toFixed(1) + '°F';
}

function formatLocalTime(timezoneOffsetSeconds) {
  const localMs = Date.now() + timezoneOffsetSeconds * 1000;
  const d = new Date(localMs);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function startClock(timezoneOffsetSeconds) {
  if (timeInterval) clearInterval(timeInterval);
  localTimeEl.textContent = formatLocalTime(timezoneOffsetSeconds);
  timeInterval = setInterval(() => {
    localTimeEl.textContent = formatLocalTime(timezoneOffsetSeconds);
  }, 10000);
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function clearUI() {
  hide(errorEl);
  hide(cityPicker);
  hide(weatherCard);
  hide(mapSection);
  hide(resizeHandleEl);
  if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
}

function setError(msg) {
  errorEl.textContent = msg;
  show(errorEl);
  hide(loadingEl);
  hide(cityPicker);
  hide(weatherCard);
  hide(mapSection);
  hide(resizeHandleEl);
}

// ── Resize handle ────────────────────────────────────────────────────────────

resizeHandleEl.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = weatherCard.offsetWidth;
  const rowWidth = contentRow.offsetWidth;
  const handleWidth = resizeHandleEl.offsetWidth + 4;
  const minPanel = 220;
  const maxWeather = rowWidth - handleWidth - minPanel;

  resizeHandleEl.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  function onMove(e) {
    const newWidth = Math.max(minPanel, Math.min(startWidth + e.clientX - startX, maxWeather));
    weatherCard.style.flex = `0 0 ${newWidth}px`;
  }

  function onUp() {
    resizeHandleEl.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if (map) map.invalidateSize();
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

// ── City disambiguation ──────────────────────────────────────────────────────

async function geocodeCity(query) {
  const url = USE_PROXY
    ? `/api/geo?q=${encodeURIComponent(query)}`
    : `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${CONFIG.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

function showCityPicker(results) {
  cityPicker.innerHTML = '';

  const label = document.createElement('div');
  label.className = 'city-picker-label';
  label.textContent = 'Multiple cities found — which one?';
  cityPicker.appendChild(label);

  results.forEach((r) => {
    const btn = document.createElement('button');
    btn.className = 'city-option';
    const parts = [r.name];
    if (r.state) parts.push(r.state);
    parts.push(r.country);
    btn.innerHTML = `
      <div>${parts.join(', ')}</div>
      <div class="city-option-sub">${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}</div>
    `;
    btn.addEventListener('click', () => {
      hide(cityPicker);
      fetchWeatherByCoords(r.lat, r.lon);
    });
    cityPicker.appendChild(btn);
  });

  show(cityPicker);
}

// ── Weather ──────────────────────────────────────────────────────────────────

function renderWeather(data) {
  cityNameEl.textContent    = `${data.name}, ${data.sys.country}`;
  weatherDescEl.textContent = data.weather[0].description;
  weatherIconEl.src         = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  weatherIconEl.alt         = data.weather[0].description;
  temperatureEl.textContent = kelvinTo(data.main.temp, unit);
  feelsLikeEl.textContent   = kelvinTo(data.main.feels_like, unit);
  humidityEl.textContent    = `${data.main.humidity}%`;
  windEl.textContent        = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
  unitToggleBtn.textContent = unit === 'C' ? 'Switch to °F' : 'Switch to °C';
  startClock(data.timezone);
  hide(loadingEl);
  show(weatherCard);
  show(resizeHandleEl);
}

async function fetchWeatherByCoords(lat, lon) {
  clearUI();
  show(loadingEl);
  try {
    const url = USE_PROXY
      ? `/api/weather?lat=${lat}&lon=${lon}`
      : `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) { setError(`Something went wrong (${res.status}). Please try again.`); return; }
    currentData = await res.json();
    renderWeather(currentData);
    renderMap(lat, lon);
  } catch {
    setError('Network error. Please check your connection and try again.');
  }
}

async function searchCity(query) {
  clearUI();
  show(loadingEl);
  let results;
  try {
    results = await geocodeCity(query);
  } catch {
    setError('Network error. Please check your connection and try again.');
    return;
  }
  hide(loadingEl);
  if (results.length === 0) { setError(`City "${query}" not found. Please check the spelling and try again.`); return; }
  if (results.length === 1) { fetchWeatherByCoords(results[0].lat, results[0].lon); return; }
  showCityPicker(results);
}

// ── Map & POIs ───────────────────────────────────────────────────────────────

async function fetchPOIs(category, lat, lon) {
  const query = `[out:json][timeout:15];(${OVERPASS_QUERIES[category](lat, lon)});out body 60;`;
  const url = `${OVERPASS_API}?data=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  const data = await res.json();
  return data.elements || [];
}

function populateLayer(category, elements) {
  layers[category].clearLayers();
  const color = POI_COLORS[category];
  elements.forEach((el) => {
    if (!el.lat || !el.lon) return;
    const name = el.tags.name || el.tags.amenity || el.tags.leisure || el.tags.tourism || 'Place';
    L.circleMarker([el.lat, el.lon], {
      radius: 7, fillColor: color, color: '#fff',
      weight: 1.5, opacity: 1, fillOpacity: 0.9,
    })
      .bindPopup(`<strong>${name}</strong>`)
      .addTo(layers[category]);
  });
}

async function renderMap(lat, lon) {
  show(mapSection);

  document.querySelectorAll('.poi-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.disabled = false;
    btn.style.opacity = '';
  });

  if (!map) {
    await new Promise(r => setTimeout(r, 50));
    map = L.map('map').setView([lat, lon], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    for (const cat of Object.keys(layers)) {
      layers[cat] = L.layerGroup().addTo(map);
    }
  } else {
    map.setView([lat, lon], 14);
    for (const cat of Object.keys(layers)) {
      layers[cat].clearLayers();
      if (!map.hasLayer(layers[cat])) layers[cat].addTo(map);
    }
  }

  map.invalidateSize();
}

// POI filter toggle buttons
document.querySelectorAll('.poi-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!currentData || !map) return;

    const category = btn.dataset.category;

    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      layers[category].clearLayers();
      return;
    }

    btn.disabled = true;
    btn.style.opacity = '0.6';

    const { lat, lon } = currentData.coord;

    try {
      const elements = await fetchPOIs(category, lat, lon);
      btn.classList.add('active');
      populateLayer(category, elements);
      if (!map.hasLayer(layers[category])) layers[category].addTo(map);

      if (elements.length === 0) {
        btn.title = 'No results found nearby';
      }
    } catch (e) {
      console.error('POI fetch failed:', e);
      btn.title = 'Failed to load — try again';
    } finally {
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
});

// ── Event listeners ──────────────────────────────────────────────────────────

function doSearch() {
  const city = input.value.trim();
  if (city) searchCity(city);
}

searchBtn.addEventListener('click', doSearch);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

unitToggleBtn.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  if (currentData) renderWeather(currentData);
});
