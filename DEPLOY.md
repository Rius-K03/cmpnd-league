# CMPND League — Deployment Guide

Total time: ~20 minutes. You'll end up with a URL like `cmpnd-league.vercel.app`
that your whole building can access, install to their home screen, and use in real time.

---

## What you need (all free)
- A computer with a browser
- Node.js installed → https://nodejs.org (click "LTS" version)
- A GitHub account → https://github.com
- A Firebase account → https://firebase.google.com (uses your Google account)
- A Vercel account → https://vercel.com (sign up with GitHub)

---

## STEP 1 — Set up Firebase (your live database)

1. Go to https://console.firebase.google.com and sign in with Google.
2. Click **"Add project"** → name it `cmpnd-league` → click Continue.
3. Turn OFF Google Analytics → click **"Create project"** → Continue.
4. In the left sidebar, click **"Build"** → **"Realtime Database"**.
5. Click **"Create Database"** → choose any location → click **"Start in test mode"** → Enable.
   *(Test mode = anyone with your URL can read/write. Fine for a friends app.)*
6. Click the ⚙️ gear icon (top left) → **"Project settings"**.
7. Scroll down to **"Your apps"** → click the **`</>`** (Web) icon.
8. Enter app nickname `cmpnd-league` → click **"Register app"**.
9. You'll see a `firebaseConfig` object. **Copy it** — you'll paste it in Step 3.

---

## STEP 2 — Put the project on GitHub

1. Go to https://github.com/new
2. Name the repo `cmpnd-league` → keep it **Public** → click **"Create repository"**.
3. On your computer, open Terminal (Mac) or Command Prompt (Windows).
4. Run these commands one by one (paste your GitHub username where shown):

```bash
cd path/to/cmpnd-league       # navigate to this project folder
npm install                    # install dependencies
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/cmpnd-league.git
git push -u origin main
```

---

## STEP 3 — Paste your Firebase config

1. Open `src/firebase.js` in any text editor.
2. Replace all the `"PASTE_YOUR_..."` placeholders with your actual values from Step 1.

It should look like this when done:
```js
const firebaseConfig = {
  apiKey:            "AIzaSyAbc123...",
  authDomain:        "cmpnd-league.firebaseapp.com",
  databaseURL:       "https://cmpnd-league-default-rtdb.firebaseio.com",
  projectId:         "cmpnd-league",
  storageBucket:     "cmpnd-league.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

3. Save the file, then push the change:
```bash
git add src/firebase.js
git commit -m "add firebase config"
git push
```

---

## STEP 4 — Deploy to Vercel (your public URL)

1. Go to https://vercel.com → sign up with your GitHub account.
2. Click **"Add New Project"** → find `cmpnd-league` → click **"Import"**.
3. Leave all settings as default → click **"Deploy"**.
4. Wait ~60 seconds. Vercel gives you a URL like `cmpnd-league.vercel.app`. 🎉

That's your app. Share it with anyone in your building.

---

## STEP 5 — "Add to Home Screen" (makes it feel like an app)

### iPhone / Safari:
1. Open the URL in Safari (must be Safari, not Chrome).
2. Tap the Share button (box with arrow pointing up).
3. Scroll down → tap **"Add to Home Screen"** → tap **"Add"**.
4. The CMPND League icon appears on your home screen.

### Android / Chrome:
1. Open the URL in Chrome.
2. Tap the three-dot menu → tap **"Add to Home screen"** → tap **"Add"**.

---

## Future updates

When you want to update the app (new features, fixes):
1. Make changes to the code.
2. Run `git add . && git commit -m "your update" && git push`
3. Vercel auto-deploys in ~60 seconds.
4. Everyone gets the update instantly on their next refresh — no re-installing.

---

## Data

All player records, match history, and bracket state live in your Firebase
Realtime Database. It's free up to 1GB stored / 10GB downloaded per month —
more than enough for a building tournament tracker running for years.

You can view and manually edit your data anytime at:
https://console.firebase.google.com → your project → Realtime Database
