function readCachedUser() {
  try {
    return JSON.parse(
      sessionStorage.getItem("plantora_user") ||
      localStorage.getItem("plantora_user") ||
      "null"
    );
  } catch (err) {
    return null;
  }
}

// resolve the assets folder from this script's own URL so injected
// icon markup works no matter which page loaded the script
const AUTH_UI_ASSETS = (function () {
  const script = document.currentScript;
  return script ? new URL("../assets/image/", script.src).href : "../assets/image/";
})();

// resolve the site root from this script's URL too: the landing page lives at
// the root (index.html) while every other page lives in pages/, so generated
// links are always built against the root instead of the current directory
const AUTH_UI_URL = (function () {
  const script = document.currentScript;
  const root = script ? new URL("../", script.src) : null;
  return root
    ? (path) => new URL(path, root).href
    : (path) => path;
})();


// lucide swaps every <i data-lucide="..."> placeholder for an inline SVG when
// createIcons() runs. This script is parsed before the deferred CDN bundle is
// executed, so refresh() retries on a short timer until the library is ready.
// All other scripts call window.PlantoraIcons.refresh() after they render icons.
(function () {
  var scheduled = false;
  var attempts = 0;

  function render() {
    scheduled = false;
    if (window.lucide && window.lucide.createIcons) {
      try { window.lucide.createIcons(); } catch (err) { /* skip unknown icons */ }
      return;
    }
    if (attempts++ < 200) {
      scheduled = true;
      setTimeout(render, 50);
    }
  }

  window.PlantoraIcons = {
    refresh: function () {
      if (window.lucide && window.lucide.createIcons) {
        render();
      } else if (!scheduled) {
        scheduled = true;
        setTimeout(render, 50);
      }
    }
  };

  render();
})();

function updateNavHomeLinks(isLoggedIn) {
  const homeLink = document.querySelector("[data-nav-home]");
  if (!homeLink) return;

  const path = window.location.pathname;
  const isLandingPage = path === "/" || path === "" || /(^|\/)index\.html$/.test(path);
  const isDashboardPage = /(^|\/)dashboard\.html$/.test(path);

  homeLink.setAttribute("href", isLoggedIn ? AUTH_UI_URL("pages/dashboard.html") : AUTH_UI_URL("index.html"));

  const highlight = isLoggedIn ? isDashboardPage || isLandingPage : isLandingPage;
  const isCurrent = isLoggedIn ? isDashboardPage : isLandingPage;

  homeLink.classList.toggle("active", highlight);
  if (isCurrent) {
    homeLink.setAttribute("aria-current", "page");
  } else {
    homeLink.removeAttribute("aria-current");
  }
}

function syncPrivateNavItems(isLoggedIn) {
  document.querySelectorAll("[data-nav-private]").forEach((el) => {
    el.hidden = !isLoggedIn;
  });
}

function updateLandingCtas(isLoggedIn) {
  document.querySelectorAll("[data-auth-cta]").forEach((el) => {
    if (el.dataset.ctaOutHref === undefined) {
      el.dataset.ctaOutHref = el.getAttribute("href") || "";
    }
    el.setAttribute("href", isLoggedIn ? AUTH_UI_URL("pages/dashboard.html") : el.dataset.ctaOutHref);
  });
}


function updateAboutLinks(isLoggedIn) {
  const onDashboard = /(^|\/)dashboard\.html$/.test(window.location.pathname);

  document.querySelectorAll('a[href$="#about"]').forEach((link) => {
    if (!isLoggedIn) {
      link.setAttribute("href", AUTH_UI_URL("index.html#about"));
    } else if (onDashboard) {
      link.setAttribute("href", "#about");
    } else {
      link.setAttribute("href", AUTH_UI_URL("pages/dashboard.html#about"));
    }
  });
}

function updateDashboardGreeting() {
  const heading = document.getElementById("dash-welcome");
  if (!heading) return;

  const fallback = "Welcome Back, Plant Lover!";
  const user = readCachedUser();
  if (!user) {
    heading.textContent = fallback;
    return;
  }

  const name = (user.displayName || (user.email || "").split("@")[0] || "").trim();
  heading.textContent = name ? `Welcome Back, ${name}!` : fallback;
}

function applyAuthUi(isLoggedIn) {
  document.documentElement.classList.toggle("is-auth", isLoggedIn);
  syncPrivateNavItems(isLoggedIn);
  updateLandingCtas(isLoggedIn);
  updateAboutLinks(isLoggedIn);
  updateDashboardGreeting();
}

