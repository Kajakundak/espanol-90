// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { useAppLanguage, AppLanguage } from '@/lib/context/LanguageContext';
import { useAppTheme } from '@/lib/context/ThemeContext';
import { useActiveUser } from '@/lib/context/UserContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { getTranslation } from '@/lib/translations';
import ProfileManagerModal from '@/components/ProfileManagerModal';

interface NavbarProps {
  currentUser?: UserProfile;
  onSwitchUser?: (userId: string) => void;
}

export default function Navbar({ currentUser: propUser, onSwitchUser: propSwitch }: NavbarProps) {
  const pathname = usePathname();
  const { language, setLanguage } = useAppLanguage();
  const { theme, toggleTheme, setTheme } = useAppTheme();
  const { userId, profiles, setUserId, updateProfile } = useActiveUser();
  const { users } = useLeaderboard();
  const t = getTranslation(language);
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const activeUser =
    propUser ||
    profiles.find((u) => u.uid === userId) ||
    users.find((u) => u.uid === userId) || {
      uid: userId,
      displayName: userId === 'user_karel' ? 'Karel' : 'Lucka',
      totalPoints: 0,
      currentStreak: 1,
      avatar: userId === 'user_karel' ? '👨‍💻' : '👩‍💻',
    };

  const profileOptions = profiles.length > 0 ? profiles : [activeUser];

  useEffect(() => {
    const selectedProfile = profiles.find((p) => p.uid === userId);
    if (selectedProfile) {
      if (selectedProfile.theme) {
        setTheme(selectedProfile.theme);
      }
      if (selectedProfile.preferredBaseLanguage) {
        setLanguage(selectedProfile.preferredBaseLanguage);
      }
    }
  }, [userId]);

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    updateProfile(userId, { theme: nextTheme });
  };

  const handleLanguageChange = (code: AppLanguage) => {
    setLanguage(code);
    updateProfile(userId, { preferredBaseLanguage: code });
  };

  const handleSelectProfile = (selectedUid: string) => {
    const selectedProfile = profiles.find((p) => p.uid === selectedUid);
    setUserId(selectedUid);
    if (selectedProfile) {
      setTheme(selectedProfile.theme || 'dark');
      setLanguage(selectedProfile.preferredBaseLanguage || 'cs');
    }
    if (typeof propSwitch === 'function') {
      propSwitch(selectedUid);
    }
    setIsProfileMenuOpen(false);
  };

  const renderAvatar = (avatarValue?: string, className = 'text-base') => {
    if (!avatarValue) return <span className={className}>👤</span>;
    if (avatarValue.startsWith('data:image') || avatarValue.startsWith('http')) {
      return (
        <img
          src={avatarValue}
          alt="Avatar"
          className="w-full h-full object-cover rounded-full"
        />
      );
    }
    return <span className={className}>{avatarValue}</span>;
  };

  const navItems = [
    { label: t.dashboard, href: '/', icon: '📊' },
    { label: t.islands, href: '/islands', icon: '🏝️' },
    { label: t.ankiDeck, href: '/anki', icon: '🧠' },
    { label: t.arena, href: '/arena', icon: '⚔️' },
    { label: t.aiTutor, href: '/tutor', icon: '🎙️' },
  ];

  const languages: { code: AppLanguage; label: string; flag: string }[] = [
    { code: 'cs', label: 'CS', flag: '🇨🇿' },
    { code: 'sk', label: 'SK', flag: '🇸🇰' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
  ];

  return (
    <>
      <header className="sticky top-0 z-[90] w-full backdrop-blur-2xl bg-[var(--nav-bg)] border-b border-[var(--nav-border)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-1 sm:space-x-2 shrink-0 group">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)] group-hover:opacity-80 transition">
              Español <span className="text-[var(--accent-emerald)]">90</span>
            </span>
          </Link>

          {/* Navigace */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center space-x-1.5 min-h-[44px] lg:min-h-auto flex-col lg:flex-row text-center ${
                    isActive
                      ? 'bg-[var(--card-bg-hover)] text-[var(--text-primary)] border border-[var(--card-border-hover)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Ovládací prvky */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Přepnutí tématu (Světlý / Tmavý) */}
            <button
              onClick={handleThemeToggle}
              className="p-2.5 sm:p-2 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] transition cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto flex items-center justify-center shadow-sm"
              title={theme === 'dark' ? t.themeLight : t.themeDark}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Přepínač jazyků */}
            <div className="flex items-center p-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-full min-h-[44px] shadow-sm">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code)}
                  className={`px-2 py-1.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer min-w-[44px] sm:min-w-auto min-h-[44px] sm:min-h-auto ${
                    language === l.code
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span className="hidden sm:inline">{l.label}</span>
                </button>
              ))}
            </div>

            {/* Streak */}
            <div className="hidden sm:flex items-center space-x-1 bg-[var(--card-bg)] border border-[var(--card-border)] px-2.5 py-1 rounded-full text-[var(--accent-amber)] text-xs font-bold shrink-0 min-h-[44px]">
              <span>🔥</span>
              <span>{activeUser.currentStreak} {t.streak}</span>
            </div>

            {/* Profilové tlačítko & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="px-3 py-2.5 sm:py-1 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] transition flex items-center justify-center gap-2 cursor-pointer shrink-0 min-h-[44px] sm:min-h-auto shadow-sm"
                title={t.profileSwitch}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  {renderAvatar(activeUser.avatar, 'text-sm')}
                </span>
                <span className="font-bold hidden sm:inline">{activeUser.displayName}</span>
              </button>

              {/* ── DROPDOWN STYLOVANÝ PŘESNĚ JAKO PROFILE MANAGER (REAGUJE NA SVĚTLÝ I TMAVÝ REŽIM) ── */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl backdrop-blur-2xl z-[120] overflow-hidden animate-scale-in">
                  <div className="border-b border-[var(--card-border)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] bg-[var(--card-bg-hover)]">
                    {t.profilesTitle}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-[var(--card-bg)]">
                    {profileOptions.map((profile) => (
                      <button
                        key={profile.uid}
                        type="button"
                        onClick={() => handleSelectProfile(profile.uid)}
                        className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition cursor-pointer ${
                          profile.uid === activeUser.uid
                            ? 'bg-[var(--accent-emerald)]/15 border border-[var(--accent-emerald)] shadow-sm'
                            : 'hover:bg-[var(--card-bg-hover)] border border-transparent'
                        }`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card-bg-hover)] text-base shrink-0 overflow-hidden border border-[var(--card-border)]">
                          {renderAvatar(profile.avatar, 'text-sm')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                            {profile.displayName}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
                            {profile.startingLevel || 'A1'} • {profile.preferredBaseLanguage?.toUpperCase() || 'CS'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full border-t border-[var(--card-border)] bg-[var(--card-bg-hover)] hover:opacity-90 px-4 py-2.5 text-left text-xs font-bold text-[var(--text-primary)] transition cursor-pointer flex items-center gap-2"
                  >
                    <span>{t.manageProfiles}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <ProfileManagerModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Mobilní spodní lišta */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[110] bg-[var(--nav-bg)] backdrop-blur-2xl border-t border-[var(--nav-border)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                isActive
                  ? 'text-[var(--accent-emerald)] font-bold bg-[var(--card-bg-hover)]'
                  : 'text-[var(--text-muted)] font-medium hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}