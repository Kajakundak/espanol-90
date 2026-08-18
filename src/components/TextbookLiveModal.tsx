'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveTutorSession, LiveStatus, LIVE_MODEL, LIVE_VOICES, sanitizeTranscript } from '@/lib/ai/live-session';
import { BookLessonDetail } from '@/lib/data/book-curriculum';
import { getProkopovaLessonData } from '@/lib/data/prokopova-book-data';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  ts: number;
}

interface TextbookLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookMeta: BookLessonDetail;
  userName?: string;
  userId?: string;
  userAvatar?: string;
}

function mergeTranscriptChunks(prevText: string, newChunk: string): string {
  const prev = prevText.trim();
  const next = newChunk.trim();
  if (!prev) return next;
  if (!next) return prev;

  if (prev.endsWith(next) || prev === next) return prev;

  if (next.toLowerCase().includes(prev.toLowerCase())) {
    return next;
  }

  if (next.toLowerCase().startsWith(prev.toLowerCase())) {
    return next;
  }

  const prevWords = prev.split(/\s+/);
  const nextWords = next.split(/\s+/);
  for (let overlapLen = Math.min(prevWords.length, nextWords.length); overlapLen > 0; overlapLen--) {
    const prevEnd = prevWords.slice(-overlapLen).join(' ').toLowerCase();
    const nextStart = nextWords.slice(0, overlapLen).join(' ').toLowerCase();
    if (prevEnd === nextStart) {
      return `${prevWords.slice(0, -overlapLen).join(' ')} ${next}`.trim();
    }
  }

  return `${prev} ${next}`.replace(/\s+/g, ' ').trim();
}

