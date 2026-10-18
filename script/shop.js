(function () {
  "use strict";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // true only if every id given is on the page
  function has() {
    for (var i = 0; i < arguments.length; i++) {
      if (!document.getElementById(arguments[i])) return false;
    }
    return true;
  }

  // give a reason back if a script we need did not load
  function deps() {
    return window.PlantoraData && window.PlantoraStore ? null : "a required script did not load";
  }


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

  function renderState(host, kind, icon, title, text, cta) {
    clear(host);
    host.appendChild(buildEmptyState(kind, icon, title, text, cta));
  }


  // plant image, or a fallback if the file is missing
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

  function entryTitle(entry) {
    return entry.nickname || entry.plantName || "Unnamed plant";
  }

  function statusPill(entry) {
    var thirsty = window.PlantoraStore.needsWater(entry);
    return el("span", "status-pill " + (thirsty ? "status-pill--needs-water" : "status-pill--healthy"),
      thirsty ? "Needs Water" : "Healthy");
  }

  // Show a message when the plants could not be loaded
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

        clear(plantsHost);
        if (!entries.length) {
          var empty = buildEmptyState("empty", "\uD83E\uDDB8",
            "No plants in your collection yet",
            "Plants you add yourself from Explore Plants will show up here with their own care schedule.",
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
            var header = el("div", "mini-plant-card__header");
            header.appendChild(el("h3", null, entryTitle(entry)));
            header.appendChild(statusPill(entry));
            info.appendChild(header);

            var water = entry.schedule && entry.schedule.watering;
            if (water) {
              info.appendChild(el("p", "mini-plant-card__meta",
                "Next watering: " + window.PlantoraStore.describeDue({ nextDue: water.nextDue })));
            }
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


  var ROOMS = ["Living Room", "Bedroom", "Office", "Kitchen", "Balcony"];

  // derived from the watering schedule: 100% right after watering, 0% when due
  function hydrationPct(task) {
    if (!task || !(task.nextDue > 0) || !(task.intervalDays > 0)) return null;
    var span = task.intervalDays * window.PlantoraStore.DAY_MS;
    var pct = Math.round((task.nextDue - Date.now()) / span * 100);
    return Math.max(0, Math.min(100, pct));
  }

  // "4 days" / "Today" / "OVERDUE"
  function dueLabel(task) {
    if (!task || !(task.nextDue > 0)) return null;
    var now = Date.now();
    if (task.nextDue <= now) return { text: "OVERDUE", overdue: true };
    var start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (task.nextDue < start.getTime() + window.PlantoraStore.DAY_MS) return { text: "Today", overdue: false };
    var due = new Date(task.nextDue);
    due.setHours(0, 0, 0, 0);
    var days = Math.round((due.getTime() - start.getTime()) / window.PlantoraStore.DAY_MS);
    return { text: days + (days === 1 ? " day" : " days"), overdue: false };
  }

  // "12d ago" / "Today"
  function lastWateredLabel(task) {
    if (!task || !(task.lastDone > 0)) return null;
    var days = Math.floor((Date.now() - task.lastDone) / window.PlantoraStore.DAY_MS);
    return days <= 0 ? "Today" : days + "d ago";
  }

  function showCardError(card, message) {
    var error = card.querySelector(".plant-card__error");
    if (!error) return;
    error.textContent = message || "";
    error.hidden = !message;
  }

  // icon stacked above its label, like the reference cards
  function detailChip(icon, label) {
    var chip = el("span", "plant-card__detail");
    chip.appendChild(el("span", "plant-card__detail-icon", icon));
    chip.appendChild(el("span", null, label));
    return chip;
  }

  // one of the user's own plants: image, hydration, care info, water button
  function buildMyPlantCard(entry) {
    var S = window.PlantoraStore;
    var plant = window.PlantoraData.getPlantById(entry.plantId);
    var water = entry.schedule && entry.schedule.watering;

    var card = el("article", "plant-card");

    var media = el("div", "plant-card__media");
    media.appendChild(plantThumb(plant, "my-plant__image"));

    var badge = el("button", "plant-card__location", entry.location || "Set location");
    badge.type = "button";
    if (!entry.location) badge.classList.add("plant-card__location--empty");
    badge.setAttribute("aria-label", "Location: " + (entry.location || "not set") + ". Click to change.");
    badge.addEventListener("click", function () {
      if (badge.disabled) return;
      var next = ROOMS[(ROOMS.indexOf(entry.location) + 1) % ROOMS.length];
      badge.disabled = true;
      S.setLocation(entry.id, next)
        .then(function () {
          entry.location = next;
          badge.textContent = next;
          badge.classList.remove("plant-card__location--empty");
          badge.disabled = false;
          showCardError(card, ""); // clear an earlier failure
        })
        .catch(function (err) {
          console.error("[Plantora My Plants]", err);
          badge.disabled = false;
          showCardError(card, "Could not save the location. Please try again.");
        });
    });
    media.appendChild(badge);
    card.appendChild(media);

    var body = el("div", "plant-card__body");
    body.appendChild(el("h3", "plant-card__name", entryTitle(entry)));
    if (plant) body.appendChild(el("p", "my-plant__sci", plant.scientificName));

    var pct = hydrationPct(water);
    if (pct !== null) {
      var hydration = el("div", "hydration" + (pct < 30 ? " hydration--low" : ""));
      hydration.title = "Estimated from the watering schedule";
      var top = el("div", "hydration__top");
      top.appendChild(el("span", "hydration__label", "HYDRATION"));
      top.appendChild(el("span", "hydration__value", pct + "%"));
      hydration.appendChild(top);
      var track = el("div", "hydration__bar");
      var fill = el("div", "hydration__fill");
      fill.style.width = pct + "%";
      track.appendChild(fill);
      hydration.appendChild(track);
      body.appendChild(hydration);
    }

    var details = el("div", "plant-card__details");
    if (plant && plant.light) {
      details.appendChild(detailChip("\u2600\uFE0F", plant.light));
    }
    var due = dueLabel(water);
    if (due) {
      var dueChip = detailChip(due.overdue ? "\u26A0\uFE0F" : "\uD83D\uDCC5", due.text);
      if (due.overdue) dueChip.classList.add("plant-card__detail--overdue");
      details.appendChild(dueChip);
    }
    var last = lastWateredLabel(water);
    if (last) details.appendChild(detailChip("\u23F0", last));

    var error = el("p", "plant-card__error");
    error.hidden = true;
    body.appendChild(error);

    var footer = el("div", "plant-card__footer");
    footer.appendChild(details);

    var waterBtn = el("button", "water-btn");
    waterBtn.type = "button";
    waterBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.7c.6.9 5 7.1 5 11a5 5 0 0 1-10 0c0-3.9 4.4-10.1 5-11z"/></svg>';
    waterBtn.title = "Mark as watered";
    waterBtn.setAttribute("aria-label", "Mark " + entryTitle(entry) + " as watered");
    if (due && due.overdue) waterBtn.classList.add("water-btn--due");
    waterBtn.addEventListener("click", function () {
      if (waterBtn.disabled) return;
      waterBtn.disabled = true;
      waterBtn.classList.add("is-saving");
      S.markTaskDone(entry.id, "watering")
        .then(function (schedule) {
          entry.schedule = schedule;
          if (card.parentNode) card.parentNode.replaceChild(buildMyPlantCard(entry), card);
        })
        .catch(function (err) {
          console.error("[Plantora My Plants]", err);
          waterBtn.disabled = false;
          waterBtn.classList.remove("is-saving");
          showCardError(card, "Could not save the watering. Please try again.");
        });
    });
    footer.appendChild(waterBtn);
    body.appendChild(footer);

    // the whole card opens the details page; buttons inside keep their own actions
    var detailsUrl = "plant-details.html?id=" + encodeURIComponent(entry.plantId);
    card.tabIndex = 0;
    card.setAttribute("aria-label", "View details for " + entryTitle(entry));
    card.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) return;
      window.location.href = detailsUrl;
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target === card) window.location.href = detailsUrl;
    });

    card.appendChild(body);
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
            "Add one you already own from Explore Plants, and it will show up here with its own watering and feeding schedule.",
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
  // each one checks for its own element first
  initDashboard();
  initMyPlants();
})();