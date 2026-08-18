// src/components/TextbookModal.tsx
'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BookLessonDetail } from '@/lib/data/book-curriculum';
import { getProkopovaLessonData } from '@/lib/data/prokopova-book-data';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';
import { ttsEngine } from '@/lib/audio/tts';
import TextbookLiveModal from '@/components/TextbookLiveModal';
import { resolveAudioCandidateUrls } from '@/lib/audio/audio-urls';

interface TextbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  bookMeta: BookLessonDetail;
  userName?: string;
  userId?: string;
  userAvatar?: string;
}

type TabType = 'dialogues' | 'grammar' | 'vocab' | 'exercises';

type TrackItem = {
  file: string;
  code: string;
  description: string;
};

// Formátování času MM:SS
const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getItemText = (item: any): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return (
    item.sentence ||
    item.prompt ||
    item.text ||
    item.q ||
    item.question ||
    item.statement ||
    item.original ||
    item.present ||
    item.fact ||
    item.action ||
    item.phrase ||
    item.masculine ||
    item.feminine ||
    item.direct ||
    item.habitual ||
    item.item ||
    ''
  );
};

export default function TextbookModal({
  isOpen,
  onClose,
  dayNumber,
  bookMeta,
  userName = 'Karel',
  userId,
  userAvatar,
}: TextbookModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [activeTab, setActiveTab] = useState<TabType>('dialogues');

  const rawLesson = useMemo(
    () => (bookMeta ? (getProkopovaLessonData(bookMeta.lessonNumber) as any) : null),
    [bookMeta]
  );

  const resolveAudioFile = (trackId: string) => {
    const match1 = trackId?.match(/oddil_1_track_(\d+)/);
    if (match1) return `1_${match1[1].padStart(2, '0')}.mp3`;
    const match2 = trackId?.match(/oddil_2_track_(\d+)/);
    if (match2) return `2_${match2[1].padStart(2, '0')}.mp3`;
    return trackId?.endsWith('.mp3') ? trackId : `${trackId}.mp3`;
  };

  const tracksList = useMemo<TrackItem[]>(() => {
    if (rawLesson?.audio_tracks && Array.isArray(rawLesson.audio_tracks) && rawLesson.audio_tracks.length > 0) {
      return rawLesson.audio_tracks.map((tItem: any) => {
        const file = resolveAudioFile(tItem.id || tItem.track || tItem.file || '');
        const cleanName = file.replace(/\.mp3$/i, '');
        const fullDescription = tItem.description || tItem.title || tItem.type || cleanName;

        return {
          file,
          code: cleanName,
          description: fullDescription,
        };
      });
    }

    return (bookMeta?.audioTracks || []).map((tItem: any) => {
      const file = tItem.file;
      const cleanName = file ? file.replace(/\.mp3$/i, '') : tItem.label;
      return {
        file,
        code: cleanName,
        description: tItem.description || tItem.label || cleanName,
      };
    });
  }, [rawLesson, bookMeta]);

  const [activeTrackFile, setActiveTrackFile] = useState<string | null>(tracksList[0]?.file || null);
  const [activeTrackDesc, setActiveTrackDesc] = useState<string>(tracksList[0]?.description || '');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(false);

  const [vocabSearch, setVocabSearch] = useState('');
  const [revealedExercises, setRevealedExercises] = useState<Set<number>>(new Set());
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [copiedSentence, setCopiedSentence] = useState<string | null>(null);
  const [isLiveTutorOpen, setIsLiveTutorOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }, []);

  useEffect(() => {
    if (tracksList.length > 0) {
      setActiveTrackFile(tracksList[0].file);
      setActiveTrackDesc(tracksList[0].description || tracksList[0].code);
    }
    setCurrentTime(0);
    setVocabSearch('');
    setRevealedExercises(new Set());
    setUserAnswers({});
  }, [bookMeta?.lessonNumber]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleSpeak = (text?: string | null) => {
    if (!text || typeof text !== 'string' || !text.trim()) return;
    if (isPlayingAudio) stopAudio();
    ttsEngine.speak(text.trim());
  };

  const handleSelectTrack = useCallback((trackFile: string, description: string) => {
    soundEngine.playTick();
    if (activeTrackFile === trackFile && isPlayingAudio) {
      stopAudio();
      return;
    }

    setActiveTrackFile(trackFile);
    setActiveTrackDesc(description);
    setIsPlayingAudio(true);

    // Synchronizace s Lock Screenem
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: description || trackFile.replace(/\.mp3$/i, ''),
          artist: `Lekce ${bookMeta.lessonNumber}: ${bookMeta.title}`,
          album: 'Španělština pro samouky',
          artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch {}
    }

    if (audioRef.current) {
      const urls = resolveAudioCandidateUrls(trackFile);
      audioRef.current.src = urls[0];
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.loop = isLooping;
      audioRef.current.play().catch((err) => {
        console.warn('Playback failed for primary URL, trying fallback:', err);
        if (urls[1] && audioRef.current) {
          audioRef.current.src = urls[1];
          audioRef.current.play().catch(console.warn);
        }
      });
    }
  }, [activeTrackFile, isPlayingAudio, stopAudio, playbackRate, isLooping, bookMeta]);

  // Přeskočení na další / předchozí nahrávku
  const handleNextTrack = useCallback(() => {
    if (!activeTrackFile || tracksList.length === 0) return;
    const currentIndex = tracksList.findIndex((tItem) => tItem.file === activeTrackFile);
    const nextIndex = (currentIndex + 1) % tracksList.length;
    const nextTrack = tracksList[nextIndex];
    if (nextTrack) handleSelectTrack(nextTrack.file, nextTrack.description);
  }, [activeTrackFile, tracksList, handleSelectTrack]);

  const handlePrevTrack = useCallback(() => {
    if (!activeTrackFile || tracksList.length === 0) return;
    const currentIndex = tracksList.findIndex((tItem) => tItem.file === activeTrackFile);
    const prevIndex = (currentIndex - 1 + tracksList.length) % tracksList.length;
    const prevTrack = tracksList[prevIndex];
    if (prevTrack) handleSelectTrack(prevTrack.file, prevTrack.description);
  }, [activeTrackFile, tracksList, handleSelectTrack]);

  // Registrace MediaSession akcí pro zamčený displej
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(console.warn);
        setIsPlayingAudio(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        stopAudio();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
    } catch {}
  }, [handleNextTrack, handlePrevTrack, stopAudio]);

  const togglePlayPause = () => {
    soundEngine.playTick();
    if (!audioRef.current) return;

    if (isPlayingAudio) {
      stopAudio();
    } else {
      if (!audioRef.current.src && tracksList[0]) {
        handleSelectTrack(tracksList[0].file, tracksList[0].description);
        return;
      }
      audioRef.current.play().catch(console.warn);
      setIsPlayingAudio(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }
  };

  const skipSeconds = (seconds: number) => {
    soundEngine.playTick();
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    soundEngine.playTick();
    const rates = [0.8, 1.0, 1.2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const toggleLoop = () => {
    soundEngine.playTick();
    const next = !isLooping;
    setIsLooping(next);
    if (audioRef.current) audioRef.current.loop = next;
  };

  // Klávesové zkratky
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(5);
      } else if (e.key === 'n' || e.key === 'N') {
        handleNextTrack();
      } else if (e.key === 'p' || e.key === 'P') {
        handlePrevTrack();
      } else if (e.key === '1') setActiveTab('dialogues');
      else if (e.key === '2') setActiveTab('grammar');
      else if (e.key === '3') setActiveTab('vocab');
      else if (e.key === '4') setActiveTab('exercises');
      else if (e.key === 'Escape') {
        stopAudio();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlayingAudio, duration, onClose, stopAudio, handleNextTrack, handlePrevTrack]);

  const toggleExerciseReveal = (exNum: number) => {
    soundEngine.playTick();
    setRevealedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exNum)) next.delete(exNum);
      else next.add(exNum);
      return next;
    });
  };

  const handleCopySentence = (text: string) => {
    soundEngine.playTick();
    navigator.clipboard.writeText(text);
    setCopiedSentence(text);
    setTimeout(() => setCopiedSentence(null), 2000);
  };

  const filteredVocabulary = (rawLesson?.vocabulary || []).filter((w: any) => {
    if (!vocabSearch.trim()) return true;
    const q = vocabSearch.toLowerCase();
    return w.word?.toLowerCase().includes(q) || w.translation?.toLowerCase().includes(q);
  });

  const pageRange = rawLesson?.pages?.book_new_edition
    ? `str. ${rawLesson.pages.book_new_edition.start}–${rawLesson.pages.book_new_edition.end}`
    : bookMeta?.pages || '';

  if (!isOpen || !bookMeta) return null;

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in overflow-hidden">
        <div className="relative w-full max-w-4xl h-[94vh] sm:h-[90vh] bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl backdrop-blur-3xl flex flex-col overflow-hidden animate-scale-in">
          
          {/* ── 1. HORNÍ LIŠTA ── */}
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 sm:px-7 py-3.5 bg-[var(--card-bg-hover)] shrink-0 gap-2 sm:gap-3">
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0">📖</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-amber)] font-mono">
                    Lekce {rawLesson?.lesson_number || bookMeta.lessonNumber}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {pageRange}
                  </span>
                </div>
                <h2 className="text-xs sm:text-base font-extrabold text-[var(--text-primary)] truncate">
                  {rawLesson?.title_es || bookMeta.title}
                  <span className="text-xs font-normal text-[var(--text-secondary)] ml-2 hidden sm:inline">
                    ({rawLesson?.title_cs || bookMeta.spanishTitle})
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTick();
                  stopAudio();
                  setIsLiveTutorOpen(true);
                }}
                className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <span>🎙️</span>
                <span className="hidden sm:inline">{t.discussWithAi}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUntick();
                  stopAudio();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] transition flex items-center justify-center cursor-pointer shadow-sm ml-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── 2. AUDIO PŘEHRÁVAČ ── */}
          {tracksList.length > 0 && (
            <div className="px-4 sm:px-6 py-2.5 sm:py-3.5 bg-[var(--card-bg)] border-b border-[var(--card-border)] shrink-0 space-y-2">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrevTrack}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] hover:border-white/20 text-xs sm:text-sm font-bold flex items-center justify-center cursor-pointer transition text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      title={t.shadowPrevBtn}
                    >
                      ⏮️
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center transition cursor-pointer shrink-0 shadow-md ${
                        isPlayingAudio ? 'bg-[var(--accent-amber)] text-black' : 'bg-[var(--accent-cyan)] text-black'
                      }`}
                      title={isPlayingAudio ? t.shadowPauseBtn : t.shadowStartBtn}
                    >
                      {isPlayingAudio ? '⏸' : '▶'}
                    </button>

                    <button
                      type="button"
                      onClick={handleNextTrack}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] hover:border-white/20 text-xs sm:text-sm font-bold flex items-center justify-center cursor-pointer transition text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      title={t.shadowNextBtn}
                    >
                      ⏭️
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 pl-1">
                    <p className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] truncate">
                      {activeTrackDesc || activeTrackFile}
                    </p>
                    <span className="text-[10px] font-mono text-[var(--accent-cyan)] font-bold">
                      {activeTrackFile ? activeTrackFile.replace(/\.mp3$/i, '') : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 border-t sm:border-t-0 border-[var(--card-border)]/40 pt-1.5 sm:pt-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => skipSeconds(-5)}
                      className="px-2 py-1 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="-5s"
                    >
                      ⏪ -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => skipSeconds(5)}
                      className="px-2 py-1 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="+5s"
                    >
                      +5s ⏩
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={cyclePlaybackRate}
                      className="px-2 py-1 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[10px] font-mono font-bold text-[var(--accent-cyan)] cursor-pointer"
                    >
                      ⚡ {playbackRate.toFixed(1)}×
                    </button>
                    <button
                      type="button"
                      onClick={toggleLoop}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${
                        isLooping ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'border-[var(--card-border)] text-[var(--text-secondary)]'
                      }`}
                      title="Loop"
                    >
                      🔁
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold pl-1 shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const newTime = parseFloat(e.target.value);
                  setCurrentTime(newTime);
                  if (audioRef.current) audioRef.current.currentTime = newTime;
                }}
                className="w-full h-1.5 bg-[var(--card-border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-cyan)] transition"
              />

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
                {tracksList.map((tItem, idx) => {
                  const isSel = activeTrackFile === tItem.file;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectTrack(tItem.file, tItem.description)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer border shrink-0 flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)] shadow-sm'
                          : 'bg-[var(--card-bg-hover)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20'
                      }`}
                    >
                      <span>{isSel && isPlayingAudio ? '🔊' : '▶'}</span>
                      <span>{tItem.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 3. NAVIGAČNÍ ZÁLOŽKY ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] shrink-0 overflow-x-auto">
            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('dialogues'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dialogues'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>💬</span> {t.tabDialogues}
            </button>

            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('grammar'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'grammar'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>💡</span> {t.tabGrammar}
            </button>

            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('vocab'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vocab'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>📚</span> {t.tabVocab} ({rawLesson?.vocabulary?.length || 0})
            </button>

            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('exercises'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'exercises'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>🎯</span> {t.tabExercises} ({rawLesson?.exercises?.length || 0})
            </button>
          </div>

          {/* ── 4. TĚLO ZÁLOŽEK ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-5 sm:space-y-6 custom-scrollbar text-xs sm:text-sm">
            
            {/* TAB 1: TEXTY & DIALOGY */}
            {activeTab === 'dialogues' && (
              <div className="space-y-5 sm:space-y-6">
                {rawLesson?.texts && rawLesson.texts.length > 0 ? (
                  rawLesson.texts.map((sec: any, secIdx: number) => (
                    <div key={secIdx} className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] space-y-4">
                      {sec.section_title && (
                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-2">
                          <h3 className="font-extrabold text-sm text-[var(--accent-cyan)] flex items-center gap-2">
                            <span>📄</span> {sec.section_title}
                          </h3>
                          {sec.author && (
                            <span className="text-[11px] font-mono text-[var(--accent-amber)]">
                              {sec.author}
                            </span>
                          )}
                        </div>
                      )}

                      {sec.paragraphs && Array.isArray(sec.paragraphs) && (
                        <div className="space-y-3">
                          {sec.paragraphs.map((p: any, pIdx: number) => {
                            const pText = p.text || p.content;
                            return (
                              <div key={pIdx} className="p-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-2">
                                {p.title && <h4 className="text-xs font-bold text-[var(--accent-amber)]">{p.title}</h4>}
                                {pText && (
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                                      {pText}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleSpeak(pText)}
                                      className="p-1.5 rounded-lg bg-[var(--card-bg-hover)] hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)] text-xs shrink-0 cursor-pointer"
                                      title={t.listenPronunciation}
                                    >
                                      🔊
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {sec.lines && Array.isArray(sec.lines) && (
                        <div className="space-y-2.5">
                          {sec.lines.map((line: any, lIdx: number) => (
                            <div
                              key={lIdx}
                              className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent-cyan)]/40 transition flex items-start justify-between gap-3"
                            >
                              <div className="space-y-1 flex-1">
                                {line.speaker && (
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-amber)] font-mono block">
                                    {line.speaker}:
                                  </span>
                                )}
                                <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed">
                                  {line.text}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleSpeak(line.text)}
                                  className="p-1.5 rounded-lg bg-[var(--card-bg-hover)] hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)] text-xs cursor-pointer"
                                  title={t.listenPronunciation}
                                >
                                  🔊
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopySentence(line.text)}
                                  className="p-1.5 px-2 rounded-lg bg-[var(--card-bg-hover)] hover:bg-emerald-500/20 text-[var(--text-secondary)] hover:text-emerald-400 border border-[var(--card-border)] text-[10px] font-bold font-mono cursor-pointer"
                                  title={t.copyToAnki}
                                >
                                  {copiedSentence === line.text ? t.copiedCheck : t.copyToAnki}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {sec.scenes && Array.isArray(sec.scenes) && (
                        <div className="space-y-4">
                          {sec.scenes.map((scene: any, sIdx: number) => (
                            <div key={sIdx} className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
                              {scene.title && (
                                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--accent-cyan)] font-mono border-b border-[var(--card-border)] pb-1.5">
                                  {scene.title}
                                </h4>
                              )}
                              <div className="space-y-2">
                                {scene.lines?.map((sLine: any, slIdx: number) => (
                                  <div key={slIdx} className="text-xs flex items-start justify-between gap-2">
                                    <div>
                                      {sLine.speaker && <strong className="text-[var(--accent-amber)] font-mono mr-1.5">{sLine.speaker}:</strong>}
                                      <span className="font-semibold text-[var(--text-primary)]">{sLine.text}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSpeak(sLine.text)}
                                      className="text-xs text-[var(--text-muted)] hover:text-white shrink-0 cursor-pointer"
                                    >
                                      🔊
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--card-bg-hover)] rounded-2xl">
                    Text lekce načten z knihy.
                  </div>
                )}

                {rawLesson?.cultural_and_linguistic_notes && rawLesson.cultural_and_linguistic_notes.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/30 space-y-3">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[var(--accent-amber)] font-mono flex items-center gap-1.5">
                      <span>💡</span> {t.culturalNotesTitle}
                    </h4>
                    <div className="space-y-2">
                      {rawLesson.cultural_and_linguistic_notes.map((note: any) => (
                        <p key={note.id} className="text-xs text-[var(--text-primary)] leading-relaxed">
                          <strong className="text-[var(--accent-amber)]">[{note.id}] </strong>
                          {note.text}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GRAMATIKA */}
            {activeTab === 'grammar' && (
              <div className="space-y-4">
                {rawLesson?.grammar && rawLesson.grammar.length > 0 ? (
                  rawLesson.grammar.map((g: any, gIdx: number) => {
                    const c = g.content || {};

                    return (
                      <div key={gIdx} className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] space-y-3">
                        <div className="flex items-center gap-2">
                          {g.roman_numeral && (
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                              {g.roman_numeral}
                            </span>
                          )}
                          <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">
                            {g.title || g.topic_box || g.topic}
                          </h4>
                        </div>

                        {(c.rule || c.explanation || c.definition || g.explanation) && (
                          <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-relaxed bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--card-border)]">
                            {c.rule || c.explanation || c.definition || g.explanation}
                          </p>
                        )}

                        {c.vowel_classification && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs">
                              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">{t.strongVowels}</span>
                              <div className="flex gap-1.5 pt-1">
                                {c.vowel_classification.strong?.map((v: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono">{v}</span>
                                ))}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs">
                              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">{t.weakVowels}</span>
                              <div className="flex gap-1.5 pt-1">
                                {c.vowel_classification.weak?.map((v: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold font-mono">{v}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {c.rules && Array.isArray(c.rules) && (
                          <div className="space-y-2">
                            {c.rules.map((rItem: any, rIdx: number) => (
                              <div key={rIdx} className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1.5">
                                {rItem.category && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-amber)] font-mono block">
                                    {rItem.category}
                                  </span>
                                )}
                                <p className="text-xs font-medium text-[var(--text-primary)] leading-relaxed">
                                  {typeof rItem === 'string' ? rItem : rItem.rule || rItem.explanation}
                                </p>
                                {rItem.examples && Array.isArray(rItem.examples) && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {rItem.examples.map((ex: any, exIdx: number) => (
                                      <span key={exIdx} className="px-2 py-0.5 rounded-md bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] font-mono text-xs font-bold">
                                        {typeof ex === 'string'
                                          ? ex
                                          : `${ex.es || ex.word || ex.m || ''} ${ex.f ? '– ' + ex.f : ''} ${ex.cs || ex.meaning ? '(' + (ex.cs || ex.meaning) + ')' : ''}`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {c.examples && Array.isArray(c.examples) && (
                          <div className="space-y-1.5 pt-1">
                            {c.examples.map((exItem: any, exIdx: number) => {
                              if (typeof exItem === 'string') {
                                return (
                                  <div key={exIdx} className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--accent-cyan)]">
                                    {exItem}
                                  </div>
                                );
                              }

                              const leftText = exItem.es || exItem.statement || exItem.affirmative || exItem.before || exItem.phrase || exItem.base || '';
                              const rightText = exItem.cs || exItem.statement_cs || exItem.affirmative_cs || exItem.cs_with || exItem.note || '';
                              const extraLeft = exItem.question || exItem.negative || exItem.after || '';
                              const extraRight = exItem.question_cs || exItem.negative_cs || '';

                              return (
                                <div key={exIdx} className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-[var(--text-primary)]">{leftText}</span>
                                    {rightText && <span className="text-[var(--text-secondary)] italic">{rightText}</span>}
                                  </div>
                                  {extraLeft && (
                                    <div className="flex items-center justify-between gap-2 border-t border-[var(--card-border)] pt-1 text-[var(--accent-amber)]">
                                      <span className="font-bold font-mono">{extraLeft}</span>
                                      {extraRight && <span className="italic text-xs">{extraRight}</span>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(c.pairs || c.contrast_examples) && Array.isArray(c.pairs || c.contrast_examples) && (
                          <div className="space-y-1.5 pt-1">
                            {(c.pairs || c.contrast_examples).map((pair: any, pIdx: number) => (
                              <div key={pIdx} className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs flex items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-[var(--accent-cyan)]">{pair.before || pair.present || pair.ser?.es}</span>
                                  <span className="text-[var(--text-muted)] mx-2">➔</span>
                                  <span className="font-bold text-[var(--accent-amber)]">{pair.after || pair.past || pair.estar?.es}</span>
                                </div>
                                <span className="text-[var(--text-secondary)] italic">{pair.cs || pair.ser?.cs || pair.estar?.cs}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {c.conjugation && Array.isArray(c.conjugation) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                            {c.conjugation.map((cItem: any, cIdx: number) => (
                              <div key={cIdx} className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs">
                                <span className="text-[10px] text-[var(--text-muted)] font-mono block">{cItem.person}</span>
                                <strong className="text-[var(--accent-cyan)] font-bold text-sm">{cItem.form}</strong>
                                {cItem.cs && <span className="text-[11px] text-[var(--text-secondary)] block italic">{cItem.cs}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {g.summary_table && Array.isArray(g.summary_table) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {g.summary_table.map((sItem: any, sIdx: number) => (
                              <div key={sIdx} className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs flex items-center justify-between">
                                <strong className="text-[var(--accent-cyan)]">{sItem.es}</strong>
                                <span className="text-[var(--text-secondary)] italic">{sItem.cs}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] space-y-2">
                    <p className="text-xs text-[var(--text-secondary)]">{bookMeta.keyRuleTip}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SLOVNÍČEK */}
            {activeTab === 'vocab' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--text-primary)]">
                      {t.tabVocab} ({rawLesson?.vocabulary?.length || 0})
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">{t.listenPronunciation}</p>
                  </div>

                  <input
                    type="text"
                    placeholder={t.searchWordPlaceholder}
                    value={vocabSearch}
                    onChange={(e) => setVocabSearch(e.target.value)}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-cyan)] transition w-full sm:w-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredVocabulary.map((w: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] flex items-center justify-between gap-2 hover:border-[var(--accent-cyan)]/40 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[var(--text-primary)] truncate">
                            {w.word}
                          </span>
                          {w.gender && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)]">
                              {w.gender}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {w.translation}
                        </p>
                        {w.notes && (
                          <p className="text-[10px] text-[var(--accent-amber)] italic truncate mt-0.5">
                            {w.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSpeak(w.word)}
                        className="p-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)] text-xs shrink-0 cursor-pointer"
                        title={t.listenPronunciation}
                      >
                        🔊
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CVIČENÍ */}
            {activeTab === 'exercises' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border-l-4 border-l-rose-500 bg-rose-500/10 border-y border-r border-rose-500/30 space-y-1 shadow-sm">
                  <div className="text-xs font-black text-[var(--accent-rose)] flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <span>⛔</span> {t.lessonRecommendation}
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-relaxed">
                    {bookMeta.whatToSkip}
                  </p>
                </div>

                {rawLesson?.exercises?.map((ex: any) => {
                  const isRevealed = revealedExercises.has(ex.number);
                  return (
                    <div
                      key={ex.number}
                      className="p-4 sm:p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)]">
                          {t.tabExercises} {ex.number}
                        </span>

                        {ex.has_key && (
                          <button
                            type="button"
                            onClick={() => toggleExerciseReveal(ex.number)}
                            className="px-3 py-1 rounded-lg bg-[var(--card-bg)] hover:bg-white/10 border border-[var(--card-border)] text-xs font-bold text-[var(--accent-cyan)] transition cursor-pointer"
                          >
                            {isRevealed ? t.hideAnswerKey : t.showAnswerKey}
                          </button>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-relaxed">
                        {ex.title || ex.instruction}
                      </p>

                      {ex.sample && (
                        <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-mono text-[var(--accent-amber)]">
                          {typeof ex.sample === 'string'
                            ? ex.sample
                            : `${ex.sample.prompt || ex.sample.question || ''} ➔ ${ex.sample.response || ex.sample.answer || ''}`}
                        </div>
                      )}

                      {/* Položky cvičení */}
                      {ex.items && Array.isArray(ex.items) && (
                        <div className="space-y-2 pt-1">
                          {ex.items.map((item: any, iIdx: number) => {
                            const itemText = getItemText(item);
                            const answerKey = `${ex.number}_${iIdx}`;
                            const isCorrect =
                              isRevealed &&
                              item.answer &&
                              userAnswers[answerKey]?.trim().toLowerCase() === item.answer.trim().toLowerCase();

                            return (
                              <div
                                key={iIdx}
                                className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-[var(--text-primary)]">{itemText || '—'}</span>
                                  {itemText && (
                                    <button
                                      type="button"
                                      onClick={() => handleSpeak(itemText)}
                                      className="text-xs text-[var(--text-muted)] hover:text-white cursor-pointer"
                                      title={t.listenPronunciation}
                                    >
                                      🔊
                                    </button>
                                  )}
                                </div>

                                {item.answer && (
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                                    <input
                                      type="text"
                                      placeholder={t.typeAnswerPlaceholder}
                                      value={userAnswers[answerKey] || ''}
                                      onChange={(e) => setUserAnswers({ ...userAnswers, [answerKey]: e.target.value })}
                                      className={`px-3 py-1.5 rounded-lg bg-[var(--card-bg-hover)] border text-xs outline-none flex-1 transition ${
                                        isRevealed
                                          ? isCorrect
                                            ? 'border-emerald-500 text-emerald-400'
                                            : 'border-rose-500/50 text-rose-300'
                                          : 'border-[var(--card-border)] text-[var(--text-primary)]'
                                      }`}
                                    />
                                    {isRevealed && (
                                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0 text-center">
                                        {t.answerKeyLabel} {item.answer}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* ── 5. SPODNÍ LIŠTA ── */}
          <div className="border-t border-[var(--card-border)] px-4 sm:px-7 py-3 bg-[var(--card-bg-hover)] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[var(--text-muted)] font-mono hidden sm:inline">
              {pageRange} • {bookMeta.title}
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTick();
                stopAudio();
                onClose();
              }}
              className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md hover:scale-105 active:scale-95 ml-auto sm:ml-0"
            >
              {t.closeReader}
            </button>
          </div>

        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={() => {
          if (isLooping) {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(console.warn);
            }
          } else {
            const currentIndex = tracksList.findIndex((tItem) => tItem.file === activeTrackFile);
            if (currentIndex !== -1 && currentIndex + 1 < tracksList.length) {
              handleNextTrack();
            } else {
              setIsPlayingAudio(false);
            }
          }
        }}
        className="hidden"
      />

      {isLiveTutorOpen && (
        <TextbookLiveModal
          isOpen={isLiveTutorOpen}
          onClose={() => setIsLiveTutorOpen(false)}
          bookMeta={bookMeta}
          userName={userName}
          userId={userId}
          userAvatar={userAvatar}
        />
      )}
    </>
  );
}