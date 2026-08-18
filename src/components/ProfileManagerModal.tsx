'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useActiveUser } from '@/lib/context/UserContext';
import { useAppTheme } from '@/lib/context/ThemeContext';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { AppTheme, CEFRLevel, PreferredBaseLanguage } from '@/lib/types';
import { soundEngine } from '@/lib/audio/sound-engine';
import AvatarGeneratorModal from '@/components/AvatarGeneratorModal';

const LEVEL_OPTIONS: CEFRLevel[] = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const AVATAR_OPTIONS = [
  '👨‍💻', '👩‍💻', '🧑‍🎓', '💃', '🐂', '🥘', '🎸', '👑',
  '🧑‍🚀', '👩‍🎨', '🧑‍🏫', '🧑‍🍳', '🤠', '🤓', '🔥', '🌴'
];

interface ProfileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileManagerModal({ isOpen, onClose }: ProfileManagerModalProps) {
  const { profiles, userId, setUserId, createProfile, updateProfile, deleteProfile } = useActiveUser();
  const { theme: activeTheme, setTheme } = useAppTheme();
  const { language, setLanguage } = useAppLanguage();
  const t = getTranslation(language);

  const LANGUAGE_OPTIONS: { value: PreferredBaseLanguage; label: string; flag: string }[] = [
    { value: 'cs', label: 'Čeština', flag: '🇨🇿' },
    { value: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const THEME_OPTIONS: { value: AppTheme; label: string; icon: string }[] = [
    { value: 'dark', label: t.themeDark, icon: '🌙' },
    { value: 'light', label: t.themeLight, icon: '☀️' },
  ];

  // Výchozí editace je aktuálně přihlášený uživatel
  const [editingUid, setEditingUid] = useState<string | null>(userId);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [theme, setThemeValue] = useState<AppTheme>('dark');
  const [preferredBaseLanguage, setPreferredBaseLanguage] = useState<PreferredBaseLanguage>('cs');
  const [startingLevel, setStartingLevel] = useState<CEFRLevel>('A1');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.uid === (editingUid || userId)) || profiles[0],
    [profiles, userId, editingUid]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (editingUid && editingUid !== 'new') {
      const selectedProfile = profiles.find((profile) => profile.uid === editingUid);
      if (selectedProfile) {
        setName(selectedProfile.displayName || '');
        setAvatar(selectedProfile.avatar || '👤');
        setThemeValue(selectedProfile.theme || 'dark');
        setPreferredBaseLanguage(selectedProfile.preferredBaseLanguage || selectedProfile.nativeLanguage || 'cs');
        setStartingLevel(selectedProfile.startingLevel || selectedProfile.level || 'A1');
        return;
      }
    }

    if (editingUid === 'new') {
      setName('');
      setAvatar('💃');
      setThemeValue('dark');
      setPreferredBaseLanguage(language);
      setStartingLevel('A1');
      return;
    }

    const source = activeProfile || profiles[0];
    setName(source?.displayName || '');
    setAvatar(source?.avatar || '👤');
    setThemeValue(source?.theme || 'dark');
    setPreferredBaseLanguage(source?.preferredBaseLanguage || source?.nativeLanguage || 'cs');
    setStartingLevel(source?.startingLevel || source?.level || 'A1');
  }, [isOpen, activeProfile, editingUid, profiles, language]);

  if (!isOpen) return null;

  const handleProfileSelect = (uid: string) => {
    soundEngine.playTick();
    setUserId(uid);
    setEditingUid(uid);
    const selectedProfile = profiles.find((profile) => profile.uid === uid);
    if (selectedProfile) {
      setName(selectedProfile.displayName || '');
      setAvatar(selectedProfile.avatar || '👤');
      setThemeValue(selectedProfile.theme || 'dark');
      setPreferredBaseLanguage(selectedProfile.preferredBaseLanguage || selectedProfile.nativeLanguage || 'cs');
      setStartingLevel(selectedProfile.startingLevel || selectedProfile.level || 'A1');
      setTheme(selectedProfile.theme || 'dark');
      setLanguage(selectedProfile.preferredBaseLanguage || selectedProfile.nativeLanguage || 'cs');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const cleanedName = name.trim();
    if (!cleanedName) return;

    soundEngine.playTick();

    if (editingUid && editingUid !== 'new') {
      updateProfile(editingUid, {
        displayName: cleanedName,
        avatar,
        theme,
        preferredBaseLanguage,
        startingLevel,
      });
      setUserId(editingUid);
      setTheme(theme);
      setLanguage(preferredBaseLanguage);
    } else {
      const created = createProfile({
        displayName: cleanedName,
        avatar,
        theme,
        preferredBaseLanguage,
        startingLevel,
      });
      setUserId(created.uid);
      setTheme(theme);
      setLanguage(preferredBaseLanguage);
      setEditingUid(created.uid);
    }

    onClose();
  };

  const handleDelete = (uid: string) => {
    if (uid === 'user_karel' || uid === 'user_lucka') return;
    if (!confirm(t.deleteProfileConfirm)) return;

    soundEngine.playUntick();
    deleteProfile(uid);
    if (userId === uid) {
      const fallback = profiles.find((profile) => profile.uid !== uid) || profiles[0];
      if (fallback) {
        setUserId(fallback.uid);
        setEditingUid(fallback.uid);
      }
    }
  };

  const renderAvatarContent = (avatarValue?: string, className = 'text-lg') => {
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

  const isCustomSvgAvatar = Boolean(
    avatar && (avatar.startsWith('data:image') || avatar.startsWith('http'))
  );

  const isCreatingNew = editingUid === 'new';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xl animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-scale-in">
        
        {/* ── 1. Top Fixed Header ── */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 sm:px-7 py-4 bg-[var(--card-bg-hover)] shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] font-mono">
              {t.profilesTitle}
            </p>
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
              {isCreatingNew ? t.addProfile : `${t.editProfile} — ${name || activeProfile?.displayName}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] transition flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ── 2. Scrollable Body Content ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
          <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
            
            {/* Left: Profiles List & Add Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTick();
                  setEditingUid('new');
                }}
                className={`w-full rounded-2xl border-2 border-dashed px-4 py-3 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                  isCreatingNew
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : 'border-[var(--accent-emerald)]/50 bg-[var(--accent-emerald)]/10 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/20'
                }`}
              >
                <span>{t.addProfile}</span>
              </button>

              <div className="space-y-2 max-h-48 md:max-h-none overflow-y-auto pr-1">
                {profiles.map((profile) => {
                  const isSelected = !isCreatingNew && (editingUid ? editingUid === profile.uid : userId === profile.uid);
                  return (
                    <div
                      key={profile.uid}
                      className={`flex items-center justify-between rounded-2xl border p-2.5 transition ${
                        isSelected
                          ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)]/15 shadow-sm'
                          : 'border-[var(--card-border)] bg-[var(--card-bg-hover)] hover:border-white/20'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleProfileSelect(profile.uid)}
                        className="flex-1 text-left flex items-center gap-2.5 min-w-0 cursor-pointer"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--card-bg)] text-lg shrink-0 border border-[var(--card-border)] overflow-hidden">
                          {renderAvatarContent(profile.avatar, 'text-base')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {profile.displayName}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
                            {profile.startingLevel || 'A1'} • {profile.preferredBaseLanguage || 'CS'}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playTick();
                          setEditingUid(profile.uid);
                        }}
                        className="ml-1.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-[var(--text-secondary)] border border-[var(--card-border)] shrink-0 cursor-pointer"
                      >
                        ✏️
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Profile Details Form */}
            <form id="profile-edit-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Name input */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.profileName} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t.profileNamePlaceholder}
                  className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg-hover)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-emerald)] transition"
                />
              </div>

              {/* Avatar Selector + AI Generator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t.avatar}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--accent-emerald)]">
                      {t.activeAvatarLabel}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[var(--card-bg-hover)] border border-[var(--card-border)] flex items-center justify-center overflow-hidden">
                      {renderAvatarContent(avatar, 'text-sm')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTick();
                    setIsAvatarModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-[var(--accent-emerald)]/50 bg-[var(--accent-emerald)]/10 hover:bg-[var(--accent-emerald)]/20 text-xs font-extrabold text-[var(--accent-emerald)] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01]"
                >
                  <span>✨ {t.generateAiAvatar}</span>
                </button>

                {isCustomSvgAvatar && (
                  <div className="p-3 bg-[var(--card-bg-hover)] border border-[var(--accent-emerald)]/40 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-[var(--accent-emerald)] overflow-hidden bg-black p-0.5">
                        <img src={avatar} alt="Custom AI Avatar" className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-[var(--text-primary)]">Custom AI Avatar active</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">Generated via Gemini AI</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAvatar('👨‍💻')}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-rose-400 font-medium underline cursor-pointer"
                    >
                      Emoji
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-8 gap-2 bg-[var(--card-bg-hover)] p-2.5 rounded-2xl border border-[var(--card-border)]">
                  {AVATAR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        soundEngine.playTick();
                        setAvatar(option);
                      }}
                      className={`h-10 w-full flex items-center justify-center rounded-xl text-lg transition cursor-pointer ${
                        avatar === option
                          ? 'bg-[var(--accent-emerald)] text-black font-extrabold shadow-md scale-110'
                          : 'hover:bg-white/10 text-[var(--text-primary)]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language & Theme Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t.preferredBaseLanguage}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          soundEngine.playTick();
                          setPreferredBaseLanguage(option.value);
                        }}
                        className={`rounded-xl border py-2 px-1 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          preferredBaseLanguage === option.value
                            ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)]/15 text-[var(--text-primary)] shadow-sm'
                            : 'border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-bg-hover)]'
                        }`}
                      >
                        <span>{option.flag}</span>
                        <span className="truncate">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t.theme}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          soundEngine.playTick();
                          setThemeValue(option.value);
                        }}
                        className={`rounded-xl border py-2 px-2 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          theme === option.value
                            ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)]/15 text-[var(--text-primary)] shadow-sm'
                            : 'border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-bg-hover)]'
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CEFR Level Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.startingLevel}
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {LEVEL_OPTIONS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        soundEngine.playTick();
                        setStartingLevel(level);
                      }}
                      className={`rounded-xl border py-2 text-xs font-extrabold transition cursor-pointer ${
                        startingLevel === level
                          ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] shadow-sm'
                          : 'border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-bg-hover)]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── 3. Bottom Sticky Action Bar (Vysoce kontrastní tlačítka) ── */}
        <div className="border-t border-[var(--card-border)] px-5 sm:px-7 py-3.5 bg-[var(--card-bg-hover)] flex items-center justify-between gap-3 shrink-0">
          <div>
            {!isCreatingNew && editingUid !== 'user_karel' && editingUid !== 'user_lucka' && (
              <button
                type="button"
                onClick={() => editingUid && handleDelete(editingUid)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
              >
                🗑️ {t.delete}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              form="profile-edit-form"
              className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              {isCreatingNew ? `+ ${t.create}` : `✓ ${t.save}`}
            </button>
          </div>
        </div>

      </div>

      <AvatarGeneratorModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        userName={name || 'Amigo'}
        onAvatarGenerated={(svgDataUri) => setAvatar(svgDataUri)}
      />
    </div>
  );
}