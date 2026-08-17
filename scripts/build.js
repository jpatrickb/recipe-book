#!/usr/bin/env node
/**
 * Patrick's Recipe Book — Static Build
 *
 * Reads data/recipes.json (unchanged source of truth) and generates:
 *   - recipes/<id>/index.html   — a fully static recipe page per recipe
 *   - index.html                — the #recipe-grid section, pre-rendered & sorted
 *
 * This exists so recipe content is real, crawlable HTML (readable by browsers
 * without JS, and by AI agents / crawlers) instead of only appearing after
 * js/app.js and js/recipe.js fetch data/recipes.json and build the DOM at
 * runtime. Those client scripts still run on load and re-render on top of this
 * — this build's output is the no-JS/crawler baseline, not a replacement for
 * the interactive site.
 *
 * USAGE:
 *   node scripts/build.js
 *
 * Run this after every edit to data/recipes.json, alongside generate-images.js,
 * and commit its output (index.html + recipes/**) like any other generated file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RECIPES_JSON = path.join(ROOT, 'data/recipes.json');
const RECIPES_DIR = path.join(ROOT, 'recipes');
const INDEX_HTML = path.join(ROOT, 'index.html');

const CATEGORY_LABELS = {
  breakfast: 'Breakfast',
  mains: 'Mains',
  sides: 'Sides & Salads',
  desserts: 'Desserts',
  sauces: 'Sauces & Seasonings',
};
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));

/* ---- Escaping ---- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryOf(recipe) {
  return VALID_CATEGORIES.has(recipe.category) ? recipe.category : 'mains';
}

/* ---- Shared fragments ---- */
function renderVisual(recipe, { lazy, emojiClass = 'card-emoji' } = {}) {
  if (recipe.image) {
    const loading = lazy ? ' loading="lazy"' : '';
    return `<img src="/${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}"${loading}>`;
  }
  return `<span class="${emojiClass}">${escapeHtml(recipe.emoji || '🍴')}</span>`;
}

function renderCard(recipe) {
  const category = categoryOf(recipe);
  const catLabel = CATEGORY_LABELS[category];
  const servesHtml = recipe.serves
    ? `<span class="serves-badge">· Serves ${escapeHtml(recipe.serves)}</span>`
    : '';
  const tagsHtml = (recipe.tags || []).slice(0, 4)
    .map(tag => `<span class="inline-tag">${escapeHtml(tag)}</span>`)
    .join('');

  return `        <a class="recipe-card" href="/recipes/${encodeURIComponent(recipe.id)}/" aria-label="${escapeHtml(recipe.title)}">
          <div class="card-visual cat-${category}">${renderVisual(recipe, { lazy: true })}</div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(recipe.title)}</h3>
            <div class="card-meta">
              <span class="badge badge-${category}">${escapeHtml(catLabel)}</span>${servesHtml}
            </div>
            <div class="card-tags">${tagsHtml}</div>
          </div>
        </a>`;
}

function renderRelatedCard(recipe) {
  const category = categoryOf(recipe);
  const catLabel = CATEGORY_LABELS[category];
  return `      <a class="recipe-card" href="/recipes/${encodeURIComponent(recipe.id)}/" aria-label="${escapeHtml(recipe.title)}">
        <div class="card-visual cat-${category}">${renderVisual(recipe, { lazy: true })}</div>
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(recipe.title)}</h3>
          <span class="badge badge-${category}">${escapeHtml(catLabel)}</span>
        </div>
      </a>`;
}

function renderTags(tags) {
  return (tags || [])
    .map(tag => `<span class="inline-tag">${escapeHtml(tag)}</span>`)
    .join('');
}

function renderServesSpan(serves) {
  if (serves) {
    return `<span id="recipe-serves" class="serves-badge">🍴 Serves ${escapeHtml(serves)}</span>`;
  }
  return `<span id="recipe-serves" class="serves-badge" style="display:none"></span>`;
}

function renderIngredients(groups) {
  return (groups || []).map(group => {
    const heading = group.heading
      ? `<p class="ingredient-section-heading">${escapeHtml(group.heading)}</p>`
      : '';
    const items = (group.items || []).map(item => `
      <li class="ingredient-item" role="checkbox" aria-checked="false" tabindex="0">
        <span class="ingredient-checkbox" aria-hidden="true"></span>
        <span class="ingredient-text">${escapeHtml(item)}</span>
      </li>`).join('');
    return `${heading}
    <ul class="ingredient-list">${items}
    </ul>`;
  }).join('\n');
}

function renderInstructions(steps) {
  return (steps || []).map((step, idx) => `
      <li class="instruction-step">
        <span class="step-number" aria-hidden="true">${idx + 1}</span>
        <p class="step-text">${escapeHtml(step)}</p>
      </li>`).join('');
}

function renderNotesBlock(notes) {
  const hasNotes = Boolean(notes && notes.length > 0);
  const items = hasNotes ? notes.map(n => `<li>${escapeHtml(n)}</li>`).join('') : '';
  return `<div id="recipe-notes" class="recipe-notes"${hasNotes ? '' : ' hidden'}>
        <p class="notes-title">💡 Notes</p>
        <ul id="notes-list" class="notes-list">${items}</ul>
      </div>`;
}

