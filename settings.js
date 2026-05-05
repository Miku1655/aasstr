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
  updateLogoDisplay();
  applyOptions();
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

  // Themes
  document.getElementById('theme-grid').innerHTML = THEMES.map(t => `
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
  state.settings = { ...DEFAULT_SETTINGS, categories: [...DEFAULT_CATEGORIES] };
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
