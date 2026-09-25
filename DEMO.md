# Demo guide: Bumi Watch

For whoever presents Bumi Watch to the judges. It covers the pitch, a 4-minute click-through, questions that
are tested to work, what to say, and what to do when something goes wrong.

## The pitch (30 seconds)

> Indonesia has fires, haze, earthquakes and droughts, but the data sits in separate places: NASA satellites,
> BMKG, air-quality sensors, weather archives. **Bumi Watch puts them on one live map, and lets you ask questions
> in plain English or Bahasa Indonesia.** The answers come from an **NVIDIA Nemotron** agent running on
> **Nebius Token Factory**. It decides for itself which data to pull, queries our live database, and cites its
> sources, so the numbers are real, not made up.

Three things to land:
1. **Real, live data:** ~8,000 fire hotspots, ~130 air-quality stations, BMKG earthquakes and rainfall for all
   38 provinces, refreshed every 30 minutes.
2. **An agent, not a chatbot:** Nemotron picks from six database tools via function calling, and you can
   *show* which tools it called.
3. **Connects the dots:** it links sources, e.g. hazardous air in Palangka Raya with the thousands of fires
   around it and the dry weeks before.

## Before the demo

- [ ] **Open the deployed site 10+ minutes early.** The header should say **Live · Xm ago** (green), not
      "Backend offline" or a stale time.
- [ ] **Ask one warm-up question** so the first real one isn't the slowest.
- [ ] **Find today's story.** The numbers change every 30 minutes, so don't memorise the ones in this guide.
      On the Overview (24h), look at **Most fire hotspots** and **Worst air** on the right. On 25 Sep 2026 it was
      Kalimantan Tengah: ~2,800 hotspots, Palangka Raya AQI 474 (Hazardous). Pick whichever province leads that day.
- [ ] **Record a backup video** of the full demo the day before, in case the venue Wi-Fi or the model is slow.
- [ ] Browser zoom ~110–125% so the room can read it; close other tabs; turn off notifications.
- [ ] **If judges will try it themselves on the same Wi-Fi:** they share one IP, and the backend allows
      10 questions per minute per IP. Ask whoever deployed the backend to raise `AGENT_RATE_LIMIT` (e.g. to 60)
      for demo day.

## The demo (about 4 minutes)

**1. Landing page (15 s).** "Ask the earth. It's listening." → click **Open dashboard**.

**2. Overview: the live picture (60 s)**
- Point at the four tiles: fire hotspots, average AQI, earthquakes, rainfall. "All live, all from public feeds."
- Map: the **Fires / Quakes / Air quality** toggles on the top left. Province shading = number of fire hotspots.
- Switch **24h → 7d** to show history, then back to **24h**.
- Right-hand column: *Most fire hotspots*, *Worst air*, *Recent earthquakes*. Name today's story out loud.

**3. Click the leading province on the map (45 s)**
- The side panel shows AQI, hotspots, earthquakes and rainfall for that province, plus its air stations.
- Click **Ask Bumi about [province]**. This jumps to the chat with a question that asks Nemotron to check
  all four sources and say whether they're linked.

**4. The agent at work (60–90 s)**
- While it thinks, the status line changes: *Choosing which data to pull → Querying the database and reasoning*.
  Say: "Nemotron is deciding which tools to call. It isn't answering from memory."
- When the answer lands, point out the real numbers and the **📍 Sources** line at the end.
- Click the grey **"N tool calls · Xs"** button under the answer. **How Nemotron answered** shows each tool it
  called with its arguments. **This is the money shot for an NVIDIA/Nebius judge.**

**5. Bahasa Indonesia + follow-up (45 s)**
- Ask: **Bagaimana kualitas udara di Jakarta hari ini?** It answers in Indonesian, station by station.
- Then a follow-up that relies on context, e.g. after a question about the worst air: **What about Palembang?**

**6. Sources page (20 s)**
- **Sources** in the header: the four feeds with live record counts, and the Collect → Choose → Answer pipeline.
  "Every number traces back to one of these."

