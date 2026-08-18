import { PREPARSED_ISLANDS } from './islands-data';
import { CEFRLevel } from '@/lib/types';
import { AppLanguage } from '@/lib/context/LanguageContext';
import { COMPLETE_BOOK_CURRICULUM, BookLessonDetail, BookAudioTrack } from './book-curriculum';

export interface DayPlanTask {
  key: 'islands' | 'anki' | 'input' | 'book' | 'speaking';
  title: string;
  subtitle: string;
  details: string;
  actionLabel: string;
  href?: string;
  externalHref?: string;
  icon: string;
}

export interface DayPlan {
  phase: number;
  phaseLabel: string;
  islandId: string;
  islandTitle: string;
  islandIcon: string;
  categoryDay: number;
  bookMeta: BookLessonDetail;
  bookTitle: string;
  dsTitle: string;
  dsUrl: string;
  dsMinutes: number;
  aiFocus: string;
  ankiCards: number;
  tasks: DayPlanTask[];
}

export function getDayPlan(
  day: number,
  startingLevel: CEFRLevel = 'A1',
  language: AppLanguage = 'cs'
): DayPlan {
  const levelOffsets: Record<CEFRLevel, number> = {
    A0: 0, A1: 0, A2: 30, B1: 45, B2: 60, C1: 75, C2: 80,
  };

  const adjustedDay = Math.min(90, Math.max(1, day + levelOffsets[startingLevel]));
  const phase = adjustedDay <= 30 ? 1 : adjustedDay <= 60 ? 2 : 3;
  const islandIndex = Math.min(PREPARSED_ISLANDS.length - 1, Math.floor((adjustedDay - 1) / 6));
  const island = PREPARSED_ISLANDS[islandIndex] || PREPARSED_ISLANDS[0];
  const categoryDay = ((adjustedDay - 1) % 6) + 1;

  // Přesný výpočet lekce 1–44 pro 90denní plán
  const mappedLessonNumber = Math.min(44, Math.max(1, Math.ceil(adjustedDay / 2.05)));
  const bookMeta = COMPLETE_BOOK_CURRICULUM[mappedLessonNumber] || COMPLETE_BOOK_CURRICULUM[1];

  const ankiCards = Math.min(150, 10 + (adjustedDay - 1) * 3);

  const isEn = language === 'en';
  const isSk = language === 'sk';

  const tasks: DayPlanTask[] = [
    {
      key: 'islands',
      title: isEn ? 'Island' : isSk ? 'Ostrov' : 'Ostrov',
      subtitle: island.title,
      details: isEn
        ? `Day ${categoryDay} of 6 in this set • ${phase === 1 ? 'Shadowing & short phrases' : 'Review & active recall'}`
        : isSk
        ? `${categoryDay}. deň zo 6 v tejto sade • ${phase === 1 ? 'shadowing a krátke frázy' : 'opakovanie a aktívny recall'}`
        : `${categoryDay}. den z 6 v této sadě • ${phase === 1 ? 'shadowing a krátké fráze' : 'opakování a aktivní recall'}`,
      actionLabel: isEn ? 'Practice Island' : isSk ? 'Precvičiť ostrov' : 'Procvičit ostrov',
      href: `/islands?category=${island.categoryId}`,
      icon: '🏝️',
    },
    {
      key: 'anki',
      title: 'Anki',
      subtitle: `${ankiCards} ${isEn ? 'cards' : isSk ? 'kariet' : 'karet'}`,
      details: isEn
        ? '10–15 min review with unlocked cards and active recall.'
        : isSk
        ? 'Opakovanie 10–15 min s novými kartami a známou gramatikou.'
        : 'Opakování 10–15 min s novými kartami a známou gramatikou.',
      actionLabel: isEn ? 'Train Anki' : isSk ? 'Trénovať Anki' : 'Trénovat Anki',
      icon: '🧠',
    },
    {
      key: 'input',
      title: 'Dreaming Spanish',
      subtitle: phase === 1 ? 'Superbeginner' : phase === 2 ? 'Beginner' : 'Intermediate',
      details: isEn
        ? `Phase ${phase} • 25 min comprehensible input in context.`
        : isSk
        ? `Fáza ${phase} • 25 min počúvania v kontexte.`
        : `Fáze ${phase} • 25 min poslechu v kontextu.`,
      actionLabel: isEn ? 'Watch on YouTube ↗' : isSk ? 'Sledovať na YouTube ↗' : 'Otevřít YouTube ↗',
      externalHref: 'https://www.youtube.com/@DreamingSpanish',
      icon: '🎧',
    },
    {
      key: 'book',
      title: isEn ? 'Textbook' : isSk ? 'Kniha' : 'Kniha',
      subtitle: `${isEn ? 'Lesson' : isSk ? 'Lekcia' : 'Lekce'} ${bookMeta.lessonNumber} (${bookMeta.pages})`,
      details: `${bookMeta.title} • ${bookMeta.grammarTopics[0] || ''}`,
      actionLabel: isEn ? 'View Lesson' : isSk ? 'Zobraziť lekciu' : 'Zobrazit lekci',
      icon: '📖',
    },
    {
      key: 'speaking',
      title: 'AI Tutor',
      subtitle: '10–15 min',
      details: isEn
        ? (phase === 1 ? 'Basic conversation, numbers, greetings, daily phrases.' : 'Speaking in past, present, and future with AI feedback.')
        : isSk
        ? (phase === 1 ? 'Základná konverzácia, pozdravy, čísla, bežné frázy.' : 'Rozprávanie v prítomnosti, minulosti a plánoch so spätnou väzbou.')
        : (phase === 1 ? 'Základní konverzace, pozdravy, čísla, běžné fráze.' : 'Mluvení v přítomnosti, minulosti a plánech se zpětnou vazbou.'),
      actionLabel: isEn ? 'Talk to AI' : isSk ? 'Hovoriť s AI' : 'Mluvit s AI',
      href: '/tutor',
      icon: '🗣️',
    },
  ];

  return {
    phase,
    phaseLabel: isEn
      ? (phase === 1 ? 'Survival Spanish' : phase === 2 ? 'More Speaking' : 'Fluent Communication')
      : isSk
      ? (phase === 1 ? 'Prežijem v španielčine' : phase === 2 ? 'Viac rozprávania' : 'Plynulá komunikácia')
      : (phase === 1 ? 'Přežiju ve španělštině' : phase === 2 ? 'Více mluvení' : 'Plynulá komunikace'),
    islandId: island.categoryId,
    islandTitle: island.title,
    islandIcon: island.icon,
    categoryDay,
    bookMeta,
    bookTitle: `${isEn ? 'Lesson' : isSk ? 'Lekcia' : 'Lekce'} ${bookMeta.lessonNumber}: ${bookMeta.title}`,
    dsTitle: phase === 1 ? 'Superbeginner' : phase === 2 ? 'Beginner' : 'Intermediate',
    dsUrl: 'https://www.youtube.com/@DreamingSpanish',
    dsMinutes: 25,
    aiFocus: phase === 1 ? 'Základní fráze' : 'Konverzace',
    ankiCards,
    tasks,
  };
}