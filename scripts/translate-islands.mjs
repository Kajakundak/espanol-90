import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.GEMINI_API_KEY) {
    console.error('❌ CHYBA: V .env.local chybí GEMINI_API_KEY!');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ISLANDS_DIR = path.join(process.cwd(), 'src/lib/data/islands');
const OUTPUT_FILE = path.join(process.cwd(), 'src/lib/data/preparsed-islands.ts');

const CATEGORIES_CONFIG = [
    { file: '100 basic sentences.txt', id: '100-basic', title: '100 Základních Vět', icon: '💬', diff: 'A1', desc: 'Nejdůležitější základy pro každodenní porozumění.' },
    { file: 'Talking about Yourself.txt', id: 'talking-about-yourself', title: 'O Sobě & Představování', icon: '🙋‍♂️', diff: 'A1', desc: 'Představení se, původ, práce a záliby.' },
    { file: 'Time.txt', id: 'time', title: 'Čas, Dny & Datum', icon: '⏰', diff: 'A1', desc: 'Hodiny, dny v týdnu, měsíce a časové plány.' },
    { file: 'Daily Routine.txt', id: 'daily-routine', title: 'Denní Rutina', icon: '🌅', diff: 'A1', desc: 'Vstávání, práce, jídlo a denní činnosti.' },
    { file: 'Location & Directions.txt', id: 'location-directions', title: 'Místo & Navigace', icon: '🗺️', diff: 'A1', desc: 'Ptaní se na cestu, doprava a orientace.' },
    { file: 'Habits.txt', id: 'habits', title: 'Návyky & Zvyky', icon: '⚡', diff: 'A2', desc: 'Pravidelné činnosti a životní styl.' },
    { file: 'Language Learning.txt', id: 'language-learning', title: 'Učení Jazyků', icon: '📚', diff: 'A2', desc: 'Fráze o studiu a metodách.' },
    { file: 'Language Patterns - Part 1.txt', id: 'language-patterns-1', title: 'Jazykové Vzorce 1', icon: '🧩', diff: 'A1', desc: 'Slovesa estar, tener, hacer, ir, venir.' },
    { file: 'Language Patterns - Part 2.txt', id: 'language-patterns-2', title: 'Jazykové Vzorce 2', icon: '🏗️', diff: 'A2', desc: 'Slovesné vazby, minulý čas a potřeby.' },
    { file: 'Language Patterns - Part 3.txt', id: 'language-patterns-3', title: 'Jazykové Vzorce 3', icon: '🚀', diff: 'B1', desc: 'Komplexní souvětí a spojování myšlenek.' },
    { file: '300 Questions & Answers - Part 1.txt', id: '300-qa-1', title: '300 Otázek & Odpovědí 1', icon: '❓', diff: 'A1', desc: 'Základní konverzační otázky.' },
    { file: '300 Questions & Answers - Part 2.txt', id: '300-qa-2', title: '300 Otázek & Odpovědí 2', icon: '🤔', diff: 'A2', desc: 'Otázky o rodině, práci a zálibách.' },
    { file: '300 Questions & Answers - Part 3.txt', id: '300-qa-3', title: '300 Otázek & Odpovědí 3', icon: '🎯', diff: 'B1', desc: 'Pokročilé konverzační otázky.' },
    { file: '300 Spartan - The Language Survival Kit.txt', id: '300-spartan', title: 'Spartanská Výbava pro Přežití', icon: '🛡️', diff: 'A1', desc: '300 nejvýznamnějších frází.' },
];

async function translateBatch(sentences) {
    const prompt = `Přelož následující španělské věty do angličtiny (en), češtiny (cs) a slovenštiny (sk). Vrať přesný JSON seznam objektů ve stejném pořadí.
Věty:
${JSON.stringify(sentences)}`;

    const res = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        es: { type: Type.STRING },
                        en: { type: Type.STRING },
                        cs: { type: Type.STRING },
                        sk: { type: Type.STRING },
                    },
                    required: ['es', 'en', 'cs', 'sk'],
                },
            },
        },
    });

    return JSON.parse(res.text || '[]');
}

async function run() {
    console.log('🚀 Spouštím překlad všech 14 ostrovů...');
    const resultCategories = [];

    for (const cat of CATEGORIES_CONFIG) {
        const filePath = path.join(ISLANDS_DIR, cat.file);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Soubor nenalezen: ${cat.file}, přeskakuji.`);
            continue;
        }

        console.log(`⏳ Zpracovávám a překládám: ${cat.title}...`);
        const rawLines = fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && !l.startsWith('---'));

        const translatedSentences = [];
        const BATCH_SIZE = 35;

        for (let i = 0; i < rawLines.length; i += BATCH_SIZE) {
            const chunk = rawLines.slice(i, i + BATCH_SIZE);
            const batchTranslations = await translateBatch(chunk);

            batchTranslations.forEach((item, idx) => {
                translatedSentences.push({
                    id: `${cat.id}_${i + idx + 1}`,
                    es: item.es,
                    translations: {
                        en: item.en,
                        cs: item.cs,
                        sk: item.sk,
                    },
                    category: cat.id,
                    difficulty: cat.diff,
                });
            });
        }

        resultCategories.push({
            categoryId: cat.id,
            title: cat.title,
            description: cat.desc,
            icon: cat.icon,
            difficulty: cat.diff,
            sentenceCount: translatedSentences.length,
            sentences: translatedSentences,
        });
    }

    const fileContent = `import { IslandCategory } from './islands-parser';\n\nexport const PREPARSED_ISLANDS: IslandCategory[] = ${JSON.stringify(resultCategories, null, 2)};\n`;

    fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
    console.log(`\n🎉 HOTOVO! Všechny věty byly přeloženy a uloženy do:\n👉 ${OUTPUT_FILE}`);
}

run().catch(console.error);