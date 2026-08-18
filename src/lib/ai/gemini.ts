import { GoogleGenAI } from '@google/genai';

// Gemini Models specified in master plan
// Available on free tier — confirmed via ai.models.list()
export const MODEL_FLASH_LIVE = 'gemini-3.1-flash-live-preview';     // Live preview — primary tutor model
export const MODEL_FLASH_LITE = 'gemini-flash-lite-latest';           // Lite — for Anki/quiz generation
export const MODEL_LIVE_TRANSLATE = 'gemini-3.5-live-translate-preview'; // Live translation (bonus feature)

export const ai = (typeof window === 'undefined' ? process.env.GEMINI_API_KEY : process.env.NEXT_PUBLIC_GEMINI_API_KEY)
  ? new GoogleGenAI({ apiKey: (typeof window === 'undefined' ? process.env.GEMINI_API_KEY : process.env.NEXT_PUBLIC_GEMINI_API_KEY)! })
  : null;

export function getClientGenAI() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export type NativeLanguage = 'cs' | 'sk' | 'en';
export type CEFRLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

const LANG_NAMES: Record<NativeLanguage, string> = {
  cs: 'češtině',
  sk: 'slovenčine',
  en: 'English',
};

const LEVEL_INSTRUCTIONS: Record<CEFRLevel, string> = {
  A0: 'Úroveň A0 (Úplný začátečník): Mluv v nejzákladnějších krátkých větách (3-6 slov). Používej primárně přítomný čas a základní slovesa (ser, estar, llamarse, vivir, tener).',
  A1: 'Úroveň A1 (Začátečník): Používej jednoduché věty v přítomném čase, otázky "¿dónde?", "¿cómo?", a základní vazby "ir a + infinitivo" nebo "me gusta".',
  A2: 'Úroveň A2 (Mírně pokročilý): Přidej minulý čas (pretérito perfecto / indefinido) a souvětí s "porque", "cuando", "pero".',
  B1: 'Úroveň B1 (Pokročilý): Používej přirozené tempo, složitější gramatiku, konjunktiv (subjuntivo) a rozšiřuj témata.',
  B2: 'Úroveň B2 (Vyšší pokročilý): Mluv plynule přirozenou rychlostí, používej abstraktní slovní zásobu, idiomatičnost a všechny časy včetně subjuntiva.',
  C1: 'Úroveň C1 (Zkušený uživatel): Mluv jako rodilý mluvčí, používej sofistikované obraty, kulturní narážky a detailní zpětnou vazbu k jemným nuance.',
  C2: 'Úroveň C2 (Mistrovská úroveň): Úplná matice s rodilým mluvčím — debatuj, používej humor, dialekty, literární výrazy a precizní stylistiku.',
};

export interface StudentContext {
  userName?: string;
  totalPoints?: number;
  currentStreak?: number;
  completedDaysCount?: number;
}

