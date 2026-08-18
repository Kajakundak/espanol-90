'use client';

interface TextbookGuideProps {
  currentDay: number;
}

const LESSON_MAPPINGS: Record<number, { lessonNumber: number; title: string; focus: string; audioTrack: string }> = {
  1: { lessonNumber: 1, title: '¡Hola! Pozdravy a představení', focus: 'Základní fráze, sloveso SER, národnosti', audioTrack: 'MP3 01' },
  2: { lessonNumber: 1, title: 'Odkud jsi a kde žiješ', focus: 'Sloveso ESTAR, předložky en/de', audioTrack: 'MP3 02' },
  3: { lessonNumber: 2, title: 'Vztahy a rodina', focus: 'Rod podstatných jmen, zájmena mi/tu/su', audioTrack: 'MP3 03' },
  4: { lessonNumber: 2, title: 'Práce a každodenní činnosti', focus: 'Pravidelná slovesa -AR (hablar, trabajar)', audioTrack: 'MP3 04' },
  5: { lessonNumber: 3, title: 'Restaurace a jídlo', focus: 'Slovesa -ER, -IR (comer, vivir, querer)', audioTrack: 'MP3 05' },
  6: { lessonNumber: 3, title: 'V obchodě a nakupování', focus: 'Číslovky 1-100, sloveso TENER, ¿cuánto cuesta?', audioTrack: 'MP3 06' },
  7: { lessonNumber: 4, title: 'Město a doprava', focus: 'Vazba HAY, orientace, ¿dónde está...?', audioTrack: 'MP3 07' },
  14: { lessonNumber: 6, title: 'Čas, hodiny a denní režim', focus: 'Zpětná slovesa (levantarse, acostarse)', audioTrack: 'MP3 12' },
  21: { lessonNumber: 9, title: 'Cestování a hotel', focus: 'Nepravidelná slovesa, zájmena', audioTrack: 'MP3 18' },
  30: { lessonNumber: 12, title: 'Minulost I - Pretérito Perfecto', focus: 'He comido, he viajado, he visto', audioTrack: 'MP3 24' },
  45: { lessonNumber: 18, title: 'Minulost II - Pretérito Indefinido', focus: 'Fui, comí, viajé, hablé', audioTrack: 'MP3 35' },
  60: { lessonNumber: 25, title: 'Budoucnost - Voy a + infinitiv', focus: 'Plány, víkend, dovolená', audioTrack: 'MP3 48' },
  90: { lessonNumber: 44, title: 'A2 Komunikační Syntéza', focus: 'Volná konverzace, vyprávění a řešení problémů', audioTrack: 'MP3 88' },
};

export default function TextbookGuide({ currentDay }: TextbookGuideProps) {
  const mapping = LESSON_MAPPINGS[currentDay] || {
    lessonNumber: Math.min(44, Math.ceil(currentDay / 2)),
    title: `Lekce ${Math.min(44, Math.ceil(currentDay / 2))} — Praktické struktury`,
    focus: 'Aktivní čtení dialogu + poslech MP3 nahrávky + výběr 2-4 větných karet',
    audioTrack: `MP3 ${Math.min(44, Math.ceil(currentDay / 2)).toString().padStart(2, '0')}`,
  };

  return (
    <div className="apple-glass p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="apple-pill-badge bg-[var(--accent-amber)]/15 text-[var(--accent-amber)] border border-[var(--accent-amber)]/30 mb-2">
            Španělština nejen pro samouky (L. Prokopová)
          </span>
          <h2 className="apple-heading-md text-[var(--text-primary)] flex items-center gap-2">
            <span>📖</span> Lesson Structure • Day {currentDay}
          </h2>
        </div>

        <span className="text-xs font-mono text-[var(--accent-amber)] bg-[var(--card-bg)] px-4 py-2 rounded-full border border-[var(--card-border)]">
          🔊 {mapping.audioTrack}
        </span>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-5 rounded-2xl space-y-2">
        <div className="text-xs text-[var(--accent-amber)] font-mono font-bold">Doporučená lekce:</div>
        <div className="text-base font-extrabold text-[var(--text-primary)]">
          Lekce {mapping.lessonNumber}: {mapping.title}
        </div>
        <div className="text-xs text-[var(--text-secondary)] font-medium">
          Focus: <span className="text-[var(--text-primary)]">{mapping.focus}</span>
        </div>
      </div>

      {/* 4-Step Execution Loop */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 text-xs">
        <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] text-[var(--text-secondary)]">
          <strong className="text-[var(--accent-amber)] block text-sm mb-1">1. 10m Poslech</strong>
          Přečti a pusť MP3 dialog.
        </div>
        <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] text-[var(--text-secondary)]">
          <strong className="text-[var(--accent-amber)] block text-sm mb-1">2. Gramatika</strong>
          Pochop 1 nový princip.
        </div>
        <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] text-[var(--text-secondary)]">
          <strong className="text-[var(--accent-amber)] block text-sm mb-1">3. Výběr Vět</strong>
          Vyber 2–4 užitečné věty.
        </div>
        <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--card-border)] text-[var(--text-secondary)]">
          <strong className="text-[var(--accent-amber)] block text-sm mb-1">4. AI Voice Chat</strong>
          Použij věty večer s AI.
        </div>
      </div>
    </div>
  );
}
