---
name: recipe-add
description: Walk through adding a new recipe to the website with validation and AI image generation
user-invocable: true
allowed-tools: Read Edit Write Bash
---

# Add a Recipe to the Website

Guide the user through adding a new recipe seamlessly. This skill handles recipe validation, JSON updates, and automatic image generation using the Gemini API.

## Step 1: Gather Recipe Metadata

Start by asking the user for basic recipe information:

1. **Recipe Title** (required)
   - Example: "Chickpea Salad"
   - Use this to auto-generate a recipe ID (lowercase, spaces→hyphens)

2. **Emoji** (required)
   - Example: "🥗"

3. **Category** (required - must be one of):
   - `breakfast` — Breakfast dishes
   - `mains` — Main courses
   - `sides` — Side dishes
   - `desserts` — Desserts and sweets
   - `sauces` — Sauces, dressings, and condiments

4. **Tags** (suggested, comma-separated)
   - Cuisine: american, italian, mexican, asian, indian, middle-eastern
   - Protein: beef, chicken, pork, seafood, vegetarian
   - Method: baked, stovetop, slow-cooker, no-cook, no-bake
   - Style: quick, make-ahead, pasta, salad, soup, appetizer

5. **Serves** (optional)
   - Example: "4–6" or leave blank for null

Display the auto-generated recipe ID and ask for confirmation before proceeding.

## Step 2: Collect Ingredient Groups

Ingredients can be organized into groups (optional headings like "Dressing", "Salad").

For each group:
- Ask if there's a heading for this group
- Collect ingredients one-by-one
- Confirm when done with the group
- Ask if they want to add another group

Validate: At least one ingredient group with at least one item is required.

## Step 3: Collect Instructions

Collect step-by-step instructions:
- Number each step automatically
- Ask for each step one-by-one
- Validate: At least one instruction is required

## Step 4: Collect Notes (Optional)

Ask for any optional notes (comma-separated), such as:
- Storage instructions
- Make-ahead tips
- Substitution suggestions

## Step 5: Review & Confirm

Display a summary of the recipe:
```
==========================================================
📋  RECIPE SUMMARY
==========================================================
Title: [title]
ID: [generated-id]
Category: [category]
Tags: [tags or "none"]
Serves: [serves or "not specified"]
Ingredient Groups: [count]
Instructions: [count] steps
Notes: [count]
==========================================================
```

Ask: "Add this recipe? (y/n)"

## Step 6: Validate and Add to recipes.json

Once confirmed:

1. **Load** `data/recipes.json`
2. **Check for duplicate ID** — if a recipe with this ID already exists, ask user to choose a different title
3. **Create recipe object**:
   ```json
   {
     "id": "chickpea-salad",
     "title": "Chickpea Salad",
     "emoji": "🥗",
     "category": "sides",
     "tags": ["vegetarian", "salad", "quick"],
     "serves": "4–6",
     "image": null,
     "relatedRecipes": [],
     "ingredientGroups": [...],
     "instructions": [...],
     "notes": [...]
   }
   ```
4. **Add to recipes array** in recipes.json
5. **Write back** to recipes.json with proper formatting (2-space indent)

## Step 7: Generate Image

Generate an AI food photography image using the Gemini API:

```bash
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d '=' -f2)
cd scripts && node generate-images.js --id=[recipe-id]
```

If the command succeeds, update the recipe's `image` field in recipes.json to `images/recipes/[recipe-id].jpg`

If it fails, inform the user they can generate it later with:
```
node scripts/generate-images.js --id=[recipe-id]
```

## Step 8: Success Summary

Display final success message:
```
==========================================================
🎉  RECIPE ADDED SUCCESSFULLY!
==========================================================
Recipe ID: [id]
Title: [title]
Image: images/recipes/[id].jpg
Category: [category]

Next steps:
  1. Review the recipe in the website
  2. Commit changes: git add . && git commit -m "Add [title] recipe"
  3. Push to GitHub: git push origin main
==========================================================
```

## Validation Rules

- ✅ Recipe title is required and non-empty
- ✅ Emoji is required
- ✅ Category must be one of the 5 allowed categories
- ✅ At least one ingredient group with at least one item
- ✅ At least one instruction step
- ✅ Recipe ID must be unique (no duplicates in recipes.json)
- ✅ Tags should be lowercase
- ✅ JSON must be properly formatted with 2-space indentation

## Error Handling

If any step fails:
- Show the error clearly
- Explain what went wrong
- Suggest how to fix it
- Do NOT add the recipe until all validation passes

If image generation fails:
- Warn the user but don't block
- Reassure them they can generate it manually later

## Files Modified

- `data/recipes.json` — Recipe added to the recipes array
- `images/recipes/[id].jpg` — AI-generated image (if successful)

## Example Workflow

```
🍳  Add a Recipe to the Website

📌  Recipe title: Chickpea Salad
😊  Emoji: 🥗
🏷️   Category (breakfast/mains/sides/desserts/sauces): sides
🔖  Tags (optional): vegetarian, salad, quick
👥  Serves (e.g., "4–6" or leave blank): 4–6

✨  Recipe ID: chickpea-salad

Does the first ingredient group have a heading? (y/n): y
  Group heading: Dressing
  Ingredient 1: 1/2 cup Greek yogurt
  Ingredient 2: 3 Tbsp mayonnaise
  Ingredient 3: [Leave blank to finish]

Does the second ingredient group have a heading? (y/n): y
  Group heading: Salad
  Ingredient 1: 3 cans chickpeas
  Ingredient 2: 1 cup celery, diced
  [Continue...]

Step 1: In a small bowl, combine yogurt with mayo...
Step 2: Place chickpeas in bowl and lightly mash...
Step 3: [Leave blank to finish]

Notes (optional, comma-separated): Can be stored in fridge for 2 days

📋  RECIPE SUMMARY
[displays summary]

Add this recipe? (y/n): y

✅  Recipe added to recipes.json
📸  Generating AI image...
✅  Saved to images/recipes/chickpea-salad.jpg

🎉  RECIPE ADDED SUCCESSFULLY!
[displays success summary]
```
