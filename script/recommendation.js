

(function () {
  "use strict";

  var DETAILS_URL = "plant-details.html?id=";

  // names plant-data.js may use for the plant array
  var PLANT_GLOBAL_NAMES = [
    "plants", "PLANTS", "plantData", "PLANT_DATA", "plantsData",
    "plantList", "allPlants", "plantDatabase", "plantDB", "PlantData"
  ];

  // used if the plants are not in a variable
  var PLANT_JSON_PATHS = ["../assets/Data/plants.json"];

  // the survey questions with their 5 answers
  // rule "atOrBelow": plant level must be <= answer level
  // rule "withinOne": plant level and answer level can differ by 1
  var SURVEY = [
    {
      field: "light", title: "Light", rule: "atOrBelow",
      question: "How much natural light does the spot for your plant get?",
      hint: "Light is the biggest factor in whether a plant stays healthy.",
      options: [
        { value: "Very Low", description: "Far from any window, or mostly artificial light" },
        { value: "Low", description: "Several metres from a window, or a shaded room" },
        { value: "Medium", description: "Near a window with bright light but no direct sun" },
        { value: "High", description: "At a window with a few hours of direct sun" },
        { value: "Very High", description: "Full-sun window (south/west) with 5+ hours of direct sun" }
      ]
    },
    {
      field: "water", title: "Watering", rule: "atOrBelow",
      question: "How often are you willing to water your plant?",
      hint: "Pick the routine you will realistically keep up.",
      options: [
        { value: "Very Low", description: "Once a month or less" },
        { value: "Low", description: "Every 2–3 weeks" },
        { value: "Medium", description: "About once a week" },
        { value: "High", description: "2–3 times a week" },
        { value: "Very High", description: "Daily checks; happy with constantly moist or water-grown plants" }
      ]
    },
    {
      field: "humidity", title: "Humidity", rule: "withinOne",
      question: "How humid is the room where the plant will live?",
      hint: "Plants can struggle when the air is much drier or much wetter than they like.",
      options: [
        { value: "Very Low", description: "Very dry; air conditioning running most of the day" },
        { value: "Low", description: "Dry; air-conditioned for part of the day" },
        { value: "Medium", description: "Normal, comfortable air" },
        { value: "High", description: "Humid; typical monsoon or non-air-conditioned room" },
        { value: "Very High", description: "Very humid; for example a poorly ventilated bathroom or kitchen" }
      ]
    },
    {
      field: "temperature", title: "Temperature", rule: "withinOne",
      question: "What is the usual room temperature?",
      hint: "Choose the temperature the room is most often at.",
      options: [
        { value: "Cool", description: "Up to 15°C" },
        { value: "Mild", description: "15–20°C" },
        { value: "Moderate", description: "20–25°C" },
        { value: "Warm", description: "25–30°C" },
        { value: "Hot", description: "Above 30°C" }
      ]
    },
    {
      field: "space", title: "Space", rule: "atOrBelow",
      question: "How much space do you have for the plant?",
      hint: "Think about the spot where the plant would actually sit.",
      options: [
        { value: "Very Small", description: "Desk or small shelf" },
        { value: "Small", description: "Table, windowsill or wide shelf" },
        { value: "Medium", description: "Floor corner or small stand" },
        { value: "Large", description: "Dedicated floor area" },
        { value: "Very Large", description: "Open floor space in a large room" }
      ]
    },
    {
      field: "maintenance", title: "Maintenance", rule: "atOrBelow",
      question: "How much care time can you give per week?",
      hint: "This covers watering, cleaning, trimming and checking on the plant.",
      options: [
        { value: "Very Low", description: "Almost none" },
        { value: "Low", description: "A few minutes" },
        { value: "Medium", description: "About 15–30 minutes" },
        { value: "High", description: "Attention several times a week" },
        { value: "Very High", description: "Daily care; plants are a hobby" }
      ]
    },
    {
      field: "difficulty", title: "Experience", rule: "atOrBelow",
      question: "How would you describe your plant-care experience?",
      hint: "Be honest. Easier plants forgive mistakes.",
      options: [
        { value: "Very Easy", description: "Complete beginner, or I often lose plants" },
        { value: "Easy", description: "Beginner" },
        { value: "Moderate", description: "Some experience" },
        { value: "Hard", description: "Experienced" },
        { value: "Very Hard", description: "Expert" }
      ]
    },
    {
      field: "size", title: "Size", rule: "atOrBelow",
      question: "What is the largest mature size you would accept?",
      hint: "Plants keep growing, so think about how big it will get.",
      options: [
        { value: "Tiny", description: "Under 15 cm" },
        { value: "Small", description: "15–40 cm" },
        { value: "Medium", description: "40–80 cm" },
        { value: "Large", description: "80–150 cm" },
        { value: "Giant", description: "Over 150 cm" }
      ]
    }
  ];

  // only used to sort the results
  var SUITABILITY_LEVELS = [
    "Unsuitable", "Poorly Suitable", "Moderately Suitable", "Suitable", "Highly Suitable"
  ];

  // which answers we are allowed to relax, in order
  var RELAX_ORDER = ["size", "space", "maintenance", "difficulty"];
  var MAX_RELAX_LEVELS = 2;
  var ENVIRONMENT_FIELDS = ["light", "water", "humidity", "temperature"];

  // turns each answer into a level number so we can compare them
  var LEVEL_MAPS = {};
  SURVEY.forEach(function (q) {
    LEVEL_MAPS[q.field] = q.options.map(function (o) { return o.value; });
  });
  LEVEL_MAPS.indoorSuitability = SUITABILITY_LEVELS;

  function normalise(value) {
    return String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  }

  // gives 1 to 5, or 0 if the value is unknown
  function getLevel(field, value) {
    var list = LEVEL_MAPS[field];
    if (!list) { return 0; }
    var wanted = normalise(value);
    for (var i = 0; i < list.length; i++) {
      if (normalise(list[i]) === wanted) { return i + 1; }
    }
    return 0;
  }

  function getQuestion(field) {
    for (var i = 0; i < SURVEY.length; i++) {
      if (SURVEY[i].field === field) { return SURVEY[i]; }
    }
    return null;
  }

  // every field has to use one of the standard values
  function isValidPlant(plant) {
    if (!plant || typeof plant !== "object") { return false; }
    if (plant.id === undefined || plant.id === null || !plant.name) { return false; }
    if (getLevel("indoorSuitability", plant.indoorSuitability) === 0) { return false; }
    return SURVEY.every(function (q) { return getLevel(q.field, plant[q.field]) > 0; });
  }

  // matching rules

  function passesRule(rule, plantLevel, userLevel, extraAllowance) {
    if (rule === "withinOne") {
      return Math.abs(plantLevel - userLevel) <= 1;
    }
    return plantLevel <= userLevel + (extraAllowance || 0);
  }

  // extraAllowance gives a field extra levels
  // leave it empty to use the normal survey rules
  function matchesPlant(plant, answers, extraAllowance) {
    var extra = extraAllowance || {};
    return SURVEY.every(function (q) {
      var plantLevel = getLevel(q.field, plant[q.field]);
      var userLevel = getLevel(q.field, answers[q.field]);
      return passesRule(q.rule, plantLevel, userLevel, extra[q.field]);
    });
  }

  function filterPlants(plants, answers, extraAllowance) {
    return plants.filter(function (plant) {
      return matchesPlant(plant, answers, extraAllowance);
    });
  }

  // check which of the normal rules this plant passes
  function getRuleResults(plant, answers) {
    return SURVEY.map(function (q) {
      var plantLevel = getLevel(q.field, plant[q.field]);
      var userLevel = getLevel(q.field, answers[q.field]);
      return { field: q.field, passedExactly: passesRule(q.rule, plantLevel, userLevel, 0) };
    });
  }
  function getMatchPercentage(plant, answers) {
  var results = getRuleResults(plant, answers);

  var passed = results.filter(function (result) {
    return result.passedExactly;
  }).length;

  return Math.round((passed / SURVEY.length) * 1000) / 10;
}

  // fallback: relax the rules a bit when nothing matches
function relaxRequirements() {
  var stages = [];

  // relax one field at a time, in RELAX_ORDER
  for (var i = 0; i < RELAX_ORDER.length; i++) {
    var field = RELAX_ORDER[i];

    stages.push({
      round: 1,
      extra: { [field]: 1 },
      relaxedFields: [field]
    });
  }

  // still nothing, so allow two levels this time
  for (var j = 0; j < RELAX_ORDER.length; j++) {
    var field2 = RELAX_ORDER[j];

    stages.push({
      round: 2,
      extra: { [field2]: 2 },
      relaxedFields: [field2]
    });
  }

  return stages;
}

  // how many plants pass each light/water/humidity/temperature answer
  function describeBlockers(plants, answers) {
    return ENVIRONMENT_FIELDS.map(function (field) {
      var q = getQuestion(field);
      var count = plants.filter(function (plant) {
        return passesRule(q.rule, getLevel(field, plant[field]), getLevel(field, answers[field]), 0);
      }).length;
      return { field: field, title: q.title, count: count };
    }).sort(function (a, b) { return a.count - b.count; });
  }

function findRecommendations(plants, answers) {
  var validPlants = plants.filter(function (plant) {
    return isValidPlant(plant);
  });

  if (validPlants.length === 0) {
    return {
      mode: "none",
      results: [],
      relaxedFields: [],
      round: 0,
      blockers: describeBlockers(plants, answers)
    };
  }

  return {
    mode: "ranked",
    results: rankPlants(validPlants, answers),
    relaxedFields: [],
    round: 0
  };
}

  // sort by suitability, then by how close the answers are
  function calculateDistance(plant, answers) {
    return SURVEY.reduce(function (total, q) {
      return total + Math.abs(getLevel(q.field, plant[q.field]) - getLevel(q.field, answers[q.field]));
    }, 0);
  }
function calculateMatchPercentage(plant, answers) {
  var matched = getRuleResults(plant, answers).filter(function (result) {
    return result.passedExactly;
  }).length;

  return Math.round((matched / SURVEY.length) * 100);
}
  function compareIds(a, b) {
    var na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) { return na - nb; }
    return String(a).localeCompare(String(b));
  }

function rankPlants(plants, answers) {
  return plants.slice().sort(function (a, b) {
    var byPercentage = calculateMatchPercentage(b, answers) -
                       calculateMatchPercentage(a, answers);

    if (byPercentage !== 0) { return byPercentage; }

    var bySuitability = getLevel("indoorSuitability", b.indoorSuitability) -
                        getLevel("indoorSuitability", a.indoorSuitability);

    if (bySuitability !== 0) { return bySuitability; }

    var byDistance = calculateDistance(a, answers) -
                     calculateDistance(b, answers);

    if (byDistance !== 0) { return byDistance; }

    return compareIds(a.id, b.id);
  });
}

  var api = {
    SURVEY: SURVEY,
    getLevel: getLevel,
    isValidPlant: isValidPlant,
    matchesPlant: matchesPlant,
    filterPlants: filterPlants,
    relaxRequirements: relaxRequirements,
    findRecommendations: findRecommendations,
    rankPlants: rankPlants,
    calculateDistance: calculateDistance
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document === "undefined") { return; }

  // read the plants from the page

  function readGlobal(name) {
    try {
      // new Function can see top level const/let, window cannot
      return new Function("return typeof " + name + ' !== "undefined" ? ' + name + " : undefined;")();
    } catch (err) {
      return undefined;
    }
  }

  function toPlantArray(value) {
    if (Array.isArray(value)) { return value; }
    if (value && Array.isArray(value.plants)) { return value.plants; }
    return null;
  }

  function looksLikePlantList(list) {
    return Array.isArray(list) && list.length > 0 && list.every(function (p) {
      return p && typeof p === "object" && "name" in p && "light" in p && "water" in p;
    });
  }

  function findPlantsInPage() {
    var i, list;
    for (i = 0; i < PLANT_GLOBAL_NAMES.length; i++) {
      list = toPlantArray(readGlobal(PLANT_GLOBAL_NAMES[i]));
      if (looksLikePlantList(list)) { return list; }
    }
    var keys = Object.keys(window);
    for (i = 0; i < keys.length; i++) {
      try { list = toPlantArray(window[keys[i]]); } catch (err) { list = null; }
      if (looksLikePlantList(list)) { return list; }
    }
    return null;
  }

  function fetchPlantsJson() {
    var index = 0;
    function tryNext() {
      if (index >= PLANT_JSON_PATHS.length) { return Promise.resolve(null); }
      var path = PLANT_JSON_PATHS[index++];
      return fetch(path)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          var list = toPlantArray(data);
          return looksLikePlantList(list) ? list : tryNext();
        })
        .catch(tryNext);
    }
    return tryNext();
  }

  var cachedPlants = null;

  function loadPlants() {
    if (cachedPlants) { return Promise.resolve(cachedPlants); }

    var raw = findPlantsInPage();
    var source = raw ? Promise.resolve(raw) : fetchPlantsJson();

    return source.then(function (list) {
      if (!list) { throw new Error("Plant data not found."); }
      var usable = list.filter(function (plant) {
        var ok = isValidPlant(plant);
        if (!ok) {
          console.warn("Plantora recommendation: skipped a plant with missing or non-standard values:", plant);
        }
        return ok;
      });
      if (usable.length === 0) { throw new Error("No plants with valid standardized values."); }
      cachedPlants = usable;
      return usable;
    });
  }

  // small helper to build a DOM node

  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === "className") { node.className = props[key]; }
      else if (key === "text") { node.textContent = props[key]; }
      else { node.setAttribute(key, props[key]); }
    });
    (children || []).forEach(function (child) { if (child) { node.appendChild(child); } });
    return node;
  }

  var form, surveyView, resultsView, errorBox;

  function renderSurvey() {
    var wrap = document.getElementById("survey-questions");
    SURVEY.forEach(function (q, index) {
      var legend = el("legend", { className: "question-card__legend" }, [
        el("span", { className: "question-card__number", text: String(index + 1), "aria-hidden": "true" }),
        el("span", {}, [
          el("span", { className: "question-card__title", text: q.title }),
          el("span", { className: "question-card__question", text: q.question })
        ])
      ]);

      var grid = el("div", { className: "option-grid" });
      q.options.forEach(function (opt, i) {
        var id = "q-" + q.field + "-" + (i + 1);
        var label = el("label", { className: "option-card", "for": id }, [
          el("input", { className: "option-card__input", type: "radio", name: q.field, id: id, value: opt.value }),
          el("span", { className: "option-card__body" }, [
            el("span", { className: "option-card__value", text: opt.value }),
            el("span", { className: "option-card__desc", text: opt.description })
          ])
        ]);
        grid.appendChild(label);
      });

      var card = el("fieldset", { className: "question-card", "data-field": q.field }, [
        legend,
        el("p", { className: "question-card__hint", text: q.hint }),
        grid,
        el("p", { className: "question-card__error", text: "Please choose an answer for this question.", hidden: "" })
      ]);
      wrap.appendChild(card);
    });
  }

  function getUserAnswers() {
    var data = new FormData(form);
    var answers = {};
    SURVEY.forEach(function (q) {
      var value = data.get(q.field);
      answers[q.field] = value === null ? null : String(value);
    });
    return answers;
  }

  function validateSurvey(answers) {
    return SURVEY.filter(function (q) { return !answers[q.field]; }).map(function (q) { return q.field; });
  }

  function countAnswered(answers) {
    return SURVEY.filter(function (q) { return answers[q.field]; }).length;
  }

  function updateProgress() {
    var answered = countAnswered(getUserAnswers());
    var percent = Math.round((answered / SURVEY.length) * 100);
    document.getElementById("progress-label").textContent =
      "Questions answered: " + answered + " of " + SURVEY.length;
    document.getElementById("progress-percent").textContent = percent + "%";
    document.getElementById("progress-fill").style.width = percent + "%";
    document.getElementById("progress-bar").setAttribute("aria-valuenow", String(answered));
  }

  function markMissing(missingFields) {
    document.querySelectorAll(".question-card").forEach(function (card) {
      var isMissing = missingFields.indexOf(card.getAttribute("data-field")) !== -1;
      card.classList.toggle("is-missing", isMissing);
      card.querySelector(".question-card__error").hidden = !isMissing;
    });
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function scrollToNode(node) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  // joins words with commas and "and"
  function joinWords(words) {
    if (words.length <= 1) { return words.join(""); }
    return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
  }

  var FIELD_WORDS = { size: "size", space: "space", maintenance: "maintenance", difficulty: "experience" };

  var PASS_TEXT = {
    light: "Suits your light level",
    water: "Fits your watering routine",
    humidity: "Works in your room's humidity",
    temperature: "Comfortable at your room temperature",
    space: "Fits your available space",
    maintenance: "Fits the care time you have",
    difficulty: "Suits your experience level",
    size: "Stays within your size limit"
  };

  var RELAXED_TEXT = {
    space: "Needs a bit more space than you listed",
    maintenance: "Needs a bit more care time than you listed",
    difficulty: "More demanding than your experience level",
    size: "Grows larger than your size limit"
  };

  var META_FIELDS = [
    ["light", "Light"], ["water", "Water"], ["humidity", "Humidity"], ["temperature", "Temperature"],
    ["space", "Space"], ["maintenance", "Maintenance"], ["difficulty", "Difficulty"],
    ["size", "Size"], ["indoorSuitability", "Indoor suitability"]
  ];

  function createPlantCard(plant, answers, mode) {
    var relaxed = mode === "relaxed";
var matchPercentage = getMatchPercentage(plant, answers);
    var image;
    if (plant.image) {
      image = el("img", {
        className: "plant-card__image", src: plant.image, alt: plant.name, loading: "lazy"
      });
      image.addEventListener("error", function () {
        image.replaceWith(el("div", { className: "rec-card__noimage", text: "🌿", "aria-hidden": "true" }));
      });
    } else {
      image = el("div", { className: "rec-card__noimage", text: "🌿", "aria-hidden": "true" });
    }

    var meta = el("ul", { className: "rec-meta" });
    META_FIELDS.forEach(function (pair) {
      meta.appendChild(el("li", {}, [
        el("span", { className: "rec-meta__label", text: pair[1] }),
        el("span", { className: "rec-meta__value", text: String(plant[pair[0]]) })
      ]));
    });

    var why = el("ul");
    getRuleResults(plant, answers).forEach(function (result) {
      var isRelaxedItem = !result.passedExactly;
      why.appendChild(el("li", {
        className: isRelaxedItem ? "is-relaxed" : "",
        text: isRelaxedItem
  ? (RELAXED_TEXT[result.field] || "Does not match your preference")
  : PASS_TEXT[result.field]
      }));
    });
    var matchPercentage = getMatchPercentage(plant, answers);
    var content = el("div", { className: "plant-card__content" }, [
        el("div", {
        className: "rec-match-score",
        text: matchPercentage + "% Match"
    }),
el("span", {
  className: "rec-badge " + (matchPercentage === 100 ? "rec-badge--exact" : "rec-badge--relaxed"),
  text: matchPercentage === 100 ? "Matches all your answers" : "Closest match"
}),
      el("h3", { className: "plant-card__title", text: plant.name }),
      plant.scientificName ? el("p", { className: "plant-card__scientific", text: plant.scientificName }) : null,
      plant.description ? el("p", { className: "rec-card__description", text: plant.description }) : null,
      meta,
      el("div", { className: "rec-why" }, [
        el("p", { className: "rec-why__title", text: "Why it matches" }),
        why
      ]),
      el("a", {
        className: "btn btn--primary plant-card__btn",
        href: DETAILS_URL + encodeURIComponent(plant.id),
        text: "View Details"
      })
    ]);

    return el("article", { className: "plant-card" }, [image, content]);
  }

  function relaxedMessage(outcome) {
    var words = outcome.relaxedFields.map(function (f) { return FIELD_WORDS[f]; });
    var plural = words.length > 1;
    var how = outcome.round === 1 ? "slightly" : "further";
    return "Your exact requirements were very specific, so we relaxed the " + joinWords(words) +
      (plural ? " requirements " : " requirement ") + how + " to find suitable plants.";
  }

  function renderResults(outcome, answers) {
    var grid = document.getElementById("results-grid");
    var notice = document.getElementById("results-notice");
    var empty = document.getElementById("results-empty");
    var count = document.getElementById("results-count");

    grid.textContent = "";
    notice.textContent = "";
    notice.hidden = true;
    empty.textContent = "";
    empty.hidden = true;

    if (outcome.mode === "none") {
      count.textContent = "No plants found";
      grid.hidden = true;

      var list = el("ul");
      (outcome.blockers || []).forEach(function (b) {
        list.appendChild(el("li", {
          text: b.title + ": " + b.count + (b.count === 1 ? " plant fits" : " plants fit") + " this answer on its own"
        }));
      });

      empty.appendChild(el("div", { className: "rec-empty" }, [
        el("h3", { text: "No plant fits all of your conditions" }),
        el("p", {
          text: "Even with flexible size, space, care time and experience limits, no plant matches your light, " +
                "watering, humidity and temperature answers together. We did not loosen those because they decide " +
                "whether a plant can survive in your room."
        }),
        el("p", { text: "Fewest matching plants by condition:" }),
        list,
        el("p", { text: "Try changing the answer with the lowest number, then search again." })
      ]));
      empty.hidden = false;
      return;
    }

    grid.hidden = false;
    count.textContent = outcome.results.length + (outcome.results.length === 1 ? " plant" : " plants") +
      " found, best match first";

    if (outcome.mode === "relaxed") {
      notice.appendChild(el("p", { text: relaxedMessage(outcome) }));
      notice.appendChild(el("p", {
        text: "Your light, water, humidity and temperature answers were still applied as you gave them. " +
              "Check the notes on each plant."
      }));
      notice.hidden = false;
    }

    outcome.results.forEach(function (plant) {
      grid.appendChild(createPlantCard(plant, answers, outcome.mode));
    });
  }

  function showView(which) {
    var showResults = which === "results";
    surveyView.hidden = showResults;
    resultsView.hidden = !showResults;
    var target = showResults ? document.getElementById("results-title") : document.querySelector(".explore-header");
    if (showResults) { target.focus({ preventScroll: true }); }
    scrollToNode(target);
  }

  function handleSubmit(event) {
    event.preventDefault();
    hideError();

    var answers = getUserAnswers();
    var missing = validateSurvey(answers);
    markMissing(missing);

    if (missing.length > 0) {
      showError("Please answer all questions before continuing.");
      var firstCard = document.querySelector('.question-card[data-field="' + missing[0] + '"]');
      scrollToNode(firstCard);
      var firstInput = firstCard.querySelector("input");
      if (firstInput) { firstInput.focus({ preventScroll: true }); }
      return;
    }

    loadPlants().then(function (plants) {
      renderResults(findRecommendations(plants, answers), answers);
      showView("results");
    }).catch(function (err) {
      console.error("Plantora recommendation:", err);
      showError("We could not load the plant list. Please refresh the page and try again.");
    });
  }

  function handleChange(event) {
    var card = event.target.closest && event.target.closest(".question-card");
    if (card) {
      card.classList.remove("is-missing");
      card.querySelector(".question-card__error").hidden = true;
    }
    updateProgress();
    if (countAnswered(getUserAnswers()) === SURVEY.length) { hideError(); }
  }

  // set up the page

  function init() {
    form = document.getElementById("survey-form");
    surveyView = document.getElementById("survey-view");
    resultsView = document.getElementById("results-view");
    errorBox = document.getElementById("survey-error");

    renderSurvey();
    updateProgress();

    form.addEventListener("submit", handleSubmit);
    form.addEventListener("change", handleChange);

    document.getElementById("reset-btn").addEventListener("click", function () {
      form.reset();
      markMissing([]);
      hideError();
      updateProgress();
    });

    document.getElementById("edit-answers-btn").addEventListener("click", function () {
      showView("survey");
    });

    // load the plants early so results show up fast
    loadPlants().catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
