export default async function handler(req, res) {
  const { q } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const r = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`
  );
  const data = await r.json();
  res.status(r.status).json(data);
}
