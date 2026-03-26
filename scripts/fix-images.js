const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;
const IMAGEN_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${API_KEY}`;

const customPrompts = {
  'chicken-alfredo': 'Professional rustic italian food photography, warm kitchen setting, featuring a steaming bowl of fettuccine chicken alfredo with peas. Creamy, thick white sauce coating the noodles, topped with freshly grated parmesan. Appetizing presentation, shallow depth of field, warm earthy tones, photorealistic, high resolution, absolutely no text, no labels, no raw ingredients on table.',
  'shannons-raspberry-cake': 'Professional dessert food photography, soft diffused light, featuring a beautiful slice of raspberry cream cake. A moist white sheet cake base topped with a thick layer of fluffy white cream cheese frosting and a vibrant, glistening red raspberry glaze. Photorealistic, high resolution, no boxes, no cake mix packaging, no text.',
  'fresh-peach-pie': 'Professional dessert food photography, bright natural light, featuring a fresh peach pie. The pie has a golden-brown pressed graham cracker crumb crust and is filled with large, glistening, fresh sliced peaches in a clear glaze. Open-face style, no lattice crust, no top pastry crust. Appetizing presentation, photorealistic, high resolution, no text.'
};

async function generate(id, prompt) {
  console.log(`📸 Generating for ${id}...`);
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(IMAGEN_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const imagePart = json?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (imagePart) {
            fs.writeFileSync(path.join(__dirname, `../images/recipes/${id}.jpg`), Buffer.from(imagePart.inlineData.data, 'base64'));
            console.log(`✅ Saved ${id}.jpg`);
            resolve();
          } else {
            reject(new Error(`Failed for ${id}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Parse error for ${id}: ${e.message}`));
        }
      });
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY not set.');
    process.exit(1);
  }
  for (const [id, prompt] of Object.entries(customPrompts)) {
    try {
      await generate(id, prompt);
      // Small delay between requests
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(e.message);
    }
  }
}

main();
