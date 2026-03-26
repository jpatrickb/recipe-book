#!/usr/bin/env node
/**
 * Patrick's Recipe Book — AI Image Generator
 *
 * Uses the Google Gemini Imagen API to generate food photography for recipes.
 * Generated images are saved to ../images/recipes/{id}.jpg and the
 * `image` field in recipes.json is updated automatically.
 *
 * SETUP:
 *   1. cd scripts && npm install
 *   2. Set your Gemini API key:
 *        export GEMINI_API_KEY="your-key-here"
 *      (Get a key at https://aistudio.google.com/apikey)
 *
 * USAGE:
 *   Generate images for all recipes without an image:
 *     node generate-images.js
 *
 *   Generate for a specific recipe by ID:
 *     node generate-images.js --id=crepes
 *
 *   Regenerate even if an image already exists:
 *     node generate-images.js --force
 *
 *   Dry run (show prompts without calling the API):
 *     node generate-images.js --dry-run
 *
 *   Combine flags:
 *     node generate-images.js --id=crepes --force
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

/* ---- Config ---- */
const RECIPES_JSON = path.join(__dirname, '../data/recipes.json');
const IMAGES_DIR   = path.join(__dirname, '../images/recipes');
const API_KEY      = process.env.GEMINI_API_KEY;

// Imagen 3 via Google AI REST API
const IMAGEN_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`;

/* ---- Parse CLI args ---- */
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    })
);

const TARGET_ID = args['id'] ?? null;
const FORCE     = args['force'] === true;
const DRY_RUN   = args['dry-run'] === true;

/* ---- Prompt builder ---- */
function buildPrompt(recipe) {
  const categoryPrompts = {
    breakfast: 'breakfast food photography, warm morning light, rustic wooden table',
    mains:     'dinner food photography, warm candlelight, elegant plating',
    sides:     'side dish food photography, bright natural light, fresh ingredients visible',
    desserts:  'dessert food photography, soft diffused light, indulgent presentation',
    sauces:    'condiment and sauce food photography, natural light, small bowl or jar',
  };

  const context = categoryPrompts[recipe.category] ?? 'food photography, natural light';

  return (
    `Professional ${context}, ` +
    `featuring ${recipe.title}. ` +
    `Shallow depth of field, appetizing presentation, warm earthy tones, ` +
    `photorealistic, high resolution, no text or labels.`
  );
}

/* ---- API call ---- */
function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
      },
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(IMAGEN_API_URL, options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          const b64 = json?.predictions?.[0]?.bytesBase64Encoded;
          if (!b64) {
            reject(new Error('No image data in response: ' + data));
            return;
          }
          resolve(Buffer.from(b64, 'base64'));
        } catch (e) {
          reject(new Error('Failed to parse API response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ---- Main ---- */
async function main() {
  if (!API_KEY && !DRY_RUN) {
    console.error('❌  GEMINI_API_KEY is not set. Export it or use --dry-run to preview prompts.');
    process.exit(1);
  }

  // Ensure images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Load recipes
  const recipesData = JSON.parse(fs.readFileSync(RECIPES_JSON, 'utf8'));
  let recipes = recipesData.recipes;

  // Filter to target recipe if --id was provided
  if (TARGET_ID) {
    const target = recipes.find(r => r.id === TARGET_ID);
    if (!target) {
      console.error(`❌  No recipe found with id "${TARGET_ID}"`);
      process.exit(1);
    }
    recipes = [target];
  }

  // Filter out already-imaged recipes unless --force
  const toProcess = FORCE
    ? recipes
    : recipes.filter(r => !r.image);

  if (toProcess.length === 0) {
    console.log('✅  All recipes already have images. Use --force to regenerate.');
    return;
  }

  console.log(`\n📸  Generating images for ${toProcess.length} recipe(s)…\n`);

  let successCount = 0;
  let failCount = 0;

  for (const recipe of toProcess) {
    const prompt = buildPrompt(recipe);
    const imagePath = path.join(IMAGES_DIR, `${recipe.id}.jpg`);
    const relativeImagePath = `images/recipes/${recipe.id}.jpg`;

    console.log(`  📖  ${recipe.title}`);
    console.log(`      Prompt: "${prompt}"`);

    if (DRY_RUN) {
      console.log('      [dry-run — skipping API call]\n');
      continue;
    }

    try {
      const imageBuffer = await generateImage(prompt);
      fs.writeFileSync(imagePath, imageBuffer);

      // Update the recipe's image field in the data
      const recipeInData = recipesData.recipes.find(r => r.id === recipe.id);
      if (recipeInData) {
        recipeInData.image = relativeImagePath;
      }

      console.log(`      ✅  Saved to ${relativeImagePath}\n`);
      successCount++;

      // Small delay between requests to be polite to the API
      if (toProcess.indexOf(recipe) < toProcess.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err) {
      console.error(`      ❌  Failed: ${err.message}\n`);
      failCount++;
    }
  }

  // Write updated recipes.json back
  if (!DRY_RUN && successCount > 0) {
    fs.writeFileSync(RECIPES_JSON, JSON.stringify(recipesData, null, 2));
    console.log(`\n✅  Updated recipes.json with ${successCount} new image path(s).`);
  }

  if (failCount > 0) {
    console.log(`\n⚠️   ${failCount} recipe(s) failed. Check the errors above.`);
  }

  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
