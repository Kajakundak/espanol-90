'use client';

import { useState } from 'react';
import { getDayPlan } from '@/lib/data/day-plan';
import { CEFRLevel } from '@/lib/types';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface CalendarScheduleProps {
  currentDay: number;
  onSelectDay: (day: number) => void;
  completedDays?: number[];
  startingLevel?: CEFRLevel;
}

export default function CalendarSchedule({
  currentDay,
  onSelectDay,
  completedDays = [],
  startingLevel = 'A1',
}: CalendarScheduleProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  // Spočítáme týden podle aktuálního dne
  const initialWeek = Math.ceil(currentDay / 7);
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);

  const startDay = (selectedWeek - 1) * 7 + 1;
  const weekDays = Array.from({ length: 7 }, (_, i) => startDay + i).filter((d) => d <= 90);

  const activePlan = getDayPlan(currentDay, startingLevel, language);

  return (
    <div className="apple-glass p-6 md:p-8 space-y-6">
      {/* Horní hlavička */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="apple-pill-badge bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              🗓️ {t.scheduleBadge}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">
            {t.weekTitle} {selectedWeek}: <span className="text-[var(--accent-emerald)]">{activePlan.islandTitle}</span>
          </h2>
        </div>

        {/* Týdenní přepínač T1 - T12 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
            const isCurrentWeek = w === selectedWeek;
            return (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                  isCurrentWeek
                    ? 'bg-emerald-500 text-slate-950 shadow-md scale-105 font-black'
                    : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)]'
                }`}
              >
                {language === 'en' ? 'W' : 'T'}{w}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7 dlaždic dnů v týdnu */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDays.map((dayNum) => {
          const isSelected = dayNum === currentDay;
          const isCompleted = completedDays.includes(dayNum);
          const plan = getDayPlan(dayNum, startingLevel, language);

          return (
            <div
              key={dayNum}
              onClick={() => onSelectDay(dayNum)}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[130px] ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-[1.02]'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-white/20 hover:bg-[var(--card-bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-white/5 text-[var(--text-secondary)]'
                  }`}
                >
                  {t.dayLabel} {dayNum}
                </span>
                {isCompleted && (
                  <span className="text-emerald-400 font-bold text-xs">✓</span>
                )}
              </div>

              <div className="my-2">
                <p className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                  {plan.islandTitle}
                </p>
              </div>

              <div className="space-y-1 pt-1 border-t border-[var(--card-border)] text-[10px] font-medium text-[var(--text-secondary)]">
                <div className="flex items-center gap-1 truncate">
                  <span>📖</span> <span className="truncate">{plan.bookTitle}</span>
                </div>
                <div className="flex items-center gap-1 truncate">
                  <span>🎧</span> <span className="truncate">DS 25m</span>
                </div>
                <div className="flex items-center gap-1 truncate">
                  <span>🎙️</span> <span className="truncate">AI Tutor</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}