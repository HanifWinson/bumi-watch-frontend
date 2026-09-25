# Demo video guide: Bumi Watch

For whoever records the demo video. It covers what to show, what to say, questions that are tested to work, and how
to record and edit it so it looks good.

**Target length: about 3 minutes.** Check the hackathon's submission rules for the exact limit (many cap demo
videos at 3 minutes) and trim to fit.

## The story in one breath

> Indonesia has fires, haze, earthquakes and droughts, but the data sits in separate places. **Bumi Watch puts it on
> one live map, and lets you ask about it in English or Bahasa Indonesia.** An **NVIDIA Nemotron** agent on
> **Nebius Token Factory** decides which data to pull, queries the live database, and cites its sources.

Three things the video must make obvious:
1. **Real, live data:** ~8,000 fire hotspots, ~130 air-quality stations, BMKG earthquakes, rainfall for all 38 provinces.
2. **An agent, not a chatbot:** you *see* which tools Nemotron called (step 4 below).
3. **It connects the dots:** hazardous air where the fires are, plus how dry it's been.

## Before recording

- [ ] **You can record from a local copy.** Backend `npm start` in `bumi-watch-nemotron`, frontend `npm run dev` here,
      then open http://localhost:3000. No deployment needed. The data is just as live. (Or use the deployed site.)
- [ ] **Let the data load:** the header should say **Live · Xm ago** (green).
- [ ] **Find today's story** before writing the final voiceover. The numbers change every 30 minutes. On the Overview
      (24h), check **Most fire hotspots** and **Worst air** on the right. On 25 Sep 2026 it was **Kalimantan Tengah**:
      ~2,800 hotspots, Palangka Raya AQI 474 (Hazardous). Use whichever province leads on recording day, and say
      the numbers you actually see.
- [ ] **Ask one throwaway question first** so the model is warmed up.
- [ ] Browser: full screen (F11), zoom ~110–125% so text is readable in a small video player, no bookmarks bar,
      notifications off, other tabs closed.
- [ ] Record at **1920×1080**.

## Shot list and voiceover (~3:00)

Record the screen and the voice separately if you can. It's much easier to keep a steady pace when you're
not clicking and talking at the same time. Timings are for the *edited* video.

| Time | On screen | Voiceover (adapt the numbers to what you see) |
|---|---|---|
| 0:00–0:15 | Landing page, then click **Open dashboard** | "Indonesia faces fires, haze, earthquakes and drought. The data exists, but it's scattered across satellites, sensors and agencies. This is Bumi Watch." |
| 0:15–0:35 | **Overview.** Hover over the four tiles; toggle **Fires / Quakes / Air quality** on the map | "One live map: fire hotspots from NASA satellites, air quality from about 130 stations, earthquakes from BMKG, and rainfall for every province, refreshed every 30 minutes. Right now there are over [N] fire hotspots in the last 24 hours." |
| 0:35–0:55 | Switch to **7d**, click **Play 7 days of fires** on the map (bottom left). Let it run its 10 seconds: fires appear in the order satellites saw them, bright when new, fading to embers | "Here's the last week, fire by fire, as NASA's satellites detected it. Watch [Kalimantan]." |
| 0:55–1:10 | Back to **24h**. Point at **Most fire hotspots** and **Worst air**; click the leading province on the map | "And the data tells a story. [Kalimantan Tengah] has the most fires, and also the worst air: [Palangka Raya] is at AQI [474]. Hazardous." |
| 1:10–1:20 | Province panel open; click **Ask Bumi about [province]** | "But a map can't tell you *why*. So we ask." |
| 1:20–1:45 | Chat: the live steps. *Nemotron is choosing which data to pull* → each tool call appears with a spinner, then ✓ (e.g. *Air quality · All Indonesia · 24h*) → *Reading the results and writing the answer*. Keep the moments where a tool row appears; cut the long "choosing" waits. Then the answer appears | "The question goes to NVIDIA Nemotron, running on Nebius Token Factory. It isn't answering from memory. It decides which of six database tools to call, queries the live data, and links the sources together." |
| 1:45–2:10 | Zoom in on the answer's numbers and the **📍 Sources** line; click **N tool calls · Xs** to open **How Nemotron answered**. Optionally click **📍 Show [province] on map**: it jumps back to the map, zoomed in with the province open | "Every number comes from the data, and every answer names its sources. And you can see exactly what the agent did: which tools, for which province, over what period." |
| 2:10–2:30 | Type **Bagaimana kualitas udara di Jakarta hari ini?** → answer in Indonesian | "It works in Bahasa Indonesia too, station by station." |
| 2:30–2:45 | **Sources** page | "Four public data feeds, pulled every 30 minutes into one database. The dashboard is plain SQL; the answers are Nemotron with function calling." |
| 2:45–2:55 | Back to the map, or the logo | "Bumi Watch. Ask the earth. It's listening." |

