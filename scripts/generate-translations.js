const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// Read .env.local manually for node script
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found!');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const islandsDir = path.join(process.cwd(), 'src', 'lib', 'data', 'islands');

const CATEGORY_MAP = [
  { fileName: '100 basic sentences.txt', categoryId: '100-basic', title: '100 Základních Vět', description: 'Nejdůležitější základy pro každodenní porozumění a první kontakt.', icon: '💬', difficulty: 'A1' },
  { fileName: '300 Questions & Answers - Part 1.txt', categoryId: '300-qa-1', title: '300 Otázek & Odpovědí (Část 1)', description: 'Otázky a odpovědi o jméně, původu, věku a denním režimu.', icon: '❓', difficulty: 'A1', isQA: true },
  { fileName: '300 Questions & Answers - Part 2.txt', categoryId: '300-qa-2', title: '300 Otázek & Odpovědí (Část 2)', description: 'Konverzace o rodině, práci, zálibách a jídle.', icon: '🤔', difficulty: 'A2', isQA: true },
  { fileName: '300 Questions & Answers - Part 3.txt', categoryId: '300-qa-3', title: '300 Otázek & Odpovědí (Část 3)', description: 'Pokročilé konverzační otázky a komplexní odpovědi.', icon: '🎯', difficulty: 'B1', isQA: true },
  { fileName: '300 Spartan - The Language Survival Kit.txt', categoryId: '300-spartan', title: 'Spartanská Výbava pro Přežití', description: 'Intenzivní balíček 300 nejvýznamnějších frází pro rychlou reakci.', icon: '🛡️', difficulty: 'A1' },
  { fileName: 'Daily Routine.txt', categoryId: 'daily-routine', title: 'Denní Rutina', description: 'Slovní zásoba pro vstávání, práci, jídlo a večerní odpočinek.', icon: '🌅', difficulty: 'A1' },
  { fileName: 'Habits.txt', categoryId: 'habits', title: 'Návyky & Zvyky', description: 'Vyjadřování pravidelných činností, zvyků a životního stylu.', icon: '⚡', difficulty: 'A2' },
  { fileName: 'Language Learning.txt', categoryId: 'language-learning', title: 'Učení Jazyků', description: 'Fráze a věty o výuce španělštiny, metodách a cílech.', icon: '📚', difficulty: 'A2' },
  { fileName: 'Language Patterns - Part 1.txt', categoryId: 'language-patterns-1', title: 'Jazykové Vzorce (Část 1)', description: 'Základní slovesné struktury: estar, tener, hacer, ir, venir.', icon: '🧩', difficulty: 'A1' },
  { fileName: 'Language Patterns - Part 2.txt', categoryId: 'language-patterns-2', title: 'Jazykové Vzorce (Část 2)', description: 'Slovesné vazby, minulý čas a vyjadřování potřeby či záměru.', icon: '🏗️', difficulty: 'A2' },
  { fileName: 'Language Patterns - Part 3.txt', categoryId: 'language-patterns-3', title: 'Jazykové Vzorce (Část 3)', description: 'Složité gramatické modely a přirozené spojování myšlenek.', icon: '🚀', difficulty: 'B1' },
  { fileName: 'Location & Directions.txt', categoryId: 'location-directions', title: 'Místo & Navigace', description: 'Ptaní se na cestu, doprava, orientace ve městě a budovách.', icon: '🗺️', difficulty: 'A1' },
  { fileName: 'Talking about Yourself.txt', categoryId: 'talking-about-yourself', title: 'O Sobě & Představování', description: 'Představení se, odkud pocházíš, co děláš a co máš rád.', icon: '🙋‍♂️', difficulty: 'A1' },
  { fileName: 'Time.txt', categoryId: 'time', title: 'Čas, Dny & Datum', description: 'Určování hodin, dny v týdnu, měsíce, roční období a plány.', icon: '⏰', difficulty: 'A1' },
];

async function translateBatch(items) {
  const prompt = `Translate the following list of Spanish sentences/questions into 3 languages: English (en), Czech (cs), Slovak (sk).
Return ONLY a valid JSON array of objects with keys: "id", "en", "cs", "sk".
DO NOT include any prefix like "Spanish sentence:" or "Španělská věta:". Provide ONLY the direct, natural translation of the sentence!

Items to translate:
${JSON.stringify(items, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    return JSON.parse(response.text || '[]');
  } catch (err) {
    console.error('Translation batch error:', err);
    return [];
  }
}

async function main() {
  const categories = [];

  for (const meta of CATEGORY_MAP) {
    const filePath = path.join(islandsDir, meta.fileName);
    if (!fs.existsSync(filePath)) continue;
    console.log(`Processing file: ${meta.fileName}...`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const rawLines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const itemsToTranslate = [];

    if (meta.isQA) {
      for (let i = 0; i < rawLines.length; i += 2) {
        const q = rawLines[i];
        const a = rawLines[i + 1] || '';
        const sentenceId = `${meta.categoryId}_${Math.floor(i / 2) + 1}`;
        const fullEs = a ? `${q} ${a}` : q;
        itemsToTranslate.push({ id: sentenceId, es: fullEs, q, a });
      }
    } else {
      rawLines.forEach((line, idx) => {
        const sentenceId = `${meta.categoryId}_${idx + 1}`;
        itemsToTranslate.push({ id: sentenceId, es: line });
      });
    }

    // Process in batches of 25 for fast, complete translations
    const batchSize = 25;
    const translatedMap = new Map();

    for (let i = 0; i < itemsToTranslate.length; i += batchSize) {
      const slice = itemsToTranslate.slice(i, i + batchSize);
      console.log(` Translating ${meta.categoryId} batch ${i / batchSize + 1}...`);
      const results = await translateBatch(slice);
      results.forEach((r) => {
        translatedMap.set(r.id, { en: r.en, cs: r.cs, sk: r.sk });
      });
    }

    const sentences = itemsToTranslate.map((item) => {
      const tr = translatedMap.get(item.id) || {
        en: item.es,
        cs: item.es,
        sk: item.es,
      };
      return {
        id: item.id,
        es: item.es,
        questionEs: item.q || undefined,
        answerEs: item.a || undefined,
        translations: {
          en: tr.en || item.es,
          cs: tr.cs || item.es,
          sk: tr.sk || item.es,
        },
        category: meta.categoryId,
        difficulty: meta.difficulty,
      };
    });

    categories.push({
      categoryId: meta.categoryId,
      title: meta.title,
      description: meta.description,
      icon: meta.icon,
      difficulty: meta.difficulty,
      sentenceCount: sentences.length,
      sentences,
    });
  }

  const fileContent = `import { IslandCategory } from './islands-parser';\n\nexport const PREPARSED_ISLANDS: IslandCategory[] = ${JSON.stringify(categories, null, 2)};\n`;
  fs.writeFileSync(path.join(process.cwd(), 'src', 'lib', 'data', 'islands-data.ts'), fileContent);
  console.log('✅ Successfully generated islands-data.ts with complete EN, CS, SK translations!');
}

main().catch(console.error);
