'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveTutorSession, LiveStatus, LiveVoiceId, LIVE_VOICES, LIVE_MODEL } from '@/lib/ai/live-session';
import { NativeLanguage, CEFRLevel } from '@/lib/ai/gemini';
import { getTutorMemories, saveTutorMemory } from '@/lib/firebase/db';
import { soundEngine } from '@/lib/audio/sound-engine';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface Message {
  role: 'user' | 'model';
  text: string;
  ts: number;
}

interface LiveTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: string;
  topic?: string;
  nativeLanguage?: NativeLanguage;
  level?: CEFRLevel;
  situation?: string;
  userName?: string;
  userId?: string;
  totalPoints?: number;
  currentStreak?: number;
}

export default function LiveTutorModal({
  isOpen,
  onClose,
  mode = 'free_conversation',
  topic = 'General Practice',
  nativeLanguage = 'cs',
  level = 'A1',
  situation,
  userName,
  userId,
  totalPoints,
  currentStreak,
}: LiveTutorModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [status, setStatus] = useState<LiveStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<LiveVoiceId>('Aoede');
  const [savedMemories, setSavedMemories] = useState<{ topic: string; summary: string; userFacts: string[] }[]>([]);
  const sessionRef = useRef<LiveTutorSession | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  const STATUS_CONFIG: Record<LiveStatus, { label: string; color: string; pulse: boolean }> = {
    idle:        { label: t.idleStatus,         color: 'text-[var(--text-secondary)]',  pulse: false },
    connecting:  { label: t.liveConnecting,     color: 'text-amber-400',                pulse: true  },
    ready:       { label: t.ready,              color: 'text-emerald-400',              pulse: false },
    listening:   { label: t.liveListening,      color: 'text-rose-400',                 pulse: true  },
    speaking:    { label: t.liveSpeaking,       color: 'text-cyan-400',                 pulse: true  },
    error:       { label: t.error,              color: 'text-rose-400',                 pulse: false },
    closed:      { label: t.close,              color: 'text-[var(--text-secondary)]',  pulse: false },
  };

  useEffect(() => {
    if (!isOpen || !userId) return;

    let active = true;
    getTutorMemories(userId)
      .then((memories) => {
        if (active) setSavedMemories(memories.slice(0, 5));
      })
      .catch(() => {
        if (active) setSavedMemories([]);
      });

    return () => { active = false; };
  }, [isOpen, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleTranscript = useCallback((role: 'user' | 'model', text: string) => {
    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: updated[updated.length - 1].text + ' ' + text,
        };
        return updated;
      }
      return [...prev, { role, text, ts: Date.now() }];
    });
  }, []);

  const handleStatusChange = useCallback((s: LiveStatus) => {
    setStatus(s);
  }, []);

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg);
  }, []);

  const startSession = useCallback(async () => {
    if (!apiKey) {
      setErrorMsg('NEXT_PUBLIC_GEMINI_API_KEY není nastaven v .env.local');
      return;
    }
    soundEngine.playTick();
    setMessages([]);
    setErrorMsg(null);
    sessionStartedAtRef.current = Date.now();

    const session = new LiveTutorSession(apiKey, {
      onStatusChange: handleStatusChange,
      onTranscript: handleTranscript,
      onError: handleError,
    });
    sessionRef.current = session;

    await session.connect({
      mode,
      topic,
      nativeLanguage,
      level,
      voiceId,
      situation,
      userName,
      totalPoints,
      currentStreak,
      memories: savedMemories,
    });
  }, [apiKey, mode, topic, nativeLanguage, level, voiceId, situation, userName, totalPoints, currentStreak, savedMemories, handleStatusChange, handleTranscript, handleError]);

  const stopSession = useCallback(async () => {
    soundEngine.playUntick();
    const elapsedMinutes = sessionStartedAtRef.current ? Math.max(1, Math.ceil((Date.now() - sessionStartedAtRef.current) / 60000)) : 0;

    if (sessionRef.current) {
      await sessionRef.current.disconnect();
      sessionRef.current = null;
    }

    if (elapsedMinutes > 0 && userId) {
      const { addAiMinutesToUser } = await import('@/lib/firebase/db');
      await addAiMinutesToUser(userId, elapsedMinutes, 2);
    }

    sessionStartedAtRef.current = null;
    setStatus('idle');
  }, [userId]);

  useEffect(() => {
    return () => { void stopSession(); };
  }, [stopSession]);

  if (!isOpen) return null;

  const statusCfg = STATUS_CONFIG[status];
  const isActive = status === 'listening' || status === 'speaking';
  const isConnecting = status === 'connecting';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl apple-glass bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[90vh] overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status === 'listening' ? 'bg-rose-400 animate-pulse' :
                status === 'speaking'  ? 'bg-indigo-400 animate-pulse' :
                status === 'connecting'? 'bg-amber-400 animate-pulse' :
                status === 'ready'     ? 'bg-emerald-400' : 'bg-gray-400'
              }`} />
              <h2 className="font-black text-[var(--text-primary)] text-sm sm:text-base">🎙️ {t.tutorTitle}</h2>
              <span className="text-[9px] sm:text-[10px] font-mono bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                {LIVE_MODEL.split('/')[1] || LIVE_MODEL}
              </span>
            </div>
            <p className={`text-[11px] sm:text-xs mt-0.5 font-mono ${statusCfg.color} ${statusCfg.pulse ? 'animate-pulse' : ''}`}>
              {statusCfg.label}
            </p>
          </div>

          <button onClick={() => { stopSession(); onClose(); }}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none cursor-pointer transition px-2 py-1">
            ×
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-3 p-3.5 sm:p-5 custom-scrollbar">
          {/* Visual Orb */}
          <div className="flex justify-center py-2 relative">
            <div className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all duration-500 ${
              status === 'listening'
                ? 'bg-rose-500/15 shadow-[0_0_50px_rgba(244,63,94,0.5)]'
                : status === 'speaking'
                ? 'bg-cyan-500/15 shadow-[0_0_50px_rgba(6,182,212,0.5)]'
                : 'bg-[var(--card-bg-hover)] border border-[var(--card-border)]'
            }`}>
              {isActive && (
                <>
                  <div className={`absolute inset-0 rounded-full border-2 animate-ping opacity-30 ${
                    status === 'listening' ? 'border-rose-400' : 'border-indigo-400'
                  }`} />
                  <div className={`absolute inset-[-6px] rounded-full border animate-pulse opacity-20 ${
                    status === 'listening' ? 'border-rose-300' : 'border-indigo-300'
                  }`} />
                </>
              )}

              <div className="text-3xl sm:text-4xl select-none">
                {status === 'listening'  ? '🎙️' :
                 status === 'speaking'   ? '🔊' :
                 status === 'connecting' ? '⏳' :
                 status === 'error'      ? '⚠️' :
                 status === 'closed'     ? '✓'  : '🎓'}
              </div>
            </div>
          </div>

          {/* Transcript Log */}
          <div ref={scrollRef} className="space-y-2.5 min-h-[100px] max-h-[220px] overflow-y-auto p-2.5 bg-[var(--card-bg-hover)] rounded-2xl border border-[var(--card-border)]">
            {messages.length === 0 && status === 'idle' && (
              <div className="text-center py-4 text-[var(--text-secondary)] text-xs">
                <p>{language === 'en' ? 'Press Start Live Call to begin talking.' : language === 'sk' ? 'Stlač Spustiť Hovor a začni rozprávať.' : 'Stiskni Spustit Hovor a začni mluvit.'}</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">Gemini 3.1 Flash Live</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}
                className={`flex gap-2 animate-fade-up ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="text-base shrink-0 mt-0.5">
                  {m.role === 'user' ? '🧑‍🎓' : '👩‍🏫'}
                </div>
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

          {/* Save Memory Notification */}
          {messages.length > 2 && (
            <div className="p-3 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-xs">
                    {language === 'en' ? 'Save conversation memory?' : language === 'sk' ? 'Uložiť pamäť konverzácie?' : 'Uložit paměť konverzace?'}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {language === 'en' ? 'AI tutor will recall these facts next session.' : language === 'sk' ? 'Lektorka si zapamätá fakty pre ďalšiu reláciu.' : 'Lektorka si zapamatuje fakta pro příští lekci.'}
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  const userMessages = messages.filter(m => m.role === 'user').map(m => m.text);
                  const summaryText = userMessages.length > 0
                    ? userMessages.join(' | ')
                    : 'Student practiced conversation.';

                  const memObj = {
                    id: `mem_${Date.now()}`,
                    topic,
                    summary: `${topic}: "${summaryText.slice(0, 220)}"`,
                    userFacts: userMessages.slice(-4).filter(Boolean),
                    createdAt: new Date().toISOString(),
                  };

                  const targetUserId = userId || (userName === 'Lucka' ? 'user_lucka' : 'user_karel');
                  await saveTutorMemory(targetUserId, memObj);
                  setSavedMemories((prev) => [memObj, ...prev.filter((item) => item.topic !== memObj.topic || item.summary !== memObj.summary)].slice(0, 5));
                  soundEngine.playSuccessTone();
                  alert(language === 'en' ? 'Memory saved successfully!' : language === 'sk' ? 'Pamäť bola úspešne uložená!' : 'Paměť byla úspěšně uložena!');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shrink-0 cursor-pointer shadow-sm"
              >
                💾 {t.saveMemoryBtn}
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Live Coaching Buttons */}
          {isActive && (
            <div className="flex flex-wrap gap-1.5 justify-center py-1">
              <button
                onClick={() => {
                  sessionRef.current?.sendTextMessage("Help me answer please.");
                  handleTranscript('user', `💡 (${t.hintBtn})`);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition cursor-pointer flex items-center gap-1">
                <span>💡 {t.hintBtn}</span>
              </button>
              <button
                onClick={() => {
                  sessionRef.current?.sendTextMessage("Please speak slower.");
                  handleTranscript('user', `🐢 (${t.slowerBtn})`);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold transition cursor-pointer flex items-center gap-1">
                <span>🐢 {t.slowerBtn}</span>
              </button>
              <button
                onClick={() => {
                  sessionRef.current?.sendTextMessage("Could you repeat that please?");
                  handleTranscript('user', `🔄 (${t.repeatBtn})`);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold transition cursor-pointer flex items-center gap-1">
                <span>🔄 {t.repeatBtn}</span>
              </button>
            </div>
          )}

          {/* Cheat Sheet */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg-hover)] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
              <span className="flex items-center gap-1 text-[var(--accent-amber)] font-mono text-[10px] sm:text-[11px] uppercase tracking-wider">
                💡 {t.cheatSheetTitle} ({level})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-2 rounded-xl space-y-0.5">
                <div className="text-[10px] font-mono text-[var(--accent-cyan)] font-bold">{t.sampleAnswersTitle}</div>
                <div className="font-mono text-[var(--text-primary)] text-[11px]">• Me llamo {userName || 'Karel'}.</div>
                <div className="font-mono text-[var(--text-primary)] text-[11px]">• Soy de la República Checa.</div>
              </div>
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-2 rounded-xl space-y-0.5">
                <div className="text-[10px] font-mono text-[var(--accent-amber)] font-bold">{t.rescuePhrasesTitle}</div>
                <div className="font-mono text-[var(--text-primary)] text-[11px]">• No entiendo.</div>
                <div className="font-mono text-[var(--text-primary)] text-[11px]">• ¿Cómo se dice...?</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-5 border-t border-[var(--card-border)] bg-[var(--card-bg-hover)] space-y-2.5 shrink-0">
          {!isActive && !isConnecting && (
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
                  }`}>
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
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-black text-slate-950 text-xs sm:text-sm transition cursor-pointer shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40">
                ▶ {t.startCallButton}
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-black text-white text-xs sm:text-sm transition cursor-pointer shadow-lg hover:scale-105 active:scale-95">
                ⏹ {t.endSession}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}