# Bumi Watch — frontend

React + Vite dashboard for the Bumi Watch Nemotron backend (`../bumi-watch-nemotron`).

- **Overview**: national stats, a map of fire hotspots, earthquakes and AQI stations, and a per-province panel.
  The numbers come straight from the backend's SQLite database via `GET /api/dashboard` and `GET /api/province/:name`.
- **Ask Bumi**: chat with the NVIDIA Nemotron agent (`POST /api/agent`). Each answer shows its sources and the
  tool calls the model made.
- **Sources**: the four data feeds and how fresh each one is (`GET /health`).

## Run locally

```bash
# 1. Backend (in ../bumi-watch-nemotron)
npm install && npm run pipeline:once && npm start   # → http://localhost:3001

# 2. Frontend (here)
npm install
cp .env.example .env    # VITE_API_URL, defaults to http://localhost:3001
npm run dev             # → http://localhost:3000
```

## Deploy (Firebase Hosting)

`VITE_API_URL` is baked in at build time, so set it to the deployed backend first:

```bash
VITE_API_URL=https://your-backend.example.com npm run build
firebase deploy
```

## Notes

- Province outlines are bundled in `public/indonesia-provinces.geojson` (BAKOSURTANAL, via
  [superpikar/indonesia-geojson](https://github.com/superpikar/indonesia-geojson)). The file predates the newest
  provinces, so Kalimantan Utara, Kepulauan Riau, Sulawesi Barat and the new Papua provinces have no outline of their
  own. Their data still shows as map points and in the lists.
- Basemap: Esri World Dark Gray Canvas (free with attribution).
