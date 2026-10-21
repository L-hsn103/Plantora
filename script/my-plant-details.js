(function () {
  'use strict';

  // INTEGRATION: change if Plantora's My Plants list lives elsewhere.
  var LIST_PAGE_URL = 'my-plants.html';

  var CARE_LABELS = { watering: 'Watering', fertilizing: 'Fertilizing', sunlight: 'Sunlight' };
  var ICONS = {
    watering: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
    fertilizing: 'M5 19c8 0 14-5 14-14C10 5 5 11 5 19zM5 19c2-5 5-8 9-10',
    sunlight: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
    other: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z'
  };

  /* ---------- Helpers ---------- */
  function $(id) { return document.getElementById(id); }

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.cls) node.className = opts.cls;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.attrs) Object.keys(opts.attrs).forEach(function (k) { node.setAttribute(k, opts.attrs[k]); });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function icon(type) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '18'); svg.setAttribute('height', '18');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', ICONS[type] || ICONS.other);
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.8'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  function parseDate(value) {
    if (!value) return null;
    if (typeof value === 'object' && typeof value.toDate === 'function') value = value.toDate(); // tolerate timestamp-like objects
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      var p = value.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function formatDate(d) { return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  function formatDateTime(d) { return formatDate(d) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }

  // Returns {key, label, text} or null when there is no usable due date.
  function dueStatus(dueDate) {
    var d = parseDate(dueDate);
    if (!d) return null;
    var days = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
    if (days < 0) return { key: 'overdue', label: 'Overdue', text: 'Was due ' + formatDate(d) };
    if (days === 0) return { key: 'due', label: 'Due today', text: 'Due today' };
    return { key: 'upcoming', label: 'Upcoming', text: 'Due ' + formatDate(d) };
  }

  function careLabel(type, label) {
    if (label) return label;
    if (CARE_LABELS[type]) return CARE_LABELS[type];
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Care task';
  }

  function badge(status) {
    return el('span', { cls: 'mpd-badge' + (status.key === 'due' ? ' mpd-badge--due' : status.key === 'overdue' ? ' mpd-badge--overdue' : ''), text: status.label });
  }

  var toastTimer = null;
  function toast(message, isError) {
    var t = $('mpd-toast');
    t.textContent = message;
    t.className = 'mpd-toast mpd-toast--show' + (isError ? ' mpd-toast--error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'mpd-toast'; }, 4500);
  }

  function errorMessage(err, fallback) {
    return (err && err.message) ? err.message : fallback;
  }

  /* ---------- Mock adapter (in memory only; never touches a real database) ---------- */
  function createMockAdapter() {
    function iso(offset) { var d = new Date(); d.setDate(d.getDate() + offset); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    var entry = { id: 'demo-1', nickname: 'Fernando', speciesName: 'Boston fern', scientificName: 'Nephrolepis exaltata', location: 'Bathroom shelf', addedAt: iso(-90), imageUrl: '', status: 'Healthy', notes: 'Sample note. Likes humidity.', sunlight: 'Bright, indirect light' };
    var tasks = [
      { id: 't1', type: 'watering', dueDate: iso(-1) },
      { id: 't2', type: 'fertilizing', dueDate: iso(12) },
      { id: 't3', type: 'misting', label: 'Misting', dueDate: iso(0) }
    ];
    var history = [{ id: 'h1', type: 'watering', completedAt: new Date(Date.now() - 4 * 86400000).toISOString(), notes: 'Sample record' }];
    var delay = function (v) { return new Promise(function (r) { setTimeout(function () { r(JSON.parse(JSON.stringify(v))); }, 350); }); };
    return {
      isMock: true,
      editableFields: ['nickname', 'location', 'notes'],
      getEntry: function (id) {
        if (id !== entry.id) { var e = new Error('No sample plant has that ID. Try entryId=demo-1.'); e.code = 'NOT_FOUND'; return Promise.reject(e); }
        return delay(entry);
      },
      getCareTasks: function () { return delay(tasks); },
      getCareHistory: function () { return delay({ supported: true, records: history }); },
      updateEntry: function (id, fields) { Object.keys(fields).forEach(function (k) { entry[k] = fields[k]; }); return delay(entry); },
      completeCareTask: function (id, taskId) {
        var t = tasks.filter(function (x) { return x.id === taskId; })[0];
        if (!t) return Promise.reject(new Error('That task no longer exists.'));
        history.unshift({ id: 'h' + Date.now(), type: t.type, completedAt: new Date().toISOString() });
        t.dueDate = iso(7);
        return delay({ tasks: tasks, history: { supported: true, records: history } });
      },
      removeEntry: function () { return delay(null); }
    };
  }

  /* ---------- State ---------- */
  var adapter = null;
  var entryId = null;
  var state = { entry: null, tasks: [], history: { supported: false, records: [] } };
  var pendingTasks = {};
  var busy = { save: false, remove: false };

  /* ---------- Screen states ---------- */
  function showLoading() { $('mpd-loading').hidden = false; $('mpd-error').hidden = true; $('mpd-content').hidden = true; $('mpd-main').setAttribute('aria-busy', 'true'); }
  function showError(title, text) {
    $('mpd-loading').hidden = true; $('mpd-content').hidden = true; $('mpd-error').hidden = false;
    $('mpd-error-title').textContent = title; $('mpd-error-text').textContent = text;
    $('mpd-main').setAttribute('aria-busy', 'false');
  }
  function showContent() { $('mpd-loading').hidden = true; $('mpd-error').hidden = true; $('mpd-content').hidden = false; $('mpd-main').setAttribute('aria-busy', 'false'); }

  /* ---------- Rendering ---------- */
  function addFact(list, label, value, extraCls) {
    if (!value) return;
    list.appendChild(el('div', { cls: extraCls || '' }, [el('dt', { text: label }), el('dd', { text: value })]));
  }

  function renderPhoto(entry) {
    var box = $('mpd-photo');
    box.textContent = '';
    function fallback() {
      box.textContent = '';
      var f = el('div', { cls: 'mpd-photo-fallback' }, [icon('other'), el('span', { text: 'No photo yet' })]);
      var svg = f.firstChild; svg.setAttribute('width', '40'); svg.setAttribute('height', '40');
      box.appendChild(f);
    }
    if (!entry.imageUrl) return fallback();
    var img = el('img', { attrs: { alt: (entry.nickname || entry.speciesName || 'Plant') + ' photo', loading: 'lazy' } });
    img.addEventListener('error', fallback, { once: true });
    img.src = entry.imageUrl;
    box.appendChild(img);
  }

  function renderOverview() {
    var e = state.entry;
    var hasNick = !!(e.nickname && e.nickname.trim());
    $('mpd-plant-name').textContent = hasNick ? e.nickname : (e.speciesName || 'My plant');
    $('mpd-species').textContent = hasNick && e.speciesName ? e.speciesName : '';
    $('mpd-species').hidden = !($('mpd-species').textContent);
    $('mpd-scientific').textContent = e.scientificName || '';
    $('mpd-scientific').hidden = !e.scientificName;
    document.title = ($('mpd-plant-name').textContent) + ' · Plantora';
    renderPhoto(e);
    var facts = $('mpd-facts'); facts.textContent = '';
    addFact(facts, 'Location', e.location);
    var added = parseDate(e.addedAt); if (added) addFact(facts, 'Added', formatDate(added));
    addFact(facts, 'Health', e.status);
    addFact(facts, 'Notes', e.notes, 'mpd-notes');
  }

  function summaryCard(type, title, tasks, fallbackText) {
    var card = el('div', { cls: 'mpd-sum' }, [el('h3', {}, [icon(type), document.createTextNode(title)])]);
    var dated = tasks.map(function (t) { return { t: t, d: parseDate(t.dueDate) }; }).filter(function (x) { return x.d; })
      .sort(function (a, b) { return a.d - b.d; });
    if (dated.length) {
      var st = dueStatus(dated[0].t.dueDate);
      card.appendChild(el('div', { cls: 'mpd-sum-main' }, [badge(st)]));
      card.appendChild(el('p', { cls: 'mpd-sum-sub', text: st.text }));
    } else if (fallbackText) {
      card.appendChild(el('p', { cls: 'mpd-sum-main', text: fallbackText }));
    } else {
      card.classList.add('mpd-sum--empty');
      card.appendChild(el('p', { cls: 'mpd-sum-main', text: 'No schedule yet' }));
    }
    return card;
  }

  function renderSummary() {
    var box = $('mpd-summary'); box.textContent = '';
    function ofType(t) { return state.tasks.filter(function (x) { return x.type === t; }); }
    box.appendChild(summaryCard('watering', 'Watering', ofType('watering')));
    box.appendChild(summaryCard('fertilizing', 'Fertilizing', ofType('fertilizing')));
    box.appendChild(summaryCard('sunlight', 'Sunlight', ofType('sunlight'), state.entry.sunlight));
    var others = state.tasks.filter(function (x) { return !CARE_LABELS[x.type]; });
    if (others.length) box.appendChild(summaryCard('other', 'Other care', others));
  }

  function renderUpcoming() {
    var list = $('mpd-upcoming'); list.textContent = '';
    if (!state.tasks.length) {
      list.appendChild(el('li', { cls: 'mpd-empty', text: 'No care schedule is set up for this plant yet.' }));
      return;
    }
    var sorted = state.tasks.slice().sort(function (a, b) {
      var da = parseDate(a.dueDate), db = parseDate(b.dueDate);
      if (da && db) return da - db; return da ? -1 : db ? 1 : 0;
    });
    sorted.forEach(function (task) {
      var st = dueStatus(task.dueDate);
      var main = el('div', { cls: 'mpd-item-main' }, [
        el('p', { cls: 'mpd-item-title', text: careLabel(task.type, task.label) }),
        el('p', { cls: 'mpd-item-meta', text: st ? st.text : 'No due date' })
      ]);
      var side = el('div', { cls: 'mpd-item-side' });
      if (st) side.appendChild(badge(st));
      if (task.canComplete !== false) {
        var btn = el('button', { cls: 'mpd-btn mpd-btn--small', text: pendingTasks[task.id] ? 'Saving…' : 'Mark as done', attrs: { type: 'button', 'aria-label': 'Mark ' + careLabel(task.type, task.label) + ' as done' } });
        btn.disabled = !!pendingTasks[task.id];
        btn.addEventListener('click', function () { onCompleteTask(task); });
        side.appendChild(btn);
      }
      list.appendChild(el('li', { cls: 'mpd-item' + (st && st.key === 'overdue' ? ' mpd-item--overdue' : '') }, [main, side]));
    });
  }

  function renderHistory() {
    var list = $('mpd-history'); list.textContent = '';
    var note = $('mpd-history-note');
    var h = state.history || { supported: false, records: [] };
    note.hidden = !h.note && h.supported !== false;
    if (h.supported === false) {
      note.hidden = false;
      note.textContent = h.note || 'This plant\u2019s data source does not store a care history, so there is nothing to show here.';
    } else {
      note.textContent = h.note || '';
      note.hidden = !h.note;
    }
    var records = (h.records || []).slice().sort(function (a, b) {
      var da = parseDate(a.completedAt), db = parseDate(b.completedAt);
      if (da && db) return db - da; return da ? -1 : db ? 1 : 0;
    });
    if (!records.length) {
      if (h.supported !== false) list.appendChild(el('li', { cls: 'mpd-empty', text: 'No care has been recorded for this plant yet.' }));
      return;
    }
    records.forEach(function (r) {
      var d = parseDate(r.completedAt);
      var main = el('div', { cls: 'mpd-item-main' }, [el('p', { cls: 'mpd-item-title', text: careLabel(r.type, r.label) })]);
      main.appendChild(el('p', { cls: 'mpd-item-meta', text: d ? 'Completed ' + formatDateTime(d) : 'Completion time not recorded' }));
      if (r.notes) main.appendChild(el('p', { cls: 'mpd-item-meta', text: r.notes }));
      list.appendChild(el('li', { cls: 'mpd-item' }, [main]));
    });
  }

  function renderAll() { renderOverview(); renderSummary(); renderUpcoming(); renderHistory(); }

  /* ---------- Data loading ---------- */
  function normalizeHistory(h) {
    if (!h || typeof h !== 'object') return { supported: false, records: [] };
    return { supported: h.supported !== false, records: Array.isArray(h.records) ? h.records : [], note: h.note };
  }

  function loadAll() {
    showLoading();
    return adapter.getEntry(entryId).then(function (entry) {
      if (!entry) { var e = new Error('This plant could not be found.'); e.code = 'NOT_FOUND'; throw e; }
      state.entry = entry;
      return Promise.all([
        adapter.getCareTasks(entryId).catch(function (err) { toast('Care schedule could not be loaded: ' + errorMessage(err, 'unknown error'), true); return []; }),
        adapter.getCareHistory(entryId).catch(function (err) { toast('Care history could not be loaded: ' + errorMessage(err, 'unknown error'), true); return { supported: false, records: [], note: 'Care history could not be loaded right now.' }; })
      ]);
    }).then(function (res) {
      state.tasks = Array.isArray(res[0]) ? res[0] : [];
      state.history = normalizeHistory(res[1]);
      renderAll(); showContent();
    }).catch(function (err) {
      if (err && err.code === 'NOT_FOUND') showError('Plant not found', 'This plant isn\u2019t in your collection. It may have been removed, or the link may be wrong.');
      else if (err && err.code === 'UNAUTHORIZED') showError('You can\u2019t view this plant', 'Sign in with the account that added this plant to see its details.');
      else showError('Something went wrong', errorMessage(err, 'Plantora couldn\u2019t load this plant. Check your connection and try again.'));
    });
  }

  /* ---------- Actions ---------- */
  function onCompleteTask(task) {
    if (pendingTasks[task.id]) return;
    pendingTasks[task.id] = true; renderUpcoming();
    adapter.completeCareTask(entryId, task.id).then(function (res) {
      if (res && Array.isArray(res.tasks)) {
        state.tasks = res.tasks;
        if (res.history) state.history = normalizeHistory(res.history);
        return null;
      }
      return Promise.all([adapter.getCareTasks(entryId), adapter.getCareHistory(entryId)]).then(function (r) {
        state.tasks = r[0] || []; state.history = normalizeHistory(r[1]);
      });
    }).then(function () {
      delete pendingTasks[task.id]; renderSummary(); renderUpcoming(); renderHistory();
      toast(careLabel(task.type, task.label) + ' marked as done.');
    }).catch(function (err) {
      delete pendingTasks[task.id]; renderUpcoming();
      toast('Couldn\u2019t mark as done: ' + errorMessage(err, 'please try again.'), true);
    });
  }

  function setupEditDialog() {
    var dlg = $('mpd-edit-dialog'), form = $('mpd-edit-form');
    var fields = adapter.editableFields || ['nickname', 'location', 'notes'];
    var limits = { nickname: 60, location: 80, notes: 1000 };

    function inputFor(name) { return $('mpd-f-' + name); }
    function clearErrors() {
      ['nickname', 'location', 'notes'].forEach(function (n) { $('mpd-e-' + n).textContent = ''; form.querySelector('[data-field="' + n + '"]').classList.remove('mpd-field--invalid'); });
      $('mpd-edit-error').hidden = true;
    }

    $('mpd-edit-btn').addEventListener('click', function () {
      clearErrors();
      ['nickname', 'location', 'notes'].forEach(function (n) {
        var wrap = form.querySelector('[data-field="' + n + '"]');
        wrap.hidden = fields.indexOf(n) === -1;
        inputFor(n).value = state.entry[n] || '';
      });
      dlg.showModal();
      inputFor(fields[0] || 'nickname').focus();
    });
    $('mpd-edit-cancel').addEventListener('click', function () { if (!busy.save) dlg.close(); });
    dlg.addEventListener('cancel', function (ev) { if (busy.save) ev.preventDefault(); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy.save) return;
      clearErrors();
      var values = {}, valid = true;
      fields.forEach(function (n) {
        var v = inputFor(n).value.trim();
        if (v.length > limits[n]) { $('mpd-e-' + n).textContent = 'Keep this under ' + limits[n] + ' characters.'; form.querySelector('[data-field="' + n + '"]').classList.add('mpd-field--invalid'); valid = false; }
        values[n] = v;
      });
      if (fields.indexOf('nickname') !== -1 && !values.nickname && !state.entry.speciesName) {
        $('mpd-e-nickname').textContent = 'Give your plant a name.'; form.querySelector('[data-field="nickname"]').classList.add('mpd-field--invalid'); valid = false;
      }
      if (!valid) return;
      busy.save = true; $('mpd-edit-save').disabled = true; $('mpd-edit-save').textContent = 'Saving…';
      adapter.updateEntry(entryId, values).then(function (saved) {
        state.entry = saved || Object.assign({}, state.entry, values); // prefer the backend's response
        renderOverview(); dlg.close(); toast('Changes saved.');
      }).catch(function (err) {
        var box = $('mpd-edit-error'); box.textContent = 'Couldn\u2019t save your changes: ' + errorMessage(err, 'please try again.'); box.hidden = false;
      }).then(function () { busy.save = false; $('mpd-edit-save').disabled = false; $('mpd-edit-save').textContent = 'Save changes'; });
    });
  }

  function setupRemoveDialog() {
    var dlg = $('mpd-remove-dialog'), confirmBtn = $('mpd-remove-confirm');
    $('mpd-remove-btn').addEventListener('click', function () {
      var name = state.entry.nickname || state.entry.speciesName || 'this plant';
      $('mpd-remove-text').textContent = 'This removes \u201C' + name + '\u201D from My Plants, along with its care schedule. Other plants of the same species are not affected.';
      $('mpd-remove-error').hidden = true;
      dlg.showModal();
      $('mpd-remove-cancel').focus();
    });
    $('mpd-remove-cancel').addEventListener('click', function () { if (!busy.remove) dlg.close(); });
    dlg.addEventListener('cancel', function (ev) { if (busy.remove) ev.preventDefault(); });
    confirmBtn.addEventListener('click', function () {
      if (busy.remove) return;
      busy.remove = true; confirmBtn.disabled = true; confirmBtn.textContent = 'Removing…';
      adapter.removeEntry(entryId).then(function () {
        dlg.close();
        if (adapter.isMock) { toast('Sample mode: nothing was actually removed.'); return; }
        window.location.href = LIST_PAGE_URL;
      }).catch(function (err) {
        var box = $('mpd-remove-error'); box.textContent = 'Couldn\u2019t remove this plant: ' + errorMessage(err, 'please try again.'); box.hidden = false;
      }).then(function () { busy.remove = false; confirmBtn.disabled = false; confirmBtn.textContent = 'Remove plant'; });
    });
  }

  /* ---------- Init ---------- */
  function init() {
    $('mpd-back-link').href = LIST_PAGE_URL;
    $('mpd-error-back').href = LIST_PAGE_URL;

    var params = new URLSearchParams(window.location.search);
    entryId = (params.get('entryId') || '').trim();

    if (window.PlantoraMyPlantAdapter) adapter = window.PlantoraMyPlantAdapter;
    else if (params.get('mock') === '1') adapter = createMockAdapter();

    if (!adapter) {
      showError('Backend not connected', 'This page needs window.PlantoraMyPlantAdapter to load real plant data. Nothing has been loaded or saved. See the integration notes at the top of my-plant-details.js.');
      return;
    }
    $('mpd-mock-banner').hidden = !adapter.isMock;

    if (!entryId || entryId.length > 200 || /[\/\\<>]/.test(entryId)) {
      showError('Plant not found', 'This link is missing a valid plant ID. Open the plant again from My Plants.');
      return;
    }

    setupEditDialog();
    setupRemoveDialog();
    loadAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();