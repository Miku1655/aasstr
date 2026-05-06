// ═══════════════════════════════════════════
//  VIEW MANAGEMENT
// ═══════════════════════════════════════════
const ALL_VIEWS = ['library','reader','editor','tags','author','admin'];

function showView(name) {
  ALL_VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('active', v === name);
  });
  state.view = name;
  updateSidebar();
  renderTopNav();
  if (name === 'library') renderLibrary();
  if (name === 'tags')    renderTagCloud();
  if (name === 'admin')   renderAdmin();
  window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════
//  LIBRARY RENDER
// ═══════════════════════════════════════════
function getFilteredStories() {
  let s = [...state.stories];
  if (state.filterMode === 'favs')   s = s.filter(x => x.isFavorite);
  else if (state.filterMode === 'unread') s = s.filter(x => !x.readingProgress || x.readingProgress < 0.05);
  if (state.filterCategory) s = s.filter(x => x.category === state.filterCategory);
  if (state.filterTag)      s = s.filter(x => x.tags && x.tags.includes(state.filterTag));
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    s = s.filter(x =>
      x.title.toLowerCase().includes(q) ||
      (x.author||'').toLowerCase().includes(q) ||
      (x.summary||'').toLowerCase().includes(q) ||
      (x.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }
  s.sort((a, b) => {
    const sort = state.sortBy;
    if (sort === 'date-desc')    return new Date(b.dateAdded) - new Date(a.dateAdded);
    if (sort === 'date-asc')     return new Date(a.dateAdded) - new Date(b.dateAdded);
    if (sort === 'title-asc')    return a.title.localeCompare(b.title);
    if (sort === 'alpha-author') return (a.author||'').localeCompare(b.author||'');
    if (sort === 'wc-desc')      return b.wordCount - a.wordCount;
    if (sort === 'wc-asc')       return a.wordCount - b.wordCount;
    return 0;
  });
  return s;
}

function renderLibrary() {
  const stories  = getFilteredStories();
  const grid     = document.getElementById('story-grid');
  const ornament = document.getElementById('ornament');
  const opts     = state.settings.options;

  let title = 'All Stories';
  if (state.filterMode === 'favs')        title = 'Favorites';
  else if (state.filterMode === 'unread') title = 'Unread';
  else if (state.filterCategory)          title = state.filterCategory;
  else if (state.filterTag)               title = `#${state.filterTag}`;
  if (state.searchQuery) title = `Search: "${state.searchQuery}"`;

  document.getElementById('library-title').textContent    = title;
  document.getElementById('library-subtitle').textContent = stories.length + (stories.length === 1 ? ' story' : ' stories');

  // Stats bar
  const totalWC  = state.stories.reduce((s, x) => s + (x.wordCount || 0), 0);
  const favCount = state.stories.filter(x => x.isFavorite).length;
  const cats     = new Set(state.stories.map(x => x.category).filter(Boolean));
  const statsBar = document.getElementById('stats-bar');
  if (statsBar) {
    statsBar.innerHTML = `
      <div class="stat"><div class="stat-value">${state.stories.length}</div><div class="stat-label">Stories</div></div>
      <div class="stat"><div class="stat-value">${Math.round(totalWC/1000)}k</div><div class="stat-label">Total Words</div></div>
      <div class="stat"><div class="stat-value">${favCount}</div><div class="stat-label">Favorites</div></div>
      <div class="stat"><div class="stat-value">${cats.size}</div><div class="stat-label">Categories</div></div>
    `;
    statsBar.style.display = opts.stats !== false ? '' : 'none';
  }

  renderActiveFilters();

  if (stories.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      <h3>No stories found</h3>
      <p>Add your first story or adjust the filters.</p>
    </div>`;
    ornament.style.display = 'none';
    return;
  }
  grid.innerHTML = stories.map(s => storyCard(s)).join('');
  ornament.style.display = 'block';
}

function storyCard(s) {
  const q    = state.searchQuery;
  const opts = state.settings.options;
  const stars   = (opts.ratings !== false && s.rating) ? '★'.repeat(s.rating) + '☆'.repeat(5 - s.rating) : '';
  const progress = (s.readingProgress || 0) * 100;
  const tags = (s.tags||[]).slice(0,4).map(t =>
    `<span class="card-tag" onclick="filterByTag('${escHtml(t)}',event)">${highlight(t,q)}</span>`
  ).join('');
  return `<div class="story-card" onclick="openStory('${s.id}')">
    <div class="card-category">${escHtml(s.category||'Uncategorized')}</div>
    <div class="card-title">${highlight(s.title,q)}</div>
    <div class="card-author" onclick="openAuthor('${escHtml(s.author||'')}',event)">${highlight(s.author||'Unknown',q)}</div>
    <div class="card-summary">${highlight(s.summary||'',q)}</div>
    <div class="card-tags">${tags}</div>
    <div class="card-footer">
      ${opts.wordcount !== false ? `<span class="card-wc">${formatWC(s.wordCount||0)}</span>` : ''}
      <span style="color:var(--gold);font-size:0.75rem">${stars}</span>
      <button class="card-fav ${s.isFavorite?'active':''}" onclick="toggleFav('${s.id}',event)" title="Favorite">★</button>
    </div>
    ${(opts.progress !== false && progress > 0) ? `<div class="card-progress"><div class="card-progress-fill" style="width:${progress}%"></div></div>` : ''}
  </div>`;
}

function renderActiveFilters() {
  const el = document.getElementById('active-filters');
  const filters = [];
  if (state.filterTag) filters.push(`<span class="filter-tag active">#${escHtml(state.filterTag)} <span style="cursor:pointer" onclick="clearTag()">×</span></span>`);
  el.innerHTML = filters.join('');
}

// ═══════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════
function updateSidebar() {
  const cats = {};
  state.stories.forEach(s => { if (s.category) cats[s.category] = (cats[s.category]||0)+1; });

  const el = document.getElementById('sidebar-categories');
  el.innerHTML = '<div class="sidebar-label">Categories</div>';
  Object.entries(cats).sort().forEach(([cat, count]) => {
    const active = state.filterCategory === cat ? 'active' : '';
    el.innerHTML += `<div class="sidebar-item ${active}" onclick="filterCategory('${escHtml(cat)}')">${escHtml(cat)}<span class="sidebar-count">${count}</span></div>`;
  });

  document.getElementById('count-all').textContent    = state.stories.length;
  document.getElementById('count-favs').textContent   = state.stories.filter(s => s.isFavorite).length;
  document.getElementById('count-unread').textContent = state.stories.filter(s => !s.readingProgress || s.readingProgress < 0.05).length;

  ['nav-all','nav-favs','nav-unread','nav-tags'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  if (state.view === 'tags')                              document.getElementById('nav-tags').classList.add('active');
  else if (state.filterMode === 'favs')                   document.getElementById('nav-favs').classList.add('active');
  else if (state.filterMode === 'unread')                 document.getElementById('nav-unread').classList.add('active');
  else if (!state.filterCategory && state.view !== 'admin') document.getElementById('nav-all').classList.add('active');
}

// ═══════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════
function filterCategory(cat) {
  state.filterCategory = cat;
  state.filterTag      = null;
  state.filterMode     = 'all';
  state.searchQuery    = '';
  document.getElementById('search-input').value = '';
  showView('library');
}
function filterFavorites() {
  state.filterMode     = 'favs';
  state.filterCategory = null;
  state.filterTag      = null;
  showView('library');
}
function filterUnread() {
  state.filterMode     = 'unread';
  state.filterCategory = null;
  state.filterTag      = null;
  showView('library');
}
function filterByTag(tag, e) {
  if (e) e.stopPropagation();
  state.filterTag      = tag;
  state.filterCategory = null;
  state.filterMode     = 'all';
  showView('library');
}
function clearTag() {
  state.filterTag = null;
  renderLibrary();
}
function handleSearch(q) {
  state.searchQuery = q.trim();
  if (state.view !== 'library') showView('library');
  else renderLibrary();
}
function handleSort(v) {
  state.sortBy = v;
  renderLibrary();
}

// ═══════════════════════════════════════════
//  READER
// ═══════════════════════════════════════════
let _scrollHandler = null;

function openStory(id) {
  const s = state.stories.find(x => x.id === id);
  if (!s) return;
  state.currentStory = s;

  document.getElementById('reader-category').textContent = s.category || '';
  document.getElementById('reader-title').textContent    = s.title;
  document.getElementById('reader-author').innerHTML     =
    `by <span style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted" onclick="openAuthor('${escHtml(s.author||'')}',event)">${escHtml(s.author||'Unknown')}</span>`;
  document.getElementById('reader-wc').textContent   = formatWC(s.wordCount||0);
  document.getElementById('reader-date').textContent = formatDate(s.dateAdded);

  const opts = state.settings.options;
  document.getElementById('reader-tags').innerHTML = (s.tags||[]).map(t =>
    `<span class="card-tag" style="cursor:pointer" onclick="filterByTag('${escHtml(t)}',event)">#${escHtml(t)}</span>`
  ).join('');

  if (opts.ratings !== false) {
    renderReaderStars(s.rating||0, s.id);
    document.getElementById('reader-stars').style.display = '';
  } else {
    document.getElementById('reader-stars').style.display = 'none';
  }

  document.getElementById('reader-body').textContent = s.content || '';
  applyFontSize();

  if (_scrollHandler) window.removeEventListener('scroll', _scrollHandler);
  _scrollHandler = () => trackProgress(s.id);
  window.addEventListener('scroll', _scrollHandler, { passive: true });

  showView('reader');
}

function renderReaderStars(current, storyId) {
  const el = document.getElementById('reader-stars');
  el.innerHTML = [1,2,3,4,5].map(n =>
    `<span class="star ${n <= current ? 'lit' : ''}" onclick="setRating('${storyId}',${n})">${n <= current ? '★' : '☆'}</span>`
  ).join('');
}

function setRating(id, n) {
  const s = state.stories.find(x => x.id === id);
  if (!s) return;
  s.rating = s.rating === n ? 0 : n;
  saveData(state.stories);
  renderReaderStars(s.rating, id);
}

function trackProgress(id) {
  const body = document.getElementById('reader-body');
  if (!body || state.view !== 'reader') return;
  const total = body.offsetHeight;
  if (total === 0) return;
  const rect     = body.getBoundingClientRect();
  const scrolled = window.scrollY + window.innerHeight - (rect.top + window.scrollY);
  const progress = Math.max(0, Math.min(1, scrolled / total));
  const s = state.stories.find(x => x.id === id);
  if (s) {
    s.readingProgress = Math.max(s.readingProgress||0, progress);
    saveData(state.stories);
  }
}

function changeFontSize(delta) {
  state.readerFontSize = Math.max(1, Math.min(5, state.readerFontSize + delta));
  applyFontSize();
}
function applyFontSize() {
  const w = document.getElementById('reader-body-wrapper');
  [1,2,3,4,5].forEach(n => w.classList.remove('reader-font-s'+n));
  w.classList.add('reader-font-s'+state.readerFontSize);
}
function toggleReadingMode() {
  state.readerLightMode = !state.readerLightMode;
  document.getElementById('reader-body-wrapper').classList.toggle('light-mode', state.readerLightMode);
  document.getElementById('mode-btn').textContent = state.readerLightMode ? '🌙 Dark' : '☀ Light';
}
function editCurrentStory() {
  if (state.currentStory) openEditor(state.currentStory.id);
}

// ═══════════════════════════════════════════
//  EDITOR
// ═══════════════════════════════════════════
function openEditor(id) {
  state.prevView  = state.view;
  const s         = id ? state.stories.find(x => x.id === id) : null;
  state.editingId = s ? s.id : null;

  document.getElementById('editor-title-text').textContent       = s ? 'Edit Story' : 'Add New Story';
  document.getElementById('editor-delete-btn').style.display     = s ? '' : 'none';
  document.getElementById('f-title').value                       = s ? s.title : '';
  document.getElementById('f-author').value                      = s ? (s.author||'') : '';
  document.getElementById('f-summary').value                     = s ? (s.summary||'') : '';
  document.getElementById('content-textarea').value              = s ? (s.content||'') : '';
  populateCategoryDropdown();
  document.getElementById('f-category').value                    = s ? (s.category||'') : '';
  document.getElementById('f-tags').value                        = s ? (s.tags||[]).join(', ') : '';

  showView('editor');
}

function cancelEditor() {
  if (state.prevView === 'reader' && state.currentStory) showView('reader');
  else showView('library');
}

function saveStory() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { toast('Please enter a title.'); return; }

  const content  = document.getElementById('content-textarea').value;
  const tags     = document.getElementById('f-tags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  const category = document.getElementById('f-category').value;
  const author   = document.getElementById('f-author').value.trim();
  const summary  = document.getElementById('f-summary').value.trim();

  if (state.editingId) {
    const s = state.stories.find(x => x.id === state.editingId);
    if (s) {
      s.title = title; s.author = author; s.category = category;
      s.summary = summary; s.tags = tags; s.content = content;
      s.wordCount = countWords(content); s.dateUpdated = new Date().toISOString();
    }
    state.currentStory = s;
    toast('Story updated.');
  } else {
    const now      = new Date().toISOString();
    const newStory = {
      id: generateId(), title, author, category, summary, tags, content,
      wordCount: countWords(content), dateAdded: now, dateUpdated: now,
      isFavorite: false, rating: 0, readingProgress: 0,
    };
    state.stories.unshift(newStory);
    state.currentStory = newStory;
    toast('Story added to library.');
  }
  saveData(state.stories);
  updateSidebar();
  showView('library');
}

function deleteCurrentStory() {
  if (!state.editingId) return;
  if (!confirm('Delete this story permanently?')) return;
  state.stories     = state.stories.filter(x => x.id !== state.editingId);
  state.editingId   = null;
  state.currentStory = null;
  saveData(state.stories);
  toast('Story deleted.');
  updateSidebar();
  showView('library');
}

// ═══════════════════════════════════════════
//  FAVORITES
// ═══════════════════════════════════════════
function toggleFav(id, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const s = state.stories.find(x => x.id === id);
  if (!s) return;
  s.isFavorite = !s.isFavorite;
  saveData(state.stories);
  updateSidebar();
  renderLibrary();
}

// ═══════════════════════════════════════════
//  AUTHOR VIEW
// ═══════════════════════════════════════════
function openAuthor(name, e) {
  if (e) e.stopPropagation();
  if (!name) return;
  const stories = state.stories.filter(s => s.author === name);
  document.getElementById('author-name').textContent     = name;
  document.getElementById('author-subtitle').textContent = `${stories.length} ${stories.length === 1 ? 'story' : 'stories'} in the library`;
  document.getElementById('author-grid').innerHTML       = stories.map(s => storyCard(s)).join('');
  showView('author');
}

// ═══════════════════════════════════════════
//  TAG CLOUD
// ═══════════════════════════════════════════
function renderTagCloud() {
  const tagCount = {};
  state.stories.forEach(s => (s.tags||[]).forEach(t => tagCount[t] = (tagCount[t]||0)+1));
  const sorted = Object.entries(tagCount).sort((a,b) => b[1]-a[1]);
  const max    = sorted[0] ? sorted[0][1] : 1;
  document.getElementById('tag-cloud').innerHTML = sorted.length
    ? sorted.map(([tag, count]) => {
        const size = 0.85 + (count/max) * 1.4;
        return `<span class="tag-cloud-item" style="font-size:${size}rem" onclick="filterByTag('${escHtml(tag)}',event)">#${escHtml(tag)} <small style="opacity:0.5">${count}</small></span>`;
      }).join('')
    : '<p style="color:var(--text3)">No tags yet.</p>';
}

// ═══════════════════════════════════════════
//  IMPORT / EXPORT
// ═══════════════════════════════════════════
function exportData() {
  const blob = new Blob([JSON.stringify(state.stories, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `private-library-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('Export complete.');
}
function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      let added = 0;
      imported.forEach(s => {
        if (!state.stories.find(x => x.id === s.id)) {
          if (!s.wordCount) s.wordCount = countWords(s.content||'');
          state.stories.push(s);
          added++;
        }
      });
      saveData(state.stories);
      closeModal('io-modal');
      toast(`Imported ${added} new stories.`);
      updateSidebar();
      renderLibrary();
    } catch {
      toast('Import failed: invalid file.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// ═══════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════
function showModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
});

// ═══════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════
//  KEYBOARD
// ═══════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.querySelectorAll('.modal-overlay.open').length) {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      return;
    }
    if (['reader','author','tags'].includes(state.view)) showView('library');
    else if (state.view === 'editor') cancelEditor();
    else if (state.view === 'admin')  showView('library');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openEditor(); }
});

// ═══════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════
applyAllSettings();
populateCategoryDropdown();
showView('library');
updateSidebar();
