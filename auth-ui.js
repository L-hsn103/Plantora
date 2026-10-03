/* =============================================================
   PLANTORA - Auth UI (auth-ui.js)
   -------------------------------------------------------------
   Storage-driven page UI. No Firebase, no network: it reads the
   cached session and updates the DOM, so the signed-in state is
   applied while the page is still parsing instead of after
   auth.js (deferred) + Firebase have answered.

   Load it as a plain <script src="auth-ui.js"></script> before </body>.
   auth.js (defer, in <head>) calls window.PlantoraUI.updateNavbarForAuth()
   whenever Firebase reports a real auth-state change.

   First paint is covered by the inline <head> snippet that sets
   html.is-auth + the state rules in style.css; this file keeps the
   class, hrefs, highlights, greeting and user menu in sync with it.
   ============================================================= */

// Cached session, sessionStorage first (per tab), localStorage as the
// cross-tab mirror written by auth.js.
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

// =============================================================
// HOME / DASHBOARD LINK
// -------------------------------------------------------------
// The first nav slot (data-nav-home) shows "Home" while signed out and
// "Dashboard" while signed in - the words live in two spans that CSS
// toggles through html.is-auth, so this only owns the href and the
// current-page highlight. Never touch textContent here: it would wipe
// those spans.
//
// On the landing page while signed in the highlight is purely visual -
// the link points at dashboard.html, not index.html, so aria-current is
// deliberately not set: announcing aria-current="page" for a link that
// goes somewhere else misleads screen readers.
// =============================================================
function updateNavHomeLinks(isLoggedIn) {
  const homeLink = document.querySelector("[data-nav-home]");
  if (!homeLink) return;

  const path = window.location.pathname;
  const isLandingPage = path === "/" || path === "" || /(^|\/)index\.html$/.test(path);
  const isDashboardPage = /(^|\/)dashboard\.html$/.test(path);

  homeLink.setAttribute("href", isLoggedIn ? "dashboard.html" : "index.html");

  const highlight = isLoggedIn ? isDashboardPage || isLandingPage : isLandingPage;
  const isCurrent = isLoggedIn ? isDashboardPage : isLandingPage;

  homeLink.classList.toggle("active", highlight);
  if (isCurrent) {
    homeLink.setAttribute("aria-current", "page");
  } else {
    homeLink.removeAttribute("aria-current");
  }
}

// =============================================================
// PRIVATE NAV ITEMS - ONLY FOR SIGNED-IN USERS
// -------------------------------------------------------------
// Links marked data-nav-private start hidden in the markup; CSS
// (html.is-auth [data-nav-private]) shows them at first paint, and the
// hidden attribute keeps them correct for no-JS visitors.
// =============================================================
function syncPrivateNavItems(isLoggedIn) {
  document.querySelectorAll("[data-nav-private]").forEach((el) => {
    el.hidden = !isLoggedIn;
  });
}

// Landing marketing CTAs (hero "Log In", final "Get Started") point at
// the dashboard once signed in. The labels are spans toggled by CSS -
// only the href is handled here.
function updateLandingCtas(isLoggedIn) {
  document.querySelectorAll("[data-auth-cta]").forEach((el) => {
    if (el.dataset.ctaOutHref === undefined) {
      el.dataset.ctaOutHref = el.getAttribute("href") || "";
    }
    el.setAttribute("href", isLoggedIn ? "dashboard.html" : el.dataset.ctaOutHref);
  });
}

// About links: signed-out visitors read About on the public landing page;
// signed-in users must never be sent back to that marketing page, so their
// About points at the dashboard's About section (in-page on the dashboard
// itself). Logging out restores index.html#about.
function updateAboutLinks(isLoggedIn) {
  const onDashboard = /(^|\/)dashboard\.html$/.test(window.location.pathname);

  document.querySelectorAll('a[href$="#about"]').forEach((link) => {
    if (!isLoggedIn) {
      link.setAttribute("href", "index.html#about");
    } else if (onDashboard) {
      link.setAttribute("href", "#about");
    } else {
      link.setAttribute("href", "dashboard.html#about");
    }
  });
}

