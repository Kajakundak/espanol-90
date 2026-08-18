'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import AnkiPracticeModal from '@/components/AnkiPracticeModal';
import ScrollReveal from '@/components/ScrollReveal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useActiveUser } from '@/lib/context/UserContext';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';

export default function AnkiPage() {
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-10 space-y-12 relative z-10">

        {/* Hero Section */}
        <ScrollReveal animation="fade-up">
          <section className="apple-glass p-8 md:p-12 text-center space-y-6">
            <span className="apple-pill-badge bg-[var(--accent-purple)]/15 text-[var(--accent-purple)] border border-[var(--accent-purple)]/30">
              {t.ankiBadge}
            </span>

            <h1 className="apple-heading-xl text-[var(--text-primary)]">
              {t.ankiTitle} 🧠
            </h1>

            <p className="apple-text-subhead max-w-2xl mx-auto">
              {t.ankiSubtitle}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  soundEngine.playTick();
                }}
                className="apple-button-primary text-base px-8 py-4"
              >
                <span>🚀 {t.startAnkiTraining}</span>
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* Features Info Grid */}
        <ScrollReveal animation="fade-up" delay={0.1}>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="apple-glass p-6 space-y-3">
              <span className="text-3xl">🔀</span>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)]">{t.featureShuffleTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.featureShuffleDesc}
              </p>
            </div>

            <div className="apple-glass p-6 space-y-3">
              <span className="text-3xl">📈</span>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)]">{t.featureUnlockTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.featureUnlockDesc}
              </p>
            </div>

            <div className="apple-glass p-6 space-y-3">
              <span className="text-3xl">🔊</span>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)]">{t.featureTtsTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.featureTtsDesc}
              </p>
            </div>
          </section>
        </ScrollReveal>

      </main>

      <AnkiPracticeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDay={currentDay}
      />
    </div>
  );
}