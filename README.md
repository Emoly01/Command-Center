# The Hearth — Emily's tool hub

One React/Vite app, tools as cards, Firebase-synced across phone + laptop
(once the Hearth is bound to Google, see below).

## One-time setup
1. Firebase Console → project `dnd-tools-1dd87` → Project settings →
   Your apps → Web app → copy the SDK config values.
2. Paste them into `src/lib/firebase.js` (replace every `REPLACE_ME`).
3. Firebase Console → Build → Authentication → Sign-in method → enable
   **Anonymous** and **Google**.
   Then Authentication → Settings → **Authorized domains** → add every address
   the Hearth runs on: the production domain, and each Vercel preview you want
   to sign in from (the per-branch alias, e.g.
   `<project>-git-feature-stash-ledger-<team>.vercel.app`). No wildcards.
4. Firebase Console → Firestore → Rules → paste:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{uid}/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }

## Accounts: anonymous first, then bound to Google
Every browser starts out signed in anonymously. That identity lives only in
the browser's storage: clearing site data loses it for good (iOS Safari also
wipes it after 7 days without a visit, unless the Hearth is on the home
screen), and each device gets its own, so devices don't share data.

The **Bind to Google** band on Home fixes both:
- **First device** (the one with the data you care about): the Google account
  is *linked* to the existing anonymous uid. The uid doesn't change, so every
  doc under `users/{uid}` stays exactly where it is.
- **Any other device**: Google is already bound, so the app signs in to that
  account instead. Before switching, it copies this browser's docs (`tools/*` and the stash)
  that the account **doesn't have yet**, and never overwrites. The old
  anonymous copies are left untouched in Firestore.

Sign-in uses a popup, not a redirect (redirects break when the app isn't
served from `firebaseapp.com` and the browser partitions storage).

## Deploy (your usual flow)
- New GitHub repo → upload all these files.
- Vercel → Add New Project → import the repo → Framework: **Vite** → Deploy.
- `vercel.json` already handles deep-link refreshes.

## Local
    npm install
    npm run dev

## What's live
- 💧 Water — fully synced, configurable daily goal, per-day history
  (`users/{uid}/tools/water` → `{ goal, days: { "YYYY-MM-DD": count } }`).
- 🔥 Ember Familiar — dashboard band that reacts to today's water.
- 🧶 Stash Ledger — craft supply inventory with photos, eyedropper colors
  and "do I already own this?" color search (`/stash`, see below).
- 🦊 The Den — fullscreen route stub, ready for the fox.
- Cleaning / Command / Combat — routed placeholders; migrate one at a time.

## Offline
Firestore runs with a persistent local cache (`src/lib/firebase.js`): anything
a device has loaded stays readable with no signal, and writes made offline
sync when the connection comes back. Don't `await` a write before moving on
in the UI: offline, the promise only resolves once the server has it.

## Stash Ledger
Craft supplies (`src/tools/Stash.jsx`, screens in `src/tools/stash/`, data in
`src/lib/stash.js`). Too many items and photos for one doc, so it doesn't use
the one-doc `useSyncedState` pattern (except for its settings):

    users/{uid}/tools/stash           { categories: [{ id, name, units }] }
    users/{uid}/stash/{itemId}        one item (shape documented in stash.js)
    users/{uid}/stashPhotos/{itemId}  { full: JPEG data URL }

- **Photos live in Firestore**, not Cloud Storage. This project has no
  Storage bucket, and since Feb 2026 Storage needs the Blaze plan. Each photo
  is shrunk in the browser to a 1280px JPEG (≤700 KB, usually far less) plus a
  192px square thumbnail kept on the item. Photos are cached offline like any
  other data, and deleting an item deletes its photo in the same batch.
- **Colors** are stored as `#RRGGBB`. The eyedropper samples a 2048px copy of
  the original photo, never the stored JPEG, and averages a small patch.
  Search ranks by CIEDE2000 (`src/lib/color.js`): under 3 is "Twin", under 6
  "Close", under 12 "Family".
- **Item IDs** are Firestore auto IDs and never change, so other tools can
  link to them.
- **For other tools:** `getStashPalette({ categoryIds })` returns owned items
  with `{ id, name, qty, unit, colors: [{ hex, name, lab }] }`. Rug-ify should
  start there.
- **Rules:** none needed. The `users/{uid}/{document=**}` rule above already
  covers the new collections.
- **Offline caveat:** data and photos are cached once loaded, but the app
  itself has no service worker. Open the Hearth before you lose signal, and
  it keeps working in the basement. A cold start with zero signal won't load
  the page.

## Adding a tool
Build it as a component in `src/tools/`, use `useSyncedState("toolId", fallback)`
for synced data (or plain `useState` for device-local), wrap in `<ToolFrame>`,
add a `<Route>` in `main.jsx` and a card in `Home.jsx`.

For anything filed per day, use `todayKey()` / `useToday()` from
`src/lib/day.js`. It gives the **Europe/Berlin** date, so days flip at local
midnight. (Older tools still use `new Date().toISOString()`, which is a UTC
date and flips at 01:00/02:00 Berlin time.)

## The Ember Familiar
The little flame on the dashboard (`src/familiar/`). Its mood is **derived,
never stored**: every render, it takes a list of *feeds* and picks a mood.

    computeMood([{ source: "water", progress: 0.5 }])  // → { mood: "content", progress: 0.5 }

- `progress` is how much of today's goal is done: 0 = nothing, 1 = goal hit.
  Values above 1 are clamped. An optional `weight` (default 1) counts a feed
  more or less.
- Moods come from the weighted average. Below 25% it's **sulking**, from 25%
  it's **content**, and at 100% it's **smug** (every feed at its goal).
  The thresholds live in `src/familiar/mood.js`.
- Lines are in `src/familiar/lines.js`. Edit freely: snarky, affectionate,
  never shaming.

Undo, the midnight reset and syncing across devices need nothing extra,
because the mood is recomputed from whatever the source tools hold right now.

### Feeding it from another module
1. **Move the module to the Berlin day helper first.** If a feeder still keys
   its days by UTC, the familiar will disagree with it between midnight and
   02:00.
2. Export a feed selector next to the module's data, the way `waterFeed()`
   does in `src/lib/water.js`. It takes the module's state and returns
   `{ source, progress, label }`. If the familiar needs the module's data
   off its own page, also export a hook like `useWater()`.
3. Add the feed to the `feeds` array in `src/familiar/FamiliarBand.jsx`.

Water is the only feeder in v0.1.

### Testing the day rollover
In `npm run dev`, add `?day=YYYY-MM-DD` to any URL to pretend it's that day.
It sticks for the tab; `?day=off` clears it. Production builds ignore it. To
use it on a Vercel preview, set `VITE_ALLOW_DAY_OVERRIDE=true` for the
**Preview** environment only. Logs you make under a fake day are real writes,
filed under that date.
