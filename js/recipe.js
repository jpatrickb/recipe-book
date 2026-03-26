/* ===================================================
   Patrick's Recipe Book — Recipe Detail Page
   =================================================== */

const CATEGORIES = {
  breakfast: 'Breakfast',
  mains:     'Mains',
  sides:     'Sides & Salads',
  desserts:  'Desserts',
  sauces:    'Sauces & Seasonings',
};

const VALID_CATEGORIES = new Set(Object.keys(CATEGORIES));

async function init() {
  const params = new URLSearchParams(window.location.search);
  const recipeId = params.get('id');

  if (!recipeId) {
    window.location.replace('index.html');
    return;
  }

  try {
    const res = await fetch('./data/recipes.json');
    if (!res.ok) throw new Error('Failed to load recipes.json');
    const data = await res.json();

    const recipe = data.recipes.find(r => r.id === recipeId);
    if (!recipe) {
      showNotFound(recipeId);
      return;
    }

    // Build related recipe lookup map
    const recipeMap = Object.fromEntries(data.recipes.map(r => [r.id, r]));
    renderRecipe(recipe, recipeMap);
  } catch (err) {
    showError();
    console.error(err);
  }
}

/* ---- Render Full Recipe ---- */
function renderRecipe(recipe, recipeMap) {
  const category = VALID_CATEGORIES.has(recipe.category) ? recipe.category : 'mains';
  const catLabel = CATEGORIES[category];

  // Page title
  document.title = recipe.title + ' — Patrick\'s Recipe Book';

  // Hero visual
  const heroVisual = document.getElementById('hero-visual');
  heroVisual.className = 'hero-visual cat-' + category;

  if (recipe.image) {
    const img = document.createElement('img');
    img.src = recipe.image;
    img.alt = recipe.title;
    heroVisual.appendChild(img);
  } else {
    const emoji = document.createElement('span');
    emoji.className = 'hero-emoji';
    emoji.textContent = recipe.emoji || '🍴';
    heroVisual.appendChild(emoji);
  }

  // Title
  document.getElementById('recipe-title').textContent = recipe.title;

  // Category badge
  const badge = document.getElementById('recipe-badge');
  badge.className = 'badge badge-' + category;
  badge.textContent = catLabel;

  // Serves
  const servesEl = document.getElementById('recipe-serves');
  if (recipe.serves) {
    servesEl.textContent = '🍴 Serves ' + recipe.serves;
  } else {
    servesEl.style.display = 'none';
  }

  // Tags
  const tagsContainer = document.getElementById('recipe-tags');
  (recipe.tags || []).forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'inline-tag';
    chip.textContent = tag;
    tagsContainer.appendChild(chip);
  });

  // Ingredients
  renderIngredients(recipe.ingredientGroups || []);

  // Instructions
  renderInstructions(recipe.instructions || []);

  // Notes
  if (recipe.notes && recipe.notes.length > 0) {
    const notesSection = document.getElementById('recipe-notes');
    notesSection.hidden = false;
    const list = document.getElementById('notes-list');
    recipe.notes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note;
      list.appendChild(li);
    });
  }

  // Related recipes
  if (recipe.relatedRecipes && recipe.relatedRecipes.length > 0) {
    const relatedSection = document.getElementById('related-section');
    const relatedGrid = document.getElementById('related-grid');
    relatedSection.hidden = false;

    recipe.relatedRecipes.forEach(id => {
      const related = recipeMap[id];
      if (!related) return;
      relatedGrid.appendChild(buildRelatedCard(related));
    });
  }

  // Check-off reset button
  document.getElementById('check-reset').addEventListener('click', resetChecks);
}

