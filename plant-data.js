/* =============================================================
   PLANTORA - plant-data.js
   Shared, read-only access to Data/plants.json, plus the demo
   inventory seed. Exposes window.PlantoraData.
   Load with: <script src="plant-data.js" defer>
   Does NOT copy the plant list; it always loads Data/plants.json
   (keep the capital "D" - paths are case-sensitive on most hosts).

   PRICES ARE NOT THE LIVE PRICES
   Once the admin portal exists, price and stock live in Firestore
   (inventory/{plantId}) and the shop reads them from there. The table
   below is only the SEED used by the admin's "Initialize demo
   inventory" button, which writes one inventory document per plant and
   never overwrites an existing one.

   These numbers run in the browser, so anyone can change them. They
   must never be treated as trusted prices: firestore.rules pins an
   order's priceBDT to the stored inventory price, and real payment
   processing needs a backend that decides prices itself.
   ============================================================= */
(function () {
  "use strict";

  /* Seed price in BDT, keyed by plant id from Data/plants.json. */
  var DEMO_PRICES_BDT = {
    1: 450, 2: 650, 3: 250, 4: 300, 5: 500, 6: 800, 7: 1200, 8: 350, 9: 550, 10: 200,
    11: 600, 12: 1000, 13: 700, 14: 250, 15: 900, 16: 450, 17: 300, 18: 350, 19: 400, 20: 350
  };

  /* Seed stock, keyed by plant id. Anything not listed gets 30.
     A few are deliberately low or zero so the "Only N left" and
     "Out of stock" states are visible as soon as you seed. */
  var DEMO_STOCK = {
    7: 4,    // Monstera - shows the low-stock badge
    12: 0,   // Areca Palm - shows as sold out
    19: 2    // Bunny Ears Cactus - nearly gone
  };
  var DEMO_DEFAULT_STOCK = 30;
  var DEMO_ALL_ACTIVE = true;

  var cache = null;      // promise, shared by all callers
  var plantList = null;  // resolved array, so getPlantById can be synchronous

  function loadPlants() {
    if (!cache) {
      cache = fetch("Data/plants.json")
        .then(function (res) {
          if (!res.ok) throw new Error("Could not load Data/plants.json (HTTP " + res.status + ")");
          return res.json();
        })
        .then(function (data) {
          if (!data || !Array.isArray(data.plants) || data.plants.length === 0) {
            throw new Error("Data/plants.json has no plants");
          }
          plantList = data.plants;
          return plantList;
        });
      cache.catch(function () { cache = null; }); // allow a retry after a failure
    }
    return cache;
  }

  // Only meaningful after loadPlants() has resolved.
  function getPlantById(id) {
    if (!plantList) return null;
    return plantList.find(function (p) { return p.id === Number(id); }) || null;
  }

  // Seed values for one plant, as an inventory document body. These
  // are the numbers the admin portal writes on first setup.
  function getDemoSeed(id) {
    var n = Number(id);
    return {
      stock: DEMO_STOCK.hasOwnProperty(n) ? DEMO_STOCK[n] : DEMO_DEFAULT_STOCK,
      priceBDT: DEMO_PRICES_BDT.hasOwnProperty(n) ? DEMO_PRICES_BDT[n] : 0,
      active: DEMO_ALL_ACTIVE
    };
  }

  function formatBDT(amount) {
    return "\u09F3" + Number(amount).toLocaleString("en-US");
  }

  window.PlantoraData = {
    loadPlants: loadPlants,
    getPlantById: getPlantById,
    getDemoSeed: getDemoSeed,
    formatBDT: formatBDT
  };
})();