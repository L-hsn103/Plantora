// plant-data.js and store.js are already loaded by the time this runs
    window.addEventListener("DOMContentLoaded", function () {
      var $ = function (id) { return document.getElementById(id); };
      var D = window.PlantoraData, S = window.PlantoraStore;
      var plantId = Number(new URLSearchParams(window.location.search).get("id"));
      var busy = false;

      function show(id) {
        ["co-loading", "co-error", "co-form-wrap", "co-success"].forEach(function (x) { $(x).hidden = (x !== id); });
      }
      function showError(text) { $("co-error-text").textContent = text; show("co-error"); }
      function showMsg(text) { var m = $("co-msg"); m.textContent = text; m.hidden = false; }

      // turn the store error codes into something a user can read
      function friendly(err) {
        switch (err && err.code) {
          case "plantora/timeout":
          case "plantora/unconfirmed":
          case "unavailable":
            return "We couldn't confirm whether your demo order was saved (network problem). Press the button again to check. This will not create a duplicate order.";
          case "permission-denied":
            return "The database refused this request. Developers: check that Firestore is created and firestore.rules is published.";
          case "plantora/out-of-stock":
          case "plantora/unavailable":
          case "plantora/no-inventory":
          case "plantora/unknown-plant":
            return err.message;
          case "plantora/unauthenticated":
            return "Please log in again to place an order.";
          case "plantora/invalid-input":
          case "plantora/id-conflict":
          case "plantora/auth-unavailable":
            return err.message;
          default:
            return "Something went wrong. Please try again.";
        }
      }

      // both scripts have to be there before we can go on
      if (!D || !S) { showError("Checkout could not start: a required script did not load."); return; }

      var invRead = S.getInventory().then(
        function (inv) { return { inv: inv, readable: true }; },
        function (err) {
          console.warn("[Plantora Checkout] inventory unreadable, showing preview:", err);
          return { inv: {}, readable: false };
        }
      );

      Promise.all([D.loadPlants(), invRead]).then(function (r) {
        var plant = D.getPlantById(plantId);
        var item = plant ? r[1].inv[plant.id] : null;
        if (!plant) { showError("That plant is not available for purchase."); return; }

        // no inventory record, so show the demo price
        var preview = false;
        if (!item) {
          item = D.getDemoSeed(plant.id);
          preview = true;
          if (item.active !== true) { showError("This plant is not currently for sale."); return; }
        }

        var img = $("co-image");
        img.src = plant.image; img.alt = plant.name;
        $("co-name").textContent = plant.name;
        $("co-sci").textContent = plant.scientificName;
        $("co-price").textContent = D.formatBDT(item.priceBDT);

        if (preview) {
          var warn = document.getElementById("co-preview");
          warn.textContent = r[1].readable
            ? "Preview mode: no inventory has been set up, so this demo price comes from plant-data.js. Placing an order will not work yet."
            : "Preview mode: the inventory database could not be reached, so this demo price comes from plant-data.js. Placing an order will not work yet.";
          warn.hidden = false;
        }

        var stock = $("co-stock");
        if (!(item.stock >= 1)) {
          stock.className = "co-stock co-stock--out";
          stock.textContent = "Out of stock";
          $("co-submit").disabled = true;
        } else if (item.stock <= 5) {
          stock.className = "co-stock co-stock--low";
          stock.textContent = "Only " + item.stock + " left in stock";
        } else {
          stock.textContent = item.stock + " in stock";
        }

        show("co-form-wrap");
      }).catch(function (err) {
        console.error("[Plantora Checkout]", err);
        showError("We couldn't load the plant data. Check your connection and refresh.");
      });

      // place the demo order, then send them to the success panel
      $("co-form").addEventListener("submit", function (e) {
        e.preventDefault();
        if (busy) return; // ignore double clicks
        $("co-msg").hidden = true;

        var delivery = {
          name: $("co-fullname").value, phone: $("co-phone").value,
          address: $("co-address").value, note: $("co-note").value
        };
        var problem = S.validateDelivery(delivery);
        if (problem) { showMsg(problem); return; }
        if (!$("co-demo-ok").checked) { showMsg("Please tick the box to confirm you understand this is a demo order."); return; }

        var btn = $("co-submit");
        busy = true; btn.disabled = true; btn.textContent = "Placing demo order…";

        S.placeDemoOrder({ plantId: plantId, delivery: delivery }).then(function (result) {
          $("co-success-text").textContent = result.recovered
            ? result.plantName + " was already saved from your earlier attempt. Nothing was charged and no duplicate was created."
            : result.plantName + " was saved to your demo orders and My Plants. Nothing was charged.";
          $("co-order-id").textContent = result.orderId;
          show("co-success");
        }).catch(function (err) {
          console.error("[Plantora Checkout]", err);
          showMsg(friendly(err));
          busy = false; btn.disabled = false; btn.textContent = "Place demo order";
        });
      });
    });