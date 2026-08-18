import { PREPARSED_ISLANDS } from './islands-data';
import { AppLanguage } from '@/lib/context/LanguageContext';

export interface IslandSentence {
  id: string;
  es: string;
  questionEs?: string;
  answerEs?: string;
  en?: string;
  translations?: {
    en: string;
    cs: string;
    sk: string;
  };
  category: string;
  difficulty: 'A1' | 'A2' | 'B1';
}

export interface IslandCategory {
  categoryId: string;
  title: string;
  description: string;
  icon: string;
  difficulty: 'A1' | 'A2' | 'B1';
  sentenceCount: number;
  sentences: IslandSentence[];
}

const ISLAND_LOCALIZATIONS: Record<string, { title: Record<AppLanguage, string>; desc: Record<AppLanguage, string> }> = {
  '100-basic': {
    title: { cs: '100 Základních Vět', sk: '100 Základných Viet', en: '100 Basic Sentences' },
    desc: { cs: 'Nejdůležitější základy pro každodenní porozumění.', sk: 'Najdôležitejšie základy pre každodenné porozumenie.', en: 'Essential foundations for everyday communication.' },
  },
  'talking-about-yourself': {
    title: { cs: 'O Sobě & Představování', sk: 'O Sebe & Predstavovanie', en: 'Talking About Yourself' },
    desc: { cs: 'Představení se, původ, práce a záliby.', sk: 'Predstavenie sa, pôvod, práca a záľuby.', en: 'Self-introduction, origin, work, and personal interests.' },
  },
  'time': {
    title: { cs: 'Čas, Dny & Datum', sk: 'Čas, Dni & Dátum', en: 'Time, Days & Dates' },
    desc: { cs: 'Hodiny, dny v týdnu, měsíce a časové plány.', sk: 'Hodiny, dni v týždni, mesiace a časové plány.', en: 'Telling time, weekdays, months, and scheduling.' },
  },
  'daily-routine': {
    title: { cs: 'Denní Rutina', sk: 'Denná Rutina', en: 'Daily Routine' },
    desc: { cs: 'Vstávání, práce, jídlo a denní činnosti.', sk: 'Vstávanie, práca, jedlo a denné činnosti.', en: 'Waking up, commuting, work, meals, and evening habits.' },
  },
  'location-directions': {
    title: { cs: 'Místo & Navigace', sk: 'Miesto & Navigácia', en: 'Location & Directions' },
    desc: { cs: 'Ptaní se na cestu, doprava a orientace.', sk: 'Pýtanie sa na cestu, doprava a orientácia.', en: 'Asking for directions, city navigation, and transport.' },
  },
  'habits': {
    title: { cs: 'Návyky & Zvyky', sk: 'Návyky & Zvyky', en: 'Habits & Lifestyle' },
    desc: { cs: 'Pravidelné činnosti a životní styl.', sk: 'Pravidelné činnosti a životný štýl.', en: 'Expressing regular activities, routines, and lifestyle.' },
  },
  'language-learning': {
    title: { cs: 'Učení Jazyků', sk: 'Učenie Jazykov', en: 'Language Learning' },
    desc: { cs: 'Fráze o studiu a metodách.', sk: 'Frázy o štúdiu a metódach.', en: 'Sentences about study routines, goals, and mindset.' },
  },
  'language-patterns-1': {
    title: { cs: 'Jazykové Vzorce 1', sk: 'Jazykové Vzorce 1', en: 'Language Patterns 1' },
    desc: { cs: 'Slovesa estar, tener, hacer, ir, venir.', sk: 'Slovesá estar, tener, hacer, ir, venir.', en: 'Core verbs: estar, tener, hacer, ir, venir in context.' },
  },
  'language-patterns-2': {
    title: { cs: 'Jazykové Vzorce 2', sk: 'Jazykové Vzorce 2', en: 'Language Patterns 2' },
    desc: { cs: 'Slovesné vazby, minulý čas a potřeby.', sk: 'Slovesné väzby, minulý čas a potreby.', en: 'Verbal patterns, past tenses, and intentions.' },
  },
  'language-patterns-3': {
    title: { cs: 'Jazykové Vzorce 3', sk: 'Jazykové Vzorce 3', en: 'Language Patterns 3' },
    desc: { cs: 'Komplexní souvětí a spojování myšlenek.', sk: 'Komplexné súvetia a spájanie myšlienok.', en: 'Complex sentence structures, conditions, and opinions.' },
  },
  '300-qa-1': {
    title: { cs: '300 Otázek & Odpovědí 1', sk: '300 Otázok & Odpovedí 1', en: '300 Q&A Part 1' },
    desc: { cs: 'Základní konverzační otázky.', sk: 'Základné konverzačné otázky.', en: 'Foundational Q&A on identity, daily life, and work.' },
  },
  '300-qa-2': {
    title: { cs: '300 Otázek & Odpovědí 2', sk: '300 Otázok & Odpovedí 2', en: '300 Q&A Part 2' },
    desc: { cs: 'Otázky o rodině, práci a zálibách.', sk: 'Otázky o rodine, práci a záľubách.', en: 'Conversational Q&A about city, travel, and hobbies.' },
  },
  '300-qa-3': {
    title: { cs: '300 Otázek & Odpovědí 3', sk: '300 Otázok & Odpovedí 3', en: '300 Q&A Part 3' },
    desc: { cs: 'Pokročilé konverzační otázky.', sk: 'Pokročilé konverzačné otázky.', en: 'Advanced questions on opinions, storytelling, and dreams.' },
  },
  '300-spartan': {
    title: { cs: 'Spartanská Výbava pro Přežití', sk: 'Spartanská Výbava pre Prežitie', en: 'Spartan Survival Kit' },
    desc: { cs: '300 nejvýznamnějších frází.', sk: '300 najvýznamnejších fráz.', en: '300 high-yield reflexes for rapid conversational response.' },
  },
};

export function getLocalizedIslandTitle(categoryId: string, lang: AppLanguage = 'cs'): string {
  const loc = ISLAND_LOCALIZATIONS[categoryId];
  if (loc && loc.title[lang]) return loc.title[lang];
  const found = PREPARSED_ISLANDS.find((cat) => cat.categoryId === categoryId);
  return found?.title || categoryId;
}

export function getLocalizedIslandDesc(categoryId: string, lang: AppLanguage = 'cs'): string {
  const loc = ISLAND_LOCALIZATIONS[categoryId];
  if (loc && loc.desc[lang]) return loc.desc[lang];
  const found = PREPARSED_ISLANDS.find((cat) => cat.categoryId === categoryId);
  return found?.description || '';
}

export function getAllIslands(lang: AppLanguage = 'cs'): IslandCategory[] {
  return PREPARSED_ISLANDS.map((island) => ({
    ...island,
    title: getLocalizedIslandTitle(island.categoryId, lang),
    description: getLocalizedIslandDesc(island.categoryId, lang),
  }));
}

export function getIslandById(categoryId: string, lang: AppLanguage = 'cs'): IslandCategory | undefined {
  const all = getAllIslands(lang);
  return all.find((cat) => cat.categoryId === categoryId);
}