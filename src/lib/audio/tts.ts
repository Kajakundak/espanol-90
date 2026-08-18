'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { NativeLanguage } from '@/lib/ai/gemini';

export type VoiceGender = 'female' | 'male';

// ── Chunk parser ─────────────────────────────────────────────────────────────

interface TextChunk {
  text: string;
  lang: 'es' | 'native';
}

/**
 * Splits tutor message into Spanish and native (parenthesized) chunks.
 * Example: "¡Hola! (Dobrý den!) ¿Cómo estás? (Jak se máš?)"
 * → [{es, "¡Hola!"}, {native, "Dobrý den!"}, {es, "¿Cómo estás?"}, {native, "Jak se máš?"}]
 */
function parseChunks(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const clean = text.replace(/[*_#`]/g, '');
  const regex = /\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(clean)) !== null) {
    const beforeParens = clean.slice(lastIndex, match.index).trim();
    if (beforeParens) chunks.push({ text: beforeParens, lang: 'es' });

    const inside = match[1].trim();
    if (inside) chunks.push({ text: inside, lang: 'native' });
    lastIndex = regex.lastIndex;
  }

  const tail = clean.slice(lastIndex).trim();
  if (tail) chunks.push({ text: tail, lang: 'es' });

  // Fallback: treat everything as Spanish if no parens found
  if (chunks.length === 0 && clean.trim()) {
    chunks.push({ text: clean.trim(), lang: 'es' });
  }

  return chunks;
}

// ── Voice resolver ────────────────────────────────────────────────────────────

const FEMALE_KEYWORDS = ['female', 'zuzana', 'sabina', 'helena', 'monica', 'laura', 'paloma', 'lucia', 'marta', 'zira', 'yelda', 'anna', 'maria', 'elena'];
const MALE_KEYWORDS   = ['male', 'pablo', 'jorge', 'david', 'jakub', 'jan', 'stefan', 'george', 'mark', 'carlos'];

function getVoice(
  voices: SpeechSynthesisVoice[],
  langPrefix: string,
  gender: VoiceGender
): SpeechSynthesisVoice | null {
  const pool = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
  );
  if (pool.length === 0) return null;

  const keywords = gender === 'female' ? FEMALE_KEYWORDS : MALE_KEYWORDS;
  const match = pool.find((v) => keywords.some((kw) => v.name.toLowerCase().includes(kw)));
  return match ?? pool[0];
}

// ── TTS Engine ────────────────────────────────────────────────────────────────

export class RobustTTS {
  private voices: SpeechSynthesisVoice[] = [];
  private gender: VoiceGender = 'female';
  private voicesLoaded = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
    }
  }

  private loadVoices() {
    const tryLoad = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        this.voices = v;
        this.voicesLoaded = true;
      }
    };
    tryLoad();
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      this.voices = window.speechSynthesis.getVoices();
      this.voicesLoaded = true;
    });
    // Some browsers need a slight delay
    setTimeout(tryLoad, 500);
    setTimeout(tryLoad, 1500);
  }

  setGender(gender: VoiceGender) {
    this.gender = gender;
  }

  speakDualLanguage(
    text: string,
    nativeLang: NativeLanguage = 'cs',
    rate = 0.88,
    onEnd?: () => void
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    // Refresh voices on every call in case they weren't ready before
    if (!this.voicesLoaded || this.voices.length === 0) {
      this.voices = window.speechSynthesis.getVoices();
    }

    const chunks = parseChunks(text);
    if (chunks.length === 0) {
      onEnd?.();
      return;
    }

    const nativeLangCode = nativeLang === 'sk' ? 'sk' : nativeLang === 'en' ? 'en' : 'cs';
    const esVoice     = getVoice(this.voices, 'es', this.gender);
    const nativeVoice = getVoice(this.voices, nativeLangCode, this.gender)
                     ?? getVoice(this.voices, 'cs', this.gender);

    let idx = 0;

    const speakNext = () => {
      if (idx >= chunks.length) {
        // Safety buffer before calling onEnd so audio hardware fully closes
        setTimeout(() => onEnd?.(), 600);
        return;
      }

      const chunk = chunks[idx++];
      const utt = new SpeechSynthesisUtterance(chunk.text);

      if (chunk.lang === 'native') {
        if (nativeVoice) utt.voice = nativeVoice;
        utt.lang = nativeVoice?.lang ?? (nativeLang === 'sk' ? 'sk-SK' : nativeLang === 'en' ? 'en-US' : 'cs-CZ');
        utt.rate = 0.9;
        utt.pitch = 1.05;
      } else {
        if (esVoice) utt.voice = esVoice;
        utt.lang = esVoice?.lang ?? 'es-ES';
        utt.rate = rate;
        utt.pitch = 1.0;
      }

      utt.onend = speakNext;
      utt.onerror = speakNext; // skip on error, don't hang
      window.speechSynthesis.speak(utt);
    };

    speakNext();
  }

  speak(text: string, rate = 0.85, onEnd?: () => void) {
    this.speakDualLanguage(text, 'cs', rate, onEnd);
  }

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const ttsEngine = new RobustTTS();

// ── One-shot Voice Input Hook (for text chat's VoiceButton) ──────────────────

export function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening]   = useState(false);
  const [isSupported, setIsSupported]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const recognitionRef                  = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) setIsSupported(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Prohlížeč nepodporuje hlasové rozpoznávání.'); return; }

    try {
      try { recognitionRef.current?.abort(); } catch {}

      const rec = new SR();
      rec.lang = 'es-ES';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      recognitionRef.current = rec;

      rec.onstart  = () => { setIsListening(true); setError(null); };
      rec.onresult = (e: any) => {
        const t = e.results[0][0].transcript?.trim();
        if (t) onResult(t);
        setIsListening(false);
      };
      rec.onerror  = (e: any) => {
        setIsListening(false);
        if (e.error === 'not-allowed') setError('Povol mikrofon v prohlížeči.');
      };
      rec.onend = () => setIsListening(false);

      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  }, [onResult]);

  return { isListening, isSupported, error, startListening, stopListening };
}
