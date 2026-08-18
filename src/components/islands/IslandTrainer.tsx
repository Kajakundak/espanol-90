// src/components/islands/IslandTrainer.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { IslandCategory, IslandSentence, getLocalizedIslandTitle } from '@/lib/data/islands-parser';
import { soundEngine } from '@/lib/audio/sound-engine';
import { addPointsToUser, getIslandProgressSnapshot, saveIslandProgressSnapshot, saveIslandProgressToFirestore } from '@/lib/firebase/db';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { ShadowAudioEngine, ShadowSentenceItem } from '@/lib/audio/shadow-audio-engine';
import IslandRecallSession from '@/components/islands/IslandRecallSession';

interface IslandTrainerProps {
  userId: string;
  category: IslandCategory;
  onClose: () => void;
}

export default function IslandTrainer({ userId, category, onClose }: IslandTrainerProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [mode, setMode] = useState<'shadowing' | 'active_recall'>('shadowing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRep, setCurrentRep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'spanish' | 'translation' | 'silence'>('spanish');

  // Kapesní režim (Ztmavení + Screen WakeLock)
  const [pocketMode, setPocketMode] = useState(false);
  const wakeLockRef = useRef<any>(null);

  const [showTranslation, setShowTranslation] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [sentences, setSentences] = useState<IslandSentence[]>(category.sentences);

  const [pauseDuration, setPauseDuration] = useState<number>(2.5);
  const [repetitions, setRepetitions] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);

  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [practicedIds, setPracticedIds] = useState<Set<string>>(new Set());
  const [totalReps, setTotalReps] = useState<number>(0);
  const [stars, setStars] = useState<Record<string, number>>({});

  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ShadowAudioEngine | null>(null);

  const localizedCategoryTitle = getLocalizedIslandTitle(category.categoryId, language);

  // ── Wake Lock pro udržení rozsvíceného displeje v kapse ──
  const requestWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (pocketMode || isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [pocketMode, isPlaying, requestWakeLock, releaseWakeLock]);

  const getSentenceTranslation = useCallback(
    (sentence: IslandSentence): string => {
      if (sentence.translations) {
        if (language === 'sk' && sentence.translations.sk) return sentence.translations.sk;
        if (language === 'en' && sentence.translations.en) return sentence.translations.en;
        if (sentence.translations.cs) return sentence.translations.cs;
      }
      return sentence.en || sentence.es;
    },
    [language]
  );

  const shadowItems = useMemo<ShadowSentenceItem[]>(() => {
    const langCode = language === 'sk' ? 'sk' : language === 'en' ? 'en' : 'cs';
    return sentences.map((sent) => ({
      id: sent.id,
      spanish: sent.questionEs ? `${sent.questionEs} ${sent.answerEs || ''}` : sent.es,
      translation: getSentenceTranslation(sent),
      langCode,
    }));
  }, [sentences, getSentenceTranslation, language]);

  useEffect(() => {
    const engine = new ShadowAudioEngine();
    engineRef.current = engine;
    engine.setSentences(shadowItems, currentIndex);
    engine.setConfig({ pauseDuration, repetitions, playbackRate: playbackSpeed, readTranslation: showTranslation });

    engine.subscribe((state) => {
      setCurrentIndex(state.currentIndex);
      setCurrentRep(state.currentRep);
      setIsPlaying(state.isPlaying);
      setCurrentPhase(state.phase);

      if (state.isPlaying && state.phase === 'spanish') {
        const item = shadowItems[state.currentIndex];
        if (item) {
          setPracticedIds((prev) => new Set(prev).add(item.id));
          setTotalReps((prev) => prev + 1);
        }
      }
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => { engineRef.current?.setSentences(shadowItems, currentIndex); }, [shadowItems, currentIndex]);
  useEffect(() => { engineRef.current?.setConfig({ pauseDuration, repetitions, playbackRate: playbackSpeed, readTranslation: showTranslation }); }, [pauseDuration, repetitions, playbackSpeed, showTranslation]);
  useEffect(() => { if (activeCardRef.current) activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [currentIndex]);

  useEffect(() => {
    const saved = getIslandProgressSnapshot(userId, category.categoryId);
    setMasteredIds(new Set(saved.masteredIds));
    setPracticedIds(new Set(saved.practicedIds));
    setTotalReps(saved.totalReps || 0);
    setStars(saved.stars || {});
  }, [userId, category.categoryId]);

  const handleTogglePlay = () => {
    soundEngine.playTick();
    if (isPlaying) engineRef.current?.pause();
    else engineRef.current?.start();
  };

  const toggleShuffle = () => {
    soundEngine.playTick();
    engineRef.current?.pause();
    if (!isShuffled) {
      setSentences([...category.sentences].sort(() => Math.random() - 0.5));
      setIsShuffled(true);
    } else {
      setSentences(category.sentences);
      setIsShuffled(false);
    }
    setCurrentIndex(0);
  };

  const handleGradeSentence = async (sentenceId: string, starCount: number) => {
    soundEngine.playTick();
    setStars((prev) => ({ ...prev, [sentenceId]: starCount }));
    if (starCount >= 4 && !masteredIds.has(sentenceId)) {
      const updated = new Set(masteredIds).add(sentenceId);
      setMasteredIds(updated);
      await addPointsToUser(userId, 5);
      await saveIslandProgressToFirestore(userId, category.categoryId, Array.from(updated), {
        practicedIds: Array.from(practicedIds),
        totalReps,
        stars: { ...stars, [sentenceId]: starCount }
      });
    }
  };

  return (
    // ── Responzivní plné pozadí přizpůsobené světlému i tmavému režimu ──
    <div className="fixed inset-0 z-[120] flex flex-col bg-[var(--card-bg)] text-[var(--text-primary)] animate-fade-in overflow-hidden">
      
      {/* ── KAPESNÍ REŽIM PROTI USNUTÍ IPHONE / ANDROIDU ── */}
      {pocketMode && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-between p-8 text-center animate-fade-in select-none">
          <div className="pt-6">
            <span className="text-4xl block mb-2">📱</span>
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-emerald-400 uppercase">
              {t.pocketModeTitle}
            </span>
          </div>

          <div className="space-y-4 max-w-sm">
            <p className="text-sm font-semibold text-slate-300">
              {t.pocketModeDesc}
            </p>
            <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-xs text-slate-300">
              <strong className="text-white">#{currentIndex + 1} / {sentences.length}</strong>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playTick();
              setPocketMode(false);
            }}
            className="w-full max-w-xs py-4 rounded-2xl bg-white text-slate-950 font-black text-sm transition cursor-pointer hover:bg-slate-200 active:scale-95 shadow-2xl"
          >
            {t.pocketModeExit}
          </button>
        </div>
      )}

      {/* ── 1. HORNÍ LIŠTA ── */}
      <header className="px-3 sm:px-8 py-3 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] flex items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-sm">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <button
            onClick={() => { engineRef.current?.pause(); onClose(); }}
            className="px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] shrink-0 cursor-pointer transition shadow-sm"
          >
            {t.back}
          </button>
          <h2 className="text-sm sm:text-base font-extrabold truncate flex items-center gap-1.5 text-[var(--text-primary)]">
            <span className="text-base sm:text-lg">{category.icon}</span>
            <span className="truncate">{localizedCategoryTitle}</span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* TLAČÍTKO KAPESNÍHO REŽIMU – POUZE NA MOBILU (sm:hidden) */}
          <button
            onClick={() => {
              soundEngine.playTick();
              setPocketMode(true);
              if (!isPlaying) engineRef.current?.start();
            }}
            className="sm:hidden p-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs font-bold transition cursor-pointer flex items-center gap-1 text-[var(--accent-emerald)] shadow-sm"
            title={t.pocketModeBtn}
          >
            <span>📱</span>
          </button>

          <button
            onClick={() => { soundEngine.playTick(); setShowSettings(!showSettings); }}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm ${
              showSettings
                ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]'
                : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)]'
            }`}
            title={t.settings}
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">{t.settings}</span>
          </button>
          
          <button
            onClick={() => {
              soundEngine.playTick();
              engineRef.current?.pause();
              setMode(mode === 'shadowing' ? 'active_recall' : 'shadowing');
            }}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-sm ${
              mode === 'active_recall'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)]'
            }`}
          >
            {mode === 'shadowing' ? t.shadowMode : t.recallMode}
          </button>
        </div>
      </header>

      {/* ── 2. NASTAVENÍ PAUZY A RYCHLOSTI ── */}
      {showSettings && (
        <div className="px-4 sm:px-8 py-3.5 bg-[var(--card-bg-hover)] border-b border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs shrink-0 animate-fadeIn shadow-inner">
          <div>
            <label className="block text-[var(--text-secondary)] font-semibold mb-1">
              ⏱️ {t.shadowPauseLabel} <strong className="text-[var(--accent-blue)]">{pauseDuration}s</strong>
            </label>
            <input type="range" min="1.0" max="6.0" step="0.5" value={pauseDuration} onChange={(e) => setPauseDuration(parseFloat(e.target.value))} className="w-full accent-[var(--accent-blue)] cursor-pointer" />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] font-semibold mb-1">
              🔁 {t.repCountLabel} <strong className="text-[var(--accent-blue)]">{repetitions}x</strong>
            </label>
            <input type="range" min="1" max="5" step="1" value={repetitions} onChange={(e) => setRepetitions(parseInt(e.target.value))} className="w-full accent-[var(--accent-blue)] cursor-pointer" />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] font-semibold mb-1">
              ⏩ {t.voiceSpeedLabel} <strong className="text-[var(--accent-blue)]">{playbackSpeed}x</strong>
            </label>
            <input type="range" min="0.7" max="1.3" step="0.1" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-full accent-[var(--accent-blue)] cursor-pointer" />
          </div>
        </div>
      )}

      {/* ── 3. HLAVNÍ SEZNAM VĚT ── */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-8 space-y-3 sm:space-y-4 pb-36 custom-scrollbar max-w-4xl w-full mx-auto">
        {isPlaying && (
          <div className={`sticky top-2 z-20 p-3.5 rounded-2xl border backdrop-blur-xl text-center flex items-center justify-center space-x-2 shadow-xl mb-3 sm:mb-4 transition-colors ${
            currentPhase === 'spanish'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-300'
              : currentPhase === 'translation'
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-300'
              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300 animate-pulse'
          }`}>
            <span className="font-extrabold text-xs sm:text-base">
              {currentPhase === 'spanish' ? t.shadowPhaseSpanish :
               currentPhase === 'translation' ? t.shadowPhaseTranslation :
               t.shadowPhaseSpeakNow}
            </span>
          </div>
        )}

        {sentences.map((sent, idx) => {
          const isActive = idx === currentIndex;
          const sentenceStars = stars[sent.id] || 0;
          return (
            <div
              key={sent.id}
              ref={isActive ? activeCardRef : null}
              onClick={() => { soundEngine.playTick(); engineRef.current?.selectIndex(idx); }}
              className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 border cursor-pointer flex flex-col gap-2.5 sm:gap-3 ${
                isActive
                  ? 'border-[var(--accent-emerald)] shadow-md ring-2 ring-[var(--accent-emerald)]/30 bg-[var(--accent-emerald)]/10'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:bg-[var(--card-bg-hover)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <span className="text-xs font-mono font-bold text-[var(--accent-blue)] px-2.5 py-1 rounded-lg bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                      {sent.questionEs ? `${sent.questionEs} ${sent.answerEs || ''}` : sent.es}
                    </p>
                    {showTranslation && (
                      <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] italic">
                        {getSentenceTranslation(sent)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); soundEngine.playTick(); engineRef.current?.playSingle(idx); }}
                  className="p-2 sm:p-2.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs sm:text-sm shrink-0 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 transition shadow-sm"
                  title={t.listenPronunciation}
                >
                  🔊
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-2 mt-0.5">
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleGradeSentence(sent.id, star); }}
                      className={`text-lg transition transform active:scale-75 cursor-pointer ${
                        star <= sentenceStars ? 'text-amber-400 font-bold' : 'text-[var(--text-muted)] hover:text-amber-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  {masteredIds.has(sent.id) && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                      ✓ {t.mastered}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  {category.difficulty || 'A1'}
                </span>
              </div>
            </div>
          );
        })}
      </main>

      {/* ── 4. PLOVOUCÍ PŘEHRÁVAČ DOLE (S JAZYKOVOU KOULÍ 🌐) ── */}
      <footer className="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 z-30 max-w-xl mx-auto p-2 sm:p-2.5 bg-[var(--card-bg)]/95 backdrop-blur-2xl border border-[var(--card-border)] rounded-2xl sm:rounded-3xl flex items-center justify-between gap-1.5 sm:gap-3 shadow-2xl">
        <button
          onClick={toggleShuffle}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-bold cursor-pointer shrink-0 transition shadow-sm ${
            isShuffled
              ? 'bg-purple-600 text-white border-purple-500 shadow-md'
              : 'bg-[var(--card-bg-hover)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          title={t.shadowShuffleBtn}
        >
          🔀
        </button>

        <button
          onClick={() => { soundEngine.playTick(); engineRef.current?.previous(); }}
          className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs sm:text-sm cursor-pointer shrink-0 text-[var(--text-primary)] hover:scale-105 transition shadow-sm"
          title={t.shadowPrevBtn}
        >
          ⏮️
        </button>

        <button
          onClick={handleTogglePlay}
          className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
            isPlaying ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
        >
          <span>{isPlaying ? t.shadowPauseBtn : t.shadowStartBtn}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/20 font-bold hidden sm:inline-block">
            #{currentIndex + 1}/{sentences.length}
          </span>
        </button>

        <button
          onClick={() => { soundEngine.playTick(); engineRef.current?.next(); }}
          className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs sm:text-sm cursor-pointer shrink-0 text-[var(--text-primary)] hover:scale-105 transition shadow-sm"
          title={t.shadowNextBtn}
        >
          ⏭️
        </button>

        {/* JAZYKOVÁ KOULE 🌐 */}
        <button
          onClick={() => { soundEngine.playTick(); setShowTranslation(!showTranslation); }}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-sm sm:text-base font-bold cursor-pointer shrink-0 transition flex items-center justify-center shadow-sm ${
            showTranslation
              ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400/40'
              : 'bg-[var(--card-bg-hover)] border-[var(--card-border)] text-[var(--text-muted)] opacity-60 hover:opacity-100'
          }`}
          title={showTranslation ? t.shadowTransOn : t.shadowTransOff}
        >
          🌐
        </button>
      </footer>

      {mode === 'active_recall' && <IslandRecallSession category={category} onClose={() => setMode('shadowing')} />}
    </div>
  );
}