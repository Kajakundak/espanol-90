'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Leaderboard from '@/components/Leaderboard';
import QuizModal from '@/components/QuizModal';
import ScrollReveal from '@/components/ScrollReveal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useActiveUser } from '@/lib/context/UserContext';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';

export default function ArenaPage() {
  const { userId, profiles } = useActiveUser();
  const { users } = useLeaderboard();
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const currentUser = profiles.find((u) => u.uid === userId) || users.find((u) => u.uid === userId) || {
    uid: userId,
    displayName: userId === 'user_karel' ? 'Karel' : 'Lucka',
    avatar: userId === 'user_karel' ? '👨‍💻' : '👩‍💻',
    totalPoints: 0,
    currentStreak: 1,
  };

  const [isQuizOpen, setIsQuizOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-10 space-y-12 relative z-10">

        {/* Hero Section */}
        <ScrollReveal animation="fade-up">
          <section className="apple-glass p-8 md:p-12 text-center space-y-6">
            <span className="apple-pill-badge bg-[var(--accent-amber)]/15 text-[var(--accent-amber)] border border-[var(--accent-amber)]/30">
              {t.arenaBadge}
            </span>

            <h1 className="apple-heading-xl text-[var(--text-primary)]">
              {t.arenaTitle} ⚔️
            </h1>

            <p className="apple-text-subhead max-w-2xl mx-auto">
              {t.arenaSubtitle}
            </p>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => {
                  setIsQuizOpen(true);
                  soundEngine.playTick();
                }}
                className="apple-button-primary text-base px-8 py-4"
              >
                <span>⚡ {t.startDailyQuiz}</span>
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* Leaderboard Showcase */}
        <ScrollReveal animation="fade-up" delay={0.1}>
          <section>
            <Leaderboard users={users} />
          </section>
        </ScrollReveal>

      </main>

      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        onCompleteQuiz={() => {}}
      />
    </div>
  );
}