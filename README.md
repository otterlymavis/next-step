# Next Step

Phase 1–2 prototype of the execution assistant described in `../PLAN.md`: a phone home-screen web app (PWA). It needs no build step and has no dependencies.

## Files

| File | What it does |
| --- | --- |
| `core.js` | State, selection rules, attempts, return flow. No DOM, so it can be tested in Node. |
| `ui.js` | Screens. Every change is saved to `localStorage` immediately as a single write. |
| `sw.js` | Offline cache. Bump `VERSION` whenever a file changes. |
| `test/core.test.js` | Phase 2 acceptance gates. |

## Run

```sh
node --test app/test/*.test.js          # logic gates
cd app && python3 -m http.server 8765   # then open http://localhost:8765
```

## Put it on your phone

Installing it properly (offline support, and iOS keeping the data) needs HTTPS. Any static host works, for example GitHub Pages, Netlify Drop, or Cloudflare Pages. Upload the contents of `app/`, open the URL on the phone, then:

- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** ⋮ → Add to Home screen / Install app

Put the icon in your first home-screen slot, ideally where the scrolling app used to be.

## Where the data lives

The data lives only in that browser on that one device. Use Menu → Backup and data to export a backup now and then. If the saved data can't be read, the app shows a recovery screen and never overwrites the data.

## Prototype rules worth tuning

These constants are at the top of `core.js`: `DEADLINE_WINDOW_DAYS` (14), `WELCOME_BACK_DAYS` (2), `LONG_ABSENCE_DAYS` (21), and `MAX_ALTERNATIVES` (3).
