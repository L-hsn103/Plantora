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

  // Load plants from PlantoraData (Firestore first, then JSON)
  let plants = [];
  try {
    plants = await window.PlantoraData.loadPlants();
  } catch (err) {
    console.error("[Plantora] Failed to load plants:", err);
    plantGrid.innerHTML = `<p class="error">Failed to load plants. Please refresh.</p>`;
    return;
  }

  populateFilterOptions(plants);

  // Turn one plant object into a card's HTML
  function createPlantCard(plant) {
    return `
      <article class="plant-card">
        <img class="plant-card__image" src="${plant.image}" alt="${plant.name}" />
        <div class="plant-card__content">
          <h3 class="plant-card__title">${plant.name}</h3>
          <p class="plant-card__scientific">${plant.scientificName}</p>
          <ul class="plant-card__meta">
            <li>Light: ${plant.light}</li>
            <li>Water: ${plant.water}</li>
            <li>Maintenance: ${plant.maintenance}</li>
          </ul>
          <div class="plant-card__actions">
            <button type="button" class="btn btn--primary plant-card__add" data-plant-id="${plant.id}">Add</button>
            <a href="plant-details.html?id=${plant.id}" class="btn btn--secondary plant-card__btn">View Details</a>
          </div>
        </div>
      </article>
    `;
  }

  // Draw the plants and hide the no results message
  function renderPlants(list) {
    plantGrid.innerHTML = list.map(createPlantCard).join("");
    noResultsMessage.hidden = list.length > 0;
    applyOwnedState();
  }

  // --- Add to My Plants -------------------------------------------------
  const store = window.PlantoraStore;
  let ownedPlantIds = null;

  function markAdded(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add("is-added");
    btn.textContent = "Added";
  }

  function applyOwnedState() {
    if (!ownedPlantIds) return;
    plantGrid.querySelectorAll(".plant-card__add").forEach((btn) => {
      if (ownedPlantIds.has(Number(btn.dataset.plantId))) markAdded(btn);
    });
  }

  function refreshOwnedPlants() {
    if (!store) return Promise.resolve();
    return store
      .getCurrentUser()
      .then((user) => (user ? store.listMyPlants() : []))
      .then((entries) => {
        ownedPlantIds = new Set(entries.map((entry) => Number(entry.plantId)));
        applyOwnedState();
      })
      .catch((err) => console.error("[Plantora] could not load My Plants:", err));
  }

  function addPlant(btn) {
    const plantId = Number(btn.dataset.plantId);

    if (!store) {
      console.error("[Plantora] store.js is not loaded on this page.");
      return;
    }
    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = "Adding…";

    store
      .addPlantManually(plantId)
      .then(() => {
        (ownedPlantIds = ownedPlantIds || new Set()).add(plantId);
        markAdded(btn);
      })
      .catch((err) => {
        btn.disabled = false;
        btn.textContent = "Add";

        if (err && err.code === "plantora/unauthenticated") {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = "login.html?redirect=" + returnUrl;
          return;
        }

        // Show full error details for debugging
        const errorMsg = err && err.message ? err.message : String(err);
        const errorCode = err && err.code ? err.code : "unknown";
        console.error("[Plantora] could not add the plant:", err);
        alert(`Failed to add plant:\nCode: ${errorCode}\nMessage: ${errorMsg}\n\nCheck console (F12) for details.\n\nIf you see "ERR_BLOCKED_BY_CLIENT", disable ad blocker/privacy extension for this site.`);
        btn.textContent = "Try again";
        setTimeout(() => {
          if (btn.isConnected && !btn.disabled) btn.textContent = "Add";
        }, 2000);
      });
  }

  plantGrid.addEventListener("click", (event) => {
    const btn = event.target.closest(".plant-card__add");
    if (btn) addPlant(btn);
  });

  refreshOwnedPlants();

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

  // Load plants from PlantoraData
  let plants = [];
  try {
    plants = await window.PlantoraData.loadPlants();
  } catch (err) {
    console.error("[Plantora] Failed to load plants for details:", err);
    return;
  }

  // Get the plant id from the url
  const urlParams = new URLSearchParams(window.location.search);
  const requestedId = Number(urlParams.get("id"));

  // Use the first plant if no id was given
  const plant = plants.find((p) => p.id === requestedId) || plants[0];

  if (!plant) {
    console.error("[Plantora] Plant not found for id:", requestedId);
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

  // "Add to My Plants" button - now actually works with Firestore
  const addBtn = document.getElementById("add-to-my-plants");
  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      const store = window.PlantoraStore;
      if (!store) {
        console.error("[Plantora] store.js not loaded");
        alert("System not ready. Please refresh.");
        return;
      }

      addBtn.disabled = true;
      addBtn.textContent = "Adding…";

      try {
        await store.addPlantManually(plant.id);
        addBtn.disabled = true;
        addBtn.classList.add("is-added");
        addBtn.textContent = "Added to My Plants";
      } catch (err) {
        addBtn.disabled = false;
        addBtn.textContent = "Add to My Plants";

        if (err && err.code === "plantora/unauthenticated") {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = "login.html?redirect=" + returnUrl;
          return;
        }

        const errorMsg = err && err.message ? err.message : String(err);
        const errorCode = err && err.code ? err.code : "unknown";
        console.error("[Plantora] could not add the plant:", err);
        alert(`Failed to add plant:\nCode: ${errorCode}\nMessage: ${errorMsg}\n\nCheck console (F12) for details.\n\nIf you see "ERR_BLOCKED_BY_CLIENT", disable ad blocker/privacy extension for this site.`);
      }
    });
  }
}

(async function boot() {
  await initExplorePage();
  await initDetailsPage();
})();

