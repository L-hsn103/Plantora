/* =============================================================
   PLANTORA — script.js
   -------------------------------------------------------------
   This one file is shared by every page. It currently does
   three jobs:

     1. PLANT DATA        — tries to load Data/plants.json first; if
                              that fails (e.g. opened directly via
                              file://) it falls back to the sample
                              list below. Used by both Explore
                              Plants and Plant Details.
     2. EXPLORE PLANTS     — builds the plant cards, and handles
                              search + filters (only runs on
                              explore.html)
     3. PLANT DETAILS      — reads the plant id from the page URL
                              and fills in plant-details.html (only
                              runs on plant-details.html)

   Each section checks whether the elements it needs exist on the
   current page before running, so this single file works safely
   on index.html, explore.html and plant-details.html.

   The page-specific parts only run after the data is ready, so
   both Explore Plants and Plant Details always have the full list.
   ============================================================= */

/* -------------------------------------------------------------
   1. PLANT DATA
   -------------------------------------------------------------
The following array is the built-in fallback dataset, used when
   Data/plants.json can't be loaded (e.g. the page is opened straight
   from the file system). If Data/plants.json exists next to this file,
   its contents take priority and replace this list.

   IMPORTANT: this list is a copy of Data/plants.json, so both must be
   kept in sync. Whenever the JSON changes, copy the new entries over
   here too — otherwise the file:// version of the site shows old data.

   NOTE ON IMAGES: most entries use placehold.co, a free placeholder
   image service, so the page works immediately with no image
   files needed. They are TEMPORARY — swap them for real local
   images later.
   ------------------------------------------------------------- */
