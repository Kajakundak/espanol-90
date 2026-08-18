'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ProgressRing from '@/components/ProgressRing';
import TaskCard from '@/components/TaskCard';
import Leaderboard from '@/components/Leaderboard';
import CalendarSchedule from '@/components/CalendarSchedule';
import AnkiPracticeModal from '@/components/AnkiPracticeModal';
import TextbookModal from '@/components/TextbookModal';
import ScrollReveal from '@/components/ScrollReveal';
import { useProgress } from '@/hooks/useProgress';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useActiveUser } from '@/lib/context/UserContext';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { TaskKey } from '@/lib/types';
import { soundEngine } from '@/lib/audio/sound-engine';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { getDayPlan } from '@/lib/data/day-plan';

export default function Dashboard() {
  const { userId: activeUserId, setUserId: setActiveUserId, profiles } = useActiveUser();
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [currentDay, setCurrentDay] = useState(1);
  const [isAnkiModalOpen, setIsAnkiModalOpen] = useState(false);
  const [isTextbookModalOpen, setIsTextbookModalOpen] = useState(false);

  const { progress, loading: progressLoading, toggleTask } = useProgress(activeUserId, currentDay);
  const { users } = useLeaderboard();

  const currentUser =
    profiles.find((u) => u.uid === activeUserId) ||
    users.find((u) => u.uid === activeUserId) || {
      uid: activeUserId,
      displayName: activeUserId === 'user_karel' ? 'Karel' : 'Lucka',
      totalPoints: 0,
      currentStreak: 1,
      startingLevel: 'A1',
      avatar: activeUserId === 'user_karel' ? '👨‍💻' : '👩‍💻',
    };

  const handleTaskToggle = async (key: string) => {
    if (!progress) return;
    const isCurrentlyChecked = progress.tasks[key as TaskKey];
    if (isCurrentlyChecked) {
      soundEngine.playUntick();
    } else {
      soundEngine.playTick();
    }

    const willBeCompleted =
      !isCurrentlyChecked &&
      Object.entries(progress.tasks)
        .filter(([k]) => k !== key)
        .every(([, completed]) => completed);

    if (willBeCompleted) {
      soundEngine.playVictoryFanfare();
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    }

    await toggleTask(key as TaskKey);
  };

  const startingLevel = currentUser.startingLevel || 'A1';
  const todayPlan = getDayPlan(currentDay, startingLevel, language);
  const phase = todayPlan.phase;

  const phaseSubtitle =
    phase === 1 ? t.phase1Subtitle : phase === 2 ? t.phase2Subtitle : t.phase3Subtitle;

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden">
      <Navbar
        currentUser={currentUser}
        onSwitchUser={(id) => setActiveUserId(id)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 md:px-8 py-6 sm:py-8 md:py-10 space-y-8 sm:space-y-10 md:space-y-12 relative z-10">

        {/* ── 1. Hero sekce (Jednorázové ikony v tlačítkách) ── */}
        <ScrollReveal animation="fade-up">
          <section className="apple-glass p-4 sm:p-6 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-10 relative overflow-hidden">
            <div className="space-y-3 sm:space-y-4 text-center md:text-left z-10 max-w-xl">
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2">
                <span className="apple-pill-badge bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/30 text-xs sm:text-sm">
                  {t.phase} {phase} • {t.dayOf} {currentDay} {t.of90}
                </span>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {phaseSubtitle}
                </span>
              </div>

              <h1 className="apple-heading-xl text-[var(--text-primary)]">
                {t.greeting}, {currentUser.displayName}! 👋
              </h1>

              <p className="apple-text-subhead max-w-md">
                {t.todayWorkingOn}{' '}
                <strong className="text-[var(--accent-emerald)] font-bold">
                  {todayPlan.islandTitle}
                </strong>{' '}
                {t.and}{' '}
                <strong className="text-[var(--accent-cyan)] font-bold">
                  {todayPlan.bookTitle}
                </strong>.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4">
                <Link href="/tutor" className="apple-button-primary w-full sm:w-auto text-center">
                  <span>🎙️</span> {t.launchAiTutor}
                </Link>
                <button
                  onClick={() => {
                    soundEngine.playTick();
                    setIsAnkiModalOpen(true);
                  }}
                  className="apple-button-secondary w-full sm:w-auto text-center"
                >
                  <span>🧠</span> {t.trainAnki}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 z-10 bg-[var(--card-bg)] p-4 sm:p-6 rounded-3xl border border-[var(--card-border)] shadow-lg">
              <ProgressRing currentDay={currentDay} totalDays={90} />
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    soundEngine.playTick();
                    setCurrentDay((d) => Math.max(1, d - 1));
                  }}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] rounded-full text-xs font-mono font-bold border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer min-h-[44px] sm:min-h-auto flex items-center justify-center"
                >
                  {t.prevDay}
                </button>
                <button
                  onClick={() => {
                    soundEngine.playTick();
                    setCurrentDay((d) => Math.min(90, d + 1));
                  }}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] rounded-full text-xs font-mono font-bold border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer min-h-[44px] sm:min-h-auto flex items-center justify-center"
                >
                  {t.nextDay}
                </button>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── 2. Harmonogram týdne ── */}
        <ScrollReveal animation="fade-up" delay={0.1}>
          <section>
            <CalendarSchedule
              currentDay={currentDay}
              onSelectDay={(day) => {
                soundEngine.playTick();
                setCurrentDay(day);
              }}
              completedDays={progress?.allCompleted ? [currentDay] : []}
              startingLevel={startingLevel}
            />
          </section>
        </ScrollReveal>

        {/* ── 3. Dnešní mise (5 úkolů) ── */}
        <ScrollReveal animation="fade-up" delay={0.2}>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="apple-heading-lg text-[var(--text-primary)]">
                {t.todaysMissions} {currentDay}
              </h2>
              {progress?.allCompleted && (
                <span className="apple-pill-badge bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/30 animate-bounce">
                  {t.allCompletedBonus}
                </span>
              )}
            </div>

            {progressLoading ? (
              <div className="apple-glass text-center py-12 sm:py-16 text-[var(--text-muted)] font-mono text-sm">
                {t.loadingMissions}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                {todayPlan.tasks.map((task) => (
                  <TaskCard
                    key={task.key}
                    id={task.key}
                    title={task.title}
                    duration={`${task.subtitle} • ${task.details}`}
                    icon={task.icon}
                    completed={progress?.tasks[task.key] || false}
                    onToggle={handleTaskToggle}
                    actionHref={task.href}
                    actionLabel={task.actionLabel}
                    onActionClick={
                      task.key === 'anki'
                        ? () => {
                            soundEngine.playTick();
                            setIsAnkiModalOpen(true);
                          }
                        : task.key === 'book'
                        ? () => {
                            soundEngine.playTick();
                            setIsTextbookModalOpen(true);
                          }
                        : task.externalHref
                        ? () => {
                            soundEngine.playTick();
                            window.open(task.externalHref, '_blank', 'noopener,noreferrer');
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* ── 4. Žebříček (Arena) ── */}
        <ScrollReveal animation="fade-up" delay={0.3}>
          <section>
            <Leaderboard users={users} />
          </section>
        </ScrollReveal>

      </main>

      {/* ── Anki tréninkový modal ── */}
      <AnkiPracticeModal
        isOpen={isAnkiModalOpen}
        onClose={() => setIsAnkiModalOpen(false)}
        currentDay={currentDay}
      />

      {/* ── Detailní průvodce knihou Prokopové ── */}
      <TextbookModal
        isOpen={isTextbookModalOpen}
        onClose={() => setIsTextbookModalOpen(false)}
        dayNumber={currentDay}
        bookMeta={todayPlan.bookMeta}
      />
    </div>
  );
}