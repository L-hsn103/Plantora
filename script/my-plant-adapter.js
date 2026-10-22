(function () {
  'use strict';



  function fail(code, message) {
    var err = new Error(message);
    err.code = code;
    return err;
  }

  // Convert a store entry + catalog plant into the shape my-plant-details.js expects
  function buildEntry(entry, plant) {
    return {
      id: entry.id,
      nickname: entry.nickname || null,
      speciesName: plant ? plant.name : entry.plantName,
      scientificName: plant ? plant.scientificName : null,
      location: entry.location || null,
      addedAt: entry.addedAt || null,
      imageUrl: plant ? plant.image : null,
      status: 'Healthy',
      notes: entry.notes || null,
      sunlight: plant ? plant.light : null
    };
  }

  // Map taskKey (watering/fertilizing/cleaning/repotting) to task id used by the page
  function taskKeyToId(taskKey) { return taskKey; }

  window.PlantoraMyPlantAdapter = {
    isMock: false,
    editableFields: ['nickname', 'location', 'notes'],

    // --- getEntry: load one plant instance by txId ---
    getEntry: function (entryId) {
      if (!window.PlantoraStore || !window.PlantoraData) {
        return Promise.reject(fail('not-ready', 'Store not loaded'));
      }
      return window.PlantoraData.loadPlants().then(function () {
        return window.PlantoraStore.listMyPlants().then(function (entries) {
          var entry = entries.filter(function (e) { return e.id === entryId; })[0];
          if (!entry) {
            throw fail('NOT_FOUND', 'Plant not found in your collection.');
          }
          var plant = window.PlantoraData.getPlantById(entry.plantId);
          return buildEntry(entry, plant);
        });
      });
    },

    // --- getCareTasks: upcoming care tasks for one entry ---
    getCareTasks: function (entryId) {
      if (!window.PlantoraStore || !window.PlantoraData) {
        return Promise.reject(fail('not-ready', 'Store not loaded'));
      }
      return window.PlantoraStore.listMyPlants().then(function (entries) {
        var entry = entries.filter(function (e) { return e.id === entryId; })[0];
        if (!entry) {
          throw fail('NOT_FOUND', 'Plant not found in your collection.');
        }
        var tasks = window.PlantoraStore.getUpcomingTasks(entries, 30);
        return tasks
          .filter(function (t) { return t.entryId === entryId; })
          .map(function (t) {
            return {
              id: t.taskKey,
              type: t.taskKey,
              dueDate: t.nextDue,
              label: t.label
            };
          });
      });
    },

    // --- getCareHistory: not yet stored (option B: defer) ---
    getCareHistory: function (entryId) {
      return Promise.resolve({
        supported: false,
        records: [],
        note: 'This plant\'s data source does not store a care history yet.'
      });
    },

    // --- updateEntry: persist nickname / location / notes ---
    updateEntry: function (entryId, fields) {
      if (!window.PlantoraStore) {
        return Promise.reject(fail('not-ready', 'Store not loaded'));
      }
      var promises = [];
      if (fields.nickname !== undefined && fields.nickname !== null) {
        promises.push(window.PlantoraStore.renamePlant(entryId, fields.nickname));
      }
      if (fields.location !== undefined && fields.location !== null) {
        promises.push(window.PlantoraStore.setLocation(entryId, fields.location));
      }
      if (fields.notes !== undefined && fields.notes !== null) {
        promises.push(window.PlantoraStore.updateNotes(entryId, fields.notes));
      }
      return Promise.all(promises).then(function () {
        return window.PlantoraData.loadPlants().then(function () {
          return window.PlantoraStore.listMyPlants().then(function (entries) {
            var entry = entries.filter(function (e) { return e.id === entryId; })[0];
            var plant = window.PlantoraData.getPlantById(entry.plantId);
            return buildEntry(entry, plant);
          });
        });
      });
    },

    // --- completeCareTask: mark a task as done ---
    completeCareTask: function (entryId, taskId) {
      if (!window.PlantoraStore) {
        return Promise.reject(fail('not-ready', 'Store not loaded'));
      }
      return window.PlantoraStore.markTaskDone(entryId, taskId).then(function (schedule) {
        // Return task list for the page to re-render
        return window.PlantoraStore.listMyPlants().then(function (entries) {
          var entry = entries.filter(function (e) { return e.id === entryId; })[0];
          var tasks = window.PlantoraStore.getUpcomingTasks(entries, 30);
          return {
            tasks: tasks.filter(function (t) { return t.entryId === entryId; })
          };
        });
      });
    },

    // --- removeEntry: delete a plant instance ---
    removeEntry: function (entryId) {
      if (!window.PlantoraStore) {
        return Promise.reject(fail('not-ready', 'Store not loaded'));
      }
      return window.PlantoraStore.removePlant(entryId).then(function () {
        return null;
      });
    }
  };
})();
