// ═══════════════════════════════════════════
//  SETTINGS APPLICATION
// ═══════════════════════════════════════════
function applyTheme(id) {
  document.body.setAttribute('data-theme', id);
  state.settings.theme = id;
  saveSettings();
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === id);
  });
}

function setLayout(id, btn) {
  document.body.setAttribute('data-layout', id);
  state.settings.layout = id;
  saveSettings();
  document.querySelectorAll('#layout-grid .layout-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  updateTopNav();
}

function setCards(id, btn) {
  document.body.setAttribute('data-cards', id);
  state.settings.cards = id;
  saveSettings();
  document.querySelectorAll('#cards-grid .layout-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function applyOptions() {
  const opts = state.settings.options;
  document.getElementById('header').style.height = opts.compactHeader ? '44px' : '';
  const sb = document.getElementById('stats-bar');
  if (sb) sb.style.display = opts.stats ? '' : 'none';
}

function saveOptions() {
  state.settings.options = {
    wordcount:     document.getElementById('opt-wordcount').checked,
    progress:      document.getElementById('opt-progress').checked,
    ratings:       document.getElementById('opt-ratings').checked,
    compactHeader: document.getElementById('opt-compact-header').checked,
    stats:         document.getElementById('opt-stats').checked,
  };
  saveSettings();
}

function saveSiteName() {
  const name = document.getElementById('admin-site-name').value.trim() || 'The Private Library';
  state.settings.siteName = name;
  saveSettings();
  updateLogoDisplay();
  toast('Site name updated.');
}

function updateLogoDisplay() {
  const name  = state.settings.siteName || 'The Private Library';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    const mid = Math.floor(parts.length / 2);
    document.getElementById('logo-accent').textContent    = parts.slice(0, mid).join(' ');
    document.getElementById('logo-main-text').textContent = ' ' + parts.slice(mid).join(' ');
  } else {
    document.getElementById('logo-accent').textContent    = name;
    document.getElementById('logo-main-text').textContent = '';
  }
  document.title = name;
}

function applyAllSettings() {
  const s = state.settings;
  document.body.setAttribute('data-theme',  s.theme  || 'crimson');
  document.body.setAttribute('data-layout', s.layout || 'default');
  document.body.setAttribute('data-cards',  s.cards  || 'default');
  injectAllCustomThemes();
  updateLogoDisplay();
  applyOptions();
  updateTopNav();
}

// ═══════════════════════════════════════════
//  TOP NAV (for no-sidebar layout)
// ═══════════════════════════════════════════
function updateTopNav() {
  const isNoSidebar = (state.settings.layout || 'default') === 'nosidebar';
  const el = document.getElementById('top-nav');
  if (!el) return;
  el.style.display = isNoSidebar ? 'flex' : 'none';
  if (isNoSidebar) renderTopNav();
}

function renderTopNav() {
  const el = document.getElementById('top-nav');
  if (!el) return;

  const cats = {};
  state.stories.forEach(s => { if (s.category) cats[s.category] = (cats[s.category]||0)+1; });

  const catItems = Object.entries(cats).sort().map(([cat]) =>
    `<button class="tnav-pill ${state.filterCategory === cat ? 'active' : ''}"
      onclick="filterCategory('${escHtml(cat)}')">${escHtml(cat)}</button>`
  ).join('');

  el.innerHTML = `
    <button class="tnav-pill ${!state.filterCategory && state.filterMode==='all' ? 'active' : ''}"
      onclick="filterCategory(null)">All</button>
    <button class="tnav-pill ${state.filterMode==='favs' ? 'active' : ''}"
      onclick="filterFavorites()">★ Favorites</button>
    <button class="tnav-pill ${state.filterMode==='unread' ? 'active' : ''}"
      onclick="filterUnread()">Unread</button>
    ${catItems}
    <button class="tnav-pill ${state.view==='tags' ? 'active' : ''}"
      onclick="showView('tags')"># Tags</button>
  `;
}

// ═══════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════
function getCategories() {
  return state.settings.categories || DEFAULT_CATEGORIES;
}

function populateCategoryDropdown() {
  const sel     = document.getElementById('f-category');
  const current = sel.value;
  sel.innerHTML = '<option value="">Select category…</option>';
  getCategories().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function addCategory() {
  const input = document.getElementById('new-cat-input');
  const name  = input.value.trim();
  if (!name) return;
  if (state.settings.categories.includes(name)) { toast('Category already exists.'); return; }
  state.settings.categories.push(name);
  saveSettings();
  input.value = '';
  renderAdminCategories();
  populateCategoryDropdown();
  toast(`Category "${name}" added.`);
}

function removeCategory(name) {
  const inUse = state.stories.some(s => s.category === name);
  if (inUse && !confirm(`"${name}" is used by some stories. Remove anyway?\nStories will become uncategorized.`)) return;
  state.settings.categories = state.settings.categories.filter(c => c !== name);
  saveSettings();
  renderAdminCategories();
  populateCategoryDropdown();
  updateSidebar();
  toast(`Category "${name}" removed.`);
}

function renderAdminCategories() {
  const list = document.getElementById('admin-cat-list');
  if (!list) return;
  list.innerHTML = getCategories().map(cat => {
    const count = state.stories.filter(s => s.category === cat).length;
    return `<div class="cat-row">
      <span class="cat-row-name">${escHtml(cat)}</span>
      <span class="cat-row-count">${count} ${count === 1 ? 'story' : 'stories'}</span>
      <button class="cat-row-del" onclick="removeCategory('${escHtml(cat)}')" title="Remove category">×</button>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════
//  ADMIN VIEW
// ═══════════════════════════════════════════
function renderAdmin() {
  document.getElementById('admin-site-name').value = state.settings.siteName || 'The Private Library';

  // Built-in themes
  const builtInHtml = THEMES.map(t => `
    <div class="theme-swatch ${state.settings.theme === t.id ? 'active' : ''}" data-theme="${t.id}" onclick="applyTheme('${t.id}')">
      <div class="swatch-preview" style="background:${t.bg}">
        <div class="swatch-bar" style="background:${t.accent}"></div>
        <div class="swatch-body">
          <div class="swatch-sidebar" style="background:${t.bg2};border:1px solid ${t.border}"></div>
          <div class="swatch-content">
            <div class="swatch-line" style="background:${t.gold};width:70%"></div>
            <div class="swatch-line" style="background:${t.border};width:100%"></div>
            <div class="swatch-line" style="background:${t.border};width:85%"></div>
            <div class="swatch-line" style="background:${t.accent};width:40%"></div>
          </div>
        </div>
      </div>
      <div class="swatch-name">${t.name}</div>
    </div>
  `).join('');

  // Custom themes
  const customHtml = (state.settings.customThemes || []).map(t => `
    <div class="theme-swatch ${state.settings.theme === t.id ? 'active' : ''}" data-theme="${t.id}" onclick="applyTheme('${t.id}')">
      <div class="swatch-preview" style="background:${t.bg}">
        <div class="swatch-bar" style="background:${t.accent}"></div>
        <div class="swatch-body">
          <div class="swatch-sidebar" style="background:${t.bg2};border:1px solid ${t.border}"></div>
          <div class="swatch-content">
            <div class="swatch-line" style="background:${t.gold};width:70%"></div>
            <div class="swatch-line" style="background:${t.border};width:100%"></div>
            <div class="swatch-line" style="background:${t.border};width:85%"></div>
            <div class="swatch-line" style="background:${t.accent};width:40%"></div>
          </div>
        </div>
      </div>
      <div class="swatch-name" style="display:flex;align-items:center;justify-content:space-between;gap:4px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.name)}</span>
        <span style="display:flex;gap:3px;flex-shrink:0">
          <button onclick="event.stopPropagation();openThemeEditor('${t.id}')" title="Edit" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:0.75rem;padding:0 2px">✎</button>
          <button onclick="event.stopPropagation();deleteCustomTheme('${t.id}')" title="Delete" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:0.85rem;padding:0 2px">×</button>
        </span>
      </div>
    </div>
  `).join('');

  document.getElementById('theme-grid').innerHTML = builtInHtml + customHtml;

  // Layout / cards buttons
  document.querySelectorAll('#layout-grid .layout-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.layout === (state.settings.layout || 'default'));
  });
  document.querySelectorAll('#cards-grid .layout-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cards === (state.settings.cards || 'default'));
  });

  // Options toggles
  const opts = state.settings.options;
  document.getElementById('opt-wordcount').checked       = opts.wordcount !== false;
  document.getElementById('opt-progress').checked        = opts.progress  !== false;
  document.getElementById('opt-ratings').checked         = opts.ratings   !== false;
  document.getElementById('opt-compact-header').checked  = !!opts.compactHeader;
  document.getElementById('opt-stats').checked           = opts.stats !== false;

  renderAdminCategories();
}

function resetSettings() {
  if (!confirm('Reset all settings to defaults? This will not affect your stories.')) return;
  state.settings = { ...DEFAULT_SETTINGS, categories: [...DEFAULT_CATEGORIES], customThemes: [] };
  saveSettings();
  applyAllSettings();
  renderAdmin();
  toast('Settings reset to defaults.');
}

function clearAllStories() {
  if (!confirm('Delete ALL stories permanently? This cannot be undone.')) return;
  if (!confirm('Are you sure? All stories will be lost.')) return;
  state.stories = [];
  saveData(state.stories);
  updateSidebar();
  toast('Library cleared.');
}

// ═══════════════════════════════════════════
//  CUSTOM THEME EDITOR
// ═══════════════════════════════════════════

// The theme being edited in the modal
let _editingTheme = null;

function openThemeEditor(id) {
  _editingTheme = id
    ? JSON.parse(JSON.stringify((state.settings.customThemes||[]).find(t=>t.id===id) || THEMES.find(t=>t.id===id)))
    : {
        id: 'custom-' + generateId(),
        name: 'My Theme',
        bg:     '#0c0a0b',
        bg2:    '#131013',
        border: '#2e2530',
        accent: '#9b2335',
        gold:   '#c4a265',
        text:   '#e2d8d0',
      };

  // If copying from built-in, give it a new id
  if (id && THEMES.find(t=>t.id===id)) {
    _editingTheme.id   = 'custom-' + generateId();
    _editingTheme.name = _editingTheme.name + ' (Custom)';
  }

  const isNew = !(state.settings.customThemes||[]).find(t=>t.id===_editingTheme.id);

  document.getElementById('te-name').value   = _editingTheme.name;
  document.getElementById('te-bg').value     = _editingTheme.bg;
  document.getElementById('te-bg2').value    = _editingTheme.bg2;
  document.getElementById('te-border').value = _editingTheme.border;
  document.getElementById('te-accent').value = _editingTheme.accent;
  document.getElementById('te-gold').value   = _editingTheme.gold;
  document.getElementById('te-text').value   = _editingTheme.text || '#e2d8d0';
  document.getElementById('te-modal-title').textContent = isNew ? 'Create Theme' : 'Edit Theme';

  syncThemePreview();
  showModal('theme-editor-modal');
}

function syncThemePreview() {
  if (!_editingTheme) return;
  _editingTheme.name   = document.getElementById('te-name').value;
  _editingTheme.bg     = document.getElementById('te-bg').value;
  _editingTheme.bg2    = document.getElementById('te-bg2').value;
  _editingTheme.border = document.getElementById('te-border').value;
  _editingTheme.accent = document.getElementById('te-accent').value;
  _editingTheme.gold   = document.getElementById('te-gold').value;
  _editingTheme.text   = document.getElementById('te-text').value;

  // Live preview: inject CSS for _editingTheme and switch body to it
  injectCustomThemeStyle(_editingTheme);
  document.getElementById('te-preview-card').setAttribute('data-theme', _editingTheme.id);

  // Update the swatch preview in the modal
  const prev = document.getElementById('te-swatch-preview');
  if (prev) {
    prev.style.background = _editingTheme.bg;
    prev.querySelector('.swatch-bar').style.background    = _editingTheme.accent;
    prev.querySelector('.swatch-sidebar').style.background = _editingTheme.bg2;
    prev.querySelector('.swatch-sidebar').style.borderColor = _editingTheme.border;
    const lines = prev.querySelectorAll('.swatch-line');
    if (lines[0]) lines[0].style.background = _editingTheme.gold;
    if (lines[1]) lines[1].style.background = _editingTheme.border;
    if (lines[2]) lines[2].style.background = _editingTheme.border;
    if (lines[3]) lines[3].style.background = _editingTheme.accent;
  }
}

function saveCustomTheme() {
  if (!_editingTheme) return;
  syncThemePreview();

  if (!_editingTheme.name.trim()) { toast('Please enter a theme name.'); return; }

  if (!state.settings.customThemes) state.settings.customThemes = [];
  const idx = state.settings.customThemes.findIndex(t => t.id === _editingTheme.id);
  if (idx >= 0) {
    state.settings.customThemes[idx] = { ..._editingTheme };
  } else {
    state.settings.customThemes.push({ ..._editingTheme });
  }

  injectCustomThemeStyle(_editingTheme);
  saveSettings();
  applyTheme(_editingTheme.id);
  closeModal('theme-editor-modal');
  renderAdmin();
  toast(`Theme "${_editingTheme.name}" saved.`);
  _editingTheme = null;
}

function deleteCustomTheme(id) {
  if (!confirm('Delete this custom theme?')) return;
  state.settings.customThemes = (state.settings.customThemes||[]).filter(t=>t.id!==id);
  // If it was active, revert to crimson
  if (state.settings.theme === id) applyTheme('crimson');
  saveSettings();
  renderAdmin();
  // Remove injected style
  const el = document.getElementById('custom-theme-' + id);
  if (el) el.remove();
  toast('Theme deleted.');
}
