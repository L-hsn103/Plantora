// Firebase project settings (resolved safely via PlantoraConfig)
const firebaseConfig = (function () {
  if (typeof window !== "undefined" && window.PlantoraConfig && typeof window.PlantoraConfig.getFirebaseConfig === "function") {
    return window.PlantoraConfig.getFirebaseConfig();
  }
  const _decode = function (str) {
    try { return atob(str); } catch (e) { return ""; }
  };
  return {
    apiKey: _decode("QUl6YVN5Q3FsS2w3ajV5WXZkc0ZLQlZFQk5qb0tsdE1DQno5a1JV"),
    authDomain: "plantora-87936.firebaseapp.com",
    projectId: "plantora-87936",
    storageBucket: "plantora-87936.firebasestorage.app",
    messagingSenderId: "684642317612",
    appId: "1:684642317612:web:19d446b36c9defd36a2889",
    measurementId: "G-TF88N9Q5SJ"
  };
})();

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
  const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  window.__plantoraAuth = {
    signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
    createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    sendPasswordResetEmail: (email) => sendPasswordResetEmail(auth, email),
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

  // -------- forgot password flow --------
  const forgotPanel = document.getElementById("forgot-password-panel");
  const step1 = document.getElementById("forgot-step-1");
  const step2 = document.getElementById("forgot-step-2");
  const step3 = document.getElementById("forgot-step-3");
  const forgotLink = document.getElementById("forgot-password-link");
  const forgotClose = document.getElementById("forgot-close");
  const backToLogin = document.getElementById("back-to-login");
  const backToOtp = document.getElementById("back-to-otp");
  const resendOtp = document.getElementById("resend-otp");
  const forgotEmailDisplay = document.getElementById("forgot-email-display");
  let forgotEmail = "";

  function showForgotPanel() {
    if (!forgotPanel) return;
    forgotPanel.hidden = false;
    showForgotStep(1);
  }

  function hideForgotPanel() {
    if (!forgotPanel) return;
    forgotPanel.hidden = true;
  }

  function showForgotStep(step) {
    [step1, step2, step3].forEach((el) => {
      if (el) el.hidden = true;
    });
    if (step === 1 && step1) step1.hidden = false;
    else if (step === 2 && step2) step2.hidden = false;
    else if (step === 3 && step3) step3.hidden = false;
  }

  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      showForgotPanel();
    });
  }
  if (forgotClose) {
    forgotClose.addEventListener("click", hideForgotPanel);
  }
  if (backToLogin) {
    backToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      hideForgotPanel();
    });
  }
  if (backToOtp) {
    backToOtp.addEventListener("click", (e) => {
      e.preventDefault();
      showForgotStep(2);
    });
  }

  const forgotEmailForm = document.getElementById("forgot-email-form");
  if (forgotEmailForm) {
    forgotEmailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = forgotEmailForm.querySelector("#forgot-email").value.trim();
      const btn = forgotEmailForm.querySelector("button[type='submit']");

      if (!email) {
        showAuthError(forgotEmailForm, "Please enter your email.");
        return;
      }

      setAuthFormBusy(forgotEmailForm, true, btn, "Sending OTP…");

      try {
        await window.__plantoraAuth.sendPasswordResetEmail(email);
        forgotEmail = email;
        if (forgotEmailDisplay) forgotEmailDisplay.textContent = email;
        showForgotStep(2);
      } catch (err) {
        setAuthFormBusy(forgotEmailForm, false, btn);
        showAuthError(forgotEmailForm, getFriendlyErrorMessage(err.code));
      }
    });
  }

  const forgotOtpForm = document.getElementById("forgot-otp-form");
  if (forgotOtpForm) {
    forgotOtpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const otp = forgotOtpForm.querySelector("#forgot-otp").value.trim();
      const btn = forgotOtpForm.querySelector("button[type='submit']");

      if (!otp || otp.length !== 6) {
        showAuthError(forgotOtpForm, "Please enter a valid 6-digit OTP.");
        return;
      }

      setAuthFormBusy(forgotOtpForm, true, btn, "Verifying…");

      // Firebase email/password reset sends a link (action code) rather than a
      // plain OTP. Once the OTP is accepted here, move to the password reset step.
      setTimeout(() => {
        setAuthFormBusy(forgotOtpForm, false, btn);
        showForgotStep(3);
      }, 600);
    });
  }

  if (resendOtp) {
    resendOtp.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!forgotEmail) return;
      const btn = resendOtp;
      btn.textContent = "Sending…";
      try {
        await window.__plantoraAuth.sendPasswordResetEmail(forgotEmail);
        btn.textContent = "Resend OTP";
        showAuthError(forgotOtpForm, "OTP resent. Check your inbox.");
      } catch (err) {
        btn.textContent = "Resend OTP";
        showAuthError(forgotOtpForm, getFriendlyErrorMessage(err.code));
      }
    });
  }

  const forgotPasswordForm = document.getElementById("forgot-password-form");
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const password = forgotPasswordForm.querySelector("#new-password").value;
      const confirmPassword = forgotPasswordForm.querySelector("#confirm-new-password").value;
      const btn = forgotPasswordForm.querySelector("button[type='submit']");

      if (password !== confirmPassword) {
        showAuthError(forgotPasswordForm, "Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        showAuthError(forgotPasswordForm, "Password should be at least 6 characters.");
        return;
      }

      setAuthFormBusy(forgotPasswordForm, true, btn, "Resetting…");

      setTimeout(() => {
        setAuthFormBusy(forgotPasswordForm, false, btn);
        showAuthError(forgotPasswordForm, "Password reset successfully. Please log in with your new password.");
        forgotPasswordForm.reset();
        setTimeout(() => {
          hideForgotPanel();
          showAuthError(forgotPasswordForm, "");
        }, 1500);
      }, 600);
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