const plants = [
  {
    id: 1,
    name: "Snake Plant",
    scientificName: "Dracaena trifasciata",
    image: "image/plant/snake-plant.webp",
    light: "Very Low",
    water: "Very Low",
    humidity: "Low",
    temperature: "Warm",
    space: "Medium",
    maintenance: "Very Low",
    difficulty: "Very Easy",
    size: "Medium",
    indoorSuitability: "Highly Suitable",
    description:
      "A tough, low-maintenance plant that tolerates low light and irregular watering, making it a great choice for beginners.",
    careGuide: {
      watering:
        "Water only when the soil is completely dry, roughly every 2–3 weeks.",
      fertilizer:
        "Feed with a diluted liquid fertilizer once every 1–2 months during spring and summer.",
      repotting: "Repot every 2–3 years, or once the roots outgrow the pot.",
      cleaning: "Wipe leaves with a damp cloth every few weeks to remove dust.",
    },
  },
  {
    id: 2,
    name: "ZZ Plant",
    scientificName: "Zamioculcas zamiifolia",
    image: "image/plant/zz-plant.webp",
    light: "Very Low",
    water: "Very Low",
    humidity: "Low",
    temperature: "Moderate",
    space: "Medium",
    maintenance: "Very Low",
    difficulty: "Very Easy",
    size: "Medium",
    indoorSuitability: "Highly Suitable",
    description:
      "A glossy, drought-tolerant plant that thrives on neglect, perfect for busy students and low-light rooms.",
    careGuide: {
      watering:
        "Water only when the soil is fully dry, roughly every 2–3 weeks.",
      fertilizer:
        "Feed sparingly, about once every 2 months during the growing season.",
      repotting: "Repot every 2–3 years, as growth is slow.",
      cleaning: "Dust leaves occasionally with a soft cloth.",
    },
  },
  {
    id: 3,
    name: "Money Plant (Pothos)",
    scientificName: "Epipremnum aureum",
    image: "image/plant/money-plant-pothos.webp",
    light: "Low",
    water: "Medium",
    humidity: "Medium",
    temperature: "Moderate",
    space: "Small",
    maintenance: "Low",
    difficulty: "Very Easy",
    size: "Medium",
    indoorSuitability: "Highly Suitable",
    description:
      "A fast-growing trailing vine that adapts well to most indoor spaces and is very forgiving for new plant owners.",
    careGuide: {
      watering: "Water when the top inch of soil feels dry, about once a week.",
      fertilizer:
        "Feed monthly with a balanced liquid fertilizer during the growing season.",
      repotting: "Repot every 1–2 years or when roots fill the pot.",
      cleaning: "Rinse leaves under water occasionally to keep them dust-free.",
    },
  },
  {
    id: 4,
    name: "Spider Plant",
    scientificName: "Chlorophytum comosum",
    image: "image/plant/spider-plant.webp",
    light: "Medium",
    water: "Medium",
    humidity: "Medium",
    temperature: "Moderate",
    space: "Small",
    maintenance: "Low",
    difficulty: "Easy",
    size: "Small",
    indoorSuitability: "Highly Suitable",
    description:
      "A resilient plant known for its arching leaves and small offshoot 'babies', ideal for hanging baskets or shelves.",
    careGuide: {
      watering: "Water when the topsoil dries out, about once a week.",
      fertilizer: "Feed lightly once a month during spring and summer.",
      repotting: "Repot every 1–2 years as it grows quickly.",
      cleaning: "Trim brown leaf tips and dust leaves occasionally.",
    },
  },
  {
    id: 5,
    name: "Peace Lily",
    scientificName: "Spathiphyllum wallisii",
    image: "image/plant/peace-lily.webp",
    light: "Low",
    water: "High",
    humidity: "High",
    temperature: "Moderate",
    space: "Medium",
    maintenance: "Medium",
    difficulty: "Moderate",
    size: "Medium",
    indoorSuitability: "Suitable",
    description:
      "An elegant flowering plant that thrives in shady spots and signals when it needs water by drooping slightly.",
    careGuide: {
      watering:
        "Keep soil consistently moist; water when the top inch feels dry, roughly twice a week.",
      fertilizer: "Feed every 6–8 weeks with a balanced liquid fertilizer.",
      repotting: "Repot once a year or when it becomes root-bound.",
      cleaning: "Wipe leaves gently to keep them glossy and dust-free.",
    },
  },
  {
    id: 6,
    name: "Rubber Plant",
    scientificName: "Ficus elastica",
    image: "image/plant/rubber-plant.webp",
    light: "Medium",
    water: "Medium",
    humidity: "Medium",
    temperature: "Moderate",
    space: "Large",
    maintenance: "Medium",
    difficulty: "Moderate",
    size: "Large",
    indoorSuitability: "Suitable",
    description:
      "A bold plant with large, glossy leaves that makes a striking statement piece in any room.",
    careGuide: {
      watering: "Water when the top inch of soil feels dry, about once a week.",
      fertilizer:
        "Feed monthly during the growing season with a balanced fertilizer.",
      repotting: "Repot every 1–2 years to support its growth.",
      cleaning: "Wipe large leaves regularly to keep them shiny and dust-free.",
    },
  },
  {
    id: 7,
    name: "Monstera Deliciosa",
    scientificName: "Monstera deliciosa",
    image: "image/plant/monstera-deliciosa.webp",
    light: "Medium",
    water: "Medium",
    humidity: "High",
    temperature: "Moderate",
    space: "Very Large",
    maintenance: "Medium",
    difficulty: "Moderate",
    size: "Large",
    indoorSuitability: "Suitable",
    description:
      "A dramatic tropical climber with large, split leaves that becomes a focal point but needs room to spread.",
    careGuide: {
      watering:
        "Water when the top 2–3 inches of soil are dry, about every 1–2 weeks.",
      fertilizer:
        "Feed monthly with a balanced liquid fertilizer during spring and summer.",
      repotting: "Repot every 2 years, or when roots circle the pot.",
      cleaning: "Wipe the large leaves regularly to remove dust.",
    },
  },
  {
    id: 8,
    name: "Heartleaf Philodendron",
    scientificName: "Philodendron hederaceum",
    image: "image/plant/heartleaf-philodendron.webp",
    light: "Low",
    water: "Medium",
    humidity: "Medium",
    temperature: "Moderate",
    space: "Small",
    maintenance: "Low",
    difficulty: "Easy",
    size: "Medium",
    indoorSuitability: "Highly Suitable",
    description:
      "A graceful trailing vine with heart-shaped leaves that grows well in shaded rooms and forgives occasional neglect.",
    careGuide: {
      watering:
        "Water when the top inch of soil feels dry, about every 1–2 weeks.",
      fertilizer:
        "Feed monthly with a balanced liquid fertilizer during the growing season.",
      repotting: "Repot every 1–2 years or when roots fill the pot.",
      cleaning: "Wipe leaves with a damp cloth to keep them clean and glossy.",
    },
  },
  {
    id: 9,
    name: "Chinese Evergreen (Aglaonema)",
    scientificName: "Aglaonema commutatum",
    image: "image/plant/chinese-evergreen-aglaonema.webp",
    light: "Low",
    water: "Medium",
    humidity: "Medium",
    temperature: "Warm",
    space: "Medium",
    maintenance: "Low",
    difficulty: "Easy",
    size: "Medium",
    indoorSuitability: "Highly Suitable",
    description:
      "A durable foliage plant with patterned leaves that tolerates shade and indoor conditions well.",
    careGuide: {
      watering:
        "Water when the top 1–2 inches of soil are dry, about every 1–2 weeks.",
      fertilizer:
        "Feed every 2 months with a diluted balanced fertilizer in spring and summer.",
      repotting: "Repot every 2–3 years, as growth is slow.",
      cleaning: "Wipe leaves occasionally to remove dust.",
    },
  },
  {
    id: 10,
    name: "Lucky Bamboo",
    scientificName: "Dracaena braunii",
    image: "image/plant/lucky-bamboo.webp",
    light: "Low",
    water: "Very High",
    humidity: "Medium",
    temperature: "Warm",
    space: "Very Small",
    maintenance: "Low",
    difficulty: "Easy",
    size: "Small",
    indoorSuitability: "Highly Suitable",
    description:
      "A symbolic, low-maintenance plant often grown in water or moist soil, popular for desks and small spaces.",
    careGuide: {
      watering:
        "If grown in water, change it every 1–2 weeks and keep the roots submerged.",
      fertilizer:
        "Feed lightly every 2 months with a diluted liquid fertilizer.",
      repotting:
        "Change its container only when it outgrows its current space.",
      cleaning: "Rinse stalks and leaves occasionally with clean water.",
    },
  },
  {
    id: 11,
    name: "Boston Fern",
    scientificName: "Nephrolepis exaltata",
    image: "image/plant/boston-fern.webp",
    light: "Medium",
    water: "High",
    humidity: "Very High",
    temperature: "Mild",
    space: "Medium",
    maintenance: "High",
    difficulty: "Hard",
    size: "Medium",
    indoorSuitability: "Moderately Suitable",
    description:
      "A lush, feathery fern that loves humid air and constant moisture, best for people willing to give it regular attention.",
    careGuide: {
      watering:
        "Keep soil evenly moist and never let it dry out; water about twice a week.",
      fertilizer:
        "Feed monthly with a diluted liquid fertilizer during spring and summer.",
      repotting: "Repot once a year or when roots fill the pot.",
      cleaning:
        "Trim brown fronds and mist or rinse the foliage to keep it fresh.",
    },
  },
  {
    id: 12,
    name: "Areca Palm",
    scientificName: "Dypsis lutescens",
    image: "image/plant/areca-palm.webp",
    light: "High",
    water: "High",
    humidity: "High",
    temperature: "Warm",
    space: "Large",
    maintenance: "Medium",
    difficulty: "Hard",
    size: "Large",
    indoorSuitability: "Moderately Suitable",
    description:
      "A graceful, feathery palm that adds a tropical feel and helps soften larger indoor spaces.",
    careGuide: {
      watering:
        "Water when the top inch of soil is dry, keeping soil lightly moist.",
      fertilizer:
        "Feed monthly during spring and summer with a balanced fertilizer.",
      repotting: "Repot every 2 years or when roots become crowded.",
      cleaning: "Mist or wipe the fronds occasionally to prevent dust buildup.",
    },
  },
  {
    id: 13,
    name: "Parlor Palm",
    scientificName: "Chamaedorea elegans",
    image: "image/plant/parlor-palm.webp",
    light: "Low",
    water: "Medium",
    humidity: "Medium",
    temperature: "Mild",
    space: "Medium",
    maintenance: "Low",
    difficulty: "Easy",
    size: "Medium",
    indoorSuitability: "Highly Suitable",
    description:
      "A compact, slow-growing palm that tolerates shade and suits shelves, corners and small to medium rooms.",
    careGuide: {
      watering:
        "Water when the top inch of soil is dry, about every 1–2 weeks.",
      fertilizer:
        "Feed every 2 months with a diluted balanced fertilizer in spring and summer.",
      repotting: "Repot every 2–3 years, as growth is slow.",
      cleaning: "Wipe fronds gently with a damp cloth to remove dust.",
    },
  },
  {
    id: 14,
    name: "Aloe Vera",
    scientificName: "Aloe vera",
    image: "image/plant/aloe-vera.webp",
    light: "High",
    water: "Low",
    humidity: "Very Low",
    temperature: "Moderate",
    space: "Small",
    maintenance: "Very Low",
    difficulty: "Easy",
    size: "Small",
    indoorSuitability: "Suitable",
    description:
      "A hardy succulent that stores water in its leaves, making it drought-tolerant and easy to care for.",
    careGuide: {
      watering:
        "Water deeply but infrequently; let the soil dry out completely between waterings.",
      fertilizer:
        "Feed once or twice a year with a cactus/succulent fertilizer.",
      repotting: "Repot every 2 years or when it outgrows its container.",
      cleaning: "Wipe leaves occasionally; avoid overwatering to prevent rot.",
    },
  },
  {
    id: 15,
    name: "Golden Barrel Cactus",
    scientificName: "Echinocactus grusonii",
    image: "image/plant/golden-barrel-cactus.webp",
    light: "Very High",
    water: "Very Low",
    humidity: "Very Low",
    temperature: "Warm",
    space: "Small",
    maintenance: "Very Low",
    difficulty: "Moderate",
    size: "Small",
    indoorSuitability: "Moderately Suitable",
    description:
      "A slow-growing, spiny round cactus that needs very bright light and almost no watering, best for sunny windowsills.",
    careGuide: {
      watering:
        "Water only when the soil is completely dry, about every 3–4 weeks in summer and rarely in winter.",
      fertilizer:
        "Feed once or twice during the growing season with a cactus fertilizer.",
      repotting:
        "Repot every 3–4 years using thick gloves or folded newspaper to handle the spines.",
      cleaning: "Dust gently with a soft brush; avoid wetting the crown.",
    },
  },
  {
    id: 16,
    name: "Christmas Cactus",
    scientificName: "Schlumbergera × buckleyi",
    image: "image/plant/christmas-cactus.webp",
    light: "Medium",
    water: "Medium",
    humidity: "Medium",
    temperature: "Mild",
    space: "Small",
    maintenance: "Medium",
    difficulty: "Moderate",
    size: "Small",
    indoorSuitability: "Suitable",
    description:
      "A trailing jungle cactus that blooms in cooler months and prefers moderate light and moisture unlike desert cacti.",
    careGuide: {
      watering:
        "Water when the top inch of soil is dry, about every 1–2 weeks; reduce slightly after flowering.",
      fertilizer:
        "Feed monthly with a balanced fertilizer from spring to early autumn.",
      repotting: "Repot every 2–3 years, preferably after flowering.",
      cleaning: "Gently wipe the flat stem segments to remove dust.",
    },
  },
  {
    id: 17,
    name: "Zebra Haworthia",
    scientificName: "Haworthiopsis fasciata",
    image: "image/plant/zebra-haworthia.webp",
    light: "Medium",
    water: "Low",
    humidity: "Low",
    temperature: "Moderate",
    space: "Very Small",
    maintenance: "Low",
    difficulty: "Easy",
    size: "Tiny",
    indoorSuitability: "Highly Suitable",
    description:
      "A tiny striped succulent that tolerates indoor light better than most succulents and suits desks and shelves.",
    careGuide: {
      watering:
        "Water every 2–3 weeks once the soil is completely dry; water less in winter.",
      fertilizer:
        "Feed once or twice during spring and summer with a diluted succulent fertilizer.",
      repotting: "Repot every 2–3 years or when offsets crowd the pot.",
      cleaning:
        "Remove dead lower leaves and dust the rosette with a soft brush.",
    },
  },
  {
    id: 18,
    name: "Moon Cactus",
    scientificName: "Gymnocalycium mihanovichii",
    image: "image/plant/moon-cactus.webp",
    light: "High",
    water: "Very Low",
    humidity: "Very Low",
    temperature: "Warm",
    space: "Very Small",
    maintenance: "Low",
    difficulty: "Moderate",
    size: "Tiny",
    indoorSuitability: "Moderately Suitable",
    description:
      "A small grafted cactus with a bright coloured top, popular as a desk plant but sensitive to overwatering and low light.",
    careGuide: {
      watering:
        "Water sparingly, about every 2–3 weeks, only when the soil is completely dry.",
      fertilizer:
        "Feed once a month in spring and summer with a diluted cactus fertilizer.",
      repotting:
        "Repot every 2 years in a small pot with fast-draining cactus mix.",
      cleaning:
        "Dust gently with a soft brush and avoid wetting the coloured top.",
    },
  },
  {
    id: 19,
    name: "Bunny Ears Cactus",
    scientificName: "Opuntia microdasys",
    image: "image/plant/boston-fern.webp",
    light: "Very High",
    water: "Very Low",
    humidity: "Very Low",
    temperature: "Warm",
    space: "Small",
    maintenance: "Low",
    difficulty: "Moderate",
    size: "Small",
    indoorSuitability: "Moderately Suitable",
    description:
      "A pad-shaped cactus covered in soft-looking dots that need strong light and very little water to stay healthy.",
    careGuide: {
      watering:
        "Water only when the soil is fully dry, about every 2–3 weeks in summer and rarely in winter.",
      fertilizer:
        "Feed once or twice during the growing season with a cactus fertilizer.",
      repotting:
        "Repot every 2–3 years using thick gloves or tongs, as the fine bristles irritate skin.",
      cleaning: "Dust with a soft brush; avoid touching the bristles.",
    },
  },
  {
    id: 20,
    name: "Echeveria",
    scientificName: "Echeveria elegans",
    image: "image/plant/echeveria.webp",
    light: "Very High",
    water: "Low",
    humidity: "Very Low",
    temperature: "Moderate",
    space: "Very Small",
    maintenance: "Medium",
    difficulty: "Moderate",
    size: "Tiny",
    indoorSuitability: "Moderately Suitable",
    description:
      "A compact rosette succulent that needs very bright light to keep its shape and colour, ideal for sunny windowsills.",
    careGuide: {
      watering:
        "Water every 2 weeks once the soil is dry, keeping water out of the rosette centre.",
      fertilizer:
        "Feed once or twice during spring and summer with a diluted succulent fertilizer.",
      repotting: "Repot every 1–2 years in fast-draining cactus mix.",
      cleaning: "Remove dead lower leaves and dust gently with a soft brush.",
    },
  },
];