If you need to cut time, drop the Jakarta question (2:10–2:30) first, then the Sources page. Keep the timelapse: it's the most visual moment.

## Questions that work

Each of these was run twice against live data on 25 Sep 2026, and all 16 answers succeeded. Answers take
**10–35 seconds** (occasionally ~50): cut the wait in editing. The wording differs every run, so if an answer
comes out clumsy, just ask again and keep the best take.

| Question | Good for |
|---|---|
| **Ask Bumi about [province]** button in the map's province panel | The main shot: all four sources for one province, and whether they're linked |
| **Where is the air quality worst in Indonesia today, and is it linked to fires?** | Alternative main shot: multi-step reasoning (air quality → fires → cross-check) |
| **What about Palembang?** (as a follow-up to the question above) | Shows it remembers the conversation |
| **Bagaimana kualitas udara di Jakarta hari ini?** | Bahasa Indonesia, per-station answer |
| **Which province has the most fire hotspots right now?** | Short and crisp |
| **Ada gempa besar minggu ini?** | Earthquakes, in Indonesian |
| **Is the smoke in Pekanbaru from fires? Has it been dry?** | Air + fires + rain in one answer |

The empty **Ask Bumi** page also shows four clickable suggestions, handy if you don't want typing in the video.
**New chat** brings them back.

## Recording and editing tips

- **Tools (all free):** OBS Studio for recording, or Windows 11's Snipping Tool (it can record the screen).
  Edit in Clipchamp (built into Windows 11), CapCut or DaVinci Resolve.
- **Cut the waiting, keep the steps.** The live steps under the question are real (streamed from the backend as
  Nemotron works), so keep each tool row appearing and ticking ✓. Cut the long stretches in between with
  jump cuts. Don't speed up the whole clip; jump cuts look cleaner.
- **Zoom in** (crop/zoom in the editor) on the answer and on the tool-call list. At full-screen size they're
  too small to read in a video player.
- **Cursor:** move it slowly and deliberately; park it out of the way while text is on screen.
- **Captions:** add them. Judges often watch muted, and it helps with the Indonesian parts.
- **Audio:** a phone headset mic in a quiet room beats a laptop mic. Record the voiceover in one go, then cut.
- **Upload:** usually YouTube (Unlisted is fine, unless the rules require Public). Check the link in a private
  window before submitting.

## Say this, not that

Keep the voiceover to what's true, since judges may try the app:

| ✅ Say | ❌ Avoid |
|---|---|
| "Live data, refreshed every 30 minutes" | "Real-time" (it's up to ~30 min behind) |
| "About 130 air-quality stations" | "Every city in Indonesia" (some provinces have no public station) |
| "The agent decides which tools to call" | "It predicts" or "it forecasts" (it reports current and recent data) |
| "Answers cite their sources" | "It's never wrong" (the model can over-interpret, e.g. calling fires "near" a city) |
| "NVIDIA Nemotron 3 Nano on Nebius Token Factory" | Naming a different or bigger model |

## Background for the description text

Useful for the submission write-up or the video description:

- **Model:** NVIDIA Nemotron 3 Nano (30B parameters, ~3B active), on Nebius Token Factory, with OpenAI-style
  function calling over six tools: air quality, fire hotspots, earthquakes, rainfall, cross-correlation for one
  province, and a national overview.
- **Data:** NASA FIRMS (VIIRS + MODIS satellites), WAQI (~130 stations), BMKG, Open-Meteo, pulled every 30 minutes
  into SQLite.
- **Honest limits:** the map uses 32 province outlines (the newest provinces are counted under their parent
  province on the map, while rainfall covers all 38); provinces without a public air station show no AQI rather
  than an estimate.
- **Next:** alerts, more sources (deforestation, land temperature), forecasts.
