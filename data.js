// ═══════════════════════════════════════════
//  CONSTANTS & DEFAULTS
// ═══════════════════════════════════════════
const STORAGE_KEY  = 'private_library_v1';
const SETTINGS_KEY = 'private_library_settings_v1';

const DEFAULT_CATEGORIES = [
  'Romance','Fantasy','Historical','Sci-Fi','Contemporary',
  'Horror','Paranormal','Other'
];

const DEFAULT_SETTINGS = {
  theme: 'crimson',
  layout: 'default',
  cards: 'default',
  siteName: 'The Private Library',
  categories: [...DEFAULT_CATEGORIES],
  customThemes: [],
  options: {
    wordcount: true,
    progress: true,
    ratings: true,
    compactHeader: false,
    stats: true,
  }
};

const THEMES = [
  { id: 'crimson',    name: 'Crimson Velvet', bg: '#0c0a0b', bg2: '#131013', border: '#2e2530', accent: '#9b2335', gold: '#c4a265' },
  { id: 'midnight',   name: 'Midnight Ink',   bg: '#090d14', bg2: '#0f1520', border: '#1e2d45', accent: '#2563a8', gold: '#7eb8d4' },
  { id: 'sepia',      name: 'Sepia Study',    bg: '#1a1410', bg2: '#221c16', border: '#3d3020', accent: '#8b5e3c', gold: '#d4a44a' },
  { id: 'emerald',    name: 'Emerald Club',   bg: '#080f0a', bg2: '#0d160e', border: '#1a3020', accent: '#1a6b35', gold: '#c8a840' },
  { id: 'arctic',     name: 'Arctic Frost',   bg: '#f0f4f8', bg2: '#ffffff', border: '#c0d0e0', accent: '#2851a8', gold: '#8060a0' },
  { id: 'typewriter', name: 'Typewriter',     bg: '#0a0a08', bg2: '#111110', border: '#333330', accent: '#e8d840', gold: '#e8d840' },
];

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function formatWC(n) {
  if (n >= 1000) return (n/1000).toFixed(1) + 'k words';
  return n + ' words';
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function highlight(text, query) {
  if (!query) return escHtml(text);
  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
  return escHtml(text).replace(re, '<mark>$1</mark>');
}

// ═══════════════════════════════════════════
//  CUSTOM THEME HELPERS
// ═══════════════════════════════════════════
function getAllThemes() {
  return [...THEMES, ...(state.settings.customThemes || [])];
}

function getThemeById(id) {
  return getAllThemes().find(t => t.id === id);
}

// Derive computed colors from a base theme definition
// A "full" custom theme stores all CSS variable values
function injectCustomThemeStyle(theme) {
  const styleId = 'custom-theme-' + theme.id;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }

  // Compute accent2/accent3 as lighter versions automatically if not provided
  const a2 = theme.accent2 || lighten(theme.accent, 20);
  const a3 = theme.accent3 || lighten(theme.accent, 40);
  const g2 = theme.gold2   || lighten(theme.gold, 20);
  const t2  = theme.text2  || mix(theme.text, theme.bg, 0.4);
  const t3  = theme.text3  || mix(theme.text, theme.bg, 0.65);
  const rbg = theme.readingBg   || '#f7f0e8';
  const rt  = theme.readingText || '#1c1715';
  const rt2 = theme.readingText2|| '#4a3f39';
  const bg3 = theme.bg3    || mix(theme.bg2, theme.bg, 0.5);

  el.textContent = `[data-theme="${theme.id}"] {
    --bg: ${theme.bg};
    --bg2: ${theme.bg2};
    --bg3: ${bg3};
    --border: ${theme.border};
    --accent: ${theme.accent};
    --accent2: ${a2};
    --accent3: ${a3};
    --gold: ${theme.gold};
    --gold2: ${g2};
    --text: ${theme.text || '#e2d8d0'};
    --text2: ${t2};
    --text3: ${t3};
    --reading-bg: ${rbg};
    --reading-text: ${rt};
    --reading-text2: ${rt2};
    --sidebar-width: 220px;
    --font-display: 'Cormorant Garamond', serif;
    --font-body: 'EB Garamond', Georgia, serif;
    --font-mono: 'Inconsolata', monospace;
    --radius: 2px;
  }
  [data-theme="${theme.id}"] .sidebar-item.active {
    background: ${hexToRgba(theme.accent, 0.08)};
  }
  [data-theme="${theme.id}"] .card-tag {
    background: ${hexToRgba(theme.accent, 0.12)};
    border: 1px solid ${hexToRgba(theme.accent, 0.25)};
    color: ${a3};
  }
  [data-theme="${theme.id}"] .layout-btn.active,
  [data-theme="${theme.id}"] .filter-tag.active {
    background: ${hexToRgba(theme.accent, 0.15)};
  }`;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lighten(hex, amount) {
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  r = Math.min(255, r + amount * 3);
  g = Math.min(255, g + amount * 2);
  b = Math.min(255, b + amount * 3);
  return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}

function mix(hex1, hex2, t) {
  // t=0 -> hex1, t=1 -> hex2
  const r1=parseInt(hex1.slice(1,3),16), g1=parseInt(hex1.slice(3,5),16), b1=parseInt(hex1.slice(5,7),16);
  const r2=parseInt(hex2.slice(1,3),16), g2=parseInt(hex2.slice(3,5),16), b2=parseInt(hex2.slice(5,7),16);
  const r=Math.round(r1+(r2-r1)*t), g=Math.round(g1+(g2-g1)*t), b=Math.round(b1+(b2-b1)*t);
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function injectAllCustomThemes() {
  (state.settings.customThemes || []).forEach(injectCustomThemeStyle);
}

// ═══════════════════════════════════════════
//  DATA LAYER  (localStorage + Firebase)
// ═══════════════════════════════════════════
function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveData(stories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  if (window.fbSaveStories) window.fbSaveStories(stories);
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (!saved) return { ...DEFAULT_SETTINGS, categories: [...DEFAULT_CATEGORIES], customThemes: [] };
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      options: { ...DEFAULT_SETTINGS.options, ...(saved.options || {}) },
      categories: Array.isArray(saved.categories) ? saved.categories : [...DEFAULT_CATEGORIES],
      customThemes: Array.isArray(saved.customThemes) ? saved.customThemes : [],
    };
  } catch { return { ...DEFAULT_SETTINGS, categories: [...DEFAULT_CATEGORIES], customThemes: [] }; }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  if (window.fbSaveSettings) window.fbSaveSettings(state.settings);
}

// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let state = {
  view: 'library',
  stories: loadData(),
  settings: loadSettings(),
  currentStory: null,
  editingId: null,
  prevView: 'library',
  filterCategory: null,
  filterTag: null,
  filterMode: 'all',
  searchQuery: '',
  sortBy: 'date-desc',
  readerFontSize: 3,
  readerLightMode: false,
};

// ═══════════════════════════════════════════
//  SEED DATA
// ═══════════════════════════════════════════
if (state.stories.length === 0) {
  state.stories = [
    {
      id: generateId(),
      title: 'The Midnight Garden',
      author: 'Elara Voss',
      summary: 'A solitary botanist discovers a secret garden that blooms only at midnight, tended by a mysterious stranger whose presence awakens desires she had long suppressed.',
      content: 'The gate was unlocked, as it always was after eleven.\n\nMiranda told herself she came for the roses — the rare black damasks that only opened in moonlight, their scent a narcotic she had documented but never quite explained in any journal. She was a scientist. She believed in explanations.\n\nBut it was not the roses she watched for, crouching between the yew hedges with her notebook pressed against her thigh.\n\nHe appeared, as he always did, at the stroke of midnight.\n\nShe had not learned his name. She had not asked. Asking would have shattered something, the way asking the name of a dream makes the dream dissolve. He moved through the garden as if he owned it — or as if it owned him, which was perhaps more accurate — bending to check this vine, pressing his thumb to that petal, murmuring something low that she could never quite hear.\n\nTonight she had come closer.\n\nHer heartbeat was a problem. She noted it clinically: elevated, arrhythmic, probably 95 BPM. She was thirty-four years old and had not felt this particular calibration of her own pulse since she was nineteen.\n\n"You can come out," he said, without turning.\n\nMiranda stood.\n\nHe turned then, and the moonlight found the angle of his jaw, the hollow of his throat, the slow expansion of his smile. "I wondered when you would."',
      tags: ['slow burn','garden','mystery','sensual'],
      category: 'Romance',
      dateAdded: new Date(Date.now()-86400000*5).toISOString(),
      dateUpdated: new Date(Date.now()-86400000*5).toISOString(),
      wordCount: 0, isFavorite: true, rating: 4, readingProgress: 0.6,
    },
    {
      id: generateId(),
      title: 'Terms & Conditions',
      author: 'J. Mercer',
      summary: 'A high-powered attorney meets her match in an opposing counsel whose negotiation tactics extend well beyond the boardroom.',
      content: 'Rule one of opposing counsel: never let them see you sweat.\n\nCassidy had observed this rule without exception for eleven years. She had argued before appellate judges with a migraine. She had cross-examined a lying CFO while her ex-husband sat in the gallery. She had once won a preliminary injunction with a broken heel and a blood blister the size of a quarter.\n\nNone of that had prepared her for Daniel Ashworth.\n\nHe was already seated when she entered the conference room — which was a small power move she noted and filed away. Seated, relaxed, jacket over the chair, sleeves rolled exactly twice. Reading her brief, which he had somehow obtained two hours before it was submitted.\n\n"Cassidy Reeves," he said, not looking up. "Your argument in the Holloway matter was elegant. The estoppel angle. I didn\'t see it coming."\n\n"I know you didn\'t."\n\nNow he looked up. The eyes were the problem. She had been warned about the eyes by opposing counsel and by at least one partner who had lowered her voice to say it, as though admitting a weather condition one had no business admitting.\n\n"Shall we begin?" she said.\n\n"We already have," said Ashworth.\n\nShe sat down. She opened her folder. She reminded herself of rule one.\n\nIt did not help.',
      tags: ['enemies to lovers','professional','tension'],
      category: 'Contemporary',
      dateAdded: new Date(Date.now()-86400000*2).toISOString(),
      dateUpdated: new Date(Date.now()-86400000*2).toISOString(),
      wordCount: 0, isFavorite: false, rating: 5, readingProgress: 0,
    },
    {
      id: generateId(),
      title: 'The Cartographer\'s Apprentice',
      author: 'Selin Kara',
      summary: 'In a city where maps are forbidden, an apprentice cartographer hides her work beneath her skirts — until the map-hunter assigned to find her turns out to want much more than parchment.',
      content: 'The city of Veln had two crimes punishable by fire: heresy and cartography.\n\nNadia had committed one of them every day for three years.\n\nHer maps were small. That was the discipline: scale everything down to what could be hidden in the lining of a coat, the hollow of a bread roll, the false bottom of an inkwell. She worked at night by the light of a single candle, drawing from memory the streets that the Censors had ordered to be forgotten. Streets that had housed the wrong people. Streets that led to the wrong ideas.\n\nIf you cannot show them on a map, the First Censor had written, they will not exist in the minds of citizens.\n\nNadia disagreed.\n\nShe was folding the newest sheet — the neighborhood of the papermakers, twelve blocks erased last winter — when she heard the step on the stair.\n\nNot her landlady. Too deliberate.\n\nShe had the map in her bodice in two seconds and the candle out in three and was sitting in the dark with a calmness she did not feel when the door opened.\n\nA lamp. A face she recognized from the broadsheets.\n\n"Cartographer," said the map-hunter, "I\'ve been looking for you for six months."\n\nNadia met his eyes in the dark and said, very quietly: "I know."',
      tags: ['historical','forbidden','slow burn','political'],
      category: 'Historical',
      dateAdded: new Date(Date.now()-86400000*10).toISOString(),
      dateUpdated: new Date(Date.now()-86400000*10).toISOString(),
      wordCount: 0, isFavorite: false, rating: 0, readingProgress: 1.0,
    }
  ];
  state.stories.forEach(s => s.wordCount = countWords(s.content));
  saveData(state.stories);
}
