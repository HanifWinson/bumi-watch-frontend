# Deploying Bumi Watch

Step-by-step guide for putting Bumi Watch online: the **backend** on Render, and the **frontend** on any
static host you like (Vercel suggested). Takes about 30 minutes the first time.

| Part | Repo | Goes to |
|---|---|---|
| Backend (API, Nemotron agent, data pipeline, SQLite) | [HanifWinson/bumi-watch-nemotron](https://github.com/HanifWinson/bumi-watch-nemotron) | Render |
| Frontend (this repo, Vite + React) | this repo | Your choice: Vercel suggested |

**Order matters:** deploy the backend first, because the frontend needs the backend's URL when it's built.
Then go back and tell the backend the frontend's URL (step 3).

> **Why not Railway?** That was the original plan, but after Railway's October 2026 security incident new
> signups are paused and customers' environment variables may have been exposed. Don't put the API keys there
> for now. Any host that runs a Dockerfile works if it meets the requirements in step 1. Render is the closest fit.

## Before you start

- **Access to both GitHub repos.** If they're private, ask Hanif to add you as a collaborator.
- **The three API keys**, sent to you privately by Hanif. Never commit them or paste them anywhere public:
  - `NEBIUS_API_KEY`: the Nemotron chat agent
  - `NASA_FIRMS_API_KEY`: fire hotspots
  - `WAQI_API_KEY`: air quality
- **Node.js 22+** if you want to build or test locally

---

## 1. Backend on Render

The backend repo has a Dockerfile, so Render builds and runs it with no extra config or code changes.

**What the backend needs from a host:** exactly one instance (the SQLite database and the data pipeline live
inside it), ideally always on (it fetches new data every 30 minutes), and ideally a persistent disk.

**Pick a plan:**

| | Free | Paid (Starter or above) |
|---|---|---|
| Cost | Free | Small monthly fee, check render.com/pricing and agree with Hanif on who pays |
| Sleeps | **Yes**, after ~15 min with no visitors. The next visit takes about a minute to wake it. | No |
| Disk | **None**: the database starts empty on every restart or wake-up | Add a disk at `/data` so history builds up |
| Good for | The demo video and judging | Keeping it online properly |

**The free plan is fine for the hackathon.** On an empty database the backend refills itself within seconds of
starting: the last 10 days of fires, current air quality, recent earthquakes and today's rainfall. What you lose
is the 30-day history and the 30-minute refreshes while it's asleep. Before recording or before judges look at
it, open the backend's `/health` URL once and wait for it to wake.

1. Sign in at **render.com** with GitHub.
2. **New → Web Service → Build and deploy from a Git repository → `bumi-watch-nemotron`.**
   If the repo isn't listed, click *Configure account* and give Render access to it. For a repo on Hanif's
   account, Hanif may need to approve that. If the repo is public you can also paste its URL under
   *Public Git repository*.
3. Settings on the create screen:

   | Setting | Value |
   |---|---|
   | Name | `bumi-watch-nemotron` (becomes part of the URL) |
   | Language / Runtime | **Docker** (detected from the Dockerfile) |
   | Branch | `main` |
   | Region | **Singapore** (closest to Indonesia and its data sources) |
   | Instance type | Free, or Starter (see the table above) |

4. **Environment Variables** (same screen) → add:

   | Variable | Value |
   |---|---|
   | `NEBIUS_API_KEY` | from Hanif |
   | `NASA_FIRMS_API_KEY` | from Hanif |
   | `WAQI_API_KEY` | from Hanif |
   | `TRUST_PROXY` | `1` |

   Don't set `PORT` (Render handles it) or `DB_PATH` (the Dockerfile already points it at `/data`).
   Leave `CORS_ORIGINS` for step 3.
5. **Advanced → Health Check Path:** `/health`.
6. **Paid plan only, Advanced → Add Disk:** mount path **`/data`**, 1 GB is plenty.
   Without a disk the database starts empty on every deploy.
7. **Create Web Service.** The first build takes a few minutes. You get a URL like
   `https://bumi-watch-nemotron.onrender.com`. This is the **backend URL**.
8. Leave scaling at **1 instance**. Don't turn on anything that runs more copies.
9. When the deploy says **Live**, check it (replace the URL):

   ```bash
   curl https://YOUR-BACKEND.onrender.com/health
   ```

   You should see `"status":"ok"` and row counts per table. They're `0` for a few seconds after startup,
   then fill in as the first data run finishes. In **Logs** you'll see lines like
   `[WAQI] Stored 133 new readings` and `Run complete`.

Every push to `main` on the backend repo redeploys automatically.

---

## 2. Frontend: any static host (Vercel suggested)

The frontend builds to plain static files (`npm run build` → `dist/`), so it runs on any static host:
Vercel, Netlify, Cloudflare Pages, Firebase Hosting, GitHub Pages… Use whichever you like.
There are no client-side routes, so no rewrite/redirect rules are needed.

Whatever you pick, there's **one setting that matters:**

> **`VITE_API_URL` = the backend URL from step 1** (e.g. `https://YOUR-BACKEND.onrender.com`, no trailing slash).
> Vite bakes it in **at build time**, so set it *before* building. If you change it later, rebuild and redeploy.

### Suggested: Vercel

1. Sign in at **vercel.com** with GitHub → **Add New… → Project** → import **`bumi-watch-frontend`**.
2. Vercel detects **Vite** automatically (build command `npm run build`, output directory `dist`). Leave those as they are.
3. Open **Environment Variables** on that same screen and add `VITE_API_URL` = your backend URL.
4. **Deploy.** You get a URL like `https://bumi-watch-frontend.vercel.app`. This is the **frontend URL**.

Every push to `main` redeploys automatically. If you change `VITE_API_URL` later, trigger a **Redeploy** in
Vercel so the new value is built in.

Note: Vercel's preview deployments (for branches and PRs) get their own URLs, which the backend's CORS setting
won't allow unless you add them in step 3. The production URL is what matters.

### Any other host

- **Build command:** `npm run build` · **Output directory:** `dist` · **Node:** 22
- **Environment variable at build time:** `VITE_API_URL`
- **Also set `VITE_SITE_URL`** to the frontend's own URL (e.g. `https://bumi-watch.netlify.app`) so shared links
  show the preview card (`public/og-image.png`). On Vercel this is automatic.
- Building locally and uploading `dist/` also works: put `VITE_API_URL="https://..."` in a `.env.production`
  file (git-ignored) before `npm run build`.
- **Firebase Hosting:** `firebase.json` is already in the repo. Create your own Firebase project, run
  `firebase use --add` to point the repo at it (the `bumi-watch` project in `.firebaserc` may not exist),
  then `npm run build && firebase deploy --only hosting`.

---

## 3. Connect them (CORS)

Right now the backend accepts requests from any website, so anyone could use it and spend the Nebius credits.
Lock it to the frontend:

1. Render → backend service → **Environment** → add

   ```
   CORS_ORIGINS=https://bumi-watch-frontend.vercel.app
   ```

   Use the exact frontend URL(s) your host gave you, comma-separated if there are several
   (e.g. a custom domain as well), no trailing slashes. Add `http://localhost:3000`
   too if you want to run the frontend locally against the deployed backend.
2. **Save Changes** and let Render redeploy (choose *Save, rebuild, and deploy* if it asks).

---

## 4. Check everything works

Open the frontend URL and go through:

- [ ] The landing page loads; **Open dashboard** shows the map.
- [ ] The header status says **Live** (not "Backend offline").
- [ ] The stat tiles show numbers: fire hotspots, average AQI, earthquakes, rainfall.
- [ ] Clicking a province (e.g. Kalimantan Tengah) opens its panel with stations.
- [ ] **Ask Bumi:** "Where is the air quality worst in Indonesia today?" gets an answer in about 5–20 seconds,
      ending with a `📍 Sources:` line. The steps (tool calls) should appear one by one while it works.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Can't reach the Bumi Watch backend" | Backend asleep (free plan), wrong `VITE_API_URL`, or CORS | Open the backend's `/health` URL and wait up to a minute for it to wake, then reload. Still failing? Check the browser console (F12). A CORS error means `CORS_ORIGINS` doesn't exactly match the frontend URL. Otherwise fix `VITE_API_URL` on your host, then rebuild/redeploy (it's baked in at build time). |