/* ---- Ingredients ---- */
function renderIngredients(groups) {
  const container = document.getElementById('ingredients-container');
  container.textContent = '';

  groups.forEach(group => {
    if (group.heading) {
      const heading = document.createElement('p');
      heading.className = 'ingredient-section-heading';
      heading.textContent = group.heading;
      container.appendChild(heading);
    }

    const ul = document.createElement('ul');
    ul.className = 'ingredient-list';

    (group.items || []).forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'ingredient-item';
      li.setAttribute('role', 'checkbox');
      li.setAttribute('aria-checked', 'false');
      li.tabIndex = 0;

      const checkbox = document.createElement('span');
      checkbox.className = 'ingredient-checkbox';
      checkbox.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'ingredient-text';
      text.textContent = item;

      li.appendChild(checkbox);
      li.appendChild(text);

      // Toggle check
      const toggleCheck = () => {
        li.classList.toggle('checked');
        const isChecked = li.classList.contains('checked');
        li.setAttribute('aria-checked', String(isChecked));
      };

      li.addEventListener('click', toggleCheck);
      li.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggleCheck();
        }
      });

      ul.appendChild(li);
    });

    container.appendChild(ul);
  });
}

/* ---- Instructions ---- */
function renderInstructions(instructions) {
  const list = document.getElementById('instructions-list');
  list.textContent = '';

  instructions.forEach((step, idx) => {
    const li = document.createElement('li');
    li.className = 'instruction-step';

    const num = document.createElement('span');
    num.className = 'step-number';
    num.textContent = idx + 1;
    num.setAttribute('aria-hidden', 'true');

    const text = document.createElement('p');
    text.className = 'step-text';
    text.textContent = step;

    li.appendChild(num);
    li.appendChild(text);
    list.appendChild(li);
  });
}

/* ---- Related Recipe Card ---- */
function buildRelatedCard(recipe) {
  const category = VALID_CATEGORIES.has(recipe.category) ? recipe.category : 'mains';
  const catInfo = CATEGORIES[category];

  const link = document.createElement('a');
  link.className = 'recipe-card';
  link.href = 'recipe.html?id=' + encodeURIComponent(recipe.id);
  link.setAttribute('aria-label', recipe.title);

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

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = recipe.title;

  const badge = document.createElement('span');
  badge.className = 'badge badge-' + category;
  badge.textContent = catInfo ?? category;

  body.appendChild(title);
  body.appendChild(badge);
  link.appendChild(visual);
  link.appendChild(body);
  return link;
}

/* ---- Reset Check-offs ---- */
function resetChecks() {
  document.querySelectorAll('.ingredient-item.checked').forEach(item => {
    item.classList.remove('checked');
    item.setAttribute('aria-checked', 'false');
  });
}

/* ---- Error/Not Found States ---- */
function showNotFound(id) {
  document.getElementById('recipe-content').textContent = '';
  const div = document.createElement('div');
  div.style.cssText = 'text-align:center;padding:64px 24px';

  const emoji = document.createElement('p');
  emoji.style.fontSize = '48px';
  emoji.textContent = '🍽️';

  const h2 = document.createElement('h2');
  h2.style.marginTop = '16px';
  h2.textContent = 'Recipe not found';

  const p = document.createElement('p');
  p.style.marginTop = '8px';
  p.textContent = 'We couldn\'t find a recipe with that ID.';

  const a = document.createElement('a');
  a.href = 'index.html';
  a.style.cssText = 'display:inline-block;margin-top:24px;color:var(--color-accent)';
  a.textContent = '← Back to all recipes';

  div.appendChild(emoji);
  div.appendChild(h2);
  div.appendChild(p);
  div.appendChild(a);
  document.getElementById('recipe-content').appendChild(div);
}

function showError() {
  document.getElementById('recipe-content').textContent = '';
  const div = document.createElement('div');
  div.style.cssText = 'text-align:center;padding:64px 24px';

  const p = document.createElement('p');
  p.textContent = '⚠️ Could not load the recipe. Make sure you\'re running from a local web server.';

  div.appendChild(p);
  document.getElementById('recipe-content').appendChild(div);
}

document.addEventListener('DOMContentLoaded', init);
