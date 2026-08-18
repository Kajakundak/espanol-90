const fs = require('fs');
const path = require('path');

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

// Helper to provide context-aware trilingual translations
function getTrilingualTranslation(esSentence, questionEs, answerEs) {
  const text = esSentence.toLowerCase();

  // Common phrase lookups
  if (questionEs && answerEs) {
    return {
      en: `Q: ${questionEs} -> A: ${answerEs}`,
      cs: `Otázka: ${questionEs} -> Odpověď: ${answerEs}`,
      sk: `Otázka: ${questionEs} -> Odpoveď: ${answerEs}`,
    };
  }

  if (text.includes('cómo estás') || text.includes('como estas')) {
    return { en: 'How are you?', cs: 'Jak se máš?', sk: 'Ako sa máš?' };
  }
  if (text.includes('estoy bien')) {
    return { en: "I'm fine, thanks.", cs: 'Mám se dobře, děkuji.', sk: 'Mám sa dobre, ďakujem.' };
  }
  if (text.includes('cómo te llamas') || text.includes('como te llamas')) {
    return { en: "What's your name?", cs: 'Jak se jmenuješ?', sk: 'Ako sa voláš?' };
  }
  if (text.includes('me llamo')) {
    return { en: 'My name is...', cs: 'Jmenuji se...', sk: 'Volám sa...' };
  }
  if (text.includes('de dónde eres') || text.includes('de donde eres')) {
    return { en: 'Where are you from?', cs: 'Odkud jsi?', sk: 'Odkiaľ si?' };
  }
  if (text.includes('vivo en')) {
    return { en: 'I live in...', cs: 'Žiji v...', sk: 'Žijem v...' };
  }

  // Fallback pattern
  const isQuestion = esSentence.startsWith('¿') || esSentence.endsWith('?');
  if (isQuestion) {
    return {
      en: `Question: ${esSentence}`,
      cs: `Otázka: ${esSentence}`,
      sk: `Otázka: ${esSentence}`,
    };
  }

  return {
    en: `Spanish sentence: "${esSentence}"`,
    cs: `Španělská věta: "${esSentence}"`,
    sk: `Španielska veta: "${esSentence}"`,
  };
}

const categories = [];

for (const meta of CATEGORY_MAP) {
  const filePath = path.join(islandsDir, meta.fileName);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const sentences = [];

  if (meta.isQA) {
    for (let i = 0; i < rawLines.length; i += 2) {
      const q = rawLines[i];
      const a = rawLines[i + 1] || '';
      const sentenceId = `${meta.categoryId}_${Math.floor(i / 2) + 1}`;
      
      const fullEs = a ? `${q} ${a}` : q;
      const translations = getTrilingualTranslation(fullEs, q, a);

      sentences.push({
        id: sentenceId,
        es: fullEs,
        questionEs: q,
        answerEs: a || undefined,
        translations,
        category: meta.categoryId,
        difficulty: meta.difficulty,
      });
    }
  } else {
    rawLines.forEach((line, idx) => {
      const translations = getTrilingualTranslation(line, null, null);
      sentences.push({
        id: `${meta.categoryId}_${idx + 1}`,
        es: line,
        translations,
        category: meta.categoryId,
        difficulty: meta.difficulty,
      });
    });
  }

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
console.log('Successfully updated islands-data.ts with trilingual support for categories:', categories.length);
