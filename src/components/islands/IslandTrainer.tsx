'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { IslandCategory, IslandSentence, getLocalizedIslandTitle } from '@/lib/data/islands-parser';
import { soundEngine } from '@/lib/audio/sound-engine';
import { addPointsToUser, getIslandProgressSnapshot, saveIslandProgressSnapshot, saveIslandProgressToFirestore } from '@/lib/firebase/db';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import IslandRecallSession from '@/components/islands/IslandRecallSession';

interface IslandTrainerProps {
  userId: string;
  category: IslandCategory;
  onClose: () => void;
}

type TrainerMode = 'shadowing' | 'active_recall';
type StatsTimeframe = 'today' | 'all_time';

export default function IslandTrainer({ userId, category, onClose }: IslandTrainerProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [mode, setMode] = useState<TrainerMode>('shadowing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [sentences, setSentences] = useState<IslandSentence[]>(category.sentences);

  // Toggle shuffle state
  const toggleShuffle = () => {
    soundEngine.playTick();
    if (!isShuffled) {
      const shuffled = [...category.sentences].sort(() => Math.random() - 0.5);
      setSentences(shuffled);
      setIsShuffled(true);
    } else {
      setSentences(category.sentences);
      setIsShuffled(false);
    }
    setCurrentIndex(0);
  };

  // Settings & Looper Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [pauseDuration, setPauseDuration] = useState<number>(2.5);
  const [repetitions, setRepetitions] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);

  // Runtime State
  const [currentRep, setCurrentRep] = useState<number>(1);
  const [shadowingCountdown, setShadowingCountdown] = useState<number>(0);
  const [isShadowingPhase, setIsShadowingPhase] = useState<boolean>(false);

  // Active Recall & Voice Rec State
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<{
    isCorrect: boolean;
    accuracyScore: number;
    feedbackText: string;
    correctSpanish: string;
  } | null>(null);

  // Stats & Progress Persistence
  const [statsTimeframe, setStatsTimeframe] = useState<StatsTimeframe>('today');
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [practicedIds, setPracticedIds] = useState<Set<string>>(new Set());
  const [totalReps, setTotalReps] = useState<number>(0);
  const [stars, setStars] = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = getIslandProgressSnapshot(userId, category.categoryId);
    setMasteredIds(new Set(saved.masteredIds));
    setPracticedIds(new Set(saved.practicedIds));
    setTotalReps(saved.totalReps || 0);
    setStars(saved.stars || {});
  }, [userId, category.categoryId]);

  useEffect(() => {
    saveIslandProgressSnapshot(userId, category.categoryId, {
      masteredIds: Array.from(masteredIds),
      practicedIds: Array.from(practicedIds),
      totalReps,
      stars,
    });
  }, [userId, category.categoryId, masteredIds, practicedIds, totalReps, stars]);

  const currentSentence = sentences[currentIndex] || sentences[0];
  const totalSentences = category.sentences.length;
  const localizedCategoryTitle = getLocalizedIslandTitle(category.categoryId, language);

  // Refs
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const activeCardRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active sentence card into view
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Helper to get clean translation without prefixes
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

  // Speak AI Voice Prompt / Evaluation in User's selected language
  const speakUserLangPrompt = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !audioEnabled) {
        if (onEnd) onEnd();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      let targetLang = 'cs-CZ';
      if (language === 'sk') targetLang = 'sk-SK';
      if (language === 'en') targetLang = 'en-US';

      utterance.lang = targetLang;
      utterance.rate = playbackSpeed;

      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find((v) => v.lang.startsWith(targetLang.slice(0, 2)));
      if (targetVoice) utterance.voice = targetVoice;

      if (onEnd) {
        utterance.onend = () => onEnd();
        utterance.onerror = () => onEnd();
      }

      window.speechSynthesis.speak(utterance);
    },
    [audioEnabled, language, playbackSpeed]
  );

  // Trigger Voice Prompt when entering Active Recall mode or selecting a new sentence
  useEffect(() => {
    if (mode === 'active_recall' && currentSentence) {
      const translation = getSentenceTranslation(currentSentence);
      let promptText = '';
      if (language === 'sk') {
        promptText = `Prelož do španielčiny: ${translation}`;
      } else if (language === 'en') {
        promptText = `Translate to Spanish: ${translation}`;
      } else {
        promptText = `Přelož do španělštiny: ${translation}`;
      }
      speakUserLangPrompt(promptText);
    }
  }, [mode, currentIndex, currentSentence, language, getSentenceTranslation, speakUserLangPrompt]);

  // Trilingual TTS Player (Spanish -> Foreign Language if translation toggle is ON)
  const speakSentenceSequence = useCallback(
    (sentence: IslandSentence, onEnd: () => void) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !audioEnabled) {
        onEnd();
        return;
      }

      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();

      const esParts: string[] = [];
      if (sentence.questionEs) esParts.push(sentence.questionEs);
      if (sentence.answerEs) esParts.push(sentence.answerEs);
      if (esParts.length === 0) esParts.push(sentence.es);

      const speakEsPart = (index: number) => {
        if (index >= esParts.length) {
          if (showTranslation) {
            const translationText = getSentenceTranslation(sentence);
            speakUserLangPrompt(translationText, onEnd);
          } else {
            onEnd();
          }
          return;
        }

        const esUtterance = new SpeechSynthesisUtterance(esParts[index]);
        esUtterance.lang = 'es-ES';
        esUtterance.rate = playbackSpeed;
        const esVoice = voices.find((v) => v.lang.startsWith('es'));
        if (esVoice) esUtterance.voice = esVoice;

        esUtterance.onend = () => speakEsPart(index + 1);
        esUtterance.onerror = () => speakEsPart(index + 1);

        window.speechSynthesis.speak(esUtterance);
      };

      speakEsPart(0);
    },
    [audioEnabled, showTranslation, playbackSpeed, getSentenceTranslation, speakUserLangPrompt]
  );

  // Navigation
  const handleNext = useCallback(() => {
    clearAllTimers();
    setIsShadowingPhase(false);
    setAiEvaluation(null);
    setSpokenTranscript('');
    setCurrentRep(1);
    setCurrentIndex((prev) => (prev + 1 < totalSentences ? prev + 1 : 0));
  }, [totalSentences, clearAllTimers]);

  const handlePrev = useCallback(() => {
    clearAllTimers();
    setIsShadowingPhase(false);
    setAiEvaluation(null);
    setSpokenTranscript('');
    setCurrentRep(1);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalSentences - 1));
  }, [totalSentences, clearAllTimers]);

  // Shadowing Looper Execution
  const runShadowingLoop = useCallback(() => {
    if (!isPlaying) return;

    setPracticedIds((prev) => new Set(prev).add(currentSentence.id));
    setTotalReps((prev) => prev + 1);

    speakSentenceSequence(currentSentence, () => {
      setIsShadowingPhase(true);
      setShadowingCountdown(pauseDuration);

      const startTime = Date.now();
      const durationMs = pauseDuration * 1000;

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, pauseDuration - elapsed);
        setShadowingCountdown(remaining);
      }, 100);

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsShadowingPhase(false);

        setCurrentRep((prev) => {
          if (prev < repetitions) {
            timeoutRef.current = setTimeout(() => {
              runShadowingLoop();
            }, 200);
            return prev + 1;
          } else {
            soundEngine.playTick();
            timeoutRef.current = setTimeout(() => {
              handleNext();
            }, 300);
            return 1;
          }
        });
      }, durationMs);
    });
  }, [isPlaying, currentSentence, speakSentenceSequence, pauseDuration, repetitions, handleNext]);

  useEffect(() => {
    if (mode === 'shadowing' && isPlaying) {
      runShadowingLoop();
    } else {
      clearAllTimers();
      setIsShadowingPhase(false);
    }
    return () => clearAllTimers();
  }, [isPlaying, mode, currentIndex, runShadowingLoop, clearAllTimers]);

  // Web Speech Recognition for Active Recall
  const startVoiceRecording = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Váš prohlížeč nepodporuje rozpoznání řeči. Použijte Chrome nebo Safari.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setSpokenTranscript('');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSpokenTranscript(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Failed speech recognition:', e);
      setIsListening(false);
    }
  };

  const stopVoiceRecordingAndEvaluate = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setTimeout(() => {
      handleEvaluateSpeech();
    }, 400);
  };

  // Evaluate speech & talk back verbally to user
  const handleEvaluateSpeech = async () => {
    const textToEval = spokenTranscript.trim();
    if (!textToEval) return;

    setIsEvaluating(true);
    setPracticedIds((prev) => new Set(prev).add(currentSentence.id));
    setTotalReps((prev) => prev + 1);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      let evalResult = {
        isCorrect: false,
        accuracyScore: 70,
        feedbackText: '',
        correctSpanish: currentSentence.es,
      };

      if (!apiKey) {
        const isExact =
          textToEval.toLowerCase() === currentSentence.es.trim().toLowerCase();
        evalResult = {
          isCorrect: isExact,
          accuracyScore: isExact ? 100 : 75,
          feedbackText: isExact
            ? language === 'sk'
              ? 'Výborne! Vaša výslovnosť je presná.'
              : language === 'en'
              ? 'Excellent! Your pronunciation is accurate.'
              : 'Výborně! Vaše výslovnost je přesná.'
            : language === 'sk'
            ? `Povedali ste: "${textToEval}". Správny tvar je: "${currentSentence.es}".`
            : language === 'en'
            ? `You said: "${textToEval}". Target is: "${currentSentence.es}".`
            : `Řekli jste: "${textToEval}". Správný tvar je: "${currentSentence.es}".`,
          correctSpanish: currentSentence.es,
        };
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const evalLang = language === 'sk' ? 'Slovak' : language === 'en' ? 'English' : 'Czech';

        const prompt = `Target Spanish sentence: "${currentSentence.es}"
User spoken Spanish transcript: "${textToEval}"

Evaluate user performance. Respond ONLY in JSON with keys:
{
  "isCorrect": boolean,
  "accuracyScore": number (0-100),
  "feedbackText": "Concise feedback in ${evalLang} (1-2 sentences)"
}`;

        let responseText = '';
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-live-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json', temperature: 0.2 },
          });
          responseText = response.text || '';
        } catch {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json', temperature: 0.2 },
          });
          responseText = response.text || '';
        }

        const parsed = JSON.parse(responseText);
        evalResult = {
          isCorrect: Boolean(parsed.isCorrect),
          accuracyScore: Number(parsed.accuracyScore) || 80,
          feedbackText: String(parsed.feedbackText || 'Dobrá práce!'),
          correctSpanish: currentSentence.es,
        };
      }

      setAiEvaluation(evalResult);

      if (evalResult.isCorrect) {
        soundEngine.playTick();
      }

      // AI Voice Assistant talks back the evaluation result in user's main language!
      speakUserLangPrompt(evalResult.feedbackText);
    } catch (err) {
      console.error('Speech evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGradeSentence = async (sentenceId: string, starCount: number) => {
    soundEngine.playTick();
    setStars((prev) => ({ ...prev, [sentenceId]: starCount }));

    if (starCount >= 4 && !masteredIds.has(sentenceId)) {
      const updated = new Set(masteredIds);
      updated.add(sentenceId);
      setMasteredIds(updated);

      await addPointsToUser(userId, 5);
      await saveIslandProgressToFirestore(userId, category.categoryId, Array.from(updated), {
        practicedIds: Array.from(practicedIds),
        totalReps,
        stars: { ...stars, [sentenceId]: starCount },
      });

      if (updated.size === totalSentences) {
        soundEngine.playVictoryFanfare();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-2 sm:p-4 overflow-hidden animate-fade-in">
      <div className="relative w-full max-w-6xl h-[96vh] sm:h-[92vh] apple-glass bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex flex-row items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] gap-2 shrink-0 overflow-x-auto">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink-0">
            <button
              onClick={() => {
                clearAllTimers();
                onClose();
              }}
              className="p-1.5 px-2 sm:px-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-[var(--text-primary)] transition flex items-center space-x-1 text-xs font-bold cursor-pointer shrink-0 border border-[var(--card-border)] min-h-[44px] sm:min-h-auto min-w-[44px] sm:min-w-auto"
            >
              <span className="hidden sm:inline">{t.back}</span>
              <span className="sm:hidden">←</span>
            </button>

            <div className="truncate min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                <span className="shrink-0">{category.icon}</span>
                <span className="truncate">{localizedCategoryTitle}</span>
              </h2>
            </div>
          </div>

          {/* Mode Pill & Audio Toggles */}
          <div className="flex items-center justify-end gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 shrink-0">
            {/* Play Button */}
            <button
              onClick={() => {
                soundEngine.playTick();
                setIsPlaying(!isPlaying);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer shadow-lg shrink-0 ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              <span>{isPlaying ? `⏸️ ${t.pauseBtn}` : `▶️ ${t.startBtn}`}</span>
              <span className="px-1.5 py-0.5 rounded-lg bg-black/20 font-mono text-[10px] text-slate-950 font-bold">
                {repetitions}x
              </span>
            </button>

            {/* Mode Switcher */}
            <div className="p-0.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl flex items-center shrink-0">
              <button
                onClick={() => {
                  soundEngine.playTick();
                  setIsPlaying(false);
                  setMode('shadowing');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  mode === 'shadowing'
                    ? 'bg-[var(--accent-blue)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{t.shadowMode}</span>
              </button>
              <button
                onClick={() => {
                  soundEngine.playTick();
                  setIsPlaying(false);
                  setMode('active_recall');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  mode === 'active_recall'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{t.recallMode}</span>
              </button>
            </div>

            {/* Shuffle Button */}
            <button
              onClick={toggleShuffle}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                isShuffled
                  ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title={isShuffled ? t.originalOrder : t.shuffleOrder}
            >
              <span>🔀</span>
              <span className="hidden md:inline">{isShuffled ? t.shuffleOrder : t.originalOrder}</span>
            </button>

            {/* Translation Toggle Button */}
            <button
              onClick={() => {
                soundEngine.playTick();
                setShowTranslation(!showTranslation);
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
                showTranslation
                  ? 'bg-[var(--accent-blue)]/20 border-[var(--accent-blue)] text-[var(--accent-blue)]'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)]'
              }`}
              title="Translation"
            >
              🌐
            </button>

            {/* Audio Toggle Button */}
            <button
              onClick={() => {
                soundEngine.playTick();
                setAudioEnabled(!audioEnabled);
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
                audioEnabled
                  ? 'bg-[var(--accent-blue)]/20 border-[var(--accent-blue)] text-[var(--accent-blue)]'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)]'
              }`}
              title="Audio"
            >
              🎧
            </button>

            {/* Settings Button */}
            <button
              onClick={() => {
                soundEngine.playTick();
                setShowSettings(!showSettings);
              }}
              className="p-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer shrink-0"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Looper Settings Bar */}
        {showSettings && (
          <div className="px-6 py-3 bg-[var(--card-bg-hover)] border-b border-[var(--card-border)] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-fadeIn">
            <div>
              <label className="block text-[var(--text-secondary)] font-semibold mb-1">
                ⏱️ {t.shadowPause} <span className="text-[var(--accent-blue)] font-bold">{pauseDuration}s</span>
              </label>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={pauseDuration}
                onChange={(e) => setPauseDuration(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent-blue)] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] font-semibold mb-1">
                🔁 {t.repCount} <span className="text-[var(--accent-blue)] font-bold">{repetitions}x</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={repetitions}
                onChange={(e) => setRepetitions(parseInt(e.target.value))}
                className="w-full accent-[var(--accent-blue)] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] font-semibold mb-1">
                ⏩ {t.voiceSpeed} <span className="text-[var(--accent-blue)] font-bold">{playbackSpeed}x</span>
              </label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.1"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent-blue)] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sentence List View */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar">
            {isShadowingPhase && (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center animate-pulse flex items-center justify-center space-x-2">
                <span className="text-[var(--text-primary)] font-bold">{t.speakNowPrompt}</span>
                <span className="font-mono font-bold text-emerald-400">
                  ({shadowingCountdown.toFixed(1)}s)
                </span>
              </div>
            )}

            {sentences.map((sent, idx) => {
              const isActive = idx === currentIndex;
              const sentenceStars = stars[sent.id] || 0;
              const isMastered = masteredIds.has(sent.id);
              const translationText = getSentenceTranslation(sent);

              return (
                <div
                  key={sent.id}
                  ref={isActive ? activeCardRef : null}
                  onClick={() => {
                    clearAllTimers();
                    setCurrentIndex(idx);
                  }}
                  className={`relative p-5 rounded-2xl transition duration-200 border cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel ${
                    isActive
                      ? 'border-emerald-500 shadow-xl ring-2 ring-emerald-500/30 bg-emerald-500/10'
                      : 'hover:border-[var(--card-border-hover)]'
                  }`}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex flex-col space-y-2 items-center">
                      <span className="text-[11px] font-mono font-bold text-[var(--accent-blue)] px-2 py-0.5 rounded-md bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20">
                        #{idx + 1}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllTimers();
                          setCurrentIndex(idx);
                          speakSentenceSequence(sent, () => {});
                        }}
                        className="p-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition text-xs cursor-pointer border border-[var(--card-border)]"
                        title="Přehrát"
                      >
                        🔊
                      </button>
                    </div>

                    <div className="space-y-1">
                      {sent.questionEs ? (
                        <div>
                          <p className="text-base md:text-lg font-bold text-[var(--text-primary)] leading-relaxed">
                            {sent.questionEs}
                          </p>
                          {sent.answerEs && (
                            <p className="text-base md:text-lg font-extrabold text-[var(--accent-blue)] leading-relaxed mt-1">
                              {sent.answerEs}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-base md:text-lg font-bold text-[var(--text-primary)] leading-relaxed">
                          {sent.es}
                        </p>
                      )}

                      {showTranslation && (
                        <p className="text-xs md:text-sm font-medium text-[var(--text-secondary)] italic">
                          {translationText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 self-end md:self-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGradeSentence(sent.id, star);
                        }}
                        className={`text-base md:text-lg transition transform active:scale-90 cursor-pointer ${
                          star <= sentenceStars
                            ? 'text-amber-400'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {isMastered && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        ✓ {t.mastered}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Info Sidebar */}
          <div className="w-full lg:w-80 p-3 md:p-5 bg-[var(--card-bg-hover)] border-t lg:border-t-0 lg:border-l border-[var(--card-border)] space-y-4 overflow-y-auto shrink-0">
            {/* Top Stats Metric Box */}
            <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">📊 {t.islandStats}</span>
                <div className="flex p-0.5 bg-[var(--card-bg-hover)] rounded-xl border border-[var(--card-border)]">
                  <button
                    onClick={() => {
                      soundEngine.playTick();
                      setStatsTimeframe('today');
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      statsTimeframe === 'today'
                        ? 'bg-[var(--accent-blue)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t.today}
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playTick();
                      setStatsTimeframe('all_time');
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      statsTimeframe === 'all_time'
                        ? 'bg-[var(--accent-blue)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t.allTime}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)]">
                  <span className="text-base md:text-lg font-extrabold text-[var(--accent-blue)] block leading-tight">
                    {practicedIds.size}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {t.practiced}
                  </span>
                </div>
                <div className="p-1.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)]">
                  <span className="text-base md:text-lg font-extrabold text-amber-400 block leading-tight">
                    {totalReps}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {t.repetitions}
                  </span>
                </div>
                <div className="p-1.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)]">
                  <span className="text-base md:text-lg font-extrabold text-emerald-400 block leading-tight">
                    {masteredIds.size}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {t.mastered}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Recall Coach Trigger */}
            {mode === 'active_recall' && (
              <IslandRecallSession
                category={category}
                onClose={() => setMode('shadowing')}
              />
            )}

            <div className="hidden md:block space-y-3">
              <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-1.5">
                <div className="flex items-center space-x-2 text-[var(--accent-blue)]">
                  <span>⚡</span>
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">
                    {t.howToPractice}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {t.shadowGuide}<br /><br />
                  {t.recallGuide}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}