export default function TextbookLiveModal({
  isOpen,
  onClose,
  bookMeta,
  userName = 'Karel',
  userId,
  userAvatar,
}: TextbookLiveModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [status, setStatus] = useState<LiveStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<(typeof LIVE_VOICES)[number]['id']>('Aoede');
  
  const [pocketMode, setPocketMode] = useState(false);
  const wakeLockRef = useRef<any>(null);
  
  const sessionRef = useRef<LiveTutorSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  const isEn = language === 'en';
  const isSk = language === 'sk';
  const langLabel = isSk ? 'slovenčine' : isEn ? 'English' : 'češtine';

  const requestWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock failed:', err);
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
    if (pocketMode || status === 'speaking' || status === 'listening') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => { releaseWakeLock(); };
  }, [pocketMode, status, requestWakeLock, releaseWakeLock]);

  const STATUS_CONFIG: Record<LiveStatus, { label: string; color: string; pulse: boolean }> = {
    idle:       { label: t.idleStatus,        color: 'text-[var(--text-secondary)]', pulse: false },
    connecting: { label: t.connectingStatus,  color: 'text-amber-500 dark:text-amber-400', pulse: true },
    ready:      { label: t.ready,             color: 'text-emerald-500 dark:text-emerald-400', pulse: false },
    listening:  { label: t.listeningStatus,   color: 'text-rose-500 dark:text-rose-400', pulse: true },
    speaking:   { label: t.speakingStatus,    color: 'text-cyan-500 dark:text-cyan-400', pulse: true },
    error:      { label: t.error,             color: 'text-rose-500 dark:text-rose-400', pulse: false },
    closed:     { label: t.close,             color: 'text-[var(--text-secondary)]', pulse: false },
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { sessionRef.current?.disconnect(); };
  }, []);

  const handleTurnStart = useCallback((role: 'user' | 'model') => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        role,
        text: '',
        ts: Date.now(),
      },
    ]);
  }, []);

  const handleTranscript = useCallback((role: 'user' | 'model', text: string) => {
    const cleanText = sanitizeTranscript(text);
    if (!cleanText) return;

    setMessages((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].role !== role) {
        return [
          ...prev,
          {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            role,
            text: cleanText,
            ts: Date.now(),
          },
        ];
      }

      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      lastMsg.text = mergeTranscriptChunks(lastMsg.text, cleanText);
      return updated;
    });
  }, []);

  const rawLessonData = getProkopovaLessonData(bookMeta.lessonNumber);

  const dialogueContext = rawLessonData?.texts?.map(t => {
    if (t.type === 'dialogue' && t.speakers) {
      return t.speakers.map(s => `${s.speaker}: "${s.text}"`).join('\n');
    }
    if (t.content) {
      return Array.isArray(t.content) ? t.content.join('\n') : t.content;
    }
    return '';
  }).join('\n\n') || 'Úvodní text/dialog lekce';

  const vocabContext = rawLessonData?.vocabulary?.slice(0, 40).map(v => `${v.es} (${v.cs})`).join(', ') || '';
  const grammarContext = rawLessonData?.grammar?.map(g => {
    const rules = g.rules ? g.rules.join('; ') : '';
    return `[${g.roman_numeral || g.topic || '•'} ${g.title || ''}]: ${rules}`;
  }).join('\n') || bookMeta.grammarTopics.join(', ');

  const exercisesContext = rawLessonData?.exercises?.map(e => `Cvičení ${e.number} (${e.type}): ${e.instruction}`).join('\n') || '';

  const textbookSystemPrompt = `
Jsi osobní lektorka španělštiny (Lektorka Elena).
Sedíš se studentem (${userName}) a máte před sebou OTEVŘENOU učebnici "Španělština pro samouky" od Lídy Prokopové.

MÁŠ PŘED SEBOU PŘESNÝ OBSAH TÉTO LEKCE:
📖 LEKCE ${bookMeta.lessonNumber}: "${bookMeta.title}" (${bookMeta.pages})

1. DOSLOVNÝ TEXT / DIALOGY V TÉTO LEKCI:
"""
${dialogueContext}
"""

2. SLOVNÍ ZÁSOBA TÉTO LEKCE:
${vocabContext}

3. GRAMATICKÁ PRAVIDLA V TÉTO LEKCI:
${grammarContext}

4. CVIČENÍ V KNIZE:
${exercisesContext || 'Písemná doplňovací cvičení'}

5. METODICKÉ POKYNY & TEMPO HOVORU:
- Mluv v KRÁTKÝCH vstupech (1–2 věty za tah). Polož vždy JEDNU jasnou otázku a hned přestaň mluvit.
- Co má student v knize projít: "${bookMeta.whatToStudy}"
- CO MÁ STUDENT ROZHODNĚ PŘESKOČIT: "${bookMeta.whatToSkip}"
- Zlaté pravidlo: "${bookMeta.keyRuleTip}"

JAK ZAHÁJIT HOVOR:
Ihned po připojení začni v ${langLabel} energicky:
"Ahoj ${userName}! Mám před sebou otevřenou Lekci ${bookMeta.lessonNumber}: ${bookMeta.title} na ${bookMeta.pages}. Máš knížku před sebou? Na co se podíváme nejdřív – na úvodní dialog, nebo si projdeme gramatiku?"
`;

  const startSession = useCallback(async () => {
    if (!apiKey) { setErrorMsg('Chybí NEXT_PUBLIC_GEMINI_API_KEY'); return; }
    soundEngine.playTick();
    setMessages([]);
    setErrorMsg(null);

    const session = new LiveTutorSession(apiKey, {
      onStatusChange: setStatus,
      onTranscript: handleTranscript,
      onTurnStart: handleTurnStart,
      onError: setErrorMsg,
    });
    sessionRef.current = session;

    await session.connect({
      mode: '__textbook_lesson__',
      topic: `Lekce ${bookMeta.lessonNumber}: ${bookMeta.title}`,
      nativeLanguage: language as any,
      level: 'A1',
      voiceId,
      situation: textbookSystemPrompt,
      userName,
    });
  }, [apiKey, language, bookMeta, handleTranscript, handleTurnStart, textbookSystemPrompt, voiceId, userName]);

  const stopSession = useCallback(async () => {
    soundEngine.playUntick();
    await sessionRef.current?.disconnect();
    sessionRef.current = null;
    setStatus('idle');
    setPocketMode(false);
  }, []);

  const sendQuickPrompt = (promptText: string) => {
    soundEngine.playTick();
    sessionRef.current?.sendTextMessage(promptText);
    handleTranscript('user', `💬 (${promptText})`);
  };

  const isActive = status === 'listening' || status === 'speaking';
  const statusCfg = STATUS_CONFIG[status];

  if (!isOpen) return null;

  const renderUserAvatar = () => {
    if (userAvatar && (userAvatar.startsWith('data:image') || userAvatar.startsWith('http'))) {
      return (
        <img
          src={userAvatar}
          alt={userName || 'Me'}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-emerald-500/40"
        />
      );
    }
    return <span className="text-base select-none">{userAvatar || '🧑‍🎓'}</span>;
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[90vh] overflow-hidden animate-scale-in">
        
        {/* Kapesní režim */}
        {pocketMode && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-between p-8 text-center animate-fade-in select-none">
            <div className="pt-8">
              <span className="text-5xl block mb-2">📱</span>
              <span className="text-xs font-mono font-bold tracking-[0.28em] text-emerald-400 uppercase">
                {t.pocketModeTitle}
              </span>
            </div>

            <div className="space-y-3 max-w-sm">
              <p className="text-sm font-semibold text-slate-300">
                {t.pocketModeDesc}
              </p>
              <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-xs text-slate-300">
                Lekce {bookMeta.lessonNumber}: <strong className="text-white">{bookMeta.title}</strong>
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

        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status === 'listening' ? 'bg-rose-500 animate-pulse' :
                status === 'speaking'  ? 'bg-cyan-500 animate-pulse' :
                status === 'connecting'? 'bg-amber-500 animate-pulse' :
                status === 'ready'     ? 'bg-emerald-500' : 'bg-gray-400'
              }`} />
              <h2 className="font-black text-[var(--text-primary)] text-sm sm:text-base truncate">
                📖 Lektorka pro Lekci {bookMeta.lessonNumber}
              </h2>
            </div>
            <p className={`text-[11px] sm:text-xs mt-0.5 font-mono ${statusCfg.color} ${statusCfg.pulse ? 'animate-pulse' : ''}`}>
              {statusCfg.label} • {bookMeta.pages}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                soundEngine.playTick();
                setPocketMode(true);
                if (status === 'idle') startSession();
              }}
              className="sm:hidden p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--accent-emerald)] shadow-sm cursor-pointer"
              title={t.pocketModeBtn}
            >
              📱
            </button>

            <button
              onClick={() => { stopSession(); onClose(); }}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none cursor-pointer transition px-2 py-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto space-y-3.5 p-3.5 sm:p-5 custom-scrollbar">
          {/* Visual Orb */}
          <div className="flex justify-center py-1 relative">
            <div className={`relative flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-full transition-all duration-500 ${
              status === 'listening'
                ? 'bg-rose-500/15 shadow-[0_0_50px_rgba(244,63,94,0.5)]'
                : status === 'speaking'
                ? 'bg-cyan-500/15 shadow-[0_0_50px_rgba(6,182,212,0.5)]'
                : 'bg-[var(--card-bg-hover)] border border-[var(--card-border)]'
            }`}>
              {isActive && (
                <>
                  <div className={`absolute inset-0 rounded-full border-2 animate-ping opacity-30 ${status === 'listening' ? 'border-rose-400' : 'border-cyan-400'}`} />
                  <div className={`absolute inset-[-6px] rounded-full border animate-pulse opacity-20 ${status === 'listening' ? 'border-rose-300' : 'border-cyan-300'}`} />
                </>
              )}
              <div className="text-3xl select-none">
                {status === 'listening'  ? '🎙️' :
                 status === 'speaking'   ? '🔊' :
                 status === 'connecting' ? '⏳' :
                 status === 'error'      ? '⚠️' : '👩‍🏫'}
              </div>
            </div>
          </div>

          {/* Transcript Log s vlastním avatarem */}
          <div ref={scrollRef} className="space-y-3 min-h-[120px] max-h-[260px] overflow-y-auto p-3 bg-[var(--card-bg-hover)] rounded-2xl border border-[var(--card-border)]">
            {messages.length === 0 && status === 'connecting' && (
              <div className="text-center py-4 text-amber-500 dark:text-amber-400 text-xs animate-pulse font-mono">
                Připojuji lektorku k Lekci {bookMeta.lessonNumber}...
              </div>
            )}
            {messages.length === 0 && status === 'idle' && (
              <div className="text-center py-4 text-[var(--text-secondary)] text-xs">
                Otevřete knížku na <strong className="text-[var(--text-primary)]">{bookMeta.pages}</strong> a spusťte hovor.
              </div>
            )}
            {messages.filter(m => m.text.trim().length > 0).map((m) => (
              <div key={m.id} className={`flex gap-2.5 animate-fade-up ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="shrink-0 mt-0.5 flex items-center justify-center">
                  {m.role === 'user' ? renderUserAvatar() : <span className="text-base select-none">👩‍🏫</span>}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[88%] shadow-sm ${
                  m.role === 'user'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-[var(--text-primary)] font-medium'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)]'
                }`}>
                  <p className="whitespace-normal leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Rychlá pomocná tlačítka */}
          {isActive && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => sendQuickPrompt(`Pojďme si projít úvodní dialog na straně ${bookMeta.pages}. Přečti první větu a zkontroluj mou výslovnost.`)}
                  className="px-3.5 py-2 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span className="p-1 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-extrabold">📖</span>
                  <span>Projít dialog</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendQuickPrompt(`Vysvětli mi prosím stručně gramatiku této lekce.`)}
                  className="px-3.5 py-2 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span className="p-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold">💡</span>
                  <span>Vysvětlit gramatiku</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendQuickPrompt(`Která cvičení na straně ${bookMeta.pages} mám přeskočit a co si raději procvičit?`)}
                  className="px-3.5 py-2 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span className="p-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold">⛔</span>
                  <span>Co přeskočit?</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendQuickPrompt(`Vyzkoušej mě ze 2 vět z dialogu této lekce a nech mě odpovědět španělsky.`)}
                  className="px-3.5 py-2 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span className="p-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold">🎯</span>
                  <span>Vyzkoušej mě</span>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-5 border-t border-[var(--card-border)] bg-[var(--card-bg-hover)] space-y-2.5 shrink-0">
          {!isActive && status !== 'connecting' && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[11px] text-[var(--text-secondary)] font-mono font-semibold">{t.voiceLabel}</span>
              {LIVE_VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    soundEngine.playTick();
                    setVoiceId(v.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                    voiceId === v.id
                      ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-sm'
                      : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {v.id} ({v.gender === 'female' ? t.voiceFemale : t.voiceMale})
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            {status === 'idle' || status === 'closed' || status === 'error' ? (
              <button
                onClick={startSession}
                disabled={!apiKey}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-black text-slate-950 text-xs sm:text-sm transition cursor-pointer shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                ▶ Spustit hodinu k Lekci {bookMeta.lessonNumber}
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-black text-white text-xs sm:text-sm transition cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              >
                ⏹ Ukončit hodinu
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}