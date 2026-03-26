/* ===================================================
   Patrick's Recipe Book — Homepage App
   Data source: data/recipes.json (controlled static file)
   All JSON values are escaped before insertion into DOM.
   =================================================== */

const CATEGORIES = {
  all:       { label: 'All Recipes',         emoji: '📖' },
  breakfast: { label: 'Breakfast',            emoji: '🌅' },
  mains:     { label: 'Mains',                emoji: '🍽️' },
  sides:     { label: 'Sides & Salads',       emoji: '🥗' },
  desserts:  { label: 'Desserts',             emoji: '🍰' },
  sauces:    { label: 'Sauces & Seasonings',  emoji: '🌿' },
};

// Only safe, alphanumeric-dash category keys are used as CSS class suffixes.
const VALID_CATEGORIES = new Set(Object.keys(CATEGORIES));

const QUICK_TAGS = [
  { label: '🐓 Chicken',     tag: 'chicken' },
  { label: '🥩 Beef',        tag: 'beef' },
  { label: '🍝 Pasta',       tag: 'pasta' },
  { label: '🫔 Mexican',     tag: 'mexican' },
  { label: '🍝 Italian',     tag: 'italian' },
  { label: '🍛 Indian',      tag: 'indian' },
  { label: '🥗 Salad',       tag: 'salad' },
  { label: '⚡ Quick',       tag: 'quick' },
  { label: '🌱 Vegetarian',  tag: 'vegetarian' },
  { label: '🎂 No-Bake',     tag: 'no-bake' },
];

let allRecipes = [];
let activeCategory = 'all';
let activeTag = null;
let searchQuery = '';
let debounceTimer = null;

async function init() {
  buildCategoryFilter();
  buildQuickTags();
  bindSearch();

  try {
    const res = await fetch('./data/recipes.json');
    if (!res.ok) throw new Error('Failed to load recipes.json');
    const data = await res.json();
    allRecipes = data.recipes;
    renderGrid();
  } catch (err) {
    const grid = document.getElementById('recipe-grid');
    grid.textContent = '';

    const msg = document.createElement('div');
    msg.className = 'error-state';

    const p1 = document.createElement('p');
    p1.textContent = '⚠️ Could not load recipes. Make sure you\'re running this from a local web server.';

    const p2 = document.createElement('p');
    p2.style.cssText = 'margin-top:8px;font-size:12px;color:#aaa';
    p2.textContent = 'Tip: run `python3 -m http.server` in the project folder, then open http://localhost:8000';

    msg.appendChild(p1);
    msg.appendChild(p2);
    grid.appendChild(msg);
    console.error(err);
  }
}

/* ---- Category Filter ---- */
function buildCategoryFilter() {
  const container = document.getElementById('category-filters');
  Object.entries(CATEGORIES).forEach(([key, { label, emoji }]) => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (key === 'all' ? ' active' : '');
    btn.dataset.category = key;

    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'pill-emoji';
    emojiSpan.textContent = emoji;

    btn.appendChild(emojiSpan);
    btn.appendChild(document.createTextNode(' ' + label));

    btn.addEventListener('click', () => {
      activeCategory = key;
      activeTag = null;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      renderGrid();
    });
    container.appendChild(btn);
  });
}

/* ---- Quick Tag Filters ---- */
function buildQuickTags() {
  const container = document.getElementById('quick-tags');
  QUICK_TAGS.forEach(({ label, tag }) => {
    const chip = document.createElement('button');
    chip.className = 'tag-chip';
    chip.textContent = label;
    chip.dataset.tag = tag;
    chip.addEventListener('click', () => {
      if (activeTag === tag) {
        activeTag = null;
        chip.classList.remove('active');
      } else {
        activeTag = tag;
        document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      }
      renderGrid();
    });
    container.appendChild(chip);
  });
}

/* ---- Search ---- */
function bindSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = input.value.trim();
    clearBtn.classList.toggle('visible', val.length > 0);
    debounceTimer = setTimeout(() => {
      searchQuery = val.toLowerCase();
      renderGrid();
    }, 220);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    clearBtn.classList.remove('visible');
    input.focus();
    renderGrid();
  });
}

/* ---- Filter Logic ---- */
function getFilteredRecipes() {
  return allRecipes.filter(r => {
    if (activeCategory !== 'all' && r.category !== activeCategory) return false;
    if (activeTag && !r.tags.includes(activeTag)) return false;
    if (searchQuery) {
      const ingredients = (r.ingredientGroups || []).flatMap(g => g.items);
      const haystack = [r.title, ...r.tags, ...ingredients].join(' ').toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });
}

/* ---- Render Grid ---- */
function renderGrid() {
  const grid = document.getElementById('recipe-grid');
  const countEl = document.getElementById('results-count');
  const filtered = getFilteredRecipes();

  const catLabel = activeCategory === 'all'
    ? 'recipes'
    : (CATEGORIES[activeCategory]?.label ?? activeCategory).toLowerCase();

  countEl.textContent = '';
  const strong = document.createElement('strong');
  strong.textContent = filtered.length;
  countEl.appendChild(strong);
  countEl.appendChild(document.createTextNode(
    ' ' + (filtered.length === 1 ? 'recipe' : catLabel)
  ));

  grid.textContent = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const emojiDiv = document.createElement('div');
    emojiDiv.className = 'empty-state-emoji';
    emojiDiv.textContent = '🤷';

    const h3 = document.createElement('h3');
    h3.textContent = 'No recipes found';

    const p = document.createElement('p');
    p.textContent = 'Try a different search term or clear the filters.';

    empty.appendChild(emojiDiv);
    empty.appendChild(h3);
    empty.appendChild(p);
    grid.appendChild(empty);
    return;
  }

  filtered.forEach(recipe => {
    grid.appendChild(buildCard(recipe));
  });
}

/* ---- Build Card DOM Node ---- */
function buildCard(recipe) {
  const category = VALID_CATEGORIES.has(recipe.category) ? recipe.category : 'mains';
  const catInfo = CATEGORIES[category];

  // Outer link
  const link = document.createElement('a');
  link.className = 'recipe-card';
  link.href = 'recipe.html?id=' + encodeURIComponent(recipe.id);
  link.setAttribute('aria-label', recipe.title);

  // Visual section
  const visual = document.createElement('div');
  visual.className = 'card-visual cat-' + category;

  if (recipe.image) {
    const img = document.createElement('img');
    img.src = recipe.image;
    img.alt = recipe.title;
    img.loading = 'lazy';
    visual.appendChild(img);
  } else {
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'card-emoji';
    emojiSpan.textContent = recipe.emoji || '🍴';
    visual.appendChild(emojiSpan);
  }

  // Card body
  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = recipe.title;

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const badge = document.createElement('span');
  badge.className = 'badge badge-' + category;
  badge.textContent = catInfo?.label ?? category;
  meta.appendChild(badge);

  if (recipe.serves) {
    const serves = document.createElement('span');
    serves.className = 'serves-badge';
    serves.textContent = '· Serves ' + recipe.serves;
    meta.appendChild(serves);
  }

  const tagsDiv = document.createElement('div');
  tagsDiv.className = 'card-tags';
  (recipe.tags || []).slice(0, 4).forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'inline-tag';
    chip.textContent = tag;
    tagsDiv.appendChild(chip);
  });

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(tagsDiv);

  link.appendChild(visual);
  link.appendChild(body);
  return link;
}

document.addEventListener('DOMContentLoaded', init);
