
(function () {
  'use strict';

  /* 1. CONFIG */
  const CONFIG = Object.assign({
    // Enables sample data ONLY when no real adapter is present. Use profile.html?preview=1
    previewMode: new URLSearchParams(window.location.search).get('preview') === '1',
    // Real URLs for the nav links in profile.html (keys match their data-nav attributes).
    navigation: { home: null, plants: null, 'my-plants': null, profile: null },
    // Real login / landing URL to open after a successful sign-out. Do not guess it.
    loginUrl: null,
    passwordMinLength: 8,              // match your auth provider's rule
    requireCurrentPassword: true,      // false if your provider doesn't need it
    supportsProfilePhoto: false,       // true only if photo storage exists
    maxPhotoBytes: 2 * 1024 * 1024
  }, window.PlantoraProfileConfig || {});

  /* 2. ADAPTER */
  function codedError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  // Default adapter: every method refuses honestly until it is connected.
  function notConnected(name) {
    return function () {
      return Promise.reject(codedError('Profile service is not connected (' + name + ').', 'not-connected'));
    };
  }
  const unconnectedAdapter = {
    getCurrentUser: notConnected('getCurrentUser'),
    getPlantEntryCount: notConnected('getPlantEntryCount'),
    getCompletedCareTaskCount: notConnected('getCompletedCareTaskCount'),
    getUpcomingCareCount: notConnected('getUpcomingCareCount'),
    updateProfile: notConnected('updateProfile'),
    changePassword: notConnected('changePassword'),
    signOut: notConnected('signOut')
  };

  // Preview adapter: sample data for design review only. Mutations never succeed.
  function previewBlocked() {
    return Promise.reject(codedError('Preview mode: no real account exists, so nothing was changed.', 'preview'));
  }
  const previewAdapter = {
    getCurrentUser: () => Promise.resolve({ displayName: 'Sample Gardener', email: 'sample@example.invalid', photoUrl: null }),
    getPlantEntryCount: () => Promise.resolve(0),
    getCompletedCareTaskCount: () => Promise.resolve(null),
    getUpcomingCareCount: () => Promise.resolve(null),
    updateProfile: previewBlocked,
    changePassword: previewBlocked,
    signOut: previewBlocked
  };

  const hasRealAdapter = Boolean(window.PlantoraProfileAdapter);
  const isPreview = !hasRealAdapter && CONFIG.previewMode;
  const adapter = hasRealAdapter
    ? Object.assign({}, unconnectedAdapter, window.PlantoraProfileAdapter)
    : (isPreview ? previewAdapter : unconnectedAdapter);

  /*3. UI */
  const $ = (id) => document.getElementById(id);
  const state = { user: null, busy: false };

  const el = {
    banner: $('pf-banner'), name: $('pf-name'), email: $('pf-email'),
    avatarImg: $('pf-avatar-img'), avatarDefault: $('pf-avatar-default'),
    editBtn: $('pf-edit-btn'), rowEdit: $('pf-row-edit'), rowPassword: $('pf-row-password'), rowLogout: $('pf-row-logout'),
    statsRetry: $('pf-stats-retry'), toast: $('pf-toast'),
    editDialog: $('pf-edit-dialog'), editForm: $('pf-edit-form'), editStatus: $('pf-edit-status'), editSave: $('pf-edit-save'),
    nameInput: $('pf-name-input'), emailReadonly: $('pf-email-readonly'), photoField: $('pf-photo-field'), photoInput: $('pf-photo-input'),
    pwDialog: $('pf-password-dialog'), pwForm: $('pf-password-form'), pwStatus: $('pf-password-status'), pwSave: $('pf-password-save'),
    currentPw: $('pf-current-password'), newPw: $('pf-new-password'), confirmPw: $('pf-confirm-password'),
    logoutDialog: $('pf-logout-dialog'), logoutStatus: $('pf-logout-status'), logoutConfirm: $('pf-logout-confirm')
  };

  function showBanner(message, isError) {
    el.banner.textContent = message;
    el.banner.classList.toggle('pf-banner--error', Boolean(isError));
    el.banner.hidden = false;
  }

  let toastTimer = null;
  function showToast(message, isError) {
    el.toast.textContent = message;
    el.toast.classList.toggle('pf-toast--error', Boolean(isError));
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 4500);
  }

  function setBusy(button, busy) {
    state.busy = busy;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  }

  function setStatus(node, message) {
    node.textContent = message || '';
    node.hidden = !message;
  }

  function friendlyError(error, fallback) {
    if (error && error.code === 'not-connected') return 'This feature isn’t connected to Plantora’s account service yet.';
    if (error && error.code === 'preview') return error.message;
    return fallback;
  }

  /* ---- Profile header ---- */
  function safeImageUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:', 'blob:'].includes(url.protocol) ? url.href : null;
    } catch (e) { return null; }
  }

  function renderProfile(user) {
    const email = user && typeof user.email === 'string' ? user.email.trim() : '';
    const rawName = user && typeof user.displayName === 'string' ? user.displayName.trim() : '';
    const name = rawName || (email ? email.split('@')[0] : '') || 'Plantora gardener';
    el.name.textContent = name;
    el.email.textContent = email || 'Email unavailable';
    const photo = user ? safeImageUrl(user.photoUrl) : null;
    el.avatarImg.hidden = !photo;
    el.avatarDefault.hidden = Boolean(photo);
    if (photo) { el.avatarImg.src = photo; } else { el.avatarImg.removeAttribute('src'); }
  }

  async function loadProfile() {
    try {
      state.user = await adapter.getCurrentUser();
      if (!state.user) throw codedError('No signed-in user.', 'no-user');
      renderProfile(state.user);
      [el.editBtn, el.rowEdit, el.rowPassword, el.rowLogout].forEach((b) => { b.disabled = false; });
      el.photoField.hidden = !CONFIG.supportsProfilePhoto;
      document.querySelector('[data-password-field="current"]').hidden = !CONFIG.requireCurrentPassword;
      $('pf-new-hint').textContent = 'At least ' + CONFIG.passwordMinLength + ' characters.';
      return true;
    } catch (error) {
      el.name.textContent = 'Profile unavailable';
      el.email.textContent = '';
      if (error && error.code === 'not-connected') {
        showBanner('Integration needed: connect script/profile.js to Plantora’s authentication service. Add ?preview=1 to the URL to see sample data.', false);
      } else {
        showBanner('We couldn’t load your profile. Check your connection or sign in again, then reload the page.', true);
      }
      return false;
    }
  }

  /* ---- Statistics ---- */
  function setStat(key, stateName, value, note) {
    const card = document.querySelector('[data-stat="' + key + '"]');
    card.dataset.state = stateName;
    card.querySelector('[data-role="value"]').textContent = value;
    if (note) card.querySelector('[data-role="note"]').textContent = note;
    return card;
  }

  function applyCount(key, result, unavailableNote) {
    const sample = isPreview ? ' (sample data)' : '';
    if (result.status === 'fulfilled' && Number.isFinite(result.value) && result.value >= 0) {
      const card = setStat(key, 'ready', String(result.value));
      if (isPreview) card.querySelector('[data-role="note"]').textContent += sample;
      return false;
    }
    if (result.status === 'fulfilled') { setStat(key, 'unavailable', 'Not tracked yet', unavailableNote); return false; }
    if (result.reason && result.reason.code === 'not-connected') { setStat(key, 'unavailable', 'Not connected', 'Waiting for integration'); return false; }
    console.error('[Plantora Profile] statistic "' + key + '" failed:', result.reason);
    if (result.reason && result.reason.code === 'plantora/unauthenticated') { setStat(key, 'unavailable', 'Sign in required', 'Your session has expired — reload the page'); return false; }
    setStat(key, 'error', 'Couldn’t load', 'Something went wrong');
    return true;
  }

  async function loadStats() {
    el.statsRetry.hidden = true;
    ['total', 'completed'].forEach((k) => setStat(k, 'loading', '…'));
    const [total, completed, upcoming] = await Promise.allSettled([
      adapter.getPlantEntryCount(), adapter.getCompletedCareTaskCount(), adapter.getUpcomingCareCount()
    ]);
    let hadError = applyCount('total', total, 'Plant count unavailable');
    hadError = applyCount('completed', completed, 'Completion history isn’t recorded') || hadError;
    const upcomingCard = document.querySelector('[data-stat="upcoming"]');
    if (upcoming.status === 'fulfilled' && Number.isFinite(upcoming.value) && upcoming.value >= 0) {
      upcomingCard.hidden = false;
      applyCount('upcoming', upcoming, '');
    } else {
      upcomingCard.hidden = true;
    }
    el.statsRetry.hidden = !hadError;
  }

  /* ---- Dialog helpers ---- */
  function openDialog(dialog) { if (!dialog.open) dialog.showModal(); }
  function closeDialog(dialog) { if (dialog.open) dialog.close(); }

  function clearFieldErrors(form) {
    form.querySelectorAll('.pf-error').forEach((p) => { p.textContent = ''; });
    form.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
  }
  function fieldError(inputId, message) {
    const input = $(inputId);
    input.setAttribute('aria-invalid', 'true');
    document.querySelector('[data-error-for="' + inputId + '"]').textContent = message;
    return input;
  }

  [el.editDialog, el.pwDialog, el.logoutDialog].forEach((dialog) => {
    dialog.addEventListener('cancel', (e) => { if (state.busy) e.preventDefault(); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog && !state.busy) dialog.close(); });
    dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { if (!state.busy) dialog.close(); }));
  });

  /* ---- Edit profile ---- */
  function openEdit() {
    clearFieldErrors(el.editForm); setStatus(el.editStatus, '');
    el.nameInput.value = (state.user && state.user.displayName) || '';
    el.emailReadonly.value = (state.user && state.user.email) || '';
    el.photoInput.value = '';
    openDialog(el.editDialog);
    el.nameInput.focus();
  }

  async function submitEdit(event) {
    event.preventDefault();
    if (state.busy) return;
    clearFieldErrors(el.editForm); setStatus(el.editStatus, '');
    const displayName = el.nameInput.value.trim();
    const photoFile = CONFIG.supportsProfilePhoto && el.photoInput.files[0] ? el.photoInput.files[0] : null;
    if (!displayName) { fieldError('pf-name-input', 'Enter your name.').focus(); return; }
    if (displayName.length > 80) { fieldError('pf-name-input', 'Use 80 characters or fewer.').focus(); return; }
    if (photoFile) {
      if (!/^image\/(png|jpeg|webp)$/.test(photoFile.type)) { fieldError('pf-photo-input', 'Choose a PNG, JPG or WebP image.').focus(); return; }
      if (photoFile.size > CONFIG.maxPhotoBytes) { fieldError('pf-photo-input', 'Image must be 2 MB or smaller.').focus(); return; }
    }
    setBusy(el.editSave, true);
    try {
      const updated = await adapter.updateProfile({ displayName: displayName, photoFile: photoFile });
      state.user = updated || Object.assign({}, state.user, { displayName: displayName });
      renderProfile(state.user);
      closeDialog(el.editDialog);
      showToast('Profile saved.');
    } catch (error) {
      setStatus(el.editStatus, friendlyError(error, 'We couldn’t save your profile. Your changes were not saved. Try again.'));
    } finally {
      setBusy(el.editSave, false);
    }
  }

  /* ---- Change password ---- */
  function resetPasswordForm() {
    el.pwForm.reset(); clearFieldErrors(el.pwForm); setStatus(el.pwStatus, '');
    el.pwForm.querySelectorAll('[data-toggle-for]').forEach((b) => {
      $(b.dataset.toggleFor).type = 'password';
      b.textContent = 'Show'; b.setAttribute('aria-pressed', 'false');
    });
  }
  el.pwDialog.addEventListener('close', resetPasswordForm);

  el.pwForm.querySelectorAll('[data-toggle-for]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $(button.dataset.toggleFor);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(show));
    });
  });

  async function submitPassword(event) {
    event.preventDefault();
    if (state.busy) return;
    clearFieldErrors(el.pwForm); setStatus(el.pwStatus, '');
    const current = el.currentPw.value, next = el.newPw.value, confirm = el.confirmPw.value;
    let firstInvalid = null;
    if (CONFIG.requireCurrentPassword && !current) firstInvalid = fieldError('pf-current-password', 'Enter your current password.');
    if (next.length < CONFIG.passwordMinLength) firstInvalid = firstInvalid || fieldError('pf-new-password', 'Use at least ' + CONFIG.passwordMinLength + ' characters.');
    else if (CONFIG.requireCurrentPassword && next === current) firstInvalid = firstInvalid || fieldError('pf-new-password', 'Choose a password different from your current one.');
    if (confirm !== next) { const f = fieldError('pf-confirm-password', 'Passwords don’t match.'); firstInvalid = firstInvalid || f; }
    if (firstInvalid) { firstInvalid.focus(); return; }

    setBusy(el.pwSave, true);
    try {
      await adapter.changePassword({ currentPassword: CONFIG.requireCurrentPassword ? current : undefined, newPassword: next });
      closeDialog(el.pwDialog);
      showToast('Password updated.');
    } catch (error) {
      const messages = {
        'wrong-password': ['pf-current-password', 'That password is incorrect.'],
        'invalid-credential': ['pf-current-password', 'That password is incorrect.'],
        'invalid-login-credentials': ['pf-current-password', 'That password is incorrect.'],
        'weak-password': ['pf-new-password', 'Choose a stronger password.']
      };
      const mapped = error && messages[error.code];
      if (mapped) { fieldError(mapped[0], mapped[1]).focus(); }
      else if (error && error.code === 'requires-recent-login') setStatus(el.pwStatus, 'For security, sign in again, then retry changing your password.');
      else setStatus(el.pwStatus, friendlyError(error, 'We couldn’t update your password. Your password was not changed. Try again.'));
    } finally {
      setBusy(el.pwSave, false);
    }
  }

  /* ---- Logout ---- */
  async function confirmLogout() {
    if (state.busy) return;
    setStatus(el.logoutStatus, '');
    setBusy(el.logoutConfirm, true);
    try {
      await adapter.signOut();
    } catch (error) {
      setStatus(el.logoutStatus, friendlyError(error, 'We couldn’t log you out. You’re still signed in. Try again.'));
      setBusy(el.logoutConfirm, false);
      return;
    }
    if (CONFIG.loginUrl) {
      window.location.assign(CONFIG.loginUrl);
    } else {
      setBusy(el.logoutConfirm, false);
      setStatus(el.logoutStatus, 'You’re logged out, but no login page is configured. Set CONFIG.loginUrl.');
    }
  }

  /* ---- Wiring ---- */
  function wireNavigation() {
    document.querySelectorAll('[data-nav]').forEach((link) => {
      const target = CONFIG.navigation[link.dataset.nav];
      if (target) { link.setAttribute('href', target); }
      else { link.addEventListener('click', (e) => e.preventDefault()); }
    });
  }

  function init() {
    wireNavigation();
    if (isPreview) showBanner('Preview mode: sample data only. Edits, password changes and logout will not affect any account.', false);
    [el.editBtn, el.rowEdit].forEach((b) => b.addEventListener('click', openEdit));
    el.rowPassword.addEventListener('click', () => { openDialog(el.pwDialog); (CONFIG.requireCurrentPassword ? el.currentPw : el.newPw).focus(); });
    el.rowLogout.addEventListener('click', () => { setStatus(el.logoutStatus, ''); openDialog(el.logoutDialog); });
    el.editForm.addEventListener('submit', submitEdit);
    el.pwForm.addEventListener('submit', submitPassword);
    el.logoutConfirm.addEventListener('click', confirmLogout);
    el.statsRetry.addEventListener('click', loadStats);
    loadProfile().then((ok) => {
      if (ok) { loadStats(); }
      else {
        ['total', 'completed'].forEach((k) => setStat(k, 'unavailable', 'Unavailable', 'Sign-in required'));
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();