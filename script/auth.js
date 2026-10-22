// Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyCqlKl7j5yYvdsFKBVEBNjoKltMCBz9kRU",
  authDomain: "plantora-87936.firebaseapp.com",
  projectId: "plantora-87936",
  storageBucket: "plantora-87936.firebasestorage.app",
  messagingSenderId: "684642317612",
  appId: "1:684642317612:web:19d446b36c9defd36a2889",
  measurementId: "G-TF88N9Q5SJ"
};

let auth = null;

// resolve the site root from this script's own URL: the landing page sits at
// the root while everything else lives in pages/, so redirects built here
// must work from either location
const AUTH_URL = (function () {
  const script = document.currentScript;
  const root = script ? new URL("../", script.src) : null;
  return root ? (path) => new URL(path, root).href : (path) => path;
})();

// load the Firebase SDK and keep the auth helpers on window
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
// save or clear the saved user whenever they log in or out
function setupAuthStateListener() {
  window.__plantoraAuth.onAuthStateChanged(async (user) => {
    if (user) {
      const payload = JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
      sessionStorage.setItem("plantora_user", payload);
      localStorage.setItem("plantora_user", payload);
      syncAuthUi(true);
      handlePostLoginRedirect();
    } else {
      sessionStorage.removeItem("plantora_user");
      localStorage.removeItem("plantora_user");
      syncAuthUi(false);
      protectPageIfNeeded();
    }
  });
}

function syncAuthUi(isLoggedIn) {
  if (window.PlantoraUI) {
    window.PlantoraUI.updateNavbarForAuth(isLoggedIn);
  } else {
    document.documentElement.classList.toggle("is-auth", isLoggedIn);
  }
}

// read the saved user from storage
function getCachedUser() {
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
// pages marked data-requires-auth send you to login if you are not signed in
function protectPageIfNeeded() {
  const body = document.body;
  const requiresAuth = body.dataset.requiresAuth === "true";

  if (requiresAuth) {
    const user = getCachedUser();
    if (!user) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = AUTH_URL("pages/login.html") + "?redirect=" + returnUrl;
    }
  }
}

// send them to the page they asked for, or the dashboard
function handlePostLoginRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get("redirect");

  const isAuthPage = window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html");

  if (isAuthPage && redirect) {
    window.location.href = decodeURIComponent(redirect);
  } else if (isAuthPage && !redirect) {
    window.location.href = AUTH_URL("pages/dashboard.html");
  }
}
function setAuthFormsPending() {
  ["login-form", "register-form"].forEach((id) => {
    const form = document.getElementById(id);
    if (!form) return;

    form.setAttribute("aria-busy", "true");

    const btn = form.querySelector("button[type='submit']");
    if (btn && btn.dataset.authLabel === undefined) {
      btn.dataset.authLabel = btn.textContent;
    }

    if (btn && window.PlantoraLoading) {
      window.PlantoraLoading.button(btn, true, "Connecting…");
    }

    Array.prototype.forEach.call(form.elements, (element) => {
      element.disabled = true;
    });
  });
}

function setAuthFormBusy(form, busy, btn, label) {
  if (!form) return;

  form.setAttribute("aria-busy", busy ? "true" : "false");

  Array.prototype.forEach.call(form.elements, (element) => {
    if (element === btn) return;
    element.disabled = busy;
  });

  if (window.PlantoraLoading) {
    window.PlantoraLoading.button(btn, busy, busy ? label : null);
    if (!busy && btn) btn.disabled = false;
    return;
  }

  if (!btn) return;

  if (busy) {
    if (btn.dataset.authLabel === undefined) {
      btn.dataset.authLabel = btn.textContent;
    }
    btn.disabled = true;
    btn.textContent = label || "Please wait…";
  } else {
    btn.disabled = false;
    if (btn.dataset.authLabel !== undefined) {
      btn.textContent = btn.dataset.authLabel;
      delete btn.dataset.authLabel;
    }
  }
}

function setupAuthForms() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    const loginBtn = loginForm.querySelector("button[type='submit']");
    setAuthFormBusy(loginForm, false, loginBtn);

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector("#email").value.trim();
      const password = loginForm.querySelector("#password").value;
      const submitBtn = loginForm.querySelector("button[type='submit']");

      setAuthFormBusy(loginForm, true, submitBtn, "Signing in…");

      try {
        await window.__plantoraAuth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        setAuthFormBusy(loginForm, false, submitBtn);
        showAuthError(loginForm, getFriendlyErrorMessage(err.code));
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    const registerBtn = registerForm.querySelector("button[type='submit']");
    setAuthFormBusy(registerForm, false, registerBtn);

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = registerForm.querySelector("#name").value.trim();
      const email = registerForm.querySelector("#email").value.trim();
      const password = registerForm.querySelector("#password").value;
      const confirmPassword = registerForm.querySelector("#confirm-password").value;
      const submitBtn = registerForm.querySelector("button[type='submit']");

      if (password !== confirmPassword) {
        showAuthError(registerForm, "Passwords do not match");
        return;
      }

      setAuthFormBusy(registerForm, true, submitBtn, "Creating account…");

      try {
        const userCredential = await window.__plantoraAuth.createUserWithEmailAndPassword(email, password);
        await window.__plantoraAuth.updateProfile(userCredential.user, { displayName: name });
      } catch (err) {
        setAuthFormBusy(registerForm, false, submitBtn);
        showAuthError(registerForm, getFriendlyErrorMessage(err.code));
      }
    });
  }
}
// friendlier wording for the Firebase error codes
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

// show the error at the top of the form for 5 seconds
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

// keep the forms visibly pending until Firebase is ready and handlers are bound
setAuthFormsPending();

// start Firebase and attach the form handlers once it is ready
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