/* -------------------------------------------------------------
   JSON DATA LOADER
   -------------------------------------------------------------
   Tries to fetch Data/plants.json and replaces the built-in list above
   with whatever it contains. If the file is missing or the browser
   blocks the request (common when opening via file://), the
   built-in sample data is kept instead.
   ------------------------------------------------------------- */
async function loadPlantData() {
  try {
    const res = await fetch("Data/plants.json");
    if (!res.ok) throw new Error("Data/plants.json unavailable");
    const data = await res.json();
    if (Array.isArray(data.plants) && data.plants.length > 0) {
      plants.length = 0;
      plants.push(...data.plants);
    }
  } catch {
    // Keep the built-in sample data above.
  }
}

/* -------------------------------------------------------------
   2. EXPLORE PLANTS PAGE
   -------------------------------------------------------------
   Everything in this block only runs if #plant-grid exists on
   the current page — so this file is safe to include everywhere.
   ------------------------------------------------------------- */

/* Each entry maps a dropdown id (#filter-<key>) to the plant field it
   filters on, plus the order its values should be listed in. Only the
   order matters for the data itself — the values shown come from the
   plants themselves, so a new value in Data/plants.json (e.g. an extra
   light level) shows up as a new option without touching the HTML. */
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

// List the distinct values of one field, ordered by the scale above
// (values not listed in the scale are sorted alphabetically at the end).
function getFilterValues(field, order) {
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

// Fill each dropdown with "All" plus one option per value found in the data
function populateFilterOptions() {
  FILTER_FIELDS.forEach(({ selectId, field, order }) => {
    const select = document.getElementById(selectId);

    if (!select) return;

    const options = ["All", ...getFilterValues(field, order)].map(
      (value) => `<option value="${value}">${value}</option>`
    );

    select.innerHTML = options.join("");
  });
}

function initExplorePage() {
  const plantGrid = document.getElementById("plant-grid");

  if (!plantGrid) return;

  const searchInput = document.getElementById("search-input");
  const filters = FILTER_FIELDS.map(({ selectId, field }) => ({
    field,
    element: document.getElementById(selectId),
  }));
  const noResultsMessage = document.getElementById("no-results");

  populateFilterOptions();

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
          <a href="plant-details.html?id=${plant.id}" class="btn btn--secondary plant-card__btn">View Details</a>
        </div>
      </article>
    `;
  }

  // Draw a list of plants into the grid, and show/hide the
  // "no results" message depending on how many were found
  function renderPlants(list) {
    plantGrid.innerHTML = list.map(createPlantCard).join("");
    noResultsMessage.hidden = list.length > 0;
  }

  // Read the current search text + every filter dropdown, and
  // return only the plants that match ALL of them at once
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

  // Run updateResults() every time the user types or changes a filter
  searchInput.addEventListener("input", updateResults);
  filters.forEach(({ element }) => element.addEventListener("change", updateResults));

  // Show every plant when the page first loads
  renderPlants(plants);
}

/* -------------------------------------------------------------
   3. PLANT DETAILS PAGE
   -------------------------------------------------------------
   Everything in this block only runs if #plant-name exists on
   the current page (i.e. we're on plant-details.html).
   ------------------------------------------------------------- */
function initDetailsPage() {
  const plantNameEl = document.getElementById("plant-name");

  if (!plantNameEl) return;

  // Read the "id" value from the page URL, e.g. plant-details.html?id=2
  const urlParams = new URLSearchParams(window.location.search);
  const requestedId = Number(urlParams.get("id"));

  // Find the matching plant. If no id was given (or it doesn't
  // match anything), fall back to the first plant (Snake Plant).
  const plant = plants.find((p) => p.id === requestedId) || plants[0];

  // --- Fill in the hero section ---
  const imageEl = document.getElementById("plant-image");
  imageEl.src = plant.image;
  imageEl.alt = plant.name;

  plantNameEl.textContent = plant.name;
  document.getElementById("plant-scientific").textContent = plant.scientificName;
  document.getElementById("plant-short-description").textContent = plant.description;

  // --- Fill in the requirements grid ---
  document.getElementById("req-light").textContent = plant.light;
  document.getElementById("req-water").textContent = plant.water;
  document.getElementById("req-humidity").textContent = plant.humidity;
  document.getElementById("req-temperature").textContent = plant.temperature;
  document.getElementById("req-space").textContent = plant.space;
  document.getElementById("req-maintenance").textContent = plant.maintenance;
  document.getElementById("req-difficulty").textContent = plant.difficulty;
  document.getElementById("req-suitability").textContent = plant.indoorSuitability;

  // --- Fill in "About This Plant" ---
  document.getElementById("plant-description").textContent = plant.description;

  // --- Fill in the Care Guide ---
  document.getElementById("care-watering").textContent = plant.careGuide.watering;
  document.getElementById("care-fertilizer").textContent = plant.careGuide.fertilizer;
  document.getElementById("care-repotting").textContent = plant.careGuide.repotting;
  document.getElementById("care-cleaning").textContent = plant.careGuide.cleaning;

  // --- Fill in the Indoor Suitability banner ---
  document.getElementById("suitability-value").textContent = plant.indoorSuitability;
  document.getElementById("suitability-note").textContent =
    plant.name +
    " is " +
    plant.indoorSuitability.toLowerCase() +
    " for indoor spaces thanks to its " +
    plant.difficulty.toLowerCase() +
    " care needs.";

  // --- "Add to My Plants" button ---
  // This is just a prototype for now — the real My Plants system
  // will be built later.
  document.getElementById("add-to-my-plants").addEventListener("click", () => {
    alert(plant.name + " added to My Plants!");
  });
}

/* -------------------------------------------------------------
   BOOT
   -------------------------------------------------------------
   Load the data first (Data/plants.json if possible), then let each
   page initialize its own widgets.
   ------------------------------------------------------------- */
(async function boot() {
  await loadPlantData();
  initExplorePage();
  initDetailsPage();
})();