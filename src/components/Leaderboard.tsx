'use client';

import { UserProfile } from '@/lib/types';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface LeaderboardProps {
  users: UserProfile[];
}

export default function Leaderboard({ users }: LeaderboardProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);
  const sortedUsers = [...users].sort((a, b) => b.totalPoints - a.totalPoints);

  const renderAvatar = (avatarValue?: string) => {
    if (!avatarValue) return '👤';
    if (avatarValue.startsWith('data:image') || avatarValue.startsWith('http')) {
      return (
        <img
          src={avatarValue}
          alt="Avatar"
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    return avatarValue;
  };

  return (
    <div className="apple-glass p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="apple-pill-badge bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-2">
            {t.liveLeaderboard}
          </span>
          <h2 className="apple-heading-md text-[var(--text-primary)] flex items-center gap-2">
            <span>🏆</span> {t.challengeAndPoints}
          </h2>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
          {t.realTimeSync}
        </span>
      </div>

      <div className="space-y-3">
        {sortedUsers.map((user, index) => {
          const isTop = index === 0;
          return (
            <div
              key={user.uid}
              className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between transition-all ${
                isTop
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:bg-[var(--card-bg-hover)]'
              }`}
            >
              <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
                {/* Medaile #1 / #2 */}
                <div
                  className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                    isTop
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black'
                      : 'bg-white/10 dark:bg-white/5 border border-[var(--card-border)] text-[var(--text-secondary)] font-bold'
                  }`}
                >
                  #{index + 1}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] border border-[var(--card-border)] flex items-center justify-center text-lg overflow-hidden shrink-0">
                  {renderAvatar(user.avatar)}
                </div>

                {/* Uživatelské jméno a streak */}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-sm sm:text-base text-[var(--text-primary)] truncate">
                      {user.displayName}
                    </span>
                    {isTop && <span className="text-sm shrink-0">👑</span>}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                    🔥 {user.currentStreak} {t.dayStreakLabel}
                  </div>
                </div>
              </div>

              {/* Body – perfektně čitelné na jakémkoliv pozadí */}
              <div className="text-right shrink-0 pl-3">
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 dark:text-amber-400 tracking-tight">
                  {user.totalPoints}{' '}
                  <span className="text-xs font-semibold text-[var(--text-muted)] font-sans">
                    {t.pointsUnit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}