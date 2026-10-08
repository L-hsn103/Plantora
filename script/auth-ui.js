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
    el.setAttribute("href", isLoggedIn ? "dashboard.html" : el.dataset.ctaOutHref);
  });
}


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

  if (!isLoggedIn) {

    const menu = document.getElementById("user-menu");
    if (menu) {
      menu.outerHTML = '<a href="login.html" class="btn btn--primary nav-cta">Get Started</a>';
    }
    return;
  }

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
      if (window.__plantoraAuth) window.__plantoraAuth.signOut();
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