function updateNavbarForAuth(isLoggedIn) {
  applyAuthUi(isLoggedIn);
  updateNavHomeLinks(isLoggedIn);

  const menu = document.getElementById("user-menu");
  const profileBtn = document.getElementById("nav-profile-btn");

  if (!isLoggedIn) {
    // put the plain profile icon link back (it sends visitors to login)
    const loginHtml = `
      <a href="${AUTH_UI_URL("pages/login.html")}" class="nav-icon-btn nav-icon-btn--profile" id="nav-profile-btn" aria-label="Account">
        <img src="${AUTH_UI_ASSETS}user.png" alt="" />
      </a>
    `;
    if (menu) {
      menu.outerHTML = loginHtml;
    } else if (profileBtn && profileBtn.tagName === "A" && !/login\.html$/.test(profileBtn.getAttribute("href") || "")) {
      profileBtn.outerHTML = loginHtml;
    }
    return;
  }

  // Signed in: clicking the icon opens the Profile page (logout lives there)
  const profileHtml = `
    <a href="${AUTH_UI_URL("pages/profile.html")}" class="nav-icon-btn nav-icon-btn--profile" id="nav-profile-btn" aria-label="Profile">
      <img src="${AUTH_UI_ASSETS}user.png" alt="" />
    </a>
  `;

  const profileUrl = AUTH_UI_URL("pages/profile.html");
  if (profileBtn && profileBtn.tagName === "A" && profileBtn.getAttribute("href") === profileUrl) return;
  if (menu) menu.outerHTML = profileHtml;
  else if (profileBtn) profileBtn.outerHTML = profileHtml;
}

function injectUserMenuStyles() {
  if (document.getElementById("user-menu-styles")) return;
  const style = document.createElement("style");
  style.id = "user-menu-styles";
  style.textContent = `
    .user-menu { position: relative; }
    .user-menu__trigger { padding: 0; }
    .user-menu__dropdown {
      position: absolute; top: calc(100% + 8px); right: 0; min-width: 200px;
      background: #fff; border: 1px solid var(--color-border, #e1eee4);
      border-radius: 12px; box-shadow: 0 20px 40px -20px rgba(34, 64, 45, 0.14);
      overflow: hidden; z-index: 50;
    }
    .user-menu__header {
      padding: 0.75rem 1rem; background: var(--color-bg-alt, #e8f5e9);
      font-size: 0.8rem; color: var(--color-text-muted, #5c6355);
      display: flex; flex-direction: column; gap: 0.1rem;
    }
    .user-menu__name { font-weight: 600; font-size: 0.9rem; color: var(--color-text, #222222); }
    .user-menu__divider { border: none; border-top: 1px solid var(--color-border, #e1eee4); margin: 0; }
    .user-menu__item {
      width: 100%; text-align: left; padding: 0.75rem 1rem; background: none; border: none;
      font: inherit; color: var(--color-text, #222222); cursor: pointer;
      display: flex; align-items: center; gap: 0.5rem; transition: background 0.1s;
    }
    .user-menu__item:hover { background: var(--color-bg-alt, #e8f5e9); }
  `;
  document.head.appendChild(style);
}

function setupUserMenu() {
  const menu = document.getElementById("user-menu");
  if (!menu) return;

  const trigger = menu.querySelector(".user-menu__trigger");
  const dropdown = menu.querySelector(".user-menu__dropdown");

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", !expanded);
    dropdown.hidden = expanded;
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) {
      trigger.setAttribute("aria-expanded", "false");
      dropdown.hidden = true;
    }
  });

  dropdown.addEventListener("click", (e) => {
    const item = e.target.closest(".user-menu__item");
    if (!item) return;
    if (item.dataset.action === "logout") {
      if (!window.__plantoraAuth || item.disabled) return;

      const original = item.innerHTML;
      item.disabled = true;
      item.classList.add("is-loading");
      item.setAttribute("aria-busy", "true");
      item.innerHTML =
        '<span class="spinner spinner--sm" aria-hidden="true"></span>' +
        '<span>Signing out…</span>';

      window.__plantoraAuth.signOut().catch((err) => {
        console.error("[Plantora Auth] Sign out failed:", err);
        item.disabled = false;
        item.classList.remove("is-loading");
        item.removeAttribute("aria-busy");
        item.innerHTML = original;
      });
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.PlantoraUI = {
  readCachedUser: readCachedUser,
  applyAuthUi: applyAuthUi,
  updateNavHomeLinks: updateNavHomeLinks,
  updateLandingCtas: updateLandingCtas,
  updateAboutLinks: updateAboutLinks,
  updateDashboardGreeting: updateDashboardGreeting,
  updateNavbarForAuth: updateNavbarForAuth
};

updateNavbarForAuth(!!readCachedUser());
