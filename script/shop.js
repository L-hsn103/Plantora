
(function () {
  "use strict";

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
    return window.PlantoraData && window.PlantoraStore
      ? null
      : "a required script did not load";
  }

  var careHost;

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

      if (img.parentNode) {
        img.parentNode.replaceChild(fallback, img);
      }
    });

    box.appendChild(img);
    return box;
  }

  function entryTitle(entry) {
    return entry.nickname || entry.plantName || "Unnamed plant";
  }

  function statusPill(entry) {
    var thirsty = window.PlantoraStore.needsWater(entry);

    return el(
      "span",
      "status-pill " + (thirsty ? "status-pill--needs-water" : "status-pill--healthy"),
      thirsty ? "Needs Water" : "Healthy"
    );
  }

  function renderListError(host, err, retryCta) {
    var offline = err && err.code === "plantora/unauthenticated";

    renderState(
      host,
      "error",
      offline ? "\uD83D\uDD11" : "\u26A0\uFE0F",
      offline ? "Please log in again" : "Can't reach the database right now",
      offline
        ? "Your session has expired. Log in again to see your plants."
        : "Your plants couldn't be loaded. If you are setting this up for the first time, check that the Firestore database exists, that firestore.rules has been published, and that you are signed in.",
      retryCta
    );
  }

  var SAMPLE_PLANT_IDS = [1, 3, 5];

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
        return chain.then(function () {
          return window.PlantoraStore.addPlantManually(id);
        });
      }, Promise.resolve())
        .then(function () {
          window.location.reload();
        })
        .catch(function (err) {
          console.error("[Plantora] sample seed failed:", err);
          btn.disabled = false;
          btn.textContent = "Load 3 sample plants";
          status.textContent =
            "Could not add the sample plants: " +
            (err && err.message ? err.message : "unknown error");
        });
    });

    wrap.appendChild(btn);
    wrap.appendChild(status);
    return wrap;
  }

  function initDashboard() {
    var plantsHost = document.getElementById("dash-plants");
    careHost = document.getElementById("upcoming-care");
    var missing = deps();

    if (missing) {
      if (plantsHost) {
        renderState(
          plantsHost, "error", "\u26A0\uFE0F",
          "Can't load your plants",
          "Dashboard could not start: " + missing + "."
        );
      }

      if (careHost) {
        renderState(
          careHost, "error", "\u26A0\uFE0F",
          "Can't load care tasks",
          "Dashboard could not start: " + missing + "."
        );
      }

      return;
    }

    if (plantsHost) {
      renderState(
        plantsHost, "loading", "\uD83C\uDF31",
        "Loading your plants\u2026", "Checking your collection."
      );
    }

    if (careHost) {
      renderState(
        careHost, "loading", "\uD83C\uDF19",
        "Loading care tasks\u2026", "Working out what is due."
      );
    }

    Promise.all([
      window.PlantoraData.loadPlants(),
      window.PlantoraStore.listMyPlants()
    ])
      .then(function (r) {
        var entries = r[1];

        if (plantsHost) {
          clear(plantsHost);

          if (!entries.length) {
            var empty = buildEmptyState(
              "empty", "\uD83E\uDDB8",
              "No plants in your collection yet",
              "Plants you add yourself from Explore Plants will show up here with their own care schedule.",
              { label: "Explore Plants", href: "explore.html" }
            );

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
                info.appendChild(el(
                  "p",
                  "mini-plant-card__meta",
                  "Next watering: " +
                    window.PlantoraStore.describeDue({ nextDue: water.nextDue })
                ));
              }

              card.appendChild(info);
              grid.appendChild(card);
            });

            plantsHost.appendChild(grid);

            if (entries.length > 6) {
              plantsHost.appendChild(el(
                "p",
                "section-note",
                "Showing 6 of " + entries.length + " plants."
              ));
            }
          }
        }

        var badge = document.getElementById("dash-plant-count");

        if (badge) {
          badge.textContent =
            entries.length === 1 ? "1 plant" : entries.length + " plants";
        }

        var careLimit = plantsHost ? 3 : null;

        if (careHost) {
          clear(careHost);
          renderCare(entries, careLimit);
        }
      })
      .catch(function (err) {
        console.error("[Plantora Dashboard]", err);

        if (plantsHost) {
          renderListError(
            plantsHost, err,
            { label: "Retry", href: "dashboard.html" }
          );
        }

        if (careHost) {
          renderState(
            careHost, "error", "\u26A0\uFE0F",
            "Can't load care tasks",
            "These are worked out from your plants, so they need the database too."
          );
        }
      });
  }

  var ROOMS = [
    "Living Room", "Bedroom", "Office", "Kitchen", "Balcony"
  ];

  function hydrationPct(task) {
    if (!task || !(task.nextDue > 0) || !(task.intervalDays > 0)) {
      return null;
    }

    var span = task.intervalDays * window.PlantoraStore.DAY_MS;
    var pct = Math.round((task.nextDue - Date.now()) / span * 100);

    return Math.max(0, Math.min(100, pct));
  }

  function dueLabel(task) {
    if (!task || !(task.nextDue > 0)) return null;

    var now = Date.now();

    if (task.nextDue <= now) {
      return { text: "OVERDUE", overdue: true };
    }

    var start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (task.nextDue < start.getTime() + window.PlantoraStore.DAY_MS) {
      return { text: "Today", overdue: false };
    }

    var due = new Date(task.nextDue);
    due.setHours(0, 0, 0, 0);

    var days = Math.round(
      (due.getTime() - start.getTime()) / window.PlantoraStore.DAY_MS
    );

    return {
      text: days + (days === 1 ? " day" : " days"),
      overdue: false
    };
  }

  function lastWateredLabel(task) {
    if (!task || !(task.lastDone > 0)) return null;

    var days = Math.floor(
      (Date.now() - task.lastDone) / window.PlantoraStore.DAY_MS
    );

    return days <= 0 ? "Today" : days + "d ago";
  }

  function showCardError(card, message) {
    var error = card.querySelector(".plant-card__error");
    if (!error) return;

    error.textContent = message || "";
    error.hidden = !message;
  }

  function detailChip(icon, label) {
    var chip = el("span", "plant-card__detail");
    chip.appendChild(el("span", "plant-card__detail-icon", icon));
    chip.appendChild(el("span", null, label));
    return chip;
  }

  function buildMyPlantCard(entry) {
    var S = window.PlantoraStore;
    var plant = window.PlantoraData.getPlantById(entry.plantId);
    var water = entry.schedule && entry.schedule.watering;

    var card = el("article", "plant-card");
    var media = el("div", "plant-card__media");

    media.appendChild(plantThumb(plant, "my-plant__image"));

    var badge = el(
      "button", "plant-card__location",
      entry.location || "Set location"
    );

    badge.type = "button";

    if (!entry.location) {
      badge.classList.add("plant-card__location--empty");
    }

    badge.setAttribute(
      "aria-label",
      "Location: " + (entry.location || "not set") + ". Click to change."
    );

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
          showCardError(card, "");
        })
        .catch(function (err) {
          console.error("[Plantora My Plants]", err);
          badge.disabled = false;
          showCardError(
            card, "Could not save the location. Please try again."
          );
        });
    });

    media.appendChild(badge);
    card.appendChild(media);

    var body = el("div", "plant-card__body");
    body.appendChild(el("h3", "plant-card__name", entryTitle(entry)));

    if (plant) {
      body.appendChild(el("p", "my-plant__sci", plant.scientificName));
    }

    var pct = hydrationPct(water);

    if (pct !== null) {
      var hydration = el(
        "div", "hydration" + (pct < 30 ? " hydration--low" : "")
      );

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
      var dueChip = detailChip(
        due.overdue ? "\u26A0\uFE0F" : "\uD83D\uDCC5",
        due.text
      );

      if (due.overdue) {
        dueChip.classList.add("plant-card__detail--overdue");
      }

      details.appendChild(dueChip);
    }

    var last = lastWateredLabel(water);

    if (last) {
      details.appendChild(detailChip("\u23F0", last));
    }

    var error = el("p", "plant-card__error");
    error.hidden = true;
    body.appendChild(error);

    var footer = el("div", "plant-card__footer");
    footer.appendChild(details);

    var waterBtn = el("button", "water-btn");
    waterBtn.type = "button";
    waterBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2.7c.6.9 5 7.1 5 11a5 5 0 0 1-10 0c0-3.9 4.4-10.1 5-11z"/>' +
      "</svg>";

    waterBtn.title = "Mark as watered";
    waterBtn.setAttribute(
      "aria-label", "Mark " + entryTitle(entry) + " as watered"
    );

    if (due && due.overdue) {
      waterBtn.classList.add("water-btn--due");
    }

    waterBtn.addEventListener("click", function () {
      if (waterBtn.disabled) return;

      waterBtn.disabled = true;
      waterBtn.classList.add("is-saving");

      S.markTaskDone(entry.id, "watering")
        .then(function (schedule) {
          entry.schedule = schedule;

          if (card.parentNode) {
            card.parentNode.replaceChild(buildMyPlantCard(entry), card);
          }
        })
        .catch(function (err) {
          console.error("[Plantora My Plants]", err);
          waterBtn.disabled = false;
          waterBtn.classList.remove("is-saving");
          showCardError(
            card, "Could not save the watering. Please try again."
          );
        });
    });

    footer.appendChild(waterBtn);
    body.appendChild(footer);

    var detailsUrl =
      "plant-details.html?id=" + encodeURIComponent(entry.plantId);

    card.tabIndex = 0;
    card.setAttribute("aria-label", "View details for " + entryTitle(entry));

    card.addEventListener("click", function (e) {
      if (e.target.closest("button, a")) return;
      window.location.href = detailsUrl;
    });

    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target === card) {
        window.location.href = detailsUrl;
      }
    });

    card.appendChild(body);
    return card;
  }

  function initMyPlants() {
    var host = document.getElementById("my-plants-grid");
    if (!host) return;

    var missing = deps();

    if (missing) {
      renderState(
        host, "error", "\u26A0\uFE0F",
        "Can't load your plants",
        "My Plants could not start: " + missing + "."
      );
      return;
    }

    renderState(
      host, "loading", "\uD83C\uDF31",
      "Loading your plants\u2026", "Checking your collection."
    );

    Promise.all([
      window.PlantoraData.loadPlants(),
      window.PlantoraStore.listMyPlants()
    ])
      .then(function (r) {
        var entries = r[1];
        clear(host);

        if (!entries.length) {
          var emptyBox = buildEmptyState(
            "empty", "\uD83E\uDDB8",
            "No plants in your collection yet",
            "Add one you already own from Explore Plants, and it will show up here with its own watering and feeding schedule.",
            { label: "Explore Plants", href: "explore.html" }
          );

          emptyBox.appendChild(buildSampleSeeder());
          clear(host);
          host.appendChild(emptyBox);
          return;
        }

        var grid = el("div", "plant-grid");

        entries.forEach(function (entry) {
          grid.appendChild(buildMyPlantCard(entry));
        });

        host.appendChild(grid);
      })
      .catch(function (err) {
        console.error("[Plantora My Plants]", err);
        renderListError(
          host, err,
          { label: "Retry", href: "my-plants.html" }
        );
      });
  }

  initDashboard();
  initMyPlants();

  /* ===== Care UI: per-user state ===== */

  function careUid() {
    try {
      var user = JSON.parse(
        localStorage.getItem("plantora_user") ||
        sessionStorage.getItem("plantora_user") ||
        "null"
      );

      return user && user.uid ? user.uid : null;
    } catch (err) {
      return null;
    }
  }

  function careKey(name) {
    var uid = careUid();
    return uid ? "plantora_" + name + ":" + uid : null;
  }

  function loadCare(name, def) {
    var key = careKey(name);
    if (!key) return def;

    try {
      var raw = localStorage.getItem(key);
      return raw === null ? def : JSON.parse(raw);
    } catch (err) {
      return def;
    }
  }

  function saveCare(name, value) {
    var key = careKey(name);
    if (!key) return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Local storage may be blocked.
    }
  }

  function findEntry(entries, entryId) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === entryId) return entries[i];
    }

    return null;
  }

  function careId(task) {
    return String(task.entryId) + ":" + String(task.taskKey);
  }

  function enrichTask(entries, task) {
    var entry = findEntry(entries, task.entryId);
    var sched = entry && entry.schedule && entry.schedule[task.taskKey];

    task.lastDone = sched ? sched.lastDone : null;
    task.intervalDays = sched ? sched.intervalDays : null;

    return task;
  }

  function isTaskDone(task, doneMap) {
    var rec = doneMap[careId(task)];

    return rec != null &&
      task.lastDone != null &&
      Number(rec) === Number(task.lastDone);
  }

  function syncDoneMap(entries, tasks, doneMap) {
    tasks.forEach(function (task) {
      if (task.lastDone && doneMap[careId(task)] == null) {
        doneMap[careId(task)] = Number(task.lastDone);
      }
    });
  }

  function syncEntrySchedule(entries, task, schedule) {
    var entry = findEntry(entries, task.entryId);

    if (entry && entry.schedule && schedule && schedule[task.taskKey]) {
      entry.schedule[task.taskKey] = schedule[task.taskKey];
    }
  }

  /* ===== Care UI: popovers ===== */

  var careOpenPopups = [];
  var carePopupAnchor = null;
  var carePopupsArmed = false;

  function careClosePopups() {
    careOpenPopups.forEach(function (node) {
      try {
        if (node.parentNode) node.parentNode.removeChild(node);
      } catch (e) {}
    });

    careOpenPopups = [];
    carePopupAnchor = null;
  }

  function careArmPopupClosing() {
    if (carePopupsArmed) return;
    carePopupsArmed = true;

    document.addEventListener("click", function (e) {
      if (careOpenPopups.length === 0) return;

      if (
        carePopupAnchor &&
        (carePopupAnchor === e.target || carePopupAnchor.contains(e.target))
      ) {
        carePopupAnchor = null;
        return;
      }

      var inside = careOpenPopups.some(function (node) {
        return node.contains(e.target);
      });

      if (!inside) careClosePopups();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") careClosePopups();
    });
  }

  function carePositionPopup(popup, anchor) {
    popup.style.position = "fixed";
    document.body.appendChild(popup);

    var rect = anchor.getBoundingClientRect();
    var pw = popup.offsetWidth || 240;
    var ph = popup.offsetHeight || 200;
    var top = rect.bottom + 7;
    var left = Math.max(
      10, Math.min(rect.left, window.innerWidth - pw - 10)
    );

    if (
      top + ph > window.innerHeight - 10 &&
      rect.top - ph - 7 > 10
    ) {
      top = rect.top - ph - 7;
    }

    if (top < 10) top = 10;

    popup.style.top = top + "px";
    popup.style.left = left + "px";
  }

  function careOpenMenu(anchor, items) {
    careClosePopups();
    careArmPopupClosing();
    carePopupAnchor = anchor;

    var menu = el("div", "care-menu");

    items.forEach(function (it) {
      var btn = el("button", "care-menu__item");
      btn.type = "button";
      btn.textContent = it.label;

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        careClosePopups();
        it.action();
      });

      menu.appendChild(btn);
    });

    carePositionPopup(menu, anchor);
    careOpenPopups.push(menu);
  }

  /* ===== Care UI: task actions ===== */

  function showCareError(message) {
    if (!careHost) return;

    var existing = careHost.querySelector(".care-message");
    if (existing) existing.remove();

    var box = el("div", "care-message care-message--error");
    box.setAttribute("role", "alert");
    box.textContent = message;
    careHost.insertBefore(box, careHost.firstChild);

    setTimeout(function () {
      box.remove();
    }, 6000);
  }

  function checkOffTask(entries, task) {
    var id = careId(task);
    var undoMap = loadCare("undo", {});

    undoMap[id] = {
      lastDone: task.lastDone == null ? null : Number(task.lastDone),
      nextDue: Number(task.nextDue)
    };

    saveCare("undo", undoMap);

    window.PlantoraStore.markTaskDone(task.entryId, task.taskKey)
      .then(function (schedule) {
        syncEntrySchedule(entries, task, schedule);

        var doneMap = loadCare("done", {});
        doneMap[id] = Number(schedule.lastDone);
        saveCare("done", doneMap);

        var hidden = loadCare("hidden", []);
        var i = hidden.indexOf(id);

        if (i >= 0) {
          hidden.splice(i, 1);
          saveCare("hidden", hidden);
        }

        renderCare(entries, getCareLimit());
      })
      .catch(function (err) {
        delete undoMap[id];
        saveCare("undo", undoMap);
        console.error("[Plantora Care]", err);
        showCareError("Couldn't mark the task complete. Please try again.");
        renderCare(entries, getCareLimit());
      });
  }

  

