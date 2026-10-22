const FILTER_FIELDS = [
  {
    selectId: "filter-light",
    field: "light",
    order: ["Very Low", "Low", "Medium", "High", "Very High"],
  },
  {
    selectId: "filter-water",
    field: "water",
    order: ["Very Low", "Low", "Medium", "High", "Very High"],
  },
  {
    selectId: "filter-maintenance",
    field: "maintenance",
    order: ["Very Low", "Low", "Medium", "High"],
  },
  {
    selectId: "filter-size",
    field: "size",
    order: ["Tiny", "Small", "Medium", "Large"],
  },
  {
    selectId: "filter-suitability",
    field: "indoorSuitability",
    order: ["Highly Suitable", "Suitable", "Moderately Suitable"],
  },
];

// Get the values of one field in order
function getFilterValues(plants, field, order) {
  const values = [...new Set(plants.map((plant) => plant[field]).filter(Boolean))];

  return values.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Add an option to the dropdown for every value found in the plants
function populateFilterOptions(plants) {
  FILTER_FIELDS.forEach(({ selectId, field, order }) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    const options = ["All", ...getFilterValues(plants, field, order)].map(
      (value) => `<option value="${value}">${value}</option>`
    );

    select.innerHTML = options.join("");
  });
}

async function initExplorePage() {
  const plantGrid = document.getElementById("plant-grid");
  if (!plantGrid) return;

  const searchInput = document.getElementById("search-input");
  const filters = FILTER_FIELDS.map(({ selectId, field }) => ({
    field,
    element: document.getElementById(selectId),
  }));
  const noResultsMessage = document.getElementById("no-results");

  // Show placeholders immediately, while Firestore/JSON resolves.
  if (window.PlantoraLoading) {
    window.PlantoraLoading.skeletonGrid(plantGrid, 6, "Loading plants…");
  } else {
    plantGrid.setAttribute("aria-busy", "true");
  }

  if (searchInput) searchInput.disabled = true;
  filters.forEach(({ element }) => {
    if (element) element.disabled = true;
  });

  // Load plants from PlantoraData (Firestore first, then JSON)
  let plants = [];
  try {
    plants = await window.PlantoraData.loadPlants();
  } catch (err) {
    console.error("[Plantora] Failed to load plants:", err);
    if (window.PlantoraLoading) {
      window.PlantoraLoading.error(
        plantGrid,
        "Can't load the plant library",
        "The plant data could not be reached. Check your connection, then try again.",
        { label: "Try again", href: "explore.html" }
      );
    } else {
      plantGrid.innerHTML = `<p class="error">Failed to load plants. Please refresh.</p>`;
    }
    return;
  }

  if (searchInput) searchInput.disabled = false;
  filters.forEach(({ element }) => {
    if (element) element.disabled = false;
  });

  populateFilterOptions(plants);

  // --- Explore card favorites (kept in localStorage) --------------------
  const FAVORITES_KEY = "plantora-favorite-plants";

  function getFavoriteIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function toggleFavorite(btn) {
    const plantId = Number(btn.dataset.plantId);
    const favorites = getFavoriteIds();
    const plant = plants.find((p) => p.id === plantId);
    const name = plant ? plant.name : "this plant";

    if (favorites.has(plantId)) {
      favorites.delete(plantId);
    } else {
      favorites.add(plantId);
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));

    const pressed = favorites.has(plantId);
    btn.setAttribute("aria-pressed", String(pressed));
    btn.setAttribute(
      "aria-label",
      pressed ? `Remove ${name} from favorite` : `Mark ${name} as favorite`
    );
  }

  // Turn one plant object into a card's HTML
  function createPlantCard(plant) {
    const isFavorite = getFavoriteIds().has(plant.id);

    return `
      <article class="plant-card">
        <div class="plant-card__media">
          <img class="plant-card__image" src="${plant.image}" alt="${plant.name}" loading="lazy" decoding="async" />
          <span class="plant-card__badge"><i data-lucide="sun"></i>${plant.light} Light</span>
          <button
            type="button"
            class="plant-card__fav"
            data-plant-id="${plant.id}"
            aria-pressed="${isFavorite}"
            aria-label="${isFavorite ? "Remove" : "Mark"} ${plant.name} ${isFavorite ? "from" : "as"} favorite"
          >
            <i data-lucide="star"></i>
          </button>
        </div>
        <div class="plant-card__content">
          <h3 class="plant-card__title">${plant.name}</h3>
          <p class="plant-card__scientific">${plant.scientificName}</p>
          <div class="plant-card__meta">
            <span class="plant-card__meta-item"><i data-lucide="droplets"></i>${plant.water}</span>
            <span class="plant-card__meta-item"><i data-lucide="sprout"></i>${plant.maintenance}</span>
          </div>
          <div class="plant-card__actions">
            <a href="plant-details.html?id=${plant.id}" class="btn btn--primary plant-card__btn">
              View Details <i data-lucide="arrow-right"></i>
            </a>
            <button
              type="button"
              class="plant-card__add"
              data-plant-id="${plant.id}"
              aria-label="Add ${plant.name} to My Plants"
            >
              <i data-lucide="plus"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // Draw the plants and hide the no results message
  function renderPlants(list) {
    plantGrid.innerHTML = list.map(createPlantCard).join("");
    noResultsMessage.hidden = list.length > 0;

    if (window.PlantoraLoading) window.PlantoraLoading.setBusy(plantGrid, false);
    else plantGrid.removeAttribute("aria-busy");

    // Lucide's CDN bundle is deferred before this script, so it is ready here
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  // --- Add to My Plants -------------------------------------------------
  const store = window.PlantoraStore;
  const modal = new window.AddPlantModal();

  // the Add button is icon-only, so all feedback goes through the accessible label
  function setAddState(btn, plant, label) {
    btn.setAttribute("aria-label", `${label} ${plant.name}`);
  }

  function addPlant(btn) {
    const plantId = Number(btn.dataset.plantId);

    if (!store) {
      console.error("[Plantora] store.js is not loaded on this page.");
      return;
    }

    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;

    function setBusy(busy) {
      if (window.PlantoraLoading) window.PlantoraLoading.button(btn, busy);
      else btn.disabled = busy;
    }

    function finish() {
      setBusy(false);
      setAddState(btn, plant, "Add");
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    }

    modal.open(plant)
      .then(({ nickname, location, wateringInterval }) => {
        setBusy(true);
        setAddState(btn, plant, "Adding");

        return store.addPlantManually(plantId, { nickname, location, wateringInterval });
      })
      .then(() => {
        finish();
      })
      .catch((err) => {
        finish();

        if (err && err.message === "Modal cancelled") return;

        if (err && err.code === "plantora/unauthenticated") {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = "login.html?redirect=" + returnUrl;
          return;
        }

        const errorMsg = err && err.message ? err.message : String(err);
        const errorCode = err && err.code ? err.code : "unknown";
        console.error("[Plantora] could not add the plant:", err);
        alert(`Failed to add plant:\nCode: ${errorCode}\nMessage: ${errorMsg}\n\nCheck console (F12) for details.\n\nIf you see "ERR_BLOCKED_BY_CLIENT", disable ad blocker/privacy extension for this site.`);
        setAddState(btn, plant, "Failed to add");
        setTimeout(() => {
          if (btn.isConnected && !btn.disabled) setAddState(btn, plant, "Add");
        }, 2000);
      });
  }

  plantGrid.addEventListener("click", (event) => {
    const favBtn = event.target.closest(".plant-card__fav");
    if (favBtn) toggleFavorite(favBtn);
  });

  plantGrid.addEventListener("click", (event) => {
    const btn = event.target.closest(".plant-card__add");
    if (btn) addPlant(btn);
  });

  // Keep plants that match the search text and every dropdown at once
  function getFilteredPlants() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const activeFilters = filters.filter(({ element }) => element.value !== "All");

    return plants.filter((plant) => {
      const matchesSearch =
        plant.name.toLowerCase().includes(searchTerm) ||
        plant.scientificName.toLowerCase().includes(searchTerm);

      const matchesFilters = activeFilters.every(
        ({ field, element }) => plant[field] === element.value
      );

      return matchesSearch && matchesFilters;
    });
  }

  // Re-run the filter + search logic and redraw the grid
  function updateResults() {
    renderPlants(getFilteredPlants());
  }

  // Show up to 6 matching plant names under the search box
  const suggestionsList = document.getElementById("search-suggestions");
  const SUGGESTION_LIMIT = 6;
  let activeSuggestion = -1; // which row is highlighted, -1 = none

  function getSuggestions(term) {
    const t = term.toLowerCase();
    // split matches into 3 groups so names that start with the text come first
    const tiers = [[], [], []];
    plants.forEach((plant) => {
      const name = plant.name.toLowerCase();
      const sci = plant.scientificName.toLowerCase();
      if (name.startsWith(t)) tiers[0].push(plant);
      else if (sci.startsWith(t) || name.includes(t)) tiers[1].push(plant);
      else if (sci.includes(t)) tiers[2].push(plant);
    });
    const byName = (a, b) => a.name.localeCompare(b.name);
    return tiers
      .flatMap((tier) => tier.sort(byName))
      .slice(0, SUGGESTION_LIMIT);
  }

  // Wrap the typed text inside the name with <mark>
  function highlightMatch(text, term) {
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text;
    return (
      text.slice(0, idx) +
      "<mark>" +
      text.slice(idx, idx + term.length) +
      "</mark>" +
      text.slice(idx + term.length)
    );
  }

  function hideSuggestions() {
    suggestionsList.hidden = true;
    suggestionsList.innerHTML = "";
    activeSuggestion = -1;
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
  }

  function renderSuggestions(list) {
    const term = searchInput.value.trim();
    if (!term || !list.length) {
      hideSuggestions();
      return;
    }
    activeSuggestion = -1;
    suggestionsList.innerHTML = list
      .map(
        (plant, i) => `
          <li
            class="search-suggestions__item"
            id="sug-${i}"
            role="option"
            aria-selected="false"
            data-name="${plant.name}"
          >
            <span class="search-suggestions__name">${highlightMatch(plant.name, term)}</span>
            <span class="search-suggestions__sci">${highlightMatch(plant.scientificName, term)}</span>
          </li>
        `
      )
      .join("");
    suggestionsList.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  }

  function setActiveSuggestion(index) {
    const items = suggestionsList.querySelectorAll(".search-suggestions__item");
    if (!items.length) return;
    // Move the highlight, wrapping around at both ends
    activeSuggestion = index < 0 ? items.length - 1 : index % items.length;
    items.forEach((item, i) => {
      const isActive = i === activeSuggestion;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    const active = items[activeSuggestion];
    searchInput.setAttribute("aria-activedescendant", active.id);
    if (typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  }

  // Put the picked plant name in the box and filter again
  function acceptSuggestion(item) {
    searchInput.value = item.dataset.name;
    hideSuggestions();
    updateResults();
  }

  // Typing filters the grid and updates the suggestion list
  searchInput.addEventListener("input", () => {
    updateResults();
    renderSuggestions(getSuggestions(searchInput.value.trim()));
  });

  // Arrow keys move the highlight, Enter picks it, Escape closes the list
  searchInput.addEventListener("keydown", (e) => {
    const openIfClosed = () => {
      if (!suggestionsList.hidden) return true;
      renderSuggestions(getSuggestions(searchInput.value.trim()));
      return !suggestionsList.hidden;
    };

    if (e.key === "ArrowDown") {
      if (openIfClosed()) {
        e.preventDefault();
        setActiveSuggestion(activeSuggestion + 1);
      }
    } else if (e.key === "ArrowUp") {
      if (openIfClosed()) {
        e.preventDefault();
        setActiveSuggestion(activeSuggestion - 1);
      }
    } else if (e.key === "Enter") {
      const items = suggestionsList.querySelectorAll(".search-suggestions__item");
      if (!suggestionsList.hidden && items.length) {
        e.preventDefault();
        acceptSuggestion(items[activeSuggestion >= 0 ? activeSuggestion : 0]);
      }
    } else if (e.key === "Escape" && !suggestionsList.hidden) {
      e.preventDefault();
      hideSuggestions();
    }
  });

  // Show the suggestions again when the box gets focus
  searchInput.addEventListener("focus", () => {
    const term = searchInput.value.trim();
    if (term) renderSuggestions(getSuggestions(term));
  });

  // Clicking away closes the list
  searchInput.addEventListener("blur", hideSuggestions);

  // stop mousedown so blur does not close the list
  suggestionsList.addEventListener("mousedown", (e) => e.preventDefault());
  suggestionsList.addEventListener("click", (e) => {
    const item = e.target.closest(".search-suggestions__item");
    if (item) acceptSuggestion(item);
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest && !e.target.closest(".search-box")) hideSuggestions();
  });

  filters.forEach(({ element }) => element.addEventListener("change", updateResults));

  // Show all plants when the page opens
  renderPlants(plants);
}

async function initDetailsPage() {
  const plantNameEl = document.getElementById("plant-name");
  if (!plantNameEl) return;

  const loadingEl = document.getElementById("plant-details-loading");
  const contentEl = document.getElementById("plant-details-content");
  const errorEl = document.getElementById("plant-details-error");

  function showLoading() {
    if (loadingEl) loadingEl.hidden = false;
    if (contentEl) contentEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    document.querySelector("main")?.setAttribute("aria-busy", "true");
  }

  function showError(message) {
    if (loadingEl) loadingEl.hidden = true;
    if (contentEl) contentEl.hidden = true;
    document.querySelector("main")?.setAttribute("aria-busy", "false");

    if (errorEl) {
      errorEl.hidden = false;
      if (window.PlantoraLoading) {
        window.PlantoraLoading.error(
          errorEl,
          "Can't load this plant",
          message,
          { label: "Back to Explore", href: "explore.html" }
        );
      } else {
        errorEl.textContent = message;
      }
    }
  }

  function showContent() {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (contentEl) contentEl.hidden = false;
    document.querySelector("main")?.setAttribute("aria-busy", "false");
  }

  showLoading();

  // Load plants from PlantoraData
  let plants = [];
  try {
    plants = await window.PlantoraData.loadPlants();
  } catch (err) {
    console.error("[Plantora] Failed to load plants for details:", err);
    showError("The plant data could not be reached. Check your connection, then try again.");
    return;
  }

  // Get the plant id from the url
  const urlParams = new URLSearchParams(window.location.search);
  const requestedId = Number(urlParams.get("id"));

  // Use the first plant if no id was given
  const plant = plants.find((p) => p.id === requestedId) || plants[0];

  if (!plant) {
    console.error("[Plantora] Plant not found for id:", requestedId);
    showError("That plant could not be found. It may have been removed from the library.");
    return;
  }

  // Main info at the top
  const imageEl = document.getElementById("plant-image");
  imageEl.src = plant.image;
  imageEl.alt = plant.name;

  plantNameEl.textContent = plant.name;
  document.getElementById("plant-scientific").textContent = plant.scientificName;
  document.getElementById("plant-short-description").textContent = plant.description;

  // Light, water, humidity etc.
  document.getElementById("req-light").textContent = plant.light;
  document.getElementById("req-water").textContent = plant.water;
  document.getElementById("req-humidity").textContent = plant.humidity;
  document.getElementById("req-temperature").textContent = plant.temperature;
  document.getElementById("req-space").textContent = plant.space;
  document.getElementById("req-maintenance").textContent = plant.maintenance;
  document.getElementById("req-difficulty").textContent = plant.difficulty;
  document.getElementById("req-suitability").textContent = plant.indoorSuitability;

  // Longer description
  document.getElementById("plant-description").textContent = plant.description;

  // Watering, fertilizer, repotting and cleaning tips
  document.getElementById("care-watering").textContent = plant.careGuide.watering;
  document.getElementById("care-fertilizer").textContent = plant.careGuide.fertilizer;
  document.getElementById("care-repotting").textContent = plant.careGuide.repotting;
  document.getElementById("care-cleaning").textContent = plant.careGuide.cleaning;

  // Indoor suitability banner
  document.getElementById("suitability-value").textContent = plant.indoorSuitability;
  document.getElementById("suitability-note").textContent =
    plant.name +
    " is " +
    plant.indoorSuitability.toLowerCase() +
    " for indoor spaces thanks to its " +
    plant.difficulty.toLowerCase() +
    " care needs.";

  showContent();

  // "Add to My Plants" button - opens the add-plant modal
  const addBtn = document.getElementById("add-to-my-plants");
  if (addBtn) {
    function setAddBusy(busy) {
      if (window.PlantoraLoading) window.PlantoraLoading.button(addBtn, busy, busy ? "Adding…" : null);
      else {
        addBtn.disabled = busy;
        addBtn.textContent = busy ? "Adding…" : "Add to My Plants";
      }
    }

    addBtn.addEventListener("click", () => {
      if (!store) {
        console.error("[Plantora] store.js not loaded");
        alert("System not ready. Please refresh.");
        return;
      }

      modal.open(plant)
        .then(({ nickname, location, wateringInterval }) => {
          setAddBusy(true);

          return store.addPlantManually(plant.id, { nickname, location, wateringInterval });
        })
        .then(() => {
          setAddBusy(false);
        })
        .catch((err) => {
          setAddBusy(false);

          if (err && err.message === "Modal cancelled") return;

          if (err && err.code === "plantora/unauthenticated") {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = "login.html?redirect=" + returnUrl;
            return;
          }

          const errorMsg = err && err.message ? err.message : String(err);
          const errorCode = err && err.code ? err.code : "unknown";
          console.error("[Plantora] could not add the plant:", err);
          alert(`Failed to add plant:\nCode: ${errorCode}\nMessage: ${errorMsg}\n\nCheck console (F12) for details.\n\nIf you see "ERR_BLOCKED_BY_CLIENT", disable ad blocker/privacy extension for this site.`);
        });
    });
  }
}

// Add Plant modal: species name (read-only), nickname (required),
// location (optional), watering interval (optional, defaults from plant needs).
class AddPlantModal {
  constructor() {
    this.overlay = null;
    this.plant = null;
    this.resolve = null;
    this.reject = null;
    this.locations = window.PlantoraStore?.LOCATIONS || ["Living Room", "Bedroom", "Office", "Kitchen", "Balcony"];
  }

  open(plant) {
    this.plant = plant;
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.render();
      this.bindEvents();
      this.focusFirstInput();
      document.body.style.overflow = "hidden";
    });
  }

  render() {
    const defaultInterval = window.PlantoraStore?.defaultIntervalDays
      ? window.PlantoraStore.defaultIntervalDays(this.plant, "watering")
      : 7;
    const locationOptions = this.locations.map(loc =>
      `<option value="${loc}">${loc}</option>`
    ).join("");

    this.overlay = document.createElement("div");
    this.overlay.className = "modal-overlay";
    this.overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button type="button" class="modal__close" aria-label="Close modal"><i data-lucide="x"></i></button>
        <div class="modal__header">
          <h2 class="modal__title" id="modal-title">Add to My Plants</h2>
          <p class="modal__species">${this.plant?.name}</p>
        </div>
        <div class="modal__body">
          <form class="modal__form" id="add-plant-form" novalidate>
            <div class="modal__field">
              <label class="modal__label" for="plant-nickname">Nickname <span class="required" aria-hidden="true">*</span></label>
              <input
                type="text"
                id="plant-nickname"
                class="modal__input"
                placeholder="e.g. Living Room Monstera"
                required
                maxlength="60"
                aria-required="true"
              >
              <p class="modal__helper">Give your plant a unique name</p>
            </div>
            <div class="modal__field">
              <label class="modal__label" for="plant-location">Location</label>
              <select id="plant-location" class="modal__select" aria-describedby="location-help">
                <option value="">Select a room (optional)</option>
                ${locationOptions}
              </select>
              <p class="modal__helper" id="location-help">Helps organize your plants by room</p>
            </div>
            <div class="modal__field">
              <label class="modal__label" for="plant-watering">Watering interval (days)</label>
              <input
                type="number"
                id="plant-watering"
                class="modal__input"
                min="1"
                max="3650"
                value="${defaultInterval}"
                aria-describedby="watering-help"
              >
              <p class="modal__helper" id="watering-help">Default based on plant's water needs: ${defaultInterval} days</p>
            </div>
          </form>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--secondary" id="modal-cancel">Cancel</button>
          <button type="button" class="btn btn--primary" id="modal-submit">Add Plant</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  bindEvents() {
    const closeBtn = this.overlay.querySelector(".modal__close");
    const cancelBtn = this.overlay.querySelector("#modal-cancel");
    const submitBtn = this.overlay.querySelector("#modal-submit");
    const form = this.overlay.querySelector("#add-plant-form");
    const nicknameInput = this.overlay.querySelector("#plant-nickname");

    const close = () => this.close(false);
    const submit = () => this.handleSubmit();

    closeBtn.addEventListener("click", close);
    cancelBtn.addEventListener("click", close);
    submitBtn.addEventListener("click", submit);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) close();
    });

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Enter" && e.target === nicknameInput) {
        e.preventDefault();
        submit();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    this._keydownHandler = handleKeydown;
  }

  focusFirstInput() {
    setTimeout(() => {
      const input = this.overlay?.querySelector("#plant-nickname");
      input?.focus();
    }, 100);
  }

  handleSubmit() {
    const nicknameInput = this.overlay.querySelector("#plant-nickname");
    const locationSelect = this.overlay.querySelector("#plant-location");
    const wateringInput = this.overlay.querySelector("#plant-watering");

    const nickname = nicknameInput.value.trim();
    if (!nickname) {
      nicknameInput.focus();
      nicknameInput.reportValidity();
      return;
    }

    const location = locationSelect.value || null;
    const wateringInterval = parseInt(wateringInput.value, 10) || null;

    this.close(true, { nickname, location, wateringInterval });
  }

  close(submitted, data) {
    document.removeEventListener("keydown", this._keydownHandler);
    document.body.style.overflow = "";

    if (this.overlay) {
      this.overlay.style.animation = "modalFadeIn 0.15s ease reverse";
      setTimeout(() => {
        if (this.overlay?.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
      }, 150);
    }

    if (submitted) {
      this.resolve(data);
    } else {
      this.reject(new Error("Modal cancelled"));
    }
    this.resolve = this.reject = this.plant = null;
  }
}

window.AddPlantModal = AddPlantModal;

(async function boot() {
  await initExplorePage();
  await initDetailsPage();
})();

