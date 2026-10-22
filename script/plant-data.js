(function () {
  "use strict";

  // fallback prices used before the admin sets real ones
  var DEMO_PRICES_BDT = {
    1: 450, 2: 650, 3: 250, 4: 300, 5: 500, 6: 800, 7: 1200, 8: 350, 9: 550, 10: 200,
    11: 600, 12: 1000, 13: 700, 14: 250, 15: 900, 16: 450, 17: 300, 18: 350, 19: 400, 20: 350
  };

  // Demo stock numbers used before the admin sets real stock
  var DEMO_STOCK = {
    7: 4,    // Monstera - shows the low-stock badge
    12: 0,   // Areca Palm - shows as sold out
    19: 2    // Bunny Ears Cactus - nearly gone
  };
  var DEMO_DEFAULT_STOCK = 30;
  var DEMO_ALL_ACTIVE = true;

  var cache = null;      // shared promise
  var plantList = null;  // cached array for instant getPlantById

  // localStorage snapshot of the plant list so repeat page loads render instantly
  var CACHE_KEY = "plantora-plants-cache";
  var CACHE_TTL_MS = 10 * 60 * 1000; // refetch at most every 10 minutes

  function readPlantsCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) { return null; }
      var saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.plants) || saved.plants.length === 0) { return null; }
      if (Date.now() - saved.savedAt > CACHE_TTL_MS) { return null; } // too old
      return saved.plants;
    } catch (err) {
      return null; // broken or unavailable storage — behave as before
    }
  }

  function writePlantsCache(plants) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), plants: plants }));
    } catch (err) { /* storage can be full or disabled — cache is best effort */ }
  }

  // Firestore SDK config (matches auth.js, resolved safely via PlantoraConfig)
  var FIREBASE_CONFIG = (function () {
    if (typeof window !== "undefined" && window.PlantoraConfig && typeof window.PlantoraConfig.getFirebaseConfig === "function") {
      return window.PlantoraConfig.getFirebaseConfig();
    }
    var _decode = function (str) {
      try { return atob(str); } catch (e) { return ""; }
    };
    return {
      apiKey: _decode("QUl6YVN5Q3FsS2w3ajV5WXZkc0ZLQlZFQk5qb0tsdE1DQno5a1JV"),
      authDomain: "plantora-87936.firebaseapp.com",
      projectId: "plantora-87936",
      storageBucket: "plantora-87936.firebasestorage.app",
      messagingSenderId: "684642317612",
      appId: "1:684642317612:web:19d446b36c9defd36a2889",
      measurementId: "G-TF88N9Q5SJ"
    };
  })();
  var SDK_URL = "https://www.gstatic.com/firebasejs/10.12.2/";

  // Fetch from Firestore "plants" collection
  function loadFromFirestore() {
    return Promise.all([
      import(SDK_URL + "firebase-app.js"),
      import(SDK_URL + "firebase-firestore.js")
    ]).then(function (modules) {
      var appMod = modules[0];
      var fsMod = modules[1];
      var app = appMod.initializeApp(FIREBASE_CONFIG);
      var db = fsMod.getFirestore(app);
      return fsMod.getDocs(fsMod.collection(db, "plants")).then(function (snap) {
        if (snap.empty) throw new Error("No plants in Firestore");
        var plants = [];
        snap.forEach(function (doc) {
          var data = doc.data();
          // Ensure numeric id matches document id
          data.id = Number(doc.id);
          plants.push(data);
        });
        // Sort by id for consistent ordering
        plants.sort(function (a, b) { return a.id - b.id; });
        return plants;
      });
    });
  }

  // Fallback to JSON file
  function loadFromJSON() {
    return fetch("../assets/Data/plants.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load Data/plants.json (HTTP " + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.plants) || data.plants.length === 0) {
          throw new Error("Data/plants.json has no plants");
        }
        return data.plants;
      });
  }

  // Firestore (with JSON fallback) + refreshes the localStorage snapshot
  function fetchAndCache() {
    return loadFromFirestore()
      .catch(function (err) {
        console.warn("[PlantoraData] Firestore load failed, falling back to JSON:", err.message);
        return loadFromJSON();
      })
      .then(function (plants) {
        plantList = plants;
        writePlantsCache(plants);
        return plantList;
      });
  }

  // Main loader: fresh cache -> instant paint (+ quiet refresh for the next visit)
  function loadPlants() {
    if (!cache) {
      var cached = readPlantsCache();
      if (cached) {
        plantList = cached;
        cache = Promise.resolve(plantList);
        // silently refresh Firestore data for the next navigation
        fetchAndCache().catch(function () { /* page already rendered, keep cache */ });
        return cache;
      }

      cache = fetchAndCache();
      cache.catch(function () { cache = null; });
    }
    return cache;
  }

  // works only after loadPlants() has finished
  function getPlantById(id) {
    if (!plantList) return null;
    return plantList.find(function (p) { return p.id === Number(id); }) || null;
  }

  // demo stock and price for one plant
  function getDemoSeed(id) {
    var n = Number(id);
    return {
      stock: DEMO_STOCK.hasOwnProperty(n) ? DEMO_STOCK[n] : DEMO_DEFAULT_STOCK,
      priceBDT: DEMO_PRICES_BDT.hasOwnProperty(n) ? DEMO_PRICES_BDT[n] : 0,
      active: DEMO_ALL_ACTIVE
    };
  }

  // show the amount with the taka sign
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