function renderRelatedSection(recipe, recipeMap) {
  const related = (recipe.relatedRecipes || [])
    .map(id => recipeMap[id])
    .filter(Boolean);
  const cards = related.map(renderRelatedCard).join('\n');
  return `<section id="related-section" class="related-section"${related.length ? '' : ' hidden'} aria-label="Related recipes">
      <h2 class="related-title">You might also need</h2>
      <div id="related-grid" class="related-grid">
${cards}
      </div>
    </section>`;
}

/* ---- Full recipe page ---- */
function renderRecipePage(recipe, recipeMap) {
  const category = categoryOf(recipe);
  const catLabel = CATEGORY_LABELS[category];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(recipe.title)} — Patrick's Recipe Book</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>

  <!-- ===== HEADER ===== -->
  <header class="site-header">
    <div class="container">
      <a class="site-logo" href="/" aria-label="Patrick's Recipe Book home">
        <span class="site-logo-icon">📖</span>
        <span class="site-logo-text">Patrick's <span>Recipe Book</span></span>
      </a>
    </div>
  </header>

  <!-- ===== MAIN CONTENT ===== -->
  <main class="main-content">
    <div class="container" id="recipe-content">

      <!-- Back button -->
      <nav class="back-nav" aria-label="Breadcrumb">
        <a class="back-btn" href="/">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M10 12L6 8l4-4"/>
          </svg>
          All Recipes
        </a>
      </nav>

      <!-- Recipe Hero -->
      <section class="recipe-hero" aria-label="Recipe overview">
        <div id="hero-visual" class="hero-visual cat-${category}">
          ${renderVisual(recipe, { emojiClass: 'hero-emoji' })}
        </div>

        <h1 id="recipe-title" class="recipe-title">${escapeHtml(recipe.title)}</h1>

        <div class="recipe-meta">
          <span id="recipe-badge" class="badge badge-${category}">${escapeHtml(catLabel)}</span>
          ${renderServesSpan(recipe.serves)}
        </div>

        <div id="recipe-tags" class="recipe-tags">
          ${renderTags(recipe.tags)}
        </div>
      </section>

      <!-- Action Buttons -->
      <div class="recipe-actions no-print">
        <button id="check-reset" class="btn btn-outline" aria-label="Uncheck all ingredients">
          <span aria-hidden="true">↺</span> Reset checklist
        </button>
        <button class="btn btn-outline" onclick="window.print()" aria-label="Print this recipe">
          <span aria-hidden="true">🖨</span> Print
        </button>
      </div>

      <!-- Recipe Body: Ingredients + Instructions -->
      <div class="recipe-body">

        <!-- Ingredients -->
        <aside class="ingredients-panel" aria-label="Ingredients">
          <h2 class="panel-title">Ingredients</h2>
          <div id="ingredients-container">
            ${renderIngredients(recipe.ingredientGroups)}
          </div>
        </aside>

        <!-- Instructions -->
        <article aria-label="Instructions">
          <h2 class="panel-title">Instructions</h2>
          <ol id="instructions-list" class="instructions-list" aria-label="Step-by-step instructions">${renderInstructions(recipe.instructions)}
          </ol>

          <!-- Notes -->
          ${renderNotesBlock(recipe.notes)}
        </article>

      </div>

      <!-- Related Recipes -->
      ${renderRelatedSection(recipe, recipeMap)}

    </div>
  </main>

  <!-- ===== FOOTER ===== -->
  <footer class="site-footer">
    <div class="container">
      <p><strong>Patrick's Recipe Book</strong> — family recipes, collected with love.</p>
    </div>
  </footer>

  <script src="/js/recipe.js"></script>
</body>
</html>
`;
}

function writeRecipePages(recipes) {
  const recipeMap = Object.fromEntries(recipes.map(r => [r.id, r]));
  fs.mkdirSync(RECIPES_DIR, { recursive: true });

  recipes.forEach(recipe => {
    const dir = path.join(RECIPES_DIR, recipe.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderRecipePage(recipe, recipeMap));
  });
}

/* ---- Index page grid ---- */
function updateIndexHtml(recipes) {
  const sorted = [...recipes].sort((a, b) => a.title.localeCompare(b.title));
  const gridHtml = sorted.map(renderCard).join('\n');

  const startMarker = '<!-- BUILD:GRID:START -->';
  const endMarker = '<!-- BUILD:GRID:END -->';

  let html = fs.readFileSync(INDEX_HTML, 'utf8');
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('index.html is missing BUILD:GRID:START/END markers — cannot regenerate the grid.');
  }

  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  html = `${before}\n${gridHtml}\n        ${after}`;
  fs.writeFileSync(INDEX_HTML, html);
}

/* ---- Main ---- */
function main() {
  const data = JSON.parse(fs.readFileSync(RECIPES_JSON, 'utf8'));
  const recipes = data.recipes;

  writeRecipePages(recipes);
  updateIndexHtml(recipes);

  console.log(`✅  Built ${recipes.length} static recipe page(s) and regenerated the index grid.`);
}

main();