function uncheckTask(entries, task) {
    var id = careId(task);
    var undoMap = loadCare("undo", {});
    var snap = undoMap[id];

    // Reopen the task using its previous due date.
    var nextDue = snap && snap.nextDue != null
        ? Number(snap.nextDue)
        : Date.now();

    window.PlantoraStore
        .setTaskDue(task.entryId, task.taskKey, nextDue, null)
        .then(function (schedule) {
            syncEntrySchedule(entries, task, schedule);

            var doneMap = loadCare("done", {});
            delete doneMap[id];
            saveCare("done", doneMap);

            delete undoMap[id];
            saveCare("undo", undoMap);

            renderCare(entries, getCareLimit());
        })
        .catch(function (error) {
            console.error("[Plantora] Uncheck failed:", error);
            showCareError("Couldn't reopen this task. Please try again.");
        });
}



  function snoozeTaskUi(entries, task, days) {
    window.PlantoraStore.snoozeTask(
      task.entryId, task.taskKey, days
    )
      .then(function (schedule) {
        syncEntrySchedule(entries, task, schedule);

        var id = careId(task);
        var doneMap = loadCare("done", {});
        delete doneMap[id];
        saveCare("done", doneMap);

        var undoMap = loadCare("undo", {});
        delete undoMap[id];
        saveCare("undo", undoMap);

        var hidden = loadCare("hidden", []);
        var i = hidden.indexOf(id);

        if (i >= 0) {
          hidden.splice(i, 1);
          saveCare("hidden", hidden);
        }

        renderCare(entries, getCareLimit());
      })
      .catch(function (err) {
        console.error("[Plantora Care]", err);
        showCareError("Couldn't snooze the task. Please try again.");
      });
  }

  function hideTaskUi(entries, task) {
    var id = careId(task);
    var hidden = loadCare("hidden", []);

    if (hidden.indexOf(id) < 0) hidden.push(id);
    saveCare("hidden", hidden);
    renderCare(entries, getCareLimit());

    var msg = el("div", "care-message");
    msg.textContent = "Task hidden. ";

    var undo = el("a", "care-message__undo", "Undo");
    undo.href = "#";

    undo.addEventListener("click", function (e) {
      e.preventDefault();

      var list = loadCare("hidden", []);
      var i = list.indexOf(id);

      if (i >= 0) {
        list.splice(i, 1);
        saveCare("hidden", list);
      }

      msg.remove();
      renderCare(entries, getCareLimit());
    });

    msg.appendChild(undo);

    if (careHost) careHost.insertBefore(msg, careHost.firstChild);

    setTimeout(function () {
      msg.remove();
    }, 6000);
  }

  function setIntervalUi(entries, task, anchor) {
    careClosePopups();
    careArmPopupClosing();
    carePopupAnchor = anchor;

    var days = task.intervalDays || 7;
    var wrap = el("div", "care-menu care-menu--wide");

    wrap.appendChild(el("div", "care-menu__title", "Repeat task"));

    var field = el("div", "care-menu__row");
    var input = el("input");

    input.type = "number";
    input.min = "1";
    input.max = "365";
    input.value = String(days);

    field.appendChild(input);
    field.appendChild(el("span", "care-menu__unit", "days"));
    wrap.appendChild(field);

    var footer = el("div", "care-menu__footer");

    var cancel = el("button", "btn btn--secondary");
    cancel.type = "button";
    cancel.textContent = "Cancel";

    cancel.addEventListener("click", function (e) {
      e.stopPropagation();
      careClosePopups();
    });

    var saveBtn = el("button", "btn btn--primary");
    saveBtn.type = "button";
    saveBtn.textContent = "Save interval";

    saveBtn.addEventListener("click", function (e) {
      e.stopPropagation();

      var n = Math.max(
        1,
        Math.min(365, Math.round(Number(input.value)) || 1)
      );

      window.PlantoraStore.setTaskInterval(
        task.entryId, task.taskKey, n
      )
        .then(function () {
          careClosePopups();
          renderCare(
            entries,
            document.getElementById("dash-plants") ? 3 : null
          );
        })
        .catch(function (err) {
          console.error("[Plantora Care]", err);
          showCareError(
            "Couldn't update the repeat interval. Please try again."
          );
        });
    });

    footer.appendChild(cancel);
    footer.appendChild(saveBtn);
    wrap.appendChild(footer);

    carePositionPopup(wrap, anchor);
    careOpenPopups.push(wrap);
    input.focus();
  }

  /* ===== Care UI: task row ===== */

  function buildCareTask(entries, task) {
    var S = window.PlantoraStore;
    var id = careId(task);
    var doneMap = loadCare("done", {});
    var done = isTaskDone(task, doneMap);
    var now = Date.now();

    var startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    var overdue = task.nextDue <= now;
    var dueToday =
      !overdue &&
      task.nextDue < startToday.getTime() + S.DAY_MS;

    var li = el(
      "li",
      "care-list__item care-task" +
        (done ? " care-task--done" : "") +
        (overdue ? " care-task--overdue" : "")
    );

    li.setAttribute("data-task-id", id);

    var row = el("div", "care-task__row");
    var label = el("label", "care-task__checkbox");

    label.setAttribute(
      "aria-label",
      (done ? "Marked as done" : "Mark as done") + " " +
      entryTitle({ nickname: task.nickname, plantName: task.plantName }) +
      ", " + task.label
    );

    var input = el("input");
    input.type = "checkbox";
    input.checked = done;

    var check = el("span", "care-task__check");

    label.appendChild(input);
    label.appendChild(check);
    row.appendChild(label);

input.addEventListener("change", function () {
    if (input.checked) {
        checkOffTask(entries, task);
    } else {
        uncheckTask(entries, task);
    }
});

    var info = el("div", "care-task__info");

    info.appendChild(el(
      "span",
      "care-list__plant",
      entryTitle({ nickname: task.nickname, plantName: task.plantName })
    ));

    info.appendChild(el(
      "span",
      "care-list__task",
      task.icon + " " + task.label
    ));

    row.appendChild(info);

    var when = el(
      "span",
      "care-list__when" +
        (overdue
          ? " care-list__when--overdue"
          : dueToday
            ? " care-list__when--today"
            : "")
    );

    when.textContent = S.describeDue(task);

    var controls = el("div", "care-task__controls");
    var snoozeBtn = el("button", "care-task__btn care-task__btn--snooze");

    snoozeBtn.type = "button";
    snoozeBtn.textContent = "Snooze";

    snoozeBtn.setAttribute(
      "aria-label",
      "Snooze " +
        entryTitle({ nickname: task.nickname, plantName: task.plantName }) +
        " " + task.label
    );

    snoozeBtn.addEventListener("click", function (e) {
      e.stopPropagation();

      careOpenMenu(snoozeBtn, [
        {
          label: "Snooze 1 day",
          action: function () { snoozeTaskUi(entries, task, 1); }
        },
        {
          label: "Snooze 3 days",
          action: function () { snoozeTaskUi(entries, task, 3); }
        },
        {
          label: "Snooze 1 week",
          action: function () { snoozeTaskUi(entries, task, 7); }
        }
      ]);
    });

    controls.appendChild(snoozeBtn);

    var menuBtn = el("button", "care-task__btn care-task__btn--menu");
    menuBtn.type = "button";

    menuBtn.setAttribute(
      "aria-label",
      "More options for " +
        entryTitle({ nickname: task.nickname, plantName: task.plantName }) +
        " " + task.label
    );

    menuBtn.textContent = "\u2026";

    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();

      var items = [];

      if (done) {
        items.push({
          label: "Mark not done",
          action: function () { uncheckTask(entries, task); }
        });
      }

      items.push({
        label: "Repeat every\u2026",
        action: function () { setIntervalUi(entries, task, menuBtn); }
      });

      items.push({
        label: "Hide task",
        action: function () { hideTaskUi(entries, task); }
      });

      careOpenMenu(menuBtn, items);
    });

    controls.appendChild(menuBtn);

    li.appendChild(row);
    li.appendChild(when);
    li.appendChild(controls);

    return li;
  }

  /* ===== Care UI: rendering ===== */

  function getCareLimit() {
    return document.getElementById("dash-plants") ? 3 : null;
  }

  function renderCare(entries, limit) {
    if (!careHost) return;

    clear(careHost);

    var S = window.PlantoraStore;
    var now = Date.now();

    var tasks = S.getUpcomingTasks(entries, 30).map(function (task) {
      return enrichTask(entries, task);
    });

    var doneMap = loadCare("done", {});
    syncDoneMap(entries, tasks, doneMap);
    saveCare("done", doneMap);

    var hiddenList = loadCare("hidden", []);
    var hideCompleted = loadCare("hidecompleted", false);
    var hiddenSet = {};

    hiddenList.forEach(function (id) {
      hiddenSet[id] = true;
    });

    var shown = tasks.filter(function (task) {
      var id = careId(task);
      var overdue = task.nextDue <= now;

      if (hiddenSet[id] && !overdue) return false;
      if (hideCompleted && isTaskDone(task, doneMap) && !overdue) return false;

      return true;
    });

    if (tasks.length) {
      var toolbar = el("div", "care-toolbar");

      toolbar.appendChild(el(
        "span",
        "count-badge",
        shown.length + (shown.length === 1 ? " task" : " tasks")
      ));

      var toggle = el("label", "care-toggle");
      var hideInput = el("input");

      hideInput.type = "checkbox";
      hideInput.checked = hideCompleted;

      hideInput.addEventListener("change", function () {
        saveCare("hidecompleted", hideInput.checked);
        renderCare(entries, limit);
      });

      toggle.appendChild(hideInput);
      toggle.appendChild(document.createTextNode(" Hide completed tasks"));
      toolbar.appendChild(toggle);
      careHost.appendChild(toolbar);
    }

    if (!tasks.length) {
      careHost.appendChild(buildEmptyState(
        "empty",
        "\u2705",
        "Nothing due in the next 30 days",
        entries.length
          ? "Care tasks appear here before they are due. Tick one off to reschedule it on its repeat interval."
          : "Add a plant first and its watering, feeding and repotting schedule will appear here.",
        { label: "Explore Plants", href: "explore.html" }
      ));

      maybeShowReminder(entries, tasks);
      return;
    }

    var list = el("ul", "care-list");
    var tasksToShow = limit != null ? tasks.slice(0, limit) : tasks;

    tasksToShow.forEach(function (task) {
      list.appendChild(buildCareTask(entries, task));
    });

    careHost.appendChild(list);
    maybeShowReminder(entries, tasks);
  }

  /* ===== Plantora Care Reminder Popup ===== */

  function maybeShowReminder(entries, tasks) {
    var startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    var tomorrow = new Date(startToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    var todayEnd = tomorrow.getTime() - 1;
    var doneMap = loadCare("done", {});

    var dueToday = (tasks || []).filter(function (task) {
      return task.nextDue > 0 &&
        task.nextDue <= todayEnd &&
        !isTaskDone(task, doneMap);
    });

    var todayStr = [
      startToday.getFullYear(),
      String(startToday.getMonth() + 1).padStart(2, "0"),
      String(startToday.getDate()).padStart(2, "0")
    ].join("-");

    var testMode =
      new URLSearchParams(window.location.search).get("testReminder") === "1";

    if (!testMode && (
      !dueToday.length ||
      loadCare("reminder") === todayStr
    )) {
      return;
    }

    if (testMode && !dueToday.length) {
      dueToday = [{
        entryId: "__plantora_test__",
        plantId: 0,
        plantName: "Snake Plant (Test Preview)",
        nickname: null,
        taskKey: "watering",
        label: "Watering",
        icon: "\uD83D\uDCA7",
        nextDue: Date.now()
      }];
    }

    try {
      showReminderPopup(entries, dueToday);

      if (!testMode) {
        saveCare("reminder", todayStr);
      }
    } catch (err) {
      console.error("[Plantora Care] Reminder popup failed:", err);
    }
  }

  function showReminderPopup(entries, dueTasks) {
    var oldOverlay = document.querySelector(".reminder-overlay");
    if (oldOverlay) oldOverlay.remove();

    var overlay = el("div", "reminder-overlay");

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "rgba(15, 23, 42, 0.65)"
    });

    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "reminder-title");

    var popup = el("div", "reminder-popup");

    Object.assign(popup.style, {
      position: "relative",
      width: "100%",
      maxWidth: "520px",
      maxHeight: "85vh",
      overflowY: "auto",
      boxSizing: "border-box",
      padding: "24px",
      borderRadius: "18px",
      background: "#ffffff",
      color: "#202124",
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
      fontFamily: "Arial, sans-serif"
    });

    var closeBtn = el("button", "reminder-popup__close", "\u00D7");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close reminder");

    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "10px",
      right: "12px",
      border: "0",
      background: "transparent",
      fontSize: "28px",
      cursor: "pointer",
      color: "#555"
    });

    var title = el(
      "h3",
      "reminder-popup__title",
      "\uD83C\uDF3F Plant Care Reminder"
    );

    title.id = "reminder-title";

    Object.assign(title.style, {
      margin: "0 30px 8px 0",
      fontSize: "22px",
      color: "#3f6212"
    });

    var intro = el(
      "p",
      "reminder-popup__intro",
      "Your plants need a little attention today."
    );

    Object.assign(intro.style, {
      margin: "0 0 18px",
      color: "#555",
      lineHeight: "1.5"
    });

    var list = el("ul", "reminder-popup__list");

    Object.assign(list.style, {
      listStyle: "none",
      padding: "0",
      margin: "0",
      display: "grid",
      gap: "12px"
    });

    function closePopup() {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }

    closeBtn.addEventListener("click", closePopup);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closePopup();
    });

    function handleEscape(event) {
      if (event.key === "Escape") {
        closePopup();
        document.removeEventListener("keydown", handleEscape);
      }
    }

    document.addEventListener("keydown", handleEscape);

    function makeButton(label, primary) {
      var button = el("button", "reminder-popup__btn", label);
      button.type = "button";

      Object.assign(button.style, {
        border: primary ? "0" : "1px solid #d1d5db",
        borderRadius: "9px",
        padding: "9px 12px",
        cursor: "pointer",
        background: primary ? "#4d7c0f" : "#fff",
        color: primary ? "#fff" : "#374151",
        fontSize: "13px",
        fontWeight: "600"
      });

      return button;
    }

    dueTasks.forEach(function (task) {
      var item = el("li", "reminder-popup__item");

      Object.assign(item.style, {
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "14px",
        display: "grid",
        gap: "10px"
      });

      var plantName = task.nickname || task.plantName || "Your plant";
      var info = el("div", "reminder-popup__info");

      var plantLabel = el("div", "reminder-popup__plant", plantName);

      Object.assign(plantLabel.style, {
        fontWeight: "700",
        marginBottom: "4px"
      });

      var taskLabel = el(
        "div",
        "reminder-popup__task",
        (task.icon || "\uD83C\uDF3F") + " " + task.label
      );

      Object.assign(taskLabel.style, {
        color: "#4b5563",
        fontSize: "14px"
      });

      var when = el(
        "div",
        "reminder-popup__when",
        window.PlantoraStore.describeDue(task)
      );

      Object.assign(when.style, {
        marginTop: "5px",
        fontSize: "12px",
        color: task.nextDue <= Date.now() ? "#b91c1c" : "#6b7280"
      });

      info.appendChild(plantLabel);
      info.appendChild(taskLabel);
      info.appendChild(when);

      var actions = el("div", "reminder-popup__actions");

      Object.assign(actions.style, {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px"
      });

      var doneBtn = makeButton("Mark Done", true);

      doneBtn.addEventListener("click", function () {
        if (task.entryId === "__plantora_test__") {
          closePopup();
          return;
        }

        doneBtn.disabled = true;

        window.PlantoraStore
          .markTaskDone(task.entryId, task.taskKey)
          .then(function (schedule) {
            syncEntrySchedule(entries, task, schedule);

            var id = careId(task);
            var doneMap = loadCare("done", {});

            doneMap[id] = Number(schedule.lastDone);
            saveCare("done", doneMap);

            renderCare(entries, getCareLimit());

            item.remove();

            if (!list.children.length) closePopup();
          })
          .catch(function (err) {
            console.error("[Plantora Care] Could not complete task:", err);
            doneBtn.disabled = false;

            showCareError(
              "Couldn't mark this task complete. Please try again."
            );
          });
      });

      var snoozeBtn = makeButton("Snooze 1 day", false);

      snoozeBtn.addEventListener("click", function () {
        if (task.entryId === "__plantora_test__") {
          closePopup();
          return;
        }

        snoozeBtn.disabled = true;

        window.PlantoraStore
          .snoozeTask(task.entryId, task.taskKey, 1)
          .then(function (schedule) {
            syncEntrySchedule(entries, task, schedule);

            var id = careId(task);
            var doneMap = loadCare("done", {});

            delete doneMap[id];
            saveCare("done", doneMap);

            var undoMap = loadCare("undo", {});
            delete undoMap[id];
            saveCare("undo", undoMap);

            renderCare(entries, getCareLimit());

            item.remove();

            if (!list.children.length) closePopup();
          })
          .catch(function (err) {
            console.error("[Plantora Care] Could not snooze task:", err);
            snoozeBtn.disabled = false;

            showCareError(
              "Couldn't snooze this task. Please try again."
            );
          });
      });

      actions.appendChild(doneBtn);
      actions.appendChild(snoozeBtn);

      item.appendChild(info);
      item.appendChild(actions);
      list.appendChild(item);
    });

    var footer = el("div", "reminder-popup__footer");

    Object.assign(footer.style, {
      marginTop: "18px",
      textAlign: "right"
    });

    var dismiss = makeButton("Remind me later", false);
    dismiss.addEventListener("click", closePopup);

    footer.appendChild(dismiss);

    popup.appendChild(closeBtn);
    popup.appendChild(title);
    popup.appendChild(intro);
    popup.appendChild(list);
    popup.appendChild(footer);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    closeBtn.focus();
  }

})();
