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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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

    navCta.outerHTML = "<button class="btn btn--secondary nav-cta" id="logout-btn" style="gap:0.5rem;"><span>🚪</span> Logout (" + user.email + ")</button>";

    document.getElementById("logout-btn")?.addEventListener("click", () => {
      window.__plantoraAuth.signOut();
    });
  } else {
    navCta.outerHTML = "<a href="login.html" class="btn btn--primary nav-cta">Get Started</a>";
  }
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
      const submitBtn = loginForm.querySelector("button[type="submit"]");
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
      const submitBtn = registerForm.querySelector("button[type="submit"]");
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
      document.body.insertAdjacentHTML("afterbegin", "<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:1rem;margin:1rem;border-radius:8px;font-family:Inter,sans-serif;max-width:600px;margin:1rem auto;"><strong>Firebase Auth not configured</strong><br>Edit <code>auth.js</code> and replace <code>firebaseConfig</code> with your project values from Firebase Console.<br><small>See comments at top of auth.js for setup steps.</small></div>");
    }
  }
})();