// Dashboard hero greeting, personalised with the cached user's name.
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

// Everything that depends only on the auth flag (no Firebase user object).
function applyAuthUi(isLoggedIn) {
  document.documentElement.classList.toggle("is-auth", isLoggedIn);
  syncPrivateNavItems(isLoggedIn);
  updateLandingCtas(isLoggedIn);
  updateAboutLinks(isLoggedIn);
  updateDashboardGreeting();
}

// =============================================================
// NAVBAR SYNC - LINKS, HIGHLIGHTS AND THE USER MENU
// =============================================================
function updateNavbarForAuth(isLoggedIn) {
  applyAuthUi(isLoggedIn);
  updateNavHomeLinks(isLoggedIn);

  if (!isLoggedIn) {
    // A sign-out after the menu was injected: put the Get Started
    // button back where the menu replaced it.
    const menu = document.getElementById("user-menu");
    if (menu) {
      menu.outerHTML = '<a href="login.html" class="btn btn--primary nav-cta">Get Started</a>';
    }
    return;
  }

  // Already injected (cached pass ran before Firebase) - nothing to do.
  if (document.getElementById("user-menu")) return;

  const navCta = document.querySelector(".nav-cta");
  if (!navCta) return;

  const user = readCachedUser();
  if (!user) return;

  const displayName = user.displayName || (user.email || "").split("@")[0] || "Account";

  injectUserMenuStyles();

  navCta.outerHTML = `
    <div class="user-menu" id="user-menu">
      <button class="user-menu__trigger btn btn--secondary" aria-expanded="false" aria-haspopup="true" style="gap:0.5rem;">
        <span class="user-menu__icon" aria-hidden="true">👤</span>
        <span class="user-menu__name">${escapeHtml(displayName)}</span>
        <span class="user-menu__chevron" aria-hidden="true">▾</span>
      </button>
      <div class="user-menu__dropdown" role="menu" hidden>
        <div class="user-menu__header">
          <span class="user-menu__email">${escapeHtml(user.email || "")}</span>
        </div>
        <hr class="user-menu__divider" />
        <button class="user-menu__item" role="menuitem" data-action="logout">
          <span aria-hidden="true">🚪</span> Logout
        </button>
      </div>
    </div>
  `;

  setupUserMenu();
}

function injectUserMenuStyles() {
  if (document.getElementById("user-menu-styles")) return;
  const style = document.createElement("style");
  style.id = "user-menu-styles";
  style.textContent = `
    .user-menu { position: relative; }
    .user-menu__trigger { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 999px; }
    .user-menu__icon { font-size: 1rem; }
    .user-menu__name { font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-menu__chevron { font-size: 0.6rem; transition: transform 0.15s; }
    .user-menu__trigger[aria-expanded="true"] .user-menu__chevron { transform: rotate(180deg); }
    .user-menu__dropdown {
      position: absolute; top: calc(100% + 8px); right: 0; min-width: 200px;
      background: #fff; border: 1px solid var(--color-border, #dce4d2);
      border-radius: 12px; box-shadow: 0 20px 40px -20px rgba(23,48,31,0.25);
      overflow: hidden; z-index: 50;
    }
    .user-menu__header { padding: 0.75rem 1rem; background: var(--color-bg-alt, #eaf0e1); font-size: 0.8rem; color: var(--color-text-muted, #5c6355); }
    .user-menu__divider { border: none; border-top: 1px solid var(--color-border, #dce4d2); margin: 0; }
    .user-menu__item {
      width: 100%; text-align: left; padding: 0.75rem 1rem; background: none; border: none;
      font: inherit; color: var(--color-text, #2b2b26); cursor: pointer;
      display: flex; align-items: center; gap: 0.5rem; transition: background 0.1s;
    }
    .user-menu__item:hover { background: var(--color-bg-alt, #eaf0e1); }
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
      // Firebase may still be loading on a very fast click.
      if (window.__plantoraAuth) window.__plantoraAuth.signOut();
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// =============================================================
// EXPORT + APPLY THE CACHED SESSION NOW (during page parse)
// =============================================================
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
