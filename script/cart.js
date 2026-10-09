(function () {
  "use strict";

  var STORAGE_KEY = "plantora_cart";

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {}
  }

  function add(item) {
    var list = read();
    var found = null;
    var i;
    for (i = 0; i < list.length; i++) {
      if (Number(list[i].id) === Number(item.id)) {
        found = list[i];
        break;
      }
    }
    if (found) {
      found.qty = (found.qty || 1) + (item.qty || 1);
    } else {
      list.push({
        id: Number(item.id),
        name: item.name || "",
        scientificName: item.scientificName || "",
        image: item.image || "",
        priceBDT: Number(item.priceBDT) || 0,
        qty: item.qty || 1
      });
    }
    write(list);
    refreshBadge();
  }

  function setQty(id, qty) {
    var list = read();
    var next = [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (Number(list[i].id) === Number(id)) {
        if (qty > 0) {
          list[i].qty = qty;
          next.push(list[i]);
        }
      } else {
        next.push(list[i]);
      }
    }
    write(next);
    refreshBadge();
  }

  function remove(id) {
    setQty(id, 0);
  }

  function count() {
    var list = read();
    var total = 0;
    var i;
    for (i = 0; i < list.length; i++) total += list[i].qty || 0;
    return total;
  }

  function subtotal() {
    var list = read();
    var total = 0;
    var i;
    for (i = 0; i < list.length; i++) total += (list[i].priceBDT || 0) * (list[i].qty || 0);
    return total;
  }

  function refreshBadge() {
    var n = count();
    var badges = document.querySelectorAll(".cart-badge");
    var i;
    for (i = 0; i < badges.length; i++) {
      badges[i].textContent = n > 0 ? String(n) : "";
      badges[i].hidden = n === 0;
    }
  }

  window.PlantoraCart = {
    load: read,
    add: add,
    setQty: setQty,
    remove: remove,
    count: count,
    subtotal: subtotal,
    refreshBadge: refreshBadge
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshBadge);
  } else {
    refreshBadge();
  }
})();
