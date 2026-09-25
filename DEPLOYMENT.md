# Deploying Bumi Watch

Step-by-step guide for putting Bumi Watch online: the **backend** on Railway and the **frontend** on Firebase Hosting.
Takes about 30 minutes the first time.

| Part | Repo | Goes to |
|---|---|---|
| Backend (API, Nemotron agent, data pipeline, SQLite) | [HanifWinson/bumi-watch-nemotron](https://github.com/HanifWinson/bumi-watch-nemotron) | Railway |
| Frontend (this repo, Vite + React) | this repo | Firebase Hosting |

**Order matters:** deploy the backend first, because the frontend needs the backend's URL when it's built.
Then go back and tell the backend the frontend's URL (step 3).

## Before you start

- **Access to both GitHub repos.** If they're private, ask Hanif to add you as a collaborator.
- **The three API keys**, sent to you privately by Hanif. Never commit them or paste them anywhere public:
  - `NEBIUS_API_KEY`: the Nemotron chat agent
  - `NASA_FIRMS_API_KEY`: fire hotspots
  - `WAQI_API_KEY`: air quality
- **Node.js 22+** and the Firebase CLI: `npm install -g firebase-tools`

---

## 1. Backend on Railway

The backend repo has a Dockerfile, so Railway builds and runs it with no extra config.

**Why Railway:** the backend needs a persistent disk (the SQLite database), must stay on all the time (it
fetches new data every 30 minutes), and must run as exactly one instance. Railway does all three simply.
It's not free long-term: after the trial credit there's a small monthly charge for a server this size.
Check railway.com/pricing and agree with Hanif on who pays.

1. Sign in at **railway.com** with GitHub.
2. **New Project → Deploy from GitHub repo → `bumi-watch-nemotron`.**
   If the repo isn't listed, click *Configure GitHub App* and give Railway access to it. For a repo on
   Hanif's account, Hanif may need to approve that, or deploy it from Hanif's Railway account and invite you to the project.
3. Railway detects the Dockerfile and starts a first build. It will fail or show errors until the next steps are done. That's fine.
4. **Add a volume:** open the service → **Settings** (or right-click the service → *Attach volume*) → mount path **`/data`**.
   Without this, the database is wiped on every redeploy.
5. **Variables** tab → add:

   | Variable | Value |
   |---|---|
   | `NEBIUS_API_KEY` | from Hanif |
   | `NASA_FIRMS_API_KEY` | from Hanif |
   | `WAQI_API_KEY` | from Hanif |
   | `TRUST_PROXY` | `1` |

   Don't set `PORT` (Railway injects it) or `DB_PATH` (the Dockerfile already points it at `/data`).
   Leave `CORS_ORIGINS` for step 3.
6. **Settings → Networking → Generate Domain.** You get something like `https://bumi-watch-nemotron-production.up.railway.app`.
   This is the **backend URL**.
7. **Settings → Scaling / Replicas:** make sure it's **1 replica**. Don't turn on anything that runs more copies.
8. Wait for the deploy to go green, then check it (replace the URL):

   ```bash
   curl https://YOUR-BACKEND.up.railway.app/health
   ```

   You should see `"status":"ok"` and row counts per table. They're `0` for a few seconds after startup,
   then fill in as the first data run finishes. In the **Deploy Logs** you'll see lines like
   `[WAQI] Stored 133 new readings` and `Run complete`.

Every push to `main` on the backend repo redeploys automatically. The volume keeps the data.

---

## 2. Frontend on Firebase Hosting

This repo is already configured for Firebase Hosting: `.firebaserc` points at the Firebase project **`bumi-watch`**,
and `firebase.json` serves the built `dist/` folder.

1. **Get access to the Firebase project.** Hanif needs to add you in the
   [Firebase console](https://console.firebase.google.com) → project `bumi-watch` → ⚙️ **Users and permissions** → *Add member*.
   (Or create your own Firebase project and run `firebase use --add` to point this repo at it instead.)
2. Log in and install dependencies:

   ```bash
   firebase login
   npm ci
   ```

3. Tell the build where the backend is. Create **`.env.production`** in the repo root (it's git-ignored):

   ```bash
   VITE_API_URL="https://YOUR-BACKEND.up.railway.app"
   ```

   Vite bakes this in **at build time**. If the backend URL ever changes, rebuild and redeploy the frontend.
4. Build and deploy:

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

5. Firebase prints the **frontend URL**, normally `https://bumi-watch.web.app` (plus `https://bumi-watch.firebaseapp.com`).

---

## 3. Connect them (CORS)

Right now the backend accepts requests from any website, so anyone could use it and spend the Nebius credits.
Lock it to the frontend:

1. Railway → backend service → **Variables** → add

   ```
   CORS_ORIGINS=https://bumi-watch.web.app,https://bumi-watch.firebaseapp.com
   ```

   Use the exact URLs Firebase printed, comma-separated, no trailing slashes. Add `http://localhost:3000`
   too if you want to run the frontend locally against the deployed backend.
2. Railway redeploys automatically when variables change.

---

## 4. Check everything works

Open the frontend URL and go through:

- [ ] The landing page loads; **Open dashboard** shows the map.
- [ ] The header status says **Live** (not "Backend offline").
- [ ] The stat tiles show numbers: fire hotspots, average AQI, earthquakes, rainfall.
- [ ] Clicking a province (e.g. Kalimantan Tengah) opens its panel with stations.
- [ ] **Ask Bumi:** "Where is the air quality worst in Indonesia today?" gets an answer in about 5–20 seconds,
      ending with a `📍 Sources:` line.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Can't reach the Bumi Watch backend" | Wrong `VITE_API_URL`, or CORS | Check the browser console (F12). A CORS error means `CORS_ORIGINS` doesn't exactly match the frontend URL. Otherwise fix `.env.production`, then rebuild and redeploy. |
| Dashboard loads but tiles are empty | First data run hasn't finished, or keys missing | Check Railway logs for `Run complete` and for `... not set — skipping` warnings. |
| Every question fails | `NEBIUS_API_KEY` missing or wrong, or wrong model ID | Railway logs show `Agent error: ...`. Don't set `NEMOTRON_MODEL` unless you mean to. The default `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` is correct, and Nebius rejects the lowercase form. |
| "Too many questions. Try again in Ns." | Rate limit: 10 questions/min per visitor | Working as intended. Raise `AGENT_RATE_LIMIT` if needed. If *everyone* hits it at once, `TRUST_PROXY=1` is missing. |
| Data resets after every deploy | No volume, or not mounted at `/data` | Redo step 1.4. |
| Fire/air counts look doubled or data jumps around | More than one replica running | Set replicas to 1 (step 1.7). |

## Updating later

- **Backend:** push to `main` on `bumi-watch-nemotron`. Railway redeploys by itself.
- **Frontend:** `npm run build && firebase deploy --only hosting`.

More backend detail (all environment variables, API changes, known gaps) is in the backend repo's
[`HANDOFF.md`](https://github.com/HanifWinson/bumi-watch-nemotron/blob/main/HANDOFF.md).