## Questions that work

Each of these was run twice against live data on 25 Sep 2026, and all 16 answers succeeded. Answers take
**10–35 seconds** (occasionally up to ~50), and the wording differs each run. Don't promise an exact sentence.

| Question | What it shows | Tools it used |
|---|---|---|
| **Where is the air quality worst in Indonesia today, and is it linked to fires?** | Best single demo question: multi-step reasoning across sources | air quality → fires (→ cross-check) |
| **Ask Bumi about [province]** button (from the map panel) | All four sources for one province, and whether they're linked | `query_cross_correlation` |
| **What about Palembang?** (as a follow-up) | Remembers the conversation | air quality + fires for Sumatera Selatan |
| **Bagaimana kualitas udara di Jakarta hari ini?** | Bahasa Indonesia; per-station answer | air quality, DKI Jakarta |
| **Which province has the most fire hotspots right now?** | Fast, crisp, one tool | fires |
| **Ada gempa besar minggu ini?** | Earthquakes, in Indonesian | earthquakes, 7 days |
| **Is the smoke in Pekanbaru from fires? Has it been dry?** | Cross-source (air + fires + rain) | `query_cross_correlation`, Riau |
| **What's the air quality in Bali right now?** | Quick single answer | air quality, Bali |

The empty **Ask Bumi** page shows four clickable suggestions (the fires, Jakarta, Pekanbaru and gempa questions above),
useful if typing live feels risky. Once a chat has started, **New chat** brings them back.

## Talking points for judges

- **Why Nemotron?** Tool use. The model gets six query tools (air quality, fires, earthquakes, rainfall,
  cross-correlation, national overview) as OpenAI-style function definitions, chooses which to call and with what
  province and time range, reads the results and writes the answer. We run **Nemotron 3 Nano** (30B total, ~3B active)
  on **Nebius Token Factory**, which is fast and cheap enough to answer live.
- **Why trust the numbers?** The system prompt forbids answering from memory; every figure comes from a tool result,
  and every answer ends with its sources and period. The dashboard numbers skip the model entirely: they're plain SQL.
- **The data:** NASA FIRMS (VIIRS + MODIS satellites), WAQI (~130 government and community stations),
  BMKG (Indonesia's meteorology and geophysics agency), Open-Meteo (rainfall → drought/flood risk). A pipeline
  pulls all of them every 30 minutes into SQLite, skipping duplicates.
- **Bilingual:** it answers in the language you ask in.
- **Where it could go:** alerts ("tell me when AQI in my city passes 150"), more sources (deforestation,
  land temperature), forecasts.

## If something goes wrong

| What you see | What to do |
|---|---|
| Header says **Backend offline** | Switch to the backup video. After the demo, ask whoever deployed it to check Railway. |
| An answer takes over ~40 s | Keep talking: explain the tools while the status line updates. It usually finishes by ~50 s. |
| An answer fails ("Agent failed…") | Click **Try again**, or pick a suggested question. Rare: none of the 16 test runs failed. |
| **"Too many questions. Try again in Ns."** | Rate limit (10/min per network). Wait the few seconds it says. See the checklist above. |
| An odd or wrong claim | Don't defend it. Say it's a 30B model and the sources line shows exactly what it looked at. |

## Honest answers to hard questions

- **"Is it always right?"** The numbers come from the data, but the model can over-interpret. For example, it may
  say fires are "near" a city when they're elsewhere in the province. That's why every answer shows its sources and
  tool calls.
- **"How current is it?"** Fires, air and earthquakes: within ~30 minutes of the source publishing them. Rainfall is
  a 7-day average, updated daily.
- **"The map only has 32 provinces?"** The province outlines predate Indonesia's newest provinces (Papua split into
  four, plus Kaltara, Kepri, Sulbar). Their data is counted under the parent province on the map; rainfall covers all 38.
- **"Why do some provinces have no air data?"** There's no public WAQI station there. We don't fill gaps with estimates.
