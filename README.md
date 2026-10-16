# HDW Aggregator (prototype v0.1)
Live demo: https://shuklaxvaibhav.github.io/hdw-aggregator-pwa/

First prototype for **The Harvest Decision Window** - AI Synergy Hackathon, Round 1, Case 02 (Agriculture).

This is only the **rural aggregator app**: the person at the village collection point who logs crop weights, often with no 4G. The mandi OCR and farmer SMS parts are not built yet.

## Why a PWA

- No app store, no APK. Opens from a link and can be added to the home screen.
- Works offline through a service worker, which is the main problem in this case.
- Plain HTML/CSS/JS, no build step, easy for the team to edit.

## Run it

```
cd hdw-aggregator-pwa
python -m http.server 8000
```

Open http://localhost:8000 (service workers only work on localhost or https).
On a phone: deploy to GitHub Pages, open the link in Chrome, then "Add to Home screen".

## What works

- Log a collection: farmer ID, crop (tomato / onion / potato), weight, timestamp
- Saves go to a local outbox on the phone first (a clock icon means pending)
- Real online/offline detection, plus a "Simulate 4G dead-zone" checkbox for demos
- When the connection returns, pending records sync one by one with a progress bar and turn green
- English / Hindi toggle
- App opens offline after the first load

## What is fake or missing (TODO)

- - [ ] Offline loading is implemented but still being tested on real devices
    [ ] Sync is mocked. `MOCK_SYNC = true` in `app.js`. Set it to `false` once the FastAPI endpoint exists
- [ ] Outbox uses localStorage. Move to IndexedDB or SQLite
- [ ] Farmer list is hardcoded
- [ ] No login, no duplicate protection on the server side
- [ ] Only the main labels are translated to Hindi
- [ ] Better icons, test on a real low-end Android phone

## Files

```
index.html   page layout
style.css    styles
app.js       form, outbox, sync logic
sw.js        service worker (offline cache)
manifest.webmanifest   makes it installable
icons/       app icons
```

## Team

vaibhav shukla
rudrakshi sharma
