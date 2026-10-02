/* =============================================================
   PLANTORA - Firebase Auth (auth.js)
   -------------------------------------------------------------
   Single-file authentication for Plantora.
   - Zero changes to existing HTML/JS required.
   - Add <script src="auth.js" defer> to each page.
   - Protect a page by adding data-requires-auth="true" to <body>.
   ============================================================= */

// =============================================================
// 1. FIREBASE CONFIG - REPLACE WITH YOUR PROJECT VALUES
// =============================================================
// GET THESE FROM: Firebase Console -> Project Settings -> General -> Your apps -> Web app
// If you don't have a Firebase project yet:
//   1. Go to https://console.firebase.google.com/
//   2. Click "Add project" -> name it (e.g., "plantora-auth")
//   3. Disable Google Analytics (optional)
//   4. Once created, click the web icon (</>) to register a web app
//   5. Copy the config object below and paste it here
//   6. In Firebase Console -> Authentication -> Sign-in method:
//      - Enable "Email/Password"
const firebaseConfig = {
  apiKey: "AIzaSyCqlKl7j5yYvdsFKBVEBNjoKltMCBz9kRU",
  authDomain: "plantora-87936.firebaseapp.com",
  projectId: "plantora-87936",
  storageBucket: "plantora-87936.firebasestorage.app",
  messagingSenderId: "684642317612",
  appId: "1:684642317612:web:19d446b36c9defd36a2889",
  measurementId: "G-TF88N9Q5SJ"
};

// =============================================================
// 2. INITIALIZE FIREBASE
// =============================================================
let auth = null;

async function initFirebase() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  window.__plantoraAuth = {
    signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
    createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    updateProfile: (user, profile) => updateProfile(user, profile),
    onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback)
  };

  setupAuthStateListener();
}
// =============================================================
// 3. AUTH STATE LISTENER - RUNS ON EVERY PAGE
// =============================================================
function setupAuthStateListener() {
  window.__plantoraAuth.onAuthStateChanged(async (user) => {
    if (user) {
      sessionStorage.setItem("plantora_user", JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }));
      updateNavbarForAuth(true);
      handlePostLoginRedirect();
    } else {
      sessionStorage.removeItem("plantora_user");
      updateNavbarForAuth(false);
      protectPageIfNeeded();
    }
  });
}
// =============================================================
// 4. ROUTE PROTECTION - CHECK data-requires-auth
// =============================================================
function protectPageIfNeeded() {
  const body = document.body;
  const requiresAuth = body.dataset.requiresAuth === "true";

  if (requiresAuth) {
    const user = JSON.parse(sessionStorage.getItem("plantora_user") || "null");
    if (!user) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = "login.html?redirect=" + returnUrl;
    }
  }
}

// =============================================================
// 5. REDIRECT AFTER LOGIN - HANDLE ?redirect= PARAM
// =============================================================
function handlePostLoginRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get("redirect");

  const isAuthPage = window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html");

  if (isAuthPage && redirect) {
    window.location.href = decodeURIComponent(redirect);
  } else if (isAuthPage && !redirect) {
    window.location.href = "dashboard.html";
  }
}
// =============================================================
// 6. NAVBAR SYNC - UPDATE LINKS BASED ON AUTH STATE
// =============================================================
function updateNavbarForAuth(isLoggedIn) {
  const navCta = document.querySelector(".nav-cta");

  if (!navCta) return;

  if (isLoggedIn) {
    const user = JSON.parse(sessionStorage.getItem("plantora_user"));
    const displayName = user.displayName || user.email.split("@")[0];

    // Inject user menu styles once
    injectUserMenuStyles();

    // Replace Get Started button with user profile dropdown
    navCta.outerHTML = `
      <div class="user-menu" id="user-menu">
        <button class="user-menu__trigger btn btn--secondary" aria-expanded="false" aria-haspopup="true" style="gap:0.5rem;">
          <span class="user-menu__icon" aria-hidden="true">👤</span>
          <span class="user-menu__name">${escapeHtml(displayName)}</span>
          <span class="user-menu__chevron" aria-hidden="true">▾</span>
        </button>
        <div class="user-menu__dropdown" role="menu" hidden>
          <div class="user-menu__header">
            <span class="user-menu__email">${escapeHtml(user.email)}</span>
          </div>
          <hr class="user-menu__divider" />
          <button class="user-menu__item" role="menuitem" data-action="logout">
            <span aria-hidden="true">🚪</span> Logout
          </button>
        </div>
      </div>
    `;

    // Wire up dropdown toggle and logout
    setupUserMenu();
  } else {
    navCta.outerHTML = '<a href="login.html" class="btn btn--primary nav-cta">Get Started</a>';
  }
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
      window.__plantoraAuth.signOut();
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
// =============================================================
// 7. LOGIN / REGISTER FORM HANDLERS (AUTO-BIND)
// =============================================================
function setupAuthForms() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector("#email").value.trim();
      const password = loginForm.querySelector("#password").value;
      const submitBtn = loginForm.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;

      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in...";

      try {
        await window.__plantoraAuth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        showAuthError(loginForm, getFriendlyErrorMessage(err.code));
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = registerForm.querySelector("#name").value.trim();
      const email = registerForm.querySelector("#email").value.trim();
      const password = registerForm.querySelector("#password").value;
      const confirmPassword = registerForm.querySelector("#confirm-password").value;
      const submitBtn = registerForm.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;

      if (password !== confirmPassword) {
        showAuthError(registerForm, "Passwords do not match");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account...";

      try {
        const userCredential = await window.__plantoraAuth.createUserWithEmailAndPassword(email, password);
        await window.__plantoraAuth.updateProfile(userCredential.user, { displayName: name });
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        showAuthError(registerForm, getFriendlyErrorMessage(err.code));
      }
    });
  }
}
// =============================================================
// 8. HELPER FUNCTIONS
// =============================================================
function getFriendlyErrorMessage(code) {
  const messages = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/too-many-requests": "Too many attempts. Please try again later."
  };
  return messages[code] || "Something went wrong. Please try again.";
}

function showAuthError(form, message) {
  const existing = form.querySelector(".auth-error");
  if (existing) existing.remove();

  const errorDiv = document.createElement("div");
  errorDiv.className = "auth-error";
  errorDiv.style.cssText = "background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:0.75rem 1rem;border-radius:8px;font-size:0.85rem;margin-bottom:1rem;text-align:center;";
  errorDiv.textContent = message;
  form.insertBefore(errorDiv, form.firstChild);

  setTimeout(() => errorDiv.remove(), 5000);
}
// =============================================================
// 9. BOOT - START EVERYTHING
// =============================================================
(async function boot() {
  try {
    await initFirebase();
    setupAuthForms();
  } catch (err) {
    console.error("[Plantora Auth] Failed to initialize:", err);
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
      document.body.insertAdjacentHTML('afterbegin', '<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:1rem;margin:1rem;border-radius:8px;font-family:Inter,sans-serif;max-width:600px;margin:1rem auto;"><strong>Firebase Auth not configured</strong><br>Edit <code>auth.js</code> and replace <code>firebaseConfig</code> with your project values from Firebase Console.<br><small>See comments at top of auth.js for setup steps.</small></div>');
    }
  }
})();