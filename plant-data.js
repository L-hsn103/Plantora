(function () {
  "use strict";

  /* Seed price in BDT, keyed by plant id from Data/plants.json. */
  var DEMO_PRICES_BDT = {
    1: 450, 2: 650, 3: 250, 4: 300, 5: 500, 6: 800, 7: 1200, 8: 350, 9: 550, 10: 200,
    11: 600, 12: 1000, 13: 700, 14: 250, 15: 900, 16: 450, 17: 300, 18: 350, 19: 400, 20: 350
  };

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