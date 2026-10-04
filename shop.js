
(function () {
  "use strict";

  var LOW_STOCK_AT = 5;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function has() {
    for (var i = 0; i < arguments.length; i++) {
      if (!document.getElementById(arguments[i])) return false;
    }
    return true;
  }

  function deps() {
    return window.PlantoraData && window.PlantoraStore ? null : "a required script did not load";
  }

  // kind: "empty" | "error" | "loading"
  function buildEmptyState(kind, icon, title, text, cta) {
    var box = el("div", "empty-state" + (kind === "error" ? " empty-state--error" : ""));
    box.setAttribute("role", kind === "error" ? "alert" : "status");
    box.appendChild(el("div", "empty-state__icon", icon));
    box.appendChild(el("h3", "empty-state__title", title));
    box.appendChild(el("p", "empty-state__text", text));
    if (cta) {
      var actions = el("div", "empty-state__actions");
      var link = el("a", "btn btn--primary", cta.label);
      link.href = cta.href;
      actions.appendChild(link);
      box.appendChild(actions);
    }
    return box;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // Replaces the contents of `host` with a single state box.

  function renderState(host, kind, icon, title, text, cta) {
    clear(host);
    host.appendChild(buildEmptyState(kind, icon, title, text, cta));
  }

  // ---------- shared plant pieces ----------

  function plantThumb(plant, className) {
    var box = el("span", className);
    if (!plant) {
      box.textContent = "\uD83C\uDF31";
      box.setAttribute("role", "img");
      box.setAttribute("aria-label", "Plant image unavailable");
      return box;
    }
    var img = el("img");
    img.src = plant.image;
    img.alt = plant.name;
    img.loading = "lazy";
    img.addEventListener("error", function () {
      var fallback = el("span", "thumb-fallback", "\uD83E\uDEB4");
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", plant.name + " (image unavailable)");
      if (img.parentNode) img.parentNode.replaceChild(fallback, img);
    });
    box.appendChild(img);
    return box;
  }

  // A card always prefers the user's own name for their plant.
  function entryTitle(entry) {
    return entry.nickname || entry.plantName || "Unnamed plant";
  }

  function statusPill(entry) {
    var thirsty = window.PlantoraStore.needsWater(entry);
    return el("span", "status-pill " + (thirsty ? "status-pill--needs-water" : "status-pill--healthy"),
      thirsty ? "Needs Water" : "Healthy");
  }

  function sourceBadge(entry) {
    return el("span", "source-badge " + (entry.source === "shop-demo" ? "source-badge--purchase" : "source-badge--manual"),
      entry.source === "shop-demo" ? "Purchased" : "Added by you");
  }

  function formatAdded(ms) {
    if (!ms) return "unknown date";
    try {
      return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "unknown date";
    }
  }

  // Explains a rejected listMyPlants() without pretending it worked.
  function renderListError(host, err, retryCta) {
    var offline = err && err.code === "plantora/unauthenticated";
    renderState(host, "error",
      offline ? "\uD83D\uDD11" : "\u26A0\uFE0F",
      offline ? "Please log in again" : "Can't reach the database right now",
      offline
        ? "Your session has expired. Log in again to see your plants."
        : "Your plants couldn't be loaded. If you are setting this up for the first time, check that the Firestore database exists, that firestore.rules has been published, and that you are signed in.",
      retryCta);
  }


  var SAMPLE_PLANT_IDS = [1, 3, 5]; // Snake Plant, Money Plant, Peace Lily

  function buildSampleSeeder() {
    var wrap = el("div", "sample-seeder");
    var btn = el("button", "btn btn--secondary", "Load 3 sample plants");
    btn.type = "button";
    var status = el("p", "sample-seeder__status");

    btn.addEventListener("click", function () {
      btn.disabled = true;
      btn.textContent = "Adding\u2026";
      status.textContent = "";

      SAMPLE_PLANT_IDS.reduce(function (chain, id) {
        return chain.then(function () { return window.PlantoraStore.addPlantManually(id); });
      }, Promise.resolve())
        .then(function () { window.location.reload(); })
        .catch(function (err) {
          console.error("[Plantora] sample seed failed:", err);
          btn.disabled = false;
          btn.textContent = "Load 3 sample plants";
          status.textContent = "Could not add the sample plants: " + (err && err.message ? err.message : "unknown error");
        });
    });

    wrap.appendChild(btn);
    wrap.appendChild(status);
    return wrap;
  }

  /* 1. SHOP GRID (shop.html) */

  function buildShopCard(plant, item) {
    var D = window.PlantoraData;
    var soldOut = !(item.stock >= 1);
    var low = !soldOut && item.stock <= LOW_STOCK_AT;

    var card = el("article", "plant-card");
    card.appendChild(buildImage(plant));

    var body = el("div", "plant-card__content");
    body.appendChild(el("h3", "plant-card__title", plant.name));
    body.appendChild(el("p", "plant-card__scientific", plant.scientificName));

    var priceRow = el("p", "shop-price");
    priceRow.appendChild(el("strong", null, D.formatBDT(item.priceBDT)));
    body.appendChild(priceRow);

    var stockLine = el("p", "shop-stock");
    if (soldOut) {
      stockLine.className = "shop-stock shop-stock--out";
      stockLine.textContent = "Out of stock";
    } else if (low) {
      stockLine.className = "shop-stock shop-stock--low";
      stockLine.textContent = "Only " + item.stock + " left";
    } else {
      stockLine.className = "shop-stock";
      stockLine.textContent = "In stock";
    }
    body.appendChild(stockLine);

    var actions = el("div", "shop-actions");
    var buy = el("button", "btn btn--primary", soldOut ? "Sold out" : "Buy");
    buy.type = "button";
    if (soldOut) {
      buy.disabled = true;
      buy.setAttribute("aria-disabled", "true");
    } else {
      buy.setAttribute("data-buy-plant", String(plant.id));
    }
    var details = el("a", "btn btn--secondary", "View Details");
    details.href = "plant-details.html?id=" + encodeURIComponent(plant.id);
    actions.appendChild(buy);
    actions.appendChild(details);
    body.appendChild(actions);

    card.appendChild(body);
    return card;
  }

  // One delegated listener covers every Buy button, including cards
  // added later, so the grid does not need per-button wiring.
  function initBuyButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-buy-plant]");
      if (!btn) return;
      e.preventDefault();
      window.location.href = "checkout.html?id=" + encodeURIComponent(btn.getAttribute("data-buy-plant"));
    });
  }

  function buildShopNotice(live, readable) {
    var box = el("div", "shop-notice");
    box.setAttribute("role", "status");

    if (live) {
      box.className = "shop-notice shop-notice--live";
      box.textContent = "Live inventory: prices and stock come from the admin database.";
      return box;
    }

    box.className = "shop-notice shop-notice--preview";
    box.appendChild(el("strong", null, "Preview mode \u2014 demo stock and prices."));
    box.appendChild(document.createTextNode(
      readable
        ? " No inventory has been set up yet, so these numbers come from the demo seed in plant-data.js. Checkout will explain that ordering is not possible yet."
        : " The inventory database could not be reached, so these numbers come from the demo seed in plant-data.js and Checkout will not complete."
    ));
    return box;
  }

  function initShop() {
    var grid = document.getElementById("shop-grid");
    if (!grid) return;

    var notice = document.getElementById("shop-notice");
    var missing = deps();
    if (missing) {
      grid.parentNode.appendChild(buildEmptyState("error", "\u26A0\uFE0F", "Shop unavailable",
        "Shop could not start: " + missing + "."));
      return;
    }

    initBuyButtons();
    grid.parentNode.appendChild(buildEmptyState("loading", "\uD83C\uDF31",
      "Loading plants\u2026", "Fetching the catalog."));


  var INVENTORY_TIMEOUT_MS = 2500;
  var read = window.PlantoraStore.getInventory().then(
    function (inv) { return { inv: inv, readable: true }; },
    function (err) {
      console.warn("[Plantora Shop] inventory unreadable, showing preview:", err);
      return { inv: {}, readable: false };
    }
  );

  read = new Promise(function (resolve) {
    var settled = false;
    var done = function (value) {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    read.then(done);
    setTimeout(function () {
      done({ inv: {}, readable: false });
    }, INVENTORY_TIMEOUT_MS);
  });

    Promise.all([window.PlantoraData.loadPlants(), read])
      .then(function (r) {
        var plants = r[0];
        var inventory = r[1].inv;
        var readable = r[1].readable;
        var live = Object.keys(inventory).length > 0;

        // Live data wins per plant; anything the admin has not set up
        // still falls back to the seed so the grid is not half empty.
        var sellable = plants.filter(function (p) {
          if (live) {
            var item = inventory[p.id];
            return item && item.active === true;
          }
          return window.PlantoraData.getDemoSeed(p.id).active === true;
        });

        clear(grid);
        if (notice) {
          clear(notice);
          notice.appendChild(buildShopNotice(live, readable));
        }
        sellable.forEach(function (p) {
          grid.appendChild(buildShopCard(p, live ? inventory[p.id] : window.PlantoraData.getDemoSeed(p.id)));
        });

        if (!sellable.length) {
          grid.parentNode.appendChild(buildEmptyState("empty", "\uD83E\uDDB8",
            "No plants are listed",
            "An admin has not put any plants up for sale yet."));
        }
      })
      .catch(function (err) {
        console.error("[Plantora Shop]", err);
        clear(grid);
        grid.parentNode.appendChild(buildEmptyState("error", "\u26A0\uFE0F", "Can't load the shop",
          "Check your connection (and that the site is served over http/https), then refresh."));
      });
  }

  function buildImage(plant) {
    var img = el("img", "plant-card__image");
    img.alt = plant.name;
    img.loading = "lazy";
    img.src = plant.image;
    img.addEventListener("error", function () {
      var fallback = el("div", "shop-image-fallback", "\uD83E\uDEB4");
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", plant.name + " (image unavailable)");
      if (img.parentNode) img.parentNode.replaceChild(fallback, img);
    });
    return img;
  }

  /* 2. DASHBOARD (dashboard.html)*/

  function initDashboard() {
    var plantsHost = document.getElementById("dash-plants");
    if (!plantsHost) return;

    var careHost = document.getElementById("upcoming-care");
    var missing = deps();
    if (missing) {
      renderState(plantsHost, "error", "\u26A0\uFE0F", "Can't load your plants", "Dashboard could not start: " + missing + ".");
      return;
    }

    renderState(plantsHost, "loading", "\uD83C\uDF31", "Loading your plants\u2026", "Checking your collection.");
    if (careHost) {
      renderState(careHost, "loading", "\uD83C\uDF19", "Loading care tasks\u2026", "Working out what is due.");
    }

    Promise.all([window.PlantoraData.loadPlants(), window.PlantoraStore.listMyPlants()])
      .then(function (r) {
        var catalog = r[0];
        var entries = r[1];

        // --- My Plants summary ---
        clear(plantsHost);
        if (!entries.length) {
          var empty = buildEmptyState("empty", "\uD83E\uDDB8",
            "No plants in your collection yet",
            "Plants you buy from the shop, or add yourself from Explore Plants, will show up here with their care schedule.",
            { label: "Explore Plants", href: "explore.html" });
          empty.appendChild(buildSampleSeeder());
          plantsHost.appendChild(empty);
        } else {
          var grid = el("div", "mini-plant-grid");
          entries.slice(0, 6).forEach(function (entry) {
            var plant = window.PlantoraData.getPlantById(entry.plantId);
            var card = el("div", "mini-plant-card");
            card.appendChild(plantThumb(plant, "mini-plant-card__image"));

            var info = el("div", "mini-plant-card__info");
            info.appendChild(el("h3", null, entryTitle(entry)));
            info.appendChild(statusPill(entry));
            card.appendChild(info);
            grid.appendChild(card);
          });
          plantsHost.appendChild(grid);

          if (entries.length > 6) {
            plantsHost.appendChild(el("p", "section-note",
              "Showing 6 of " + entries.length + " plants."));
          }
        }

        var badge = document.getElementById("dash-plant-count");
        if (badge) {
          badge.textContent = entries.length === 1 ? "1 plant" : entries.length + " plants";
        }

        // --- Upcoming Care ---
        if (careHost) {
          clear(careHost);
          var tasks = window.PlantoraStore.getUpcomingTasks(entries, 7);
          if (!tasks.length) {
            careHost.appendChild(buildEmptyState("empty", "\u2705",
              "Nothing due in the next 7 days",
              entries.length
                ? "Care tasks appear here a week before they are due. Tick one off on My Plants to reschedule it."
                : "Add a plant first and its watering, feeding and repotting schedule will appear here."));
          } else {
            var list = el("ul", "care-list");
            tasks.slice(0, 8).forEach(function (task) {
              var li = el("li", "care-list__item");
              li.appendChild(el("span", "care-list__plant", entryTitle({
                nickname: task.nickname, plantName: task.plantName
              })));
              li.appendChild(el("span", "care-list__task", task.icon + " " + task.label));
              li.appendChild(el("span", "care-list__when" + (task.overdueDays > 0 ? " care-list__when--today" : ""),
                window.PlantoraStore.describeDue(task)));
              list.appendChild(li);
            });
            careHost.appendChild(list);
          }
        }
      })
      .catch(function (err) {
        console.error("[Plantora Dashboard]", err);
        renderListError(plantsHost, err, { label: "Retry", href: "dashboard.html" });
        if (careHost) {
          renderState(careHost, "error", "\u26A0\uFE0F", "Can't load care tasks",
            "These are worked out from your plants, so they need the database too.");
        }
      });
  }

  /* 3. MY PLANTS (my-plants.html)*/

  function buildMyPlantCard(entry) {
    var S = window.PlantoraStore;
    var plant = window.PlantoraData.getPlantById(entry.plantId);

    var card = el("article", "plant-card");
    card.appendChild(plantThumb(plant, "my-plant__image"));

    var header = el("div", "plant-card__header");
    header.appendChild(el("h3", null, entryTitle(entry)));
    header.appendChild(statusPill(entry));
    card.appendChild(header);

    if (plant) card.appendChild(el("p", "my-plant__sci", plant.scientificName));
    card.appendChild(sourceBadge(entry));

    var meta = el("ul", "plant-card__meta");

    var water = entry.schedule && entry.schedule.watering;
    if (water) {
      meta.appendChild(el("li", null,
        "Next watering: " + S.describeDue({ nextDue: water.nextDue })));
    }
    S.TASK_KEYS.forEach(function (key) {
      var task = entry.schedule && entry.schedule[key];
      if (!task || key === "watering") return;
      meta.appendChild(el("li", null,
        S.TASK_META[key].label + ": " + S.describeDue({ nextDue: task.nextDue })));
    });
    meta.appendChild(el("li", null, "Added: " + formatAdded(entry.addedAt)));
    card.appendChild(meta);

    var link = el("a", "btn btn--secondary", "View Details");
    link.href = "plant-details.html?id=" + encodeURIComponent(entry.plantId);
    card.appendChild(link);

    return card;
  }

  function initMyPlants() {
    var host = document.getElementById("my-plants-grid");
    if (!host) return;

    var missing = deps();
    if (missing) {
      renderState(host, "error", "\u26A0\uFE0F", "Can't load your plants", "My Plants could not start: " + missing + ".");
      return;
    }

    renderState(host, "loading", "\uD83C\uDF31", "Loading your plants\u2026", "Checking your collection.");

    Promise.all([window.PlantoraData.loadPlants(), window.PlantoraStore.listMyPlants()])
      .then(function (r) {
        var entries = r[1];
        clear(host);

        if (!entries.length) {
          var emptyBox = buildEmptyState("empty", "\uD83E\uDDB8",
            "No plants in your collection yet",
            "Buy a plant from the shop, or add one you already own from Explore Plants, and it will show up here with its own watering and feeding schedule.",
            { label: "Explore Plants", href: "explore.html" });
          emptyBox.appendChild(buildSampleSeeder());
          clear(host);
          host.appendChild(emptyBox);
          return;
        }

        var grid = el("div", "plant-grid");
        entries.forEach(function (entry) { grid.appendChild(buildMyPlantCard(entry)); });
        host.appendChild(grid);
      })
      .catch(function (err) {
        console.error("[Plantora My Plants]", err);
        renderListError(host, err, { label: "Retry", href: "my-plants.html" });
      });
  }

  /* BOOT - each init is a no-op on pages it does not belong to */
  initShop();
  initDashboard();
  initMyPlants();
})();