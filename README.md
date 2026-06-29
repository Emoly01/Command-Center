# The Hearth — Emily's tool hub

One React/Vite app, tools as cards, Firebase-synced across phone + laptop.

## One-time setup
1. Firebase Console → project `dnd-tools-1dd87` → Project settings →
   Your apps → Web app → copy the SDK config values.
2. Paste them into `src/lib/firebase.js` (replace every `REPLACE_ME`).
3. Firebase Console → Build → Authentication → enable **Anonymous**.
4. Firebase Console → Firestore → Rules → paste:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{uid}/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }

## Deploy (your usual flow)
- New GitHub repo → upload all these files.
- Vercel → Add New Project → import the repo → Framework: **Vite** → Deploy.
- `vercel.json` already handles deep-link refreshes.

## Local
    npm install
    npm run dev

## What's live
- 💧 Water — fully synced (the proof everything else copies).
- 🦊 The Den — fullscreen route stub, ready for the fox.
- Cleaning / Command / Combat — routed placeholders; migrate one at a time.

## Adding a tool
Build it as a component in `src/tools/`, use `useSyncedState("toolId", fallback)`
for synced data (or plain `useState` for device-local), wrap in `<ToolFrame>`,
add a `<Route>` in `main.jsx` and a card in `Home.jsx`.