| Dashboard loads but tiles are empty | First data run hasn't finished, or keys missing | Check Render **Logs** for `Run complete` and for `... not set — skipping` warnings. |
| Every question fails | `NEBIUS_API_KEY` missing or wrong, or wrong model ID | Render logs show `Agent error: ...`. Don't set `NEMOTRON_MODEL` unless you mean to. The default `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` is correct, and Nebius rejects the lowercase form. |
| "Too many questions. Try again in Ns." | Rate limit: 10 questions/min per visitor | Working as intended. Raise `AGENT_RATE_LIMIT` if needed. If *everyone* hits it at once, `TRUST_PROXY=1` is missing. |
| The chat's steps all appear at once at the end | Something between the browser and the backend buffers the stream | Answers still work. Check no extra proxy/CDN sits in front of the backend. |
| Data resets after every deploy or wake-up | Free plan (no disk), or the disk isn't mounted at `/data` | Expected on the free plan. On a paid plan, redo step 1.6. |
| Fire/air counts look doubled or data jumps around | More than one instance running | Set it back to 1 instance (step 1.8). |

## Updating later

- **Backend:** push to `main` on `bumi-watch-nemotron`. Render redeploys by itself.
- **Frontend:** on Vercel (or Netlify, Cloudflare Pages), push to `main` and it redeploys itself. Elsewhere, rebuild and upload `dist/`.

More backend detail (all environment variables, API changes, known gaps) is in the backend repo's
[`HANDOFF.md`](https://github.com/HanifWinson/bumi-watch-nemotron/blob/main/HANDOFF.md).
