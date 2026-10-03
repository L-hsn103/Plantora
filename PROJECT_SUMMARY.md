# Plantora - Project Summary

## Overview
Plantora is a web-based plant management and plant-shopping platform that helps users discover, identify, purchase, and take care of indoor plants.

**Current state:** the public catalogue, authentication and page structure are working. The Firestore data layer has been written but **has never been run against a real database** — see [Verification Status](#verification-status).

## Team
- **Jannatul Bakiya** (ID: 05) - Team Leader & Project Manager
- **Ateea Benta Alamin** (ID: 11) - Backend & Database Developer *(currently implementing the login interface)*
- **Marzia Hasan** (ID: 23) - API & Integration Developer
- **Labib Hasan** (ID: 24) - Frontend & UI/UX Developer

## Who Built Which Portion

Derived from the git history (`git shortlog`), not from assumption.

| Member | Portion | Key files |
|---|---|---|
| **Ateea Benta Alamin** (11) | Login system, authentication, Firebase setup, navbar account menu | `auth.js`, `login.html`, `register.html`, Firebase project config, auth wiring across every page |
| **Labib Hasan** (24) | Explore catalogue, search & filters, plant details page, UI/theme styling | `explore.css`, `style.css`, `script.js`, `explore.html`, `plant-details.html`, hero image |
| **Jannatul Bakiya** (05) | Plant database, plant images, recommendation quiz, project documentation | `Data/plants.json` (20 plants), all 20 `image/plant/*.webp`, `recommendation.html` + `recommendation.js`, `README.md` |
| **Labib Hasan** (24) | Landing/nav redesign, About sections, logo + favicon, flash-free auth UI | `auth-ui.js`, `index.html`, `style.css` auth-state rules, `image/Plantora_log.png`, navbar across all pages — commit `ff33532` |
| **Marzia Hasan** (23) | API & integration — *no commits yet; plant identification API still unselected* | — |
| **Ateea + frontend pair** | Firestore data layer, shop, checkout, sample-data removal, unified navbar | `store.js`, `plant-data.js`, `shop.js`, `shop.html`, `checkout.html`, `firestore.rules` — committed as `L-hsn103` and pushed to `origin/main` (`79e38ce`) |

Some pages were touched by more than one member while integrating features (for example `dashboard.html`, `explore.html` and `my-plants.html`), so ownership there is shared rather than exclusive.

---

## Verification Status

Read this before trusting anything below.

| Area | State |
|---|---|
| HTML / CSS / JS syntax | Checked with `node --check` and static link/structure analysis |
| Auth UI state machine | Checked with a throwaway jsdom smoke test (32 assertions: signed-in/out on explore, index, dashboard, logout, repeat-run idempotency) — **script not committed, lives outside the repo** |
| Landing, Explore, Plant Details | Working (previously verified) |
| Firebase Auth (login/register) | Code written; **not re-verified in a browser since the auth.js / auth-ui.js split** |
| Firestore data layer (`store.js`, `firestore.rules`) | **Written but never executed.** No Firestore database exists on the project yet |
| Shop, Checkout, Dashboard, My Plants data | Depends entirely on Firestore; untested |
| Automated tests in the repo | **None.** No test framework, no `package.json`, no CI |

Everything marked untested can only be confirmed by running the site with `npx serve` and a real Firebase project.

---

## Features Implemented

### 1. Landing Page (index.html)
- Hero with plant visual; marketing CTAs **Log In** · **Explore Plants** (they become **Go to Dashboard** once signed in)
- Features grid (4 cards), How it works (3-step process)
- **About section** (`#about`) — the target of every About link while signed out
- Final CTA section
- Navbar: logo image + **Home · Explore Plants · Shop · About** and the Get Started slot
- The old floating "Your Room" info card was removed

### 2. Explore Plants (explore.html)
- Search plants by name or scientific name
- Filter by: Light, Water, Maintenance, Size, Indoor Suitability
- Filter options are generated from the plant data, so they always match it
- Real-time filtering and search

### 3. Plant Details (plant-details.html)
- Plant hero with image and description
- Requirements grid (8 fields: Light, Water, Humidity, Temperature, Space, Maintenance, Difficulty, Indoor Suitability)
- About This Plant section
- Care Guide (Watering, Fertilizing, Repotting, Cleaning)
- Indoor Suitability banner
- "Add to My Plants" button — **still a placeholder `alert()`, not connected to the database**

### 4. Authentication (auth.js + auth-ui.js)
**Split by responsibility**

| File | Loads | Owns |
|---|---|---|
| `auth.js` | `<head>`, `defer` | Firebase config/init, auth-state listener, route protection, login/register forms, friendly error messages |
| `auth-ui.js` | plain `<script>` before `</body>` | DOM + storage only: navbar, About links, landing CTAs, dashboard greeting, profile menu — exposed as `window.PlantoraUI` |

`auth-ui.js` runs **during page parse**, so the cached signed-in state is on screen before Firebase (or the network) answers. `auth.js` then calls `PlantoraUI.updateNavbarForAuth()` to confirm or correct it.

**Firebase Authentication with Email/Password**
- Login page (login.html) — email/password form
- Register page (register.html) — name, email, password, confirm password
- Firebase project: `plantora-87936`
- Forms bind automatically via `#login-form` / `#register-form`
- Friendly error messages mapped from Firebase error codes

**Session cache (no signed-out flash)**
- The user is mirrored to `sessionStorage` (this tab) **and** `localStorage` (every other tab), and cleared from both on sign-out — a freshly opened tab starts signed-in instead of flashing the signed-out navbar
- An inline snippet in `<head>` sets `html.is-auth` from that cache **before the body renders**
- `style.css` state rules then do the visible part with no JavaScript at all: `My Plants` appears, `Get Started` hides, and paired label spans swap (`Home`/`Dashboard`, `Log In`/`Get Started` → `Go to Dashboard`)
- `auth-ui.js` fills in the parts CSS cannot: hrefs, current-page highlight, the personalised greeting and the profile menu

**Route Protection**
- `dashboard.html` and `my-plants.html` require login (`data-requires-auth="true"` on `<body>`)
- `checkout.html` is also protected
- Other pages are public
- Redirect back to the original page via `?redirect=` (reads both storage mirrors)

**Navbar profile dropdown**
- Signed out: "Get Started" button
- Signed in: display name + 👤 dropdown, showing the account email, with a Logout button
- Closes on outside click, ARIA attributes present, injected once (a repeat call cannot duplicate it)

**Auth-aware first nav slot**
- Signed out: **Home → index.html**, first position
- Signed in: **Dashboard → dashboard.html**, first position (same slot, the words are CSS-toggled spans)
- The highlight moves with it, but `aria-current` is only set where it is factually true

**Auth-aware About**
- Signed out: `index.html#about` — the landing About section
- Signed in: `dashboard.html#about` (`#about` on the dashboard itself), so a logged-in user is never sent back to the marketing page

### 5. Shop (shop.html)
- Public listing of all 20 plants with prices and stock
- Stock states: `In stock`, `Only N left` (5 or fewer), `Out of stock` (button disabled)
- "Buy" routes to `checkout.html?id=N`
- **Preview mode**: with no inventory in the database, the shop falls back to the demo seed in `plant-data.js` and shows a loud banner saying so. It switches to live data automatically once real inventory exists.

### 6. Checkout (checkout.html)
- Protected demo checkout — order summary, delivery form, demo-payment acknowledgement
- Delivery fields validated in the browser **and** in `firestore.rules`
- On success, writes the order and the new plant in a single Firestore transaction, then links to My Plants
- Clearly marked as taking no real money

### 7. Dashboard (dashboard.html)
- Welcome hero, personalised from the cached session: **"Welcome Back, name!"** (falls back to "Welcome Back, Plant Lover!" when signed out), with the "Find My Plant" CTA
- Quick Actions grid (4 cards)
- **My Plants** summary — real plants from the database, with a live count
- **Upcoming Care** — real care tasks due within 7 days, grouped by date
- Recommendation banner, Plant Care Knowledge topics, Explore Plant Library CTA
- **About section** (`#about`, `.about--plain`) — where the About link points for signed-in users
- **All sample data has been removed.** Empty and error states replace the old hardcoded cards

### 8. My Plants (my-plants.html)
- Real plant cards from the database: image, nickname or name, scientific name
- `Purchased` / `Added by you` badge showing how the plant entered the collection
- Status pill computed from the watering due date (`Healthy` / `Needs Water`)
- Next due date for all four care tasks
- **All sample data has been removed.** The "Add Plant" button links to Explore rather than a placeholder `alert()`

### 9. Three-state rendering (shop.js)
Every Firestore-backed list renders one of three states, and they are deliberately distinct:

| State | When | Message |
|---|---|---|
| Real data | The read succeeds | Cards |
| Empty | The read succeeds and returns nothing | "No plants in your collection yet" |
| Error | The read fails | "Can't reach the database right now" + what to check |

Collapsing the last two would tell a user they own no plants when the truth is that the database could not be reached.

### 10. Consistent navigation (8 pages)
One navbar across `index`, `explore`, `plant-details`, `shop`, `checkout`, `recommendation`, `dashboard`, `my-plants` (`login` / `register` use their own card layout):

| | Signed out | Signed in |
|---|---|---|
| Links | Home · Explore Plants · Shop · About | Dashboard · Explore Plants · Shop · My Plants · About |
| Right slot | Get Started | 👤 name dropdown (email + Logout) |

- The landing page carries `navbar--landing`: its links are centred between logo and CTA and stay visible on small screens
- **My Plants** is `data-nav-private` — hidden in the markup, revealed only for signed-in users (CSS first, JS confirmed)
- One identical footer everywhere, current page marked with `aria-current="page"`, **no dead `#` links**

### 11. Branding
- `image/Plantora_log.png` is the site mark: navbar logo, footer logo, login/register card logo, and the **favicon on every page** (`<link rel="icon">`, all 11 HTML files)
- Section icons are still emoji

---

## Care Schedules (logic only — no UI yet)

`store.js` contains a complete, tested-by-reading care schedule system. **No page calls it yet.**

Each plant gets four tasks, with intervals derived from the plant's own data:

| Task | Interval |
|---|---|
| Watering | `Very Low` 21d · `Low` 14d · `Medium` 7d · `High` 4d · `Very High` 2d |
| Fertilizing | by maintenance: `Very Low` 120d · `Low` 90d · `Medium` 60d · `High` 30d |
| Repotting | 730 days |
| Cleaning | 30 days |

A newly added plant starts a full interval out, because a nursery has just watered it — this also stops a new account opening into a wall of reminders.

Marking a task done sets `lastDone` and pushes `nextDue` out by one interval, so the current reminder disappears from the list with no extra "completed" flag.

**Not built:** the editing controls, the tick-off buttons and the due-today popup. `markTaskDone()`, `setTaskInterval()`, `renamePlant()` and `removePlant()` all exist in the store but have no UI.

---

## Firestore Schema

```text
admins/{uid}                     Admin grant. Created by hand in the console.
                                 A user may read their OWN grant so the app can
                                 ask "am I admin?" without a permission error.

inventory/{plantId}              Admin-owned. plantId is 1..20 to match plants.json.
  stock, priceBDT, active,
  updatedAt, updatedBy

users/{uid}/orders/{txId}        Immutable once created.
  uid, plantId, plantName, quantity, currency, priceBDT,
  isDemo, paymentMethod, status, delivery{}, createdAt

users/{uid}/myPlants/{txId}      The user's collection.
  uid, plantId, plantName, nickname, source, orderId,
  addedAt, schedule { watering, fertilizing, repotting, cleaning }
                                 each task: { intervalDays, lastDone, nextDue }
```

`lastDone` / `nextDue` are epoch milliseconds so rescheduling is plain arithmetic. `addedAt` / `createdAt` are server Timestamps so the console can order documents normally.

### One attempt, one id, two documents
A checkout generates a **single `tx_<32 hex>` id** used as the document id for both the order and the plant it creates. The id is kept in `sessionStorage`, so a retry after a lost response reuses it and cannot create a duplicate. `firestore.rules` requires both documents to exist together with matching ids.

The ids are deliberately **shared rather than prefixed `or_` / `pl_`** because Firestore rules have no string-slice operator, so a derived second id could not be cross-checked in the rules.

### Safety rules enforced in `firestore.rules`
- Orders are **create-only and immutable**
- A `myPlants` document may **only ever change `schedule` and `nickname`** (`diff().affectedKeys()`); `plantId`, `plantName`, `source`, `orderId` and `addedAt` are frozen
- A plant must arrive either as a purchase **linked to a real order in the same batch**, or as `source: 'manual'` with no order
- **The price is pinned to the inventory price** at write time, so a tampered client cannot invent a cheaper price for itself
- An order requires the plant to be `active` and to have `stock >= 1`
- Stock is decremented in the **same transaction** as the order, so the last plant cannot be sold twice
- Delivery fields are shape- and length-checked in both the browser and the rules
- Every other path is denied

### What the rules cannot do
They check who writes and the shape of the data. They cannot verify that a price is *fair*, that stock was physically shipped, or that a delivery address is real. **Real payment processing needs a trusted backend (Cloud Functions) that decides everything server-side.**

---

## Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Authentication**: Firebase Auth (Email/Password), Firebase JS SDK 10.12.2
- **Database**: Cloud Firestore (written, not yet deployed)
- **Plant catalogue**: `Data/plants.json`, 20 plants
- **Fonts**: Google Fonts (Fraunces for headings, Inter for body)
- **Logo / favicon**: `image/Plantora_log.png` (nav, footer, auth cards, browser tab); section icons are emoji
- **No build step, no bundler, no `package.json`**

### JavaScript style
Two styles coexist, which is inconsistent but intentional during the handover:
- `auth.js`, `script.js` — ES6+ (`const`, arrow functions, template literals, `async/await`)
- `plant-data.js`, `store.js`, `shop.js` — ES5 (`var`, `function`, `.then()`)

---

## Project Structure
```text
Plantora/
├── index.html              # Landing page (hero, features, how it works, About, CTA)
├── explore.html            # Browse plants with search/filter
├── plant-details.html      # Detailed plant view
├── shop.html               # Plant shop with prices and stock (public)
├── checkout.html           # Demo checkout (protected)
├── recommendation.html     # Recommendation quiz + results
├── recommendation.js       # Quiz flow + result rendering
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # User dashboard (protected, includes About section)
├── my-plants.html          # User's plant collection (protected)
├── admin.html              # Placeholder notes only - admin portal not built
├── admin.js                # Placeholder notes only - admin portal not built
├── style.css               # Shared theme, landing page, auth-state rules, empty states
├── explore.css             # Explore & plant-details styles
├── script.js               # Explore + plant-details rendering
├── auth.js                 # Firebase: init, listener, route protection, forms
├── auth-ui.js              # DOM + storage: navbar, About/CTA links, greeting, user menu
├── plant-data.js           # Catalogue loader + demo inventory seed
├── store.js                # Firestore data layer + care schedule maths
├── shop.js                 # Page controllers (shop, dashboard, my-plants)
├── firestore.rules         # Firestore security rules (not yet published)
├── .gitignore              # Node, Firebase CLI, editor and OS files
├── Data/
│   └── plants.json         # 20 plants with care info
└── image/
    ├── Plantora_log.png    # Site mark: navbar, footer, auth cards, favicon
    ├── hero-plant.jpg
    └── plant/              # 20 .webp images, one per plant
```

**Script order on every page:**
- `<head>`: `auth.js`, `plant-data.js`, `store.js`, `shop.js` — all `defer` — plus the inline snippet that sets `html.is-auth` from the cached session **before first paint**
- before `</body>`: `auth-ui.js` (plain script, so it runs during parse, not after a deferred fetch)

---

## Plant Data (20 Plants)
1. Snake Plant - Very Low light/water, Very Easy
2. ZZ Plant - Very Low light/water, Very Easy
3. Money Plant (Pothos) - Low light, Medium water, Very Easy
4. Spider Plant - Medium light/water, Easy
5. Peace Lily - Low light, High water, Moderate
6. Rubber Plant - Medium light/water, Moderate
7. Monstera Deliciosa - Medium light/water, Moderate
8. Heartleaf Philodendron - Low light, Medium water, Easy
9. Chinese Evergreen - Low light, Medium water, Easy
10. Lucky Bamboo - Low light, Very High water, Easy
11. Boston Fern - Medium light, High water, Hard
12. Areca Palm - High light/water, Hard
13. Parlor Palm - Low light, Medium water, Easy
14. Aloe Vera - High light, Low water, Easy
15. Golden Barrel Cactus - Very High light, Very Low water, Moderate
16. Christmas Cactus - Medium light/water, Moderate
17. Zebra Haworthia - Medium light, Low water, Easy
18. Moon Cactus - High light, Very Low water, Moderate
19. Bunny Ears Cactus - Very High light, Very Low water, Moderate
20. Echeveria - Very High light, Low water, Moderate

`Data/plants.json` is the single source of truth. **`script.js` still carries a second, duplicated copy of all 20 plants** — see Known Issues.

---

## Setup Instructions

Steps 1–4 below are **assigned to Ateea Benta Alamin (Backend & Database)**. The
frontend cannot be tested until they are done. Steps 5–6 are for whoever is running
the site locally.

### 1. Firebase Console
- Project: `plantora-87936`
- **Authentication** → Sign-in method → enable **Email/Password**
- **Authentication** → Authorized domains → add `localhost` **and your deployment domain**. A missing entry here breaks the login interface with `auth/unauthorized-domain`
- **Firestore Database** → Create → Production mode
- **Firestore** → link a billing account (Blaze plan) — required for Firestore on new projects

### 2. Publish the security rules
Paste `firestore.rules` into Firestore → Rules → Publish. `firestore.rules` ends with a 12-step manual test list; run it before relying on the rules.

There is no `firebase.json`, so rules are published through the console rather than `firebase deploy`.

### 3. Grant the first admin
Create a document `admins/{yourUid}` (empty is fine) in Firestore. Get your uid from Authentication → Users. **No client can create this document** — the rules deny it.

### 4. Run locally
```bash
npx serve        # a server is required; Firebase Auth will not work over file://
```
Open `/shop.html` to see the catalogue, `/dashboard.html` and `/my-plants.html` for the collection views. In the empty state, **Load 3 sample plants** writes three real plants to Firestore, which is the fastest way to see the dashboard populated.

### Deployment
Works on any static host (Netlify, Vercel, Firebase Hosting, GitHub Pages). Add the deployment domain to Authorized domains and to `store.js`'s `firebaseConfig.authDomain` if it differs.

---

## Known Issues

1. **Nothing has been tested against a real database.** Every Firestore path is unverified.
2. **`script.js` duplicates all 20 plants.** `plants.json` and `script.js` are two sources for the same data and can drift. This has already happened once: at `script.js:500` the Bunny Ears Cactus points at `boston-fern.webp`. It is currently masked because `Data/plants.json` overwrites the built-in list on load, so the bug only shows if the JSON fails to load. **Fix: delete the built-in array and read from `plant-data.js`.**
3. **`login.html` and `register.html` still display "This is an early prototype — login is not yet functional."** This copy is wrong; login does work. Never corrected.
4. **"Add to My Plants" on `plant-details.html` is still an `alert()`** (`script.js:775`). Nothing on any page can add a plant yet.
5. **No automated tests in the repo.** The `_setBackendForTests()` hook in `store.js` exists for offline testing but no test file uses it. The auth-UI smoke test (32 jsdom assertions) was written in a temp directory, run once, and deliberately not committed — there is still no `package.json`.
6. **`nextDue` uses the browser clock**, so clock skew shifts reminders. A real fix computes dates in Cloud Functions.
7. **`admin.html` / `admin.js` contain placeholder notes only.** The admin portal is not built and neither file is linked from any page.

---

## Not Yet Built
- **Admin portal** — the schema and store functions (`isAdmin`, `getInventory`, `setInventoryItem`, `seedDemoInventory`) are ready; the UI is not
- **Manual add from Explore Plants** — the store supports `addPlantManually()` and the rules permit it; no button triggers it
- **Buy button on Plant Details** — only the shop links to checkout
- **Care schedule UI** — tick-off, interval editing, nickname editing, remove plant, due-today popup
- **Plant identification API** — not selected (see README)
- **Recommendation quiz** — not started
- **bKash payment** — planned for next week; the checkout is structured so the demo payment step is one replaceable function

---

## Recent Git History
All work below is pushed to `origin/main`.

| Commit | Message |
|--------|---------|
| `ff33532` | feat: auth-aware navbar and About sections, logo branding, flash-free signed-in state |
| `b158131` | Add plant recommendation system with dashboard integration |
| `462c7bc` | docs: correct stale status claims in project summary |
| `f876caf` | docs: record current status, Firestore schema and contributions |
| `cf8225f` | chore: remove unused snake-plant.jpg |
| `76ae7ab` | refactor: remove placeholder sample data, wire dashboard and My Plants to real data |
| `a9b2fbe` | refactor: unify navbar and footer, add Shop and Dashboard links |
| `acd3a64` | feat: add plant shop and demo checkout |
| `79e38ce` | feat(data): add Firestore data layer, demo inventory seed and rules |
| `4ea7286` | chore: add .gitignore and document the unbuilt admin portal |
| `ec0df1e` | Add PROJECT_SUMMARY.md documentation |
| `5368452` | Fix quote escaping in auth.js |
| `05fccf4` | Add user profile dropdown to navbar |
| `04fdd92` | Remove prototype login/register scripts |
| `599efa2` | Configure Firebase project credentials |
| `82a4d00` | Integrate auth.js across all pages |
| `2b036db` | Add Firebase Auth (auth.js) |

**Pushed but never run in a browser:** the Firestore data layer and rules, the shop and checkout pages, removal of all sample data from the dashboard and My Plants, the three-state rendering, the unified navbar/footer, the auth-aware nav, the `auth.js` / `auth-ui.js` split and the flash-free signed-in first paint (that last part only has the jsdom smoke test).

---

*Last updated: 3 October 2026*
*Project: Plantora - "Helping You to Keep Plants Alive"*