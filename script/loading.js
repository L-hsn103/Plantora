
(function () {
  "use strict";

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function setBusy(node, busy) {
    if (!node) return;
    node.setAttribute("aria-busy", busy ? "true" : "false");
    node.classList.toggle("is-loading", !!busy);
  }

  function status(text) {
    var node = document.createElement("span");
    node.className = "sr-only";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    node.textContent = text || "Loading…";
    return node;
  }

  function spinnerEl(size) {
    var node = document.createElement("span");
    node.className = "spinner" + (size === "lg" ? " spinner--lg" : size === "sm" ? " spinner--sm" : "");
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  /* Replace a host with a centred spinner + message. */
  function renderSpinner(host, label, size) {
    if (!host) return;

    clear(host);
    setBusy(host, true);

    var block = document.createElement("div");
    block.className = "loading-block";
    block.appendChild(spinnerEl(size || "lg"));

    if (label) {
      var text = document.createElement("p");
      text.className = "loading-label";
      text.textContent = label;
      block.appendChild(text);
    }

    host.appendChild(block);
  }

  /* Replace a host with skeleton cards for a grid/list of plants. */
  function skeletonGrid(host, count, label) {
    if (!host) return;

    clear(host);
    setBusy(host, true);
    host.appendChild(status(label || "Loading…"));

    var grid = document.createElement("div");
    grid.className = "skeleton-grid";
    grid.setAttribute("aria-hidden", "true");

    for (var i = 0; i < (count || 6); i++) {
      var card = document.createElement("div");
      card.className = "skeleton-card";

      var media = document.createElement("div");
      media.className = "skeleton skeleton-card__media";
      card.appendChild(media);

      var body = document.createElement("div");
      body.className = "skeleton-card__body";

      var title = document.createElement("div");
      title.className = "skeleton skeleton-line skeleton-line--title";
      body.appendChild(title);

      var shortLine = document.createElement("div");
      shortLine.className = "skeleton skeleton-line skeleton-line--short";
      body.appendChild(shortLine);

      var meta = document.createElement("div");
      meta.className = "skeleton skeleton-line skeleton-line--meta";
      body.appendChild(meta);

      card.appendChild(body);
      grid.appendChild(card);
    }

    host.appendChild(grid);
  }

  /* Replace a host with skeleton rows for task lists. */
  function skeletonRows(host, count, label) {
    if (!host) return;

    clear(host);
    setBusy(host, true);
    host.appendChild(status(label || "Loading…"));

    var list = document.createElement("div");
    list.className = "skeleton-rows";
    list.setAttribute("aria-hidden", "true");

    for (var i = 0; i < (count || 3); i++) {
      var row = document.createElement("div");
      row.className = "skeleton-row";

      var circle = document.createElement("div");
      circle.className = "skeleton skeleton-row__circle";
      row.appendChild(circle);

      var body = document.createElement("div");
      body.className = "skeleton-row__body";

      var line = document.createElement("div");
      line.className = "skeleton skeleton-line";
      body.appendChild(line);

      var shortLine = document.createElement("div");
      shortLine.className = "skeleton skeleton-line skeleton-line--short";
      body.appendChild(shortLine);

      row.appendChild(body);

      var end = document.createElement("div");
      end.className = "skeleton skeleton-row__end";
      row.appendChild(end);

      list.appendChild(row);
    }

    host.appendChild(list);
  }

  /* Put a button into a pending state and later restore exactly what it had. */
  function button(btn, busy, busyText) {
    if (!btn) return;

    if (busy) {
      if (!btn.__plantoraBusyState) {
        btn.__plantoraBusyState = {
          html: btn.innerHTML,
          label: btn.getAttribute("aria-label"),
          disabled: btn.disabled
        };
      }

      btn.disabled = true;
      btn.classList.add("is-loading");
      btn.setAttribute("aria-busy", "true");

      clear(btn);
      btn.appendChild(spinnerEl("sm"));

      if (busyText) {
        var text = document.createElement("span");
        text.className = "btn__busy-text";
        text.textContent = busyText;
        btn.appendChild(text);

        if (btn.hasAttribute("aria-label")) {
          btn.setAttribute("aria-label", busyText);
        }
      }
    } else {
      var state = btn.__plantoraBusyState;
      if (!state) return;

      btn.innerHTML = state.html;

      if (state.label === null) btn.removeAttribute("aria-label");
      else btn.setAttribute("aria-label", state.label);

      btn.disabled = !!state.disabled;
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
      delete btn.__plantoraBusyState;
    }
  }

  /* Inline failure state with an optional retry link. */
  function error(host, title, text, retry) {
    if (!host) return;

    clear(host);
    setBusy(host, false);

    var box = document.createElement("div");
    box.className = "empty-state empty-state--error";
    box.setAttribute("role", "alert");

    var heading = document.createElement("h3");
    heading.className = "empty-state__title";
    heading.textContent = title || "Something went wrong";
    box.appendChild(heading);

    if (text) {
      var body = document.createElement("p");
      body.className = "empty-state__text";
      body.textContent = text;
      box.appendChild(body);
    }

    if (retry && retry.href) {
      var actions = document.createElement("div");
      actions.className = "empty-state__actions";

      var link = document.createElement("a");
      link.className = "btn btn--secondary";
      link.href = retry.href;
      link.textContent = retry.label || "Try again";
      actions.appendChild(link);
      box.appendChild(actions);
    }

    host.appendChild(box);
  }

  window.PlantoraLoading = {
    clear: clear,
    setBusy: setBusy,
    spinner: renderSpinner,
    skeletonGrid: skeletonGrid,
    skeletonRows: skeletonRows,
    button: button,
    error: error
  };
})();
