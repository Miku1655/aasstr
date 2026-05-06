// ═══════════════════════════════════════════
//  FIREBASE — Auth + Realtime Database Sync
// ═══════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  off,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1p4i6q4KLUYPxROYengaNi1a7h226LCI",
  authDomain: "asstr-f6536.firebaseapp.com",
  databaseURL: "https://asstr-f6536-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "asstr-f6536",
  storageBucket: "asstr-f6536.firebasestorage.app",
  messagingSenderId: "440031866116",
  appId: "1:440031866116:web:06c79472a47f1fd4277451"
};

// ── Init ──────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getDatabase(fbApp);

// ── State ─────────────────────────────────
window.fbUser        = null;
window.fbListeners   = {};
let   _remotePause   = false;

// ── Helpers ──────────────────────────────
function userRef(path) {
  return ref(db, `users/${fbUser.uid}/${path}`);
}

function setSyncIndicator(status) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  const icons  = { synced: '●', syncing: '◌', offline: '○', error: '⚠' };
  const labels = { synced: 'Synced', syncing: 'Syncing…', offline: 'Offline', error: 'Sync error' };
  el.dataset.status = status;
  el.title = labels[status] || '';
  el.textContent = (icons[status] || '○') + ' ' + (labels[status] || '');
}

// ═══════════════════════════════════════════
//  AUTH FUNCTIONS
// ═══════════════════════════════════════════
window.fbSignIn = async function () {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please enter email and password.'; return; }
  try {
    document.getElementById('auth-submit').disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = friendlyAuthError(e.code);
    document.getElementById('auth-submit').disabled = false;
  }
};

window.fbRegister = async function () {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please enter email and password.'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  try {
    document.getElementById('auth-submit').disabled = true;
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = friendlyAuthError(e.code);
    document.getElementById('auth-submit').disabled = false;
  }
};

window.fbSignOut = async function () {
  detachListeners();
  await signOut(auth);
};

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':      'No account found with that email.',
    'auth/wrong-password':      'Incorrect password.',
    'auth/invalid-email':       'Invalid email address.',
    'auth/email-already-in-use':'That email is already registered.',
    'auth/weak-password':       'Password is too weak.',
    'auth/invalid-credential':  'Incorrect email or password.',
    'auth/too-many-requests':   'Too many attempts. Please wait a moment.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || `Authentication error (${code}).`;
}

// ═══════════════════════════════════════════
//  REALTIME LISTENERS
// ═══════════════════════════════════════════
function attachListeners() {
  // ── Stories ──
  const storiesRef = userRef('stories');
  const storiesUnsub = onValue(storiesRef, snapshot => {
    if (_remotePause) return;
    const val = snapshot.val();
    if (val === null) {
      if (state.stories.length > 0) fbSaveStories(state.stories);
      return;
    }
    const remote = Array.isArray(val) ? val : Object.values(val);
    if (JSON.stringify(remote) !== JSON.stringify(state.stories)) {
      state.stories = remote;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      updateSidebar();
      if (state.view === 'library') renderLibrary();
      if (state.view === 'tags')    renderTagCloud();
    }
    setSyncIndicator('synced');
  }, () => setSyncIndicator('error'));
  fbListeners.stories = () => off(storiesRef, 'value', storiesUnsub);

  // ── Settings ──
  const settingsRef = userRef('settings');
  const settingsUnsub = onValue(settingsRef, snapshot => {
    if (_remotePause) return;
    const val = snapshot.val();
    if (val === null) {
      if (state.settings) fbSaveSettings(state.settings);
      return;
    }
    const merged = {
      ...DEFAULT_SETTINGS,
      ...val,
      options: { ...DEFAULT_SETTINGS.options, ...(val.options || {}) },
      categories: Array.isArray(val.categories) ? val.categories : [...DEFAULT_CATEGORIES],
      customThemes: Array.isArray(val.customThemes) ? val.customThemes : [],
    };
    if (JSON.stringify(merged) !== JSON.stringify(state.settings)) {
      state.settings = merged;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      // Re-inject all custom theme styles since we got fresh data
      injectAllCustomThemes();
      applyAllSettings();
      if (state.view === 'admin') renderAdmin();
    }
    setSyncIndicator('synced');
  }, () => setSyncIndicator('error'));
  fbListeners.settings = () => off(settingsRef, 'value', settingsUnsub);
}

function detachListeners() {
  Object.values(fbListeners).forEach(fn => fn());
  window.fbListeners = {};
}

// ═══════════════════════════════════════════
//  WRITE FUNCTIONS
// ═══════════════════════════════════════════
window.fbSaveStories = async function (stories) {
  if (!fbUser) return;
  setSyncIndicator('syncing');
  _remotePause = true;
  try {
    await set(userRef('stories'), stories);
    setSyncIndicator('synced');
  } catch (e) {
    console.error('Firebase write error:', e);
    setSyncIndicator('error');
  } finally {
    setTimeout(() => { _remotePause = false; }, 300);
  }
};

window.fbSaveSettings = async function (settings) {
  if (!fbUser) return;
  setSyncIndicator('syncing');
  _remotePause = true;
  try {
    await set(userRef('settings'), settings);
    setSyncIndicator('synced');
  } catch (e) {
    console.error('Firebase write error:', e);
    setSyncIndicator('error');
  } finally {
    setTimeout(() => { _remotePause = false; }, 300);
  }
};

// ═══════════════════════════════════════════
//  AUTH STATE OBSERVER
// ═══════════════════════════════════════════
onAuthStateChanged(auth, user => {
  if (user) {
    window.fbUser = user;
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app').style.display = '';
    document.getElementById('user-email-display').textContent = user.email;
    document.getElementById('sync-indicator').style.display = '';
    attachListeners();
    setSyncIndicator('syncing');
  } else {
    window.fbUser = null;
    detachListeners();
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('sync-indicator').style.display = 'none';
  }
});
