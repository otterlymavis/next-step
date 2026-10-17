# Next Step

Phase 1–2 prototype of the execution assistant described in `../PLAN.md`: a phone home-screen web app (PWA). It needs no build step and has no dependencies.

## Files

| File | What it does |
| --- | --- |
| `core.js` | State, selection rules, attempts, return flow, reminders, points, streaks, badges, and display preferences. No DOM, so it can be tested in Node. |
| `ui.js` | Screens. Every change is saved to `localStorage` immediately. Unsent form drafts and the open screen of an unfinished process are kept under a separate key, so the process resumes after the app closes. |
| `sw.js` | Cache-first offline shell: the app opens instantly. A new version installs in the background and Home offers "Update now". Bump `VERSION` here and `APP_VERSION` in `ui.js` together whenever a file changes. |
| `test/core.test.js` | Phase 2 acceptance gates. |

## Run

```sh
node --test app/test/*.test.js          # logic gates
cd app && python3 -m http.server 8765   # then open http://localhost:8765
```

## Interface rules this follows (PLAN §2)

- No looping or moving animation. Transitions are short, and off when reduce-motion is set.
- All text is 16px or larger with 1.5 line spacing, with no all-caps or italics.
- Every button has a text label, and every action confirms on screen.
- Multi-step flows show "Step x of n". Drafts survive leaving the app; Back discards them.
- Visible keyboard focus. Theme, focus mode, animation and points switches, and backup, under More → Settings.

## Put it on your phone

Deployed at https://otterlymavis.github.io/next-step/. To install it:

- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** ⋮ → Install app

## Where the data lives

The data lives only in that browser on that one device. Use More → Settings → Backup to save a copy now and then. If the saved data can't be read, the app shows a recovery screen and never overwrites the data.
