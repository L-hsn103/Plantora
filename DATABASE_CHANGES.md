# DATABASE_CHANGES.md

## Purpose
This document explains the database/backend changes required to support multiple instances of the same plant species per user in the Plantora project.

## Current Limitation
**No database limitation exists.** The current Firestore data model already supports multiple instances of the same plant species per user.

### Verified Existing Behavior
- **Collection**: `users/{uid}/myPlants/{txId}`
- **Document ID**: Auto-generated unique `txId` (e.g., `tx_a1b2c3d4e5f6...`)
- **Fields per document**:
  - `plantId` (number) — references the species in the `plants` catalog
  - `plantName` (string) — denormalized species name
  - `nickname` (string, nullable) — user-defined name for this instance
  - `location` (string, nullable) — room/location (Living Room, Bedroom, Office, Kitchen, Balcony)
  - `source` (string) — "manual" | "shop-demo" | etc.
  - `orderId` (string, nullable) — linked order if purchased
  - `addedAt` (timestamp) — when added to collection
  - `schedule` (map) — care schedule per task (watering, fertilizing, repotting, cleaning)

The frontend (`script.js`) previously enforced a **UI-level restriction** by tracking `ownedPlantIds = new Set(entries.map(e => e.plantId))` and disabling the "Add" button when a species was already in the user's collection. This was purely a frontend constraint.

## Required Data Model
**No changes required.** The existing model already supports the feature:

```
users/{uid}/myPlants/{txId} (multiple docs per user, same plantId allowed)
├── plantId: 7                    // Monstera Deliciosa
├── plantName: "Monstera Deliciosa"
├── nickname: "Living Room Monstera"
├── location: "Living Room"
├── schedule: { watering: { intervalDays: 7, ... }, ... }
└── ...

users/{uid}/myPlants/{txId2}      // Second instance, same species
├── plantId: 7                    // Same species!
├── plantName: "Monstera Deliciosa"
├── nickname: "Bedroom Monstera"
├── location: "Bedroom"
├── schedule: { watering: { intervalDays: 5, ... }, ... }
└── ...
```

Each instance is a **completely independent document** with its own:
- Unique `txId` (primary key)
- Nickname
- Location
- Watering schedule (customizable interval)
- Care history (last watered, next due)
- Independent watering/editing/deletion

## Required Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plantId` | number | Yes | FK to `plants` catalog |
| `plantName` | string | Yes | Denormalized for display |
| `nickname` | string | **Yes** (new) | User-defined instance name |
| `location` | string | No | One of: Living Room, Bedroom, Office, Kitchen, Balcony |
| `notes` | string | No | Free-text personal notes for this plant instance (max 1000 chars) |
| `schedule` | map | Yes | Per-task intervals & timestamps |
| `source` | string | Yes | "manual" \| "shop-demo" |
| `addedAt` | timestamp | Yes | Server timestamp |

**New/Changed from frontend perspective:**
- `nickname` is now **required** on creation (was `null`)
- `location` is now **set on creation** (was `null`, set later via badge click)
- `schedule.watering.intervalDays` can be **customized on creation** (was auto-derived from plant's `water` level)
- `notes` is a new optional field for personal plant notes, editable in the my-plant-details page

## Database Constraints and Indexes
**No changes required.**

- **No uniqueness constraint** on `plantId` within `myPlants` — multiple docs with same `plantId` are allowed
- **No composite index** needed for the new queries — existing `orderBy("addedAt", "desc")` works
- Firestore Rules (`firestore.rules:28-30`) already allow read/write per document:
  ```javascript
  match /users/{uid}/myPlants/{txId} {
    allow read, write: if isOwner(uid);
  }
  ```

## API Changes
**Backend (Firestore) — No changes needed.** The existing `addManual` function in `store.js` already writes to the correct collection with the correct fields.

**Frontend API (store.js) — Extended:**
```javascript
// Before
addPlantManually(plantId)

// After
addPlantManually(plantId, options)
// options: { nickname: string, location: string|null, wateringInterval: number|null }
```

The `addManual` backend function in `store.js` was updated to accept an optional `options` parameter:
- `nickname` → stored directly (validated via `cleanNickname`)
- `location` → validated against allowed `ROOMS` array, stored or `null`
- `wateringInterval` → overrides default watering schedule interval via `scheduleWithInterval()`

Note: the Add Plant modal only collects `nickname` + `location`. Watering is scheduled automatically from each plant's water needs; `wateringInterval` remains an optional store-level override that the UI no longer exposes.

## Migration Plan
**No migration required.** 

- Existing user plants remain unchanged — they have `nickname: null`, `location: null`, default schedules
- The new frontend will:
  - Require nickname on **new** additions
  - Allow setting location on **new** additions
  - Watering schedule is set automatically from each plant's water needs (no custom interval is asked)
- Existing plants without nickname/location will continue to work — they'll appear in the "Unassigned" section
- Users can edit nickname/location of existing plants via the new "Change Location" menu (to be implemented in frontend)

## Backend Tasks Checklist
| Task | Status | Notes |
|------|--------|-------|
| Verify Firestore rules allow multiple `myPlants` docs per `plantId` | ✅ Done | Rules use `txId` as doc ID, no `plantId` uniqueness |
| Verify `addManual` accepts nickname, location, wateringInterval | ✅ Done | Updated in `store.js` |
| Verify `setLocation` works for existing plants | ✅ Done | Already exists in `store.js` |
| Verify `renamePlant` works for existing plants | ✅ Done | Already exists in `store.js` |
| Verify independent schedules per instance | ✅ Done | Each doc has own `schedule` map |
| Deploy updated `store.js` | ⬜ Pending | Frontend deployment |
| Test adding same species twice with different nicknames | ⬜ Pending | Frontend test |

## Acceptance Criteria
The backend can be verified by:

1. **Manual Firestore Console Test:**
   - Create two documents in `users/{uid}/myPlants/` with same `plantId: 7`
   - Different `nickname`, `location`, `schedule.watering.intervalDays`
   - Both should be readable via `listMyPlants()`

2. **API Test (via frontend or direct SDK):**
   ```javascript
   // Add first Monstera
   await addPlantManually(7, { nickname: "Living Room Monstera", location: "Living Room", wateringInterval: 7 })
   
   // Add second Monstera
   await addPlantManually(7, { nickname: "Bedroom Monstera", location: "Bedroom", wateringInterval: 5 })
   
   // List plants
   const plants = await listMyPlants()
   // Should return 2 entries, both with plantId: 7, different nicknames/locations/schedules
   ```

3. **Independence Verification:**
   - Water first plant → only its `schedule.watering.lastDone`/`nextDue` updates
   - Change location of second plant → only its `location` field updates
   - Delete first plant → second plant remains

4. **Existing Data Preservation:**
   - Pre-existing plants (with `nickname: null`, `location: null`) still appear in "Unassigned" section
   - Their schedules remain functional

## Conclusion
**No backend/database changes are required.** The feature is implemented entirely in the frontend:
- `style.css` — Modal and section styles
- `script.js` — AddPlantModal, removed duplicate check, integrated modal
- `store.js` — Extended `addManual`/`addPlantManually` to accept options
- `shop.js` — Group by location, removed location badge, added "Change Location" menu

The existing Firestore schema, rules, and backend functions already support multiple independent instances of the same species per user.