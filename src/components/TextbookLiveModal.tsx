// src/components/TextbookLiveModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveTutorSession, LiveStatus, LIVE_MODEL, LIVE_VOICES } from '@/lib/ai/live-session';
import { BookLessonDetail } from '@/lib/data/book-curriculum';
import { getProkopovaLessonData } from '@/lib/data/prokopova-book-data';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';

interface TextbookLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookMeta: BookLessonDetail;
  userName?: string;
  userId?: string;
}

export default function TextbookLiveModal({
  isOpen,
  onClose,
  bookMeta,
  userName = 'Karel',
  userId,
}: TextbookLiveModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [status, setStatus] = useState<LiveStatus>('idle');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<(typeof LIVE_VOICES)[number]['id']>('Aoede');
  
  // Kapesní režim + WakeLock
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
    connecting: { label: t.connectingStatus,  color: 'text-amber-400',               pulse: true  },
    ready:      { label: t.ready,             color: 'text-emerald-400',             pulse: false },
    listening:  { label: t.listeningStatus,  color: 'text-rose-400',                pulse: true  },
    speaking:   { label: t.speakingStatus,   color: 'text-cyan-400',                pulse: true  },
    error:      { label: t.error,             color: 'text-rose-400',                pulse: false },
    closed:     { label: t.close,             color: 'text-[var(--text-secondary)]', pulse: false },
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { sessionRef.current?.disconnect(); };
  }, []);

  const handleTranscript = useCallback((role: 'user' | 'model', text: string) => {
    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], text: updated[updated.length - 1].text + ' ' + text };
        return updated;
      }
      return [...prev, { role, text }];
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

5. METODICKÉ POKYNY:
- Co má student v knize projít: "${bookMeta.whatToStudy}"
- CO MÁ STUDENT ROZHODNĚ PŘESKOČIT: "${bookMeta.whatToSkip}"
- Zlaté pravidlo: "${bookMeta.keyRuleTip}"

JAK ZAHÁJIT HOVOR:
Ihned po připojení začni v ${langLabel} energicky a přesně takto:
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
  }, [apiKey, language, bookMeta, handleTranscript, textbookSystemPrompt, voiceId, userName]);

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

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl apple-glass bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[90vh] overflow-hidden animate-scale-in">
        
        {/* ── KAPESNÍ REŽIM PROTI USNUTÍ IPHONE / ANDROIDU ── */}
        {pocketMode && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-between p-8 text-center animate-fade-in select-none">
            <div className="pt-8">
              <span className="text-5xl block mb-2">📱</span>
              <span className="text-xs font-mono font-bold tracking-[0.28em] text-emerald-400 uppercase">
                Kapesní režim aktivní
              </span>
            </div>

            <div className="space-y-3 max-w-sm">
              <p className="text-sm font-semibold text-slate-300">
                Displej zůstane černý, aby telefon neuspal lekci do sluchátek.
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
              ✕ Vypnout kapesní režim
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status === 'listening' ? 'bg-rose-400 animate-pulse' :
                status === 'speaking'  ? 'bg-cyan-400 animate-pulse' :
                status === 'connecting'? 'bg-amber-400 animate-pulse' :
                status === 'ready'     ? 'bg-emerald-400' : 'bg-gray-400'
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
            {/* TLAČÍTKO KAPESNÍHO REŽIMU – POUZE NA MOBILU (sm:hidden) */}
            <button
              onClick={() => {
                soundEngine.playTick();
                setPocketMode(true);
                if (status === 'idle') startSession();
              }}
              className="sm:hidden p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--accent-emerald)] shadow-sm cursor-pointer"
              title="Kapesní režim proti zhasnutí obrazovky"
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
        <div className="flex-1 overflow-y-auto space-y-3 p-3.5 sm:p-5 custom-scrollbar">
          {/* Visual Orb */}
          <div className="flex justify-center py-1 relative">
            <div className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all duration-500 ${
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

          {/* Transcript Log */}
          <div ref={scrollRef} className="space-y-2.5 min-h-[110px] max-h-[220px] overflow-y-auto p-3 bg-[var(--card-bg-hover)] rounded-2xl border border-[var(--card-border)]">
            {messages.length === 0 && status === 'connecting' && (
              <div className="text-center py-4 text-amber-400 text-xs animate-pulse font-mono">
                Připojuji lektorku k Lekci {bookMeta.lessonNumber}...
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 animate-fade-up ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="text-base shrink-0 mt-0.5">{m.role === 'user' ? '🧑‍🎓' : '👩‍🏫'}</div>
                <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-[var(--text-primary)]'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)]'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Rychlá interaktivní tlačítka */}
          {isActive && (
            <div className="space-y-1.5 pt-1">
              <div className="flex flex-wrap gap-1.5 justify-center">
                <button
                  type="button"
                  onClick={() => sendQuickPrompt(`Pojďme si projít úvodní dialog na straně ${bookMeta.pages}. Přečti první větu a zkontroluj mou výslovnost.`)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition cursor-pointer"
                >
                  📖 Projít dialog
                </button>
                <button
                  type="button"
                  onClick={() => sendQuickPrompt(`Vysvětli mi prosím stručně gramatiku této lekce.`)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition cursor-pointer"
                >
                  💡 Vysvětlit gramatiku
                </button>
                <button
                  type="button"
                  onClick={() => sendQuickPrompt(`Vyzkoušej mě ze 2 vět z dialogu této lekce a nech mě odpovědět španělsky.`)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                >
                  🎯 Vyzkoušej mě
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-3.5 sm:p-5 border-t border-[var(--card-border)] bg-[var(--card-bg-hover)] space-y-2.5 shrink-0">
          {!isActive && status !== 'connecting' && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[11px] text-[var(--text-secondary)] font-mono">{t.voiceLabel}</span>
              {LIVE_VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    soundEngine.playTick();
                    setVoiceId(v.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                    voiceId === v.id
                      ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]'
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