export const SYSTEM_PROMPTS = {
  BEGINNER_CONVERSATION: (
    topic: string = 'volné téma',
    lang: NativeLanguage = 'cs',
    level: CEFRLevel = 'A0',
    context?: StudentContext
  ) => {
    const studentInfo = context?.userName
      ? `Student se jmenuje ${context.userName}. Má získaných ${context.totalPoints || 0} XP bodů a streak ${context.currentStreak || 1} dní.`
      : '';

    return `Jsi přátelská, ale DŮSLEDNÁ UČITELKA ŠPANĚLŠTINY (Lektorka).
Student má úroveň ${level}. ${studentInfo}
Vysvětlení gramatiky a případné opravy uváděj v ${LANG_NAMES[lang]}.

${LEVEL_INSTRUCTIONS[level]}

Téma a zaměření konverzace: ${topic}.

DŮLEŽITÉ POKYNY PRO UČITELSKÝ ROZHOVOR A OPRAVY:
1. OPRAVUJ JAKO SKUTEČNÁ LEKTORKA: Pokud student udělá jakoukoliv chybu v gramatice, slovosledu nebo tvaru slovesa, OKAMŽITĚ ho vlídně, ale jasně oprav. Napiš v závorce v ${LANG_NAMES[lang]} vysvětlení (např. "⚠️ Pozor: Říká se 'soy de', protože se jedná o původ.").
2. PŘIZPŮSOB RYCHLOST A SLOVNÍ ZÁSOBU ÚROVNI ${level}:
   - A0-A1: Mluv přehledně, nabízej nápovědu.
   - A2-C2: Reaguj přirozeně, zpochybňuj argumenty, vyžaduj správný konjunktiv a bohatou zásobu.
3. OSLOVUJ STUDENTA JMÉNEM (${context?.userName || 'studente'}), pokud ho znáš.
4. UDRŽUJ KONVERZACI AKTIVNÍ: Po reakci a případné opravě se zeptej na doplňující otázku k tématům ${topic}.`;
  },

  TRAVEL_MODE: (situation: string = 'HOTEL', lang: NativeLanguage = 'cs', level: CEFRLevel = 'A1') =>
    `Hraj roli člověka ve Španělsku (situace: ${situation}).
Simuluješ reálnou konverzaci. Student je na úrovni ${level}.
Vysvětlení a opravy uváděj v ${LANG_NAMES[lang]}.

${LEVEL_INSTRUCTIONS[level]}

Sleduj konverzaci a nerecykluj již zodpovězené otázky.`,

  INTERROGATION_MODE: (lang: NativeLanguage = 'cs', level: CEFRLevel = 'A1') =>
    `Jsi zkoušející lektorka španělštiny. Testuješ studenta (úroveň ${level}).
Vysvětlení a zpětnou vazbu po testu uveď v ${LANG_NAMES[lang]}.
Ptej se postupně na život, práci, koníčky, minulost a plány bez opakování dotazů.`,

  STORY_MODE: (lang: NativeLanguage = 'cs', level: CEFRLevel = 'A1') =>
    `Jsi lektorka storytellingu ve španělštině. Student má úroveň ${level}.
Opravy a tipy piš v ${LANG_NAMES[lang]}.
Dej studentovi krátkou situaci nebo obrázek k popisu a nech ho mluvit.`,

  SURVIVAL_MODE: (lang: NativeLanguage = 'cs', level: CEFRLevel = 'A1') =>
    `Simulace krizové situace ve Španělsku. Student má úroveň ${level}.
Vytvoř problém (ztracené zavazadlo, chyba na účtu v restauraci), který student musí vyřešit.
Komentáře a nápovědy v závorce piš v ${LANG_NAMES[lang]}.`,

  WEEKLY_REVIEW: (lang: NativeLanguage = 'cs', level: CEFRLevel = 'A1') =>
    `Provádíš kompletní týdenní zhodnocení a test studenta.
Výstupní analýzu mezer a 5 Anki kartiček uveď s překladem v ${LANG_NAMES[lang]}.`,

  HINT_GENERATOR: (topic: string, lastTutorMessage: string, lang: NativeLanguage = 'cs', level: CEFRLevel = 'A0') =>
    `Jsi laskavá učitelka španělštiny.
Student (úroveň ${level}) dostal tuto zprávu od AI tutorky: "${lastTutorMessage}". Téma je "${topic}".

Vytvoř přesně 3 různé vzorové odpovědi vhodné pro úroveň ${level}.
Každá odpověď musí mít:
- "spanish": španělská věta (krátká, přiměřená úrovni)
- "translation": přesný překlad v ${LANG_NAMES[lang]}
- "tip": krátký gramatický tip nebo výslovnostní poznámka v ${LANG_NAMES[lang]} (max 1 věta)

Vrať POUZE validní JSON array — žádný markdown, žádný text mimo JSON:
[
  {"spanish": "...", "translation": "...", "tip": "..."},
  {"spanish": "...", "translation": "...", "tip": "..."},
  {"spanish": "...", "translation": "...", "tip": "..."}
]`,

  ANKI_EXTRACTOR: `Analyze the following Spanish conversation transcript. Extract 3 to 5 key vocabulary phrases or sentences where the student made mistakes or encountered new words. Format each cloze deletion using {{c1::word_to_hide}} syntax.`,

  QUIZ_GENERATOR: `Generate a 3-question multiple-choice Spanish quiz for a beginner. Return structured JSON only.`,
};

// ─── Day-specific topics ─────────────────────────────────────────────────────

export const DAY_TOPICS: Record<number, { topic: string; goal: string }> = {
  1:  { topic: 'pozdravy + představení (saludos y presentación)', goal: 'Hola. Me llamo Karel. Soy de la República Checa. Vivo en Praga.' },
  2:  { topic: 'jméno, země, město (nombre, país, ciudad)', goal: 'Říct odkud jsi a kde bydlíš.' },
  3:  { topic: 'ser / estar — sloveso být', goal: 'Soy checo. Estoy en Praga. Estoy contento.' },
  4:  { topic: 'seznamování ve vlaku (conocer gente en el tren)', goal: 'Základní konverzace s cestujícím.' },
  5:  { topic: 'práce a denní program (trabajo y vida diaria)', goal: 'Trabajo en Praga. Como a las dos.' },
  6:  { topic: 'co máš rád / nemáš rád (me gusta / no me gusta)', goal: 'Me gusta viajar. No me gusta la lluvia.' },
  7:  { topic: 'NEDĚLNÍ TEST — představení', goal: 'Souhrnný rozhovor bez nápovědy.' },
  8:  { topic: 'denní rutina (rutina diaria)', goal: 'Me levanto a las siete, desayuno, trabajo.' },
  9:  { topic: 'reflexivní slovesa (levantarse, ducharse)', goal: 'Me ducho por la mañana.' },
  10: { topic: 'jídlo a restaurace (la comida y el restaurante)', goal: 'Quiero pedir una tortilla y agua.' },
  11: { topic: 'pití a kavárna (bebidas y café)', goal: 'Un café con leche, por favor.' },
  12: { topic: 'nakupování a ceny (compras y precios)', goal: '¿Cuánto cuesta esto?' },
  13: { topic: 'čas a hodiny (la hora y el tiempo)', goal: '¿Qué hora es? Son las tres de la tarde.' },
  14: { topic: 'NEDĚLNÍ TEST — běžný den', goal: 'Shrnutí témat 8-13.' },
  21: { topic: 'letištní simulace (aeropuerto de Madrid)', goal: 'Koupit lístek na metro, najít hotel.' },
  28: { topic: 'minulost — pretérito indefinido (včera)', goal: 'Ayer fui al trabajo y comí pizza.' },
  29: { topic: 'minulost — dovolená (viaje pasado)', goal: 'El año pasado viajé a España.' },
  30: { topic: 'MĚSÍČNÍ TEST — 15 min bez matky', goal: 'Kompletní přehled A1.' },
};

export function getDayTopic(day: number): { topic: string; goal: string } {
  return DAY_TOPICS[day] || { topic: 'volné téma', goal: 'Konverzace na libovolné téma.' };
}
