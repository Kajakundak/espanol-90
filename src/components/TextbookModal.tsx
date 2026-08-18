'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BookLessonDetail } from '@/lib/data/book-curriculum';
import { getProkopovaLessonData } from '@/lib/data/prokopova-book-data';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';
import { ttsEngine } from '@/lib/audio/tts';
import TextbookLiveModal from '@/components/TextbookLiveModal';

interface TextbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  bookMeta: BookLessonDetail;
  userName?: string;
  userId?: string;
}

type TabType = 'dialogues' | 'grammar' | 'vocab' | 'exercises';

// Formátování času MM:SS
const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Pomocná funkce pro bezpečné vytažení textu položky cvičení z libovolného formátu v JSONu
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
}: TextbookModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('dialogues');

  // Načtení dat z JSONu podle čísla lekce
  const rawLesson = useMemo(
    () => getProkopovaLessonData(bookMeta.lessonNumber) as any,
    [bookMeta.lessonNumber]
  );

  // Převod ID stopy (oddil_1_track_07) na reálný soubor (1_07.mp3)
  const resolveAudioFile = (trackId: string) => {
    const match1 = trackId?.match(/oddil_1_track_(\d+)/);
    if (match1) return `1_${match1[1].padStart(2, '0')}.mp3`;
    const match2 = trackId?.match(/oddil_2_track_(\d+)/);
    if (match2) return `2_${match2[1].padStart(2, '0')}.mp3`;
    return trackId?.endsWith('.mp3') ? trackId : `${trackId}.mp3`;
  };

  // Seznam stop pro přehrávač
  const tracksList = useMemo(() => {
    if (rawLesson?.audio_tracks && Array.isArray(rawLesson.audio_tracks) && rawLesson.audio_tracks.length > 0) {
      return rawLesson.audio_tracks.map((tItem: any) => ({
        file: resolveAudioFile(tItem.id || tItem.track || ''),
        code: tItem.code || tItem.name || '',
        description: tItem.description || tItem.type || '',
      }));
    }
    return (bookMeta.audioTracks || []).map((tItem) => ({
      file: tItem.file,
      code: tItem.label,
      description: tItem.label,
    }));
  }, [rawLesson, bookMeta]);

  // Audio Player State
  const [activeTrackFile, setActiveTrackFile] = useState<string | null>(tracksList[0]?.file || null);
  const [activeTrackDesc, setActiveTrackDesc] = useState<string>(tracksList[0]?.description || '');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(false);

  // Další stavy
  const [vocabSearch, setVocabSearch] = useState('');
  const [revealedExercises, setRevealedExercises] = useState<Set<number>>(new Set());
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [copiedSentence, setCopiedSentence] = useState<string | null>(null);
  const [isLiveTutorOpen, setIsLiveTutorOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bezpečné zastavení přehrávání
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(false);
  }, []);

  // Reset a vyčištění při změně lekce
  useEffect(() => {
    if (tracksList.length > 0) {
      setActiveTrackFile(tracksList[0].file);
      setActiveTrackDesc(tracksList[0].description || tracksList[0].code);
    }
    setCurrentTime(0);
    stopAudio();
    setVocabSearch('');
    setRevealedExercises(new Set());
    setUserAnswers({});
  }, [bookMeta.lessonNumber, tracksList, stopAudio]);

  // Vyčištění při unmountu
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Bezpečné volání TTS (zastaví MP3 a ověří neprázdnost textu)
  const handleSpeak = (text?: string | null) => {
    if (!text || typeof text !== 'string' || !text.trim()) return;
    if (isPlayingAudio) stopAudio();
    ttsEngine.speak(text.trim());
  };

  const handleSelectTrack = (trackFile: string, description: string) => {
    soundEngine.playTick();
    if (activeTrackFile === trackFile && isPlayingAudio) {
      stopAudio();
      return;
    }

    setActiveTrackFile(trackFile);
    setActiveTrackDesc(description);
    setIsPlayingAudio(true);

    if (audioRef.current) {
      audioRef.current.src = `/mp3/${trackFile}`;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.loop = isLooping;
      audioRef.current.play().catch(console.warn);
    }
  };

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

  // Klávesové zkratky (Mezerník = Play/Pause, Šipky = skok, 1-4 = taby, Esc = zavřít)
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
  }, [isOpen, isPlayingAudio, duration, onClose, stopAudio]);

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
    : bookMeta.pages;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in overflow-hidden">
        <div className="relative w-full max-w-4xl h-[96vh] sm:h-[92vh] bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-scale-in">
          
          {/* ── 1. HORNÍ LIŠTA ── */}
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 sm:px-7 py-3.5 bg-[var(--card-bg-hover)] shrink-0 gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <span className="text-2xl shrink-0">📖</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-amber)] font-mono">
                    Lekce {rawLesson?.lesson_number || bookMeta.lessonNumber}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {pageRange}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate">
                  {rawLesson?.title_es || bookMeta.title}
                  <span className="text-xs font-normal text-[var(--text-secondary)] ml-2 hidden sm:inline">
                    ({rawLesson?.title_cs || bookMeta.spanishTitle})
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTick();
                  stopAudio();
                  setIsLiveTutorOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 hover:scale-105 active:scale-95"
              >
                <span>🎙️</span>
                <span className="hidden sm:inline">Probrat s AI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUntick();
                  stopAudio();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] transition flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── 2. AUDIO PŘEHRÁVAČ ── */}
          {tracksList.length > 0 && (
            <div className="px-5 py-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer shrink-0 shadow-sm ${
                      isPlayingAudio ? 'bg-[var(--accent-amber)] text-black' : 'bg-[var(--accent-cyan)] text-black'
                    }`}
                  >
                    {isPlayingAudio ? '⏸' : '▶'}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[var(--text-primary)] truncate">
                      {activeTrackDesc || activeTrackFile}
                    </p>
                    <span className="text-[10px] font-mono text-[var(--accent-cyan)] font-bold">
                      {activeTrackFile}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => skipSeconds(-5)}
                    className="p-1.5 px-2 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    title="Zpět o 5 sekund (Šipka vlevo)"
                  >
                    ⏪ -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => skipSeconds(5)}
                    className="p-1.5 px-2 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    title="Vpřed o 5 sekund (Šipka vpravo)"
                  >
                    +5s ⏩
                  </button>
                  <button
                    type="button"
                    onClick={cyclePlaybackRate}
                    className="p-1.5 px-2 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[10px] font-mono font-bold text-[var(--accent-cyan)] cursor-pointer"
                  >
                    ⚡ {playbackRate.toFixed(1)}×
                  </button>
                  <button
                    type="button"
                    onClick={toggleLoop}
                    className={`p-1.5 px-2 rounded-lg border text-[10px] font-bold cursor-pointer ${
                      isLooping ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'border-[var(--card-border)] text-[var(--text-secondary)]'
                    }`}
                    title="Opakovat stopu ve smyčce"
                  >
                    🔁
                  </button>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold pl-1">
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
                {tracksList.map((tItem: any, idx: number) => {
                  const isSel = activeTrackFile === tItem.file;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectTrack(tItem.file, tItem.description)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition cursor-pointer border shrink-0 ${
                        isSel
                          ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                          : 'bg-[var(--card-bg-hover)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isSel && isPlayingAudio ? '🔊' : '▶'} {tItem.code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 3. NAVIGAČNÍ ZÁLOŽKY ── */}
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] shrink-0 overflow-x-auto">
            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('dialogues'); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dialogues'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>💬</span> Texty & Dialogy [1]
            </button>

            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('grammar'); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'grammar'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>💡</span> Gramatika [2]
            </button>

            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('vocab'); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vocab'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>📚</span> Slovníček ({rawLesson?.vocabulary?.length || 0}) [3]
            </button>

            <button
              onClick={() => { soundEngine.playTick(); setActiveTab('exercises'); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'exercises'
                  ? 'bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>🎯</span> Cvičení ({rawLesson?.exercises?.length || 0}) [4]
            </button>
          </div>

          {/* ── 4. TĚLO ZÁLOŽKY ── */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar text-xs sm:text-sm">
            
            {/* 💬 TAB 1: TEXTY & DIALOGY */}
            {activeTab === 'dialogues' && (
              <div className="space-y-6">
                {rawLesson?.texts && rawLesson.texts.length > 0 ? (
                  rawLesson.texts.map((sec: any, secIdx: number) => (
                    <div key={secIdx} className="p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] space-y-4">
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

                      {/* Odstavce */}
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

                      {/* Repliky v dialogu */}
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
                                  title="Poslech"
                                >
                                  🔊
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopySentence(line.text)}
                                  className="p-1.5 px-2 rounded-lg bg-[var(--card-bg-hover)] hover:bg-emerald-500/20 text-[var(--text-secondary)] hover:text-emerald-400 border border-[var(--card-border)] text-[10px] font-bold font-mono cursor-pointer"
                                  title="Zkopírovat pro Anki"
                                >
                                  {copiedSentence === line.text ? '✓' : '+ Anki'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Scény */}
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

                {/* Poznámky k lekci */}
                {rawLesson?.cultural_and_linguistic_notes && rawLesson.cultural_and_linguistic_notes.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/30 space-y-3">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[var(--accent-amber)] font-mono flex items-center gap-1.5">
                      <span>💡</span> Jazykové a kulturní poznámky:
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

            {/* 💡 TAB 2: GRAMATIKA (OPRAVENO: UNIVERZÁLNÍ VYKRESLOVÁNÍ) */}
            {activeTab === 'grammar' && (
              <div className="space-y-4">
                {rawLesson?.grammar && rawLesson.grammar.length > 0 ? (
                  rawLesson.grammar.map((g: any, gIdx: number) => {
                    const c = g.content || {};

                    return (
                      <div key={gIdx} className="p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] space-y-3">
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

                        {/* 1. Výklad / Definice / Jednotlivé pravidlo */}
                        {(c.rule || c.explanation || c.definition || g.explanation) && (
                          <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-relaxed bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--card-border)]">
                            {c.rule || c.explanation || c.definition || g.explanation}
                          </p>
                        )}

                        {/* 2. Klasifikace samohlásek (Lekce 1 apod.) */}
                        {c.vowel_classification && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs">
                              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">Silné samohlásky:</span>
                              <div className="flex gap-1.5 pt-1">
                                {c.vowel_classification.strong?.map((v: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono">{v}</span>
                                ))}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs">
                              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">Slabé samohlásky:</span>
                              <div className="flex gap-1.5 pt-1">
                                {c.vowel_classification.weak?.map((v: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold font-mono">{v}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. Seznam pravidel v poli rules */}
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

                        {/* 4. Příklady s překlady (c.examples) */}
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

                        {/* 5. Kontrastní dvojice (pairs, contrast_examples) */}
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

                        {/* 6. Časování sloves */}
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

                        {/* 7. Souhrnné tabulky */}
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

            {/* 📚 TAB 3: SLOVNÍČEK */}
            {activeTab === 'vocab' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-[var(--text-primary)]">
                      Slovní zásoba lekce ({rawLesson?.vocabulary?.length || 0} slov)
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">Kliknutím na 🔊 si poslechneš výslovnost</p>
                  </div>

                  <input
                    type="text"
                    placeholder="Hledat slovo nebo překlad..."
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
                      >
                        🔊
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🎯 TAB 4: CVIČENÍ & INTERAKTIVITA */}
            {activeTab === 'exercises' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border-l-4 border-l-rose-500 bg-rose-500/10 border-y border-r border-rose-500/30 space-y-1 shadow-sm">
                  <div className="text-xs font-black text-[var(--accent-rose)] flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <span>⛔</span> Doporučení k lekci:
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
                      className="p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)]">
                          Cvičení {ex.number}
                        </span>

                        {ex.has_key && (
                          <button
                            type="button"
                            onClick={() => toggleExerciseReveal(ex.number)}
                            className="px-3 py-1 rounded-lg bg-[var(--card-bg)] hover:bg-white/10 border border-[var(--card-border)] text-xs font-bold text-[var(--accent-cyan)] transition cursor-pointer"
                          >
                            {isRevealed ? 'Skrýt klíč' : '👁️ Zobrazit správné řešení'}
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
                                      title="Přehrát"
                                    >
                                      🔊
                                    </button>
                                  )}
                                </div>

                                {item.answer && (
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                                    <input
                                      type="text"
                                      placeholder="Napiš svou odpověď..."
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
                                        Klíč: {item.answer}
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
          <div className="border-t border-[var(--card-border)] px-5 sm:px-7 py-3 bg-[var(--card-bg-hover)] flex items-center justify-between shrink-0">
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
              ✓ Zavřít čtečku [Esc]
            </button>
          </div>

        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={() => { if (!isLooping) setIsPlayingAudio(false); }}
        className="hidden"
      />

      {isLiveTutorOpen && (
        <TextbookLiveModal
          isOpen={isLiveTutorOpen}
          onClose={() => setIsLiveTutorOpen(false)}
          bookMeta={bookMeta}
          userName={userName}
          userId={userId}
        />
      )}
    </>
  );
}