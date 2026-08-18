// src/components/DreamingSpanishSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { soundEngine } from '@/lib/audio/sound-engine';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import confetti from 'canvas-confetti';

interface DreamingSpanishSectionProps {
  currentDay: number;
  onCompleteMission?: () => void;
}

export default function DreamingSpanishSection({
  currentDay,
  onCompleteMission,
}: DreamingSpanishSectionProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const DS_LEVELS = [
    {
      id: 'superbeginner',
      label: 'Superbeginner',
      phase: 'A0',
      days: '1–30',
      desc: t.dsSuperbeginnerDesc,
      ytUrl: 'https://www.youtube.com/playlist?list=PLlpPf-YgbU7GbOHc3siOGQ5KmVSngZucl',
      icon: '🌱',
    },
    {
      id: 'beginner',
      label: 'Beginner',
      phase: 'A1',
      days: '31–60',
      desc: t.dsBeginnerDesc,
      ytUrl: 'https://www.youtube.com/playlist?list=PLlpPf-YgbU7HWrrenMs3-nuhxgzyAiA-C',
      icon: '🚀',
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      phase: 'A2',
      days: '61–90',
      desc: t.dsIntermediateDesc,
      ytUrl: 'https://www.youtube.com/playlist?list=PLlpPf-YgbU7Gssxi9f72cZktgOb4Vpdoy',
      icon: '🔥',
    },
  ];

  const phase = currentDay <= 30 ? 1 : currentDay <= 60 ? 2 : 3;
  const defaultId = phase === 1 ? 'superbeginner' : phase === 2 ? 'beginner' : 'intermediate';

  const [selectedId, setSelectedId] = useState(defaultId);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      setCompleted(true);
      soundEngine.playVictoryFanfare();
      try { confetti({ particleCount: 120, spread: 80 }); } catch { /* ignore */ }
      if (onCompleteMission) onCompleteMission();
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, secondsLeft, onCompleteMission]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const active = DS_LEVELS.find((l) => l.id === selectedId) || DS_LEVELS[0];

  const handleOpenYouTube = () => {
    if (!isActive && !completed) {
      setIsActive(true);
      soundEngine.playTick();
    }
    window.open(active.ytUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="apple-glass p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="apple-pill-badge bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 mb-2">
            {t.dsBadge} {currentDay}
          </span>
          <h2 className="apple-heading-md text-[var(--text-primary)] flex items-center gap-2">
            🎧 Dreaming Spanish
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t.dsSubtitle}
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3 bg-[var(--card-bg)] px-5 py-3 rounded-2xl border border-[var(--card-border)] self-start sm:self-auto">
          <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${completed ? 'text-[var(--accent-emerald)]' : isActive ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-cyan)]'}`}>
            {formatTime(secondsLeft)}
          </span>
          {secondsLeft < 25 * 60 && !completed && (
            <button
              onClick={() => { setIsActive(!isActive); isActive ? soundEngine.playUntick() : soundEngine.playTick(); }}
              className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-amber)] text-black'
                  : 'bg-[var(--card-bg-hover)] text-[var(--text-primary)] border border-[var(--card-border)]'
              }`}
            >
              {isActive ? t.dsPause : t.dsContinue}
            </button>
          )}
          {secondsLeft < 25 * 60 && !completed && (
            <button
              onClick={() => { setIsActive(false); setSecondsLeft(25 * 60); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition"
            >
              {t.dsReset}
            </button>
          )}
          {completed && (
            <span className="text-xs font-bold text-[var(--accent-emerald)]">{t.dsDone}</span>
          )}
        </div>
      </div>

      {/* Level tabs */}
      <div className="flex gap-2 flex-wrap">
        {DS_LEVELS.map((lvl) => {
          const isSel = lvl.id === selectedId;
          return (
            <button
              key={lvl.id}
              onClick={() => { soundEngine.playTick(); setSelectedId(lvl.id); }}
              className={`px-4 py-2.5 rounded-full border text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                isSel
                  ? 'bg-[var(--accent-cyan)]/15 border-[var(--accent-cyan)] text-[var(--accent-cyan)] shadow-sm'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-[var(--card-bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{lvl.icon}</span>
              <span>{lvl.label}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isSel ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]' : 'bg-[var(--card-border)] text-[var(--text-muted)]'}`}>
                {lvl.phase}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected level card + CTA */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{active.icon}</span>
            <span className="font-extrabold text-[var(--text-primary)] text-lg">DS {active.label}</span>
            <span className="text-[10px] text-[var(--accent-cyan)] font-mono bg-[var(--accent-cyan)]/10 px-2.5 py-0.5 rounded-full border border-[var(--accent-cyan)]/20">{active.days} {t.daysCount}</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{active.desc}</p>
        </div>

        <a
          href={active.ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenYouTube}
          className="shrink-0 flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-full transition hover:scale-105 active:scale-95 shadow-lg cursor-pointer whitespace-nowrap"
        >
          {t.dsWatchYt}
        </a>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] text-center">
        {t.dsTip}
      </p>

      {completed && (
        <div className="bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/30 p-4 rounded-2xl text-sm text-[var(--accent-emerald)] font-bold flex items-center gap-2">
          {t.dsCompletedBanner}
        </div>
      )}
    </div>
  );
}