'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import IslandTrainer from '@/components/islands/IslandTrainer';
import CustomIslandModal from '@/components/islands/CustomIslandModal';
import ScrollReveal from '@/components/ScrollReveal';
import { PREPARSED_ISLANDS } from '@/lib/data/islands-data';
import { getIslandById, IslandCategory } from '@/lib/data/islands-parser';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useActiveUser } from '@/lib/context/UserContext';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';

export default function IslandsPage() {
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

  const [selectedCategory, setSelectedCategory] = useState<IslandCategory | null>(null);
  const [filter, setFilter] = useState<'all' | 'custom'>('all');
  const [customIslands, setCustomIslands] = useState<IslandCategory[]>([]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const search = new URLSearchParams(window.location.search);
    const categoryId = search.get('category');
    if (!categoryId) return;

    const category = getIslandById(categoryId) || PREPARSED_ISLANDS.find((item) => item.categoryId === categoryId);
    if (category) {
      setSelectedCategory(category);
    }
  }, []);

  const allCategories = [...PREPARSED_ISLANDS, ...customIslands];

  const filteredCategories = allCategories.filter((cat) => {
    if (filter === 'custom') return cat.categoryId.startsWith('custom-') || cat.categoryId.startsWith('custom_');
    return true;
  });

  const handleCreateCustomIsland = (newIsland: IslandCategory) => {
    setCustomIslands((prev) => [newIsland, ...prev]);
    setSelectedCategory(newIsland);
    soundEngine.playTick();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 md:px-8 py-6 sm:py-10 pb-24 sm:pb-10 space-y-8 sm:space-y-12 relative z-10">

        {/* Hero Section */}
        <ScrollReveal animation="fade-up">
          <section className="apple-glass p-8 md:p-12 text-center space-y-4">
            <span className="apple-pill-badge bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/30">
              {t.islandsBadge}
            </span>

            <h1 className="apple-heading-xl text-[var(--text-primary)]">
              {t.islandsTitle} 🏝️
            </h1>

            <p className="apple-text-subhead max-w-2xl mx-auto">
              {t.islandsSubtitle}
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
              <button
                onClick={() => { setFilter('all'); soundEngine.playTick(); }}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-black transition cursor-pointer min-h-[44px] sm:min-h-auto flex items-center justify-center ${
                  filter === 'all'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.allIslands} ({allCategories.length})
              </button>

              <button
                onClick={() => { setFilter('custom'); soundEngine.playTick(); }}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-black transition cursor-pointer min-h-[44px] sm:min-h-auto flex items-center justify-center ${
                  filter === 'custom'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.customIslands} ({customIslands.length})
              </button>
              <button
                onClick={() => { setIsCustomModalOpen(true); soundEngine.playTick(); }}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 text-white font-extrabold text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 min-h-[44px] sm:min-h-auto"
              >
                <span className="hidden sm:inline">✨</span> <span>{t.createCustomIsland}</span>
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* Islands Cards Grid */}
        <ScrollReveal animation="fade-up" delay={0.1}>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.categoryId}
                onClick={() => {
                  setSelectedCategory(category);
                  soundEngine.playTick();
                }}
                className="apple-card-interactive p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{category.icon}</span>
                    <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)]">
                      {category.sentences.length} {t.sentencesCount}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-lg text-[var(--text-primary)]">
                      {category.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-1 line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[var(--card-border)]">
                  <span className="text-xs font-semibold text-[var(--accent-emerald)]">
                    {t.startTraining}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    {category.difficulty || 'A1'}
                  </span>
                </div>
              </div>
            ))}
          </section>
        </ScrollReveal>

      </main>

      {selectedCategory && (
        <IslandTrainer
          userId={currentUser.uid}
          category={selectedCategory}
          userName={currentUser.displayName}
          userAvatar={currentUser.avatar}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      <CustomIslandModal
        userId={currentUser.uid}
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSaved={handleCreateCustomIsland}
      />
    </div>
  );
}