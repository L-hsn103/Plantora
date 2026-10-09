
(function () {
  "use strict";

  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/"; // same version as auth.js
  var WRITE_TIMEOUT_MS = 15000;
  var PHONE_RE = /^[0-9+() -]{6,20}$/;
  var TX_ID_RE = /^tx_[a-f0-9]{32}$/;
  var DAY_MS = 86400000;
  var NICKNAME_MAX = 60;

  var TASK_KEYS = ["watering", "fertilizing", "repotting", "cleaning"];
  var TASK_META = {
    watering: { label: "Watering", icon: "\uD83D\uDCA7" },
    fertilizing: { label: "Fertilizing", icon: "\uD83C\uDF3F" },
    repotting: { label: "Repotting", icon: "\uD83E\uDED4" },
    cleaning: { label: "Cleaning", icon: "\uD83E\uDDF9" }
  };

  var WATER_DAYS = { "Very Low": 21, "Low": 14, "Medium": 7, "High": 4, "Very High": 2 };
  var FERTILIZER_DAYS = { "Very Low": 120, "Low": 90, "Medium": 60, "High": 30 };
  var REPOTTING_DAYS = 730;
  var CLEANING_DAYS = 30;

  var backendPromise = null;
  var inFlight = {};

  function fail(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }


  function defaultIntervalDays(plant, taskKey) {
    if (taskKey === "watering") return WATER_DAYS[plant.water] || 7;
    if (taskKey === "fertilizing") return FERTILIZER_DAYS[plant.maintenance] || 60;
    if (taskKey === "repotting") return REPOTTING_DAYS;
    return CLEANING_DAYS;
  }

  function clampInterval(days) {
    var n = Math.round(Number(days));
    if (!isFinite(n)) return 7;
    return Math.min(3650, Math.max(1, n));
  }

  function buildSchedule(plant, nowMs) {
    var s = {};
    TASK_KEYS.forEach(function (key) {
      var days = defaultIntervalDays(plant, key);
      s[key] = { intervalDays: days, lastDone: null, nextDue: nowMs + days * DAY_MS };
    });
    return s;
  }

  function cloneSchedule(schedule) {
    var out = {};
    TASK_KEYS.forEach(function (key) {
      var t = (schedule && schedule[key]) || {};
      out[key] = {
        intervalDays: clampInterval(t.intervalDays || 7),
        lastDone: t.lastDone == null ? null : Number(t.lastDone),
        nextDue: Number(t.nextDue) || 0
      };
    });
    return out;
  }

  function scheduleWithInterval(schedule, taskKey, days) {
    var next = cloneSchedule(schedule);
    var task = next[taskKey];
    task.intervalDays = clampInterval(days);
    var base = task.lastDone || Date.now();
    task.nextDue = base + task.intervalDays * DAY_MS;
    return next;
  }

  function scheduleWithDone(schedule, taskKey, nowMs) {
    var next = cloneSchedule(schedule);
    var task = next[taskKey];
    task.lastDone = nowMs;
    task.nextDue = nowMs + task.intervalDays * DAY_MS;
    return next;
  }


  function isOverdue(task, nowMs) {
    return task && task.nextDue > 0 && task.nextDue <= nowMs;
  }

  function getDueTasks(myPlants, nowMs) {
    nowMs = nowMs || Date.now();
    var out = [];
    (myPlants || []).forEach(function (entry) {
      TASK_KEYS.forEach(function (key) {
        var task = entry.schedule && entry.schedule[key];
        if (!isOverdue(task, nowMs)) return;
        out.push({
          entryId: entry.id,
          plantId: entry.plantId,
          plantName: entry.plantName,
          nickname: entry.nickname || null,
          taskKey: key,
          label: TASK_META[key].label,
          icon: TASK_META[key].icon,
          nextDue: task.nextDue,
          overdueDays: Math.floor((nowMs - task.nextDue) / DAY_MS)
        });
      });
    });
    out.sort(function (a, b) { return a.nextDue - b.nextDue; });
    return out;
  }

  function getUpcomingTasks(myPlants, days, nowMs) {
    nowMs = nowMs || Date.now();
    var horizon = nowMs + (days || 7) * DAY_MS;
    var out = [];
    (myPlants || []).forEach(function (entry) {
      TASK_KEYS.forEach(function (key) {
        var task = entry.schedule && entry.schedule[key];
        if (!task || task.nextDue <= 0 || task.nextDue > horizon) return;
        out.push({
          entryId: entry.id,
          plantId: entry.plantId,
          plantName: entry.plantName,
          nickname: entry.nickname || null,
          taskKey: key,
          label: TASK_META[key].label,
          icon: TASK_META[key].icon,
          nextDue: task.nextDue,
          overdueDays: task.nextDue <= nowMs ? Math.floor((nowMs - task.nextDue) / DAY_MS) : 0
        });
      });
    });
    out.sort(function (a, b) { return a.nextDue - b.nextDue; });
    return out;
  }

  // "Today" / "Tomorrow" / "5 days overdue"
  function describeDue(task, nowMs) {
    nowMs = nowMs || Date.now();
    var startOfToday = new Date(nowMs);
    startOfToday.setHours(0, 0, 0, 0);
    var days = Math.round((task.nextDue - startOfToday.getTime()) / DAY_MS);
    if (task.nextDue <= nowMs) {
      var late = Math.floor((nowMs - task.nextDue) / DAY_MS);
      if (late === 0) return "Due today";
      if (late === 1) return "1 day overdue";
      return late + " days overdue";
    }
    if (days <= 0) return "Today";
    if (days === 1) return "Tomorrow";
    return "In " + days + " days";
  }

  function needsWater(entry, nowMs) {
    nowMs = nowMs || Date.now();
    var task = entry.schedule && entry.schedule.watering;
    return !!(task && isOverdue(task, nowMs));
  }


  function cleanDelivery(d) {
    d = d || {};
    return {
      name: String(d.name || "").trim(),
      phone: String(d.phone || "").trim(),
      address: String(d.address || "").trim(),
      note: String(d.note || "").trim()
    };
  }

  function validateDelivery(raw) {
    var d = cleanDelivery(raw);
    if (d.name.length < 2 || d.name.length > 80) return "Please enter your name (2-80 characters).";
    if (!PHONE_RE.test(d.phone)) return "Please enter a valid phone number (6-20 digits, may include + ( ) - and spaces).";
    if (d.address.length < 10 || d.address.length > 300) return "Please enter your full delivery address (10-300 characters).";
    if (d.note.length > 300) return "Notes can be at most 300 characters.";
    return null;
  }

  function cleanNickname(value) {
    var s = String(value == null ? "" : value).trim().slice(0, NICKNAME_MAX);
    return s === "" ? null : s;
  }


  function waitForAuth() {
    return new Promise(function (resolve, reject) {
      var tries = 0;
      (function check() {
        if (window.__plantoraAuth) return resolve(window.__plantoraAuth);
        if (++tries > 100) return reject(fail("plantora/auth-unavailable", "Login system did not load. Please refresh the page."));
        setTimeout(check, 100);
      })();
    });
  }

  function getCurrentUser() {
    return waitForAuth().then(function (a) {
      return new Promise(function (resolve) {
        var done = false;
        var off = a.onAuthStateChanged(function (u) {
          if (done) return;
          done = true;
          if (typeof off === "function") off();
          resolve(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null);
        });
      });
    });
  }

  function requireUser() {
    return getCurrentUser().then(function (user) {
      if (!user) throw fail("plantora/unauthenticated", "Please log in to continue.");
      return user;
    });
  }


  function randomHex(bytes) {
    var buf = new Uint8Array(bytes);
    window.crypto.getRandomValues(buf);
    return Array.prototype.map.call(buf, function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  function attemptKey(uid, plantId) { return "plantora_attempt:" + uid + ":" + plantId; }

  function getAttemptId(uid, plantId) {
    var key = attemptKey(uid, plantId);
    try {
      var saved = sessionStorage.getItem(key);
      if (saved && TX_ID_RE.test(saved)) return saved;
      var fresh = "tx_" + randomHex(16);
      sessionStorage.setItem(key, fresh);
      return fresh;
    } catch (e) {
      return "tx_" + randomHex(16); // storage blocked, still works
    }
  }

  function clearAttemptId(uid, plantId) {
    try { sessionStorage.removeItem(attemptKey(uid, plantId)); } catch (e) { /* ignore */ }
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(fail("plantora/timeout", "The request timed out.")); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }


  function firebaseBackend() {
    if (!backendPromise) {
      backendPromise = waitForAuth() // auth.js has called initializeApp by now
        .then(function () { return Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-firestore.js")]); })
        .then(function (m) {
          var app = m[0];
          var fs = m[1];
          var db = fs.getFirestore(app.getApp());

          function plantRef(uid, id) { return fs.doc(db, "users", uid, "myPlants", id); }
          function orderRef(uid, id) { return fs.doc(db, "users", uid, "orders", id); }
          function invRef(plantId) { return fs.doc(db, "inventory", String(plantId)); }

          return {
            isAdmin: function (uid) {
              return fs.getDoc(fs.doc(db, "admins", uid))
                .then(function (snap) { return snap.exists(); })
                .catch(function () { return false; });
            },

            listInventory: function () {
              return fs.getDocs(fs.collection(db, "inventory")).then(function (snap) {
                var out = {};
                snap.docs.forEach(function (d) { out[Number(d.id)] = d.data(); });
                return out;
              });
            },
            setInventory: function (plantId, values, uid) {
              return fs.setDoc(invRef(plantId), Object.assign({
                plantId: Number(plantId),
                updatedAt: fs.serverTimestamp(),
                updatedBy: uid
              }, values));
            },

            getOrder: function (uid, id) {
              return fs.getDoc(orderRef(uid, id)).then(function (snap) {
                return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
              });
            },

            listMyPlants: function (uid) {
              var q = fs.query(fs.collection(db, "users", uid, "myPlants"), fs.orderBy("addedAt", "desc"));
              return fs.getDocs(q).then(function (snap) {
                return snap.docs.map(function (d) {
                  var data = d.data();
                  return {
                    id: d.id,
                    plantId: data.plantId,
                    plantName: data.plantName,
                    nickname: data.nickname == null ? null : data.nickname,
                    source: data.source,
                    orderId: data.orderId == null ? null : data.orderId,
                    addedAt: data.addedAt && data.addedAt.toMillis ? data.addedAt.toMillis() : null,
                    schedule: cloneSchedule(data.schedule)
                  };
                });
              });
            },
            removePlant: function (uid, id) {
              return fs.deleteDoc(plantRef(uid, id));
            },
            updatePlantFields: function (uid, id, fields) {
              return fs.updateDoc(plantRef(uid, id), fields);
            },
            placeOrder: function (uid, txId, delivery, plant) {
              var nowMs = Date.now();
              var ref = invRef(plant.id);
              return fs.runTransaction(db, function (tx) {
                return tx.get(ref).then(function (snap) {
                  if (!snap.exists()) {
                    throw fail("plantora/no-inventory",
                      "This plant has no inventory record yet, so it cannot be ordered.");
                  }
                  var inv = snap.data();
                  if (inv.active !== true) {
                    throw fail("plantora/unavailable", "This plant is not currently for sale.");
                  }
                  if (!(inv.stock >= 1)) {
                    throw fail("plantora/out-of-stock", "This plant is out of stock.");
                  }

                  tx.update(ref, { stock: fs.increment(-1), updatedAt: fs.serverTimestamp() });
                  tx.set(orderRef(uid, txId), {
                    uid: uid,
                    plantId: plant.id,
                    plantName: plant.name,
                    quantity: 1,
                    currency: "BDT",
                    priceBDT: inv.priceBDT,
                    isDemo: true,
                    paymentMethod: "demo",
                    status: "demo-placed",
                    delivery: delivery,
                    createdAt: fs.serverTimestamp()
                  });
                  tx.set(plantRef(uid, txId), {
                    uid: uid,
                    plantId: plant.id,
                    plantName: plant.name,
                    nickname: null,
                    source: "shop-demo",
                    orderId: txId,
                    addedAt: fs.serverTimestamp(),
                    schedule: buildSchedule(plant, nowMs)
                  });

                  return { priceBDT: inv.priceBDT };
                });
              });
            },

            // Add a plant to the user's collection without buying it
            addManual: function (uid, docId, plant) {
              return fs.setDoc(plantRef(uid, docId), {
                uid: uid,
                plantId: plant.id,
                plantName: plant.name,
                nickname: null,
                source: "manual",
                orderId: null,
                addedAt: fs.serverTimestamp(),
                schedule: buildSchedule(plant, Date.now())
              });
            }
          };
        })
        .catch(function (err) { backendPromise = null; throw err; });
    }
    return backendPromise;
  }

  // Functions the pages can use

  function loadCatalog() {
    var D = window.PlantoraData;
    if (!D) return Promise.reject(fail("plantora/setup", "plant-data.js must load before store.js."));
    return D.loadPlants();
  }

  function isAdmin() {
    return requireUser()
      .then(function (user) { return firebaseBackend().then(function (b) { return b.isAdmin(user.uid); }); });
  }

  // All stock and prices, keyed by plantId
  function getInventory() {
    return firebaseBackend().then(function (b) { return b.listInventory(); });
  }

  function setInventoryItem(plantId, values) {
    return requireUser().then(function (user) {
      return firebaseBackend().then(function (b) { return b.setInventory(plantId, values, user.uid); });
    });
  }

  function seedDemoInventory() {
    var D = window.PlantoraData;
    if (!D) return Promise.reject(fail("plantora/setup", "plant-data.js must load before store.js."));

    return Promise.all([loadCatalog(), requireUser(), getInventory()]).then(function (r) {
      var plants = r[0];
      var user = r[1];
      var existing = r[2];
      var pending = [];

      plants.forEach(function (plant) {
        if (existing[plant.id]) return;
        var seed = D.getDemoSeed(plant.id);
        pending.push(
          firebaseBackend().then(function (b) {
            return b.setInventory(plant.id, seed, user.uid);
          })
        );
      });

      if (!pending.length) return { created: 0, skipped: plants.length };
      return Promise.all(pending).then(function () {
        return { created: pending.length, skipped: plants.length - pending.length };
      });
    });
  }

  function summarize(txId, order, recovered) {
    return {
      txId: txId,
      orderId: txId, // checkout.html shows this to the user
      plantId: order.plantId,
      plantName: order.plantName,
      priceBDT: order.priceBDT,
      recovered: recovered
    };
  }

  function placeDemoOrder(input) {
    var delivery = cleanDelivery(input && input.delivery);
    var invalid = validateDelivery(delivery);
    if (invalid) return Promise.reject(fail("plantora/invalid-input", invalid));

    var plantId = Number(input && input.plantId);

    return Promise.all([loadCatalog(), requireUser()]).then(function (r) {
      var plant = r[0].filter(function (p) { return p.id === plantId; })[0];
      var user = r[1];
      if (!plant) throw fail("plantora/unknown-plant", "This plant is not available for purchase.");

      var txId = getAttemptId(user.uid, plantId);
      var key = user.uid + ":" + txId;
      if (inFlight[key]) return inFlight[key]; // stops double clicks

      function succeed(existing, recovered) {
        if (existing.uid !== user.uid || existing.plantId !== plant.id) {
          clearAttemptId(user.uid, plantId);
          throw fail("plantora/id-conflict", "A saved order did not match this purchase. Please try again.");
        }
        clearAttemptId(user.uid, plantId);
        return summarize(txId, existing, recovered);
      }

      var run = firebaseBackend().then(function (b) {
        return b.getOrder(user.uid, txId).then(function (existing) {
          if (existing) return succeed(existing, true); // this order was already saved

          return withTimeout(b.placeOrder(user.uid, txId, delivery, plant), WRITE_TIMEOUT_MS)
            .then(function () {
              // Read it again so we show the price the database charged
              return b.getOrder(user.uid, txId).then(function (saved) {
                return succeed(saved || { uid: user.uid, plantId: plant.id, plantName: plant.name, priceBDT: 0 }, false);
              });
            })
            .catch(function (writeErr) {
              if (writeErr && (writeErr.code === "plantora/id-conflict"
                || writeErr.code === "plantora/out-of-stock"
                || writeErr.code === "plantora/unavailable"
                || writeErr.code === "plantora/no-inventory")) {
                throw writeErr; // no retry, the error is real
              }
              // Check if the order was saved even though we got an error
              return b.getOrder(user.uid, txId).then(
                function (nowExisting) {
                  if (nowExisting) return succeed(nowExisting, true);
                  throw writeErr; // not saved, safe to use the same id again
                },
                function () {
                  throw fail("plantora/unconfirmed", "Could not confirm whether the order was saved.");
                }
              );
            });
        });
      });

      inFlight[key] = run;
      var clear = function () { delete inFlight[key]; };
      run.then(clear, clear);
      return run;
    });
  }

  function addPlantManually(plantId) {
    plantId = Number(plantId);
    return Promise.all([loadCatalog(), requireUser()]).then(function (r) {
      var plant = r[0].filter(function (p) { return p.id === plantId; })[0];
      var user = r[1];
      if (!plant) throw fail("plantora/unknown-plant", "That plant could not be found.");
      var docId = "tx_" + randomHex(16);
      return firebaseBackend().then(function (b) {
        return b.addManual(user.uid, docId, plant).then(function () {
          return { entryId: docId, plantId: plant.id, plantName: plant.name, source: "manual" };
        });
      });
    });
  }

  function listMyPlants() {
    return requireUser().then(function (user) {
      return firebaseBackend().then(function (b) { return b.listMyPlants(user.uid); });
    });
  }

  function removePlant(entryId) {
    return requireUser().then(function (user) {
      return firebaseBackend().then(function (b) { return b.removePlant(user.uid, entryId); });
    });
  }

  function renamePlant(entryId, nickname) {
    var clean = cleanNickname(nickname);
    return requireUser().then(function (user) {
      return firebaseBackend().then(function (b) {
        return b.updatePlantFields(user.uid, entryId, { nickname: clean });
      });
    }).then(function () { return clean; });
  }

  function setTaskInterval(entryId, taskKey, days) {
    if (TASK_KEYS.indexOf(taskKey) === -1) {
      return Promise.reject(fail("plantora/unknown-task", "Unknown care task."));
    }
    return listMyPlants().then(function (entries) {
      var entry = entries.filter(function (e) { return e.id === entryId; })[0];
      if (!entry) throw fail("plantora/unknown-plant", "That plant is no longer in your collection.");
      var schedule = scheduleWithInterval(entry.schedule, taskKey, days);
      return requireUser().then(function (user) {
        return firebaseBackend().then(function (b) {
          return b.updatePlantFields(user.uid, entryId, { schedule: schedule });
        });
      }).then(function () { return schedule; });
    });
  }

  function markTaskDone(entryId, taskKey) {
    if (TASK_KEYS.indexOf(taskKey) === -1) {
      return Promise.reject(fail("plantora/unknown-task", "Unknown care task."));
    }
    return listMyPlants().then(function (entries) {
      var entry = entries.filter(function (e) { return e.id === entryId; })[0];
      if (!entry) throw fail("plantora/unknown-plant", "That plant is no longer in your collection.");
      var schedule = scheduleWithDone(entry.schedule, taskKey, Date.now());
      return requireUser().then(function (user) {
        return firebaseBackend().then(function (b) {
          return b.updatePlantFields(user.uid, entryId, { schedule: schedule });
        });
      }).then(function () { return schedule; });
    });
  }

  window.PlantoraStore = {
    // helpers that work without the database
    TASK_KEYS: TASK_KEYS,
    TASK_META: TASK_META,
    DAY_MS: DAY_MS,
    defaultIntervalDays: defaultIntervalDays,
    buildSchedule: buildSchedule,
    getDueTasks: getDueTasks,
    getUpcomingTasks: getUpcomingTasks,
    describeDue: describeDue,
    needsWater: needsWater,

    getCurrentUser: getCurrentUser,
    isAdmin: isAdmin,

    validateDelivery: validateDelivery,
    cleanNickname: cleanNickname,

    // used by the admin page
    getInventory: getInventory,
    setInventoryItem: setInventoryItem,
    seedDemoInventory: seedDemoInventory,

    placeDemoOrder: placeDemoOrder,
    addPlantManually: addPlantManually,
    listMyPlants: listMyPlants,
    removePlant: removePlant,
    renamePlant: renamePlant,
    setTaskInterval: setTaskInterval,
    markTaskDone: markTaskDone,

    _setBackendForTests: function (b) { backendPromise = Promise.resolve(b); } // offline tests only
  };
})();