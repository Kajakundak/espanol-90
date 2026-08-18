'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveTutorSession, LiveStatus, LIVE_MODEL, LIVE_VOICES } from '@/lib/ai/live-session';
import { IslandCategory } from '@/lib/data/islands-parser';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';

interface IslandRecallSessionProps {
  category: IslandCategory;
  onClose: () => void;
}

export default function IslandRecallSession({ category, onClose }: IslandRecallSessionProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<(typeof LIVE_VOICES)[number]['id']>('Aoede');
  const sessionRef = useRef<LiveTutorSession | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  const STATUS_CONFIG: Record<LiveStatus, { label: string; color: string; pulse: boolean }> = {
    idle:       { label: t.idleStatus,        color: 'text-[var(--text-secondary)]',  pulse: false },
    connecting: { label: t.connectingStatus,  color: 'text-amber-400',                pulse: true  },
    ready:      { label: t.ready,             color: 'text-emerald-400',              pulse: false },
    listening:  { label: t.listeningStatus,  color: 'text-rose-400',                 pulse: true  },
    speaking:   { label: t.speakingStatus,   color: 'text-cyan-400',                 pulse: true  },
    error:      { label: t.error,             color: 'text-rose-400',                 pulse: false },
    closed:     { label: t.close,             color: 'text-[var(--text-secondary)]',  pulse: false },
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { sessionRef.current?.disconnect(); };
  }, []);

  const handleTranscript = useCallback((role: 'user' | 'model', text: string) => {
    setMessages(prev => {
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], text: updated[updated.length - 1].text + ' ' + text };
        return updated;
      }
      return [...prev, { role, text }];
    });
  }, []);

  const langLabel = language === 'sk' ? 'Slovak' : language === 'en' ? 'English' : 'Czech';
  const langCode = language === 'sk' ? 'sk' : language === 'en' ? 'en' : 'cs';

  const sentenceList = category.sentences.slice(0, 30).map((s, i) => {
    const tr = s.translations?.[langCode as 'en' | 'cs' | 'sk'] || s.en || s.es;
    return `${i + 1}. ES: "${s.es}" | ${langLabel}: "${tr}"`;
  }).join('\n');

  const systemInstruction = `You are an enthusiastic Spanish language coach running a hands-free Active Recall drill session.
The student is learning Spanish. Their native language is ${langLabel}.
You are working through this sentence list from the "${category.title}" category:
${sentenceList}

YOUR JOB:
1. Say the sentence translation in ${langLabel} (e.g. "The apple is red.")
2. Ask student to say it in Spanish.
3. Wait for their microphone answer.
4. Give SHORT instant feedback in ${langLabel} (1 sentence max) and immediately move to the next sentence.`;

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
      mode: '__island_recall__',
      topic: category.title,
      nativeLanguage: language as any,
      level: (category.difficulty as any) || 'A1',
      voiceId,
      situation: systemInstruction,
    });
  }, [apiKey, language, category, handleTranscript, systemInstruction, voiceId]);

  const stopSession = useCallback(async () => {
    soundEngine.playUntick();
    await sessionRef.current?.disconnect();
    sessionRef.current = null;
    setStatus('idle');
  }, []);

  const isActive = status === 'listening' || status === 'speaking';
  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-[var(--nav-bg)]/70 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg apple-glass bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[90vh] overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[var(--card-border)] bg-[var(--card-bg-hover)] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status === 'listening'  ? 'bg-rose-400 animate-pulse' :
                status === 'speaking'   ? 'bg-cyan-400 animate-pulse' :
                status === 'connecting' ? 'bg-amber-400 animate-pulse' :
                status === 'ready'      ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'
              }`} />
              <h2 className="font-black text-[var(--text-primary)] text-sm sm:text-base">🤖 {t.recallCoachTitle}</h2>
              <span className="text-[9px] sm:text-[10px] font-mono bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 px-1.5 py-0.5 rounded-full">
                {LIVE_MODEL.split('/')[1] || LIVE_MODEL}
              </span>
            </div>
            <p className={`text-[11px] sm:text-xs mt-0.5 font-mono ${statusCfg.color} ${statusCfg.pulse ? 'animate-pulse' : ''}`}>
              {statusCfg.label}
            </p>
          </div>
          <button onClick={() => { stopSession(); onClose(); }}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none cursor-pointer transition px-2 py-1">×</button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto space-y-3 p-3.5 sm:p-5 custom-scrollbar">
          {/* Audio orb */}
          <div className="flex justify-center py-2 relative">
            <div className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full transition-all duration-500 ${
              status === 'listening' ? 'bg-rose-500/15 shadow-[0_0_50px_rgba(244,63,94,0.5)]' :
              status === 'speaking'  ? 'bg-cyan-500/15 shadow-[0_0_50px_rgba(6,182,212,0.5)]' :
              'bg-[var(--card-bg-hover)] border border-[var(--card-border)]'
            }`}>
              {isActive && (
                <>
                  <div className={`absolute inset-0 rounded-full border-2 animate-ping opacity-30 ${status === 'listening' ? 'border-rose-400' : 'border-indigo-400'}`} />
                  <div className={`absolute inset-[-6px] rounded-full border animate-pulse opacity-20 ${status === 'listening' ? 'border-rose-300' : 'border-indigo-300'}`} />
                </>
              )}
              <div className="text-3xl select-none">
                {status === 'listening'  ? '🎙️' :
                 status === 'speaking'   ? '🔊' :
                 status === 'connecting' ? '⏳' :
                 status === 'error'      ? '⚠️' : '🤖'}
              </div>
            </div>
          </div>

          {/* Info card when idle */}
          {status === 'idle' && (
            <div className="p-3.5 rounded-2xl bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/30 text-xs text-[var(--text-primary)] space-y-1.5">
              <p className="font-bold text-[var(--accent-blue)]">📋 {t.howItWorksTitle}</p>
              <p>{t.howItWorks1}</p>
              <p>{t.howItWorks2}</p>
              <p>{t.howItWorks3}</p>
            </div>
          )}

          {/* Transcript */}
          <div ref={scrollRef} className="space-y-2.5 min-h-[100px] max-h-[220px] overflow-y-auto p-2 bg-[var(--card-bg-hover)] rounded-2xl border border-[var(--card-border)]">
            {messages.length === 0 && status === 'connecting' && (
              <div className="text-center py-4 text-amber-400 text-xs animate-pulse font-mono">{t.connectingStatus}</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="text-base shrink-0">{m.role === 'user' ? '🧑‍🎓' : '🤖'}</div>
                <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-[var(--text-primary)]'
                    : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)]'
                }`}>{m.text}</div>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {isActive && (
            <div className="flex flex-wrap gap-1.5 justify-center py-1">
              <button onClick={() => sessionRef.current?.sendTextMessage('Skip to next sentence please.')}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition cursor-pointer">
                ⏭️ {language === 'en' ? 'Skip' : language === 'sk' ? 'Preskočiť' : 'Přeskočit'}
              </button>
              <button onClick={() => sessionRef.current?.sendTextMessage('Repeat the sentence please.')}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold transition cursor-pointer">
                🔄 {t.repeatBtn}
              </button>
              <button onClick={() => sessionRef.current?.sendTextMessage('Give me the answer please.')}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold transition cursor-pointer">
                💡 {t.hintBtn}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-5 border-t border-[var(--card-border)] bg-[var(--card-bg-hover)] flex flex-col gap-2.5 shrink-0">
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
                ▶ {t.startRecallSession}
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-black text-white text-xs sm:text-sm transition cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              >
                ⏹ {t.endSession}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}