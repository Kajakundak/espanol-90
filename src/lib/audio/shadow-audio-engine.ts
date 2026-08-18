// src/lib/audio/shadow-audio-engine.ts
'use client';

export interface ShadowSentenceItem {
  id: string;
  spanish: string;
  translation: string;
  langCode: string; // 'cs' | 'sk' | 'en'
}

export interface ShadowEngineConfig {
  pauseDuration: number;
  repetitions: number;
  playbackRate: number;
  readTranslation: boolean;
}

export class ShadowAudioEngine {
  private sentences: ShadowSentenceItem[] = [];
  private currentIndex = 0;
  private currentRepetition = 1;
  private isPlaying = false;
  private phase: 'spanish' | 'translation' | 'silence' = 'spanish';

  private config: ShadowEngineConfig = {
    pauseDuration: 2.5,
    repetitions: 1,
    playbackRate: 1.0,
    readTranslation: true,
  };

  private timeoutId: NodeJS.Timeout | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private onStateChangeCb?: (state: {
    currentIndex: number;
    currentRep: number;
    isPlaying: boolean;
    phase: 'spanish' | 'translation' | 'silence';
  }) => void;

  public setSentences(sentences: ShadowSentenceItem[], startIndex = 0) {
    this.sentences = sentences;
    this.currentIndex = Math.max(0, Math.min(startIndex, sentences.length - 1));
  }

  public setConfig(cfg: Partial<ShadowEngineConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  public subscribe(cb: typeof this.onStateChangeCb) {
    this.onStateChangeCb = cb;
  }

  public start() {
    if (this.sentences.length === 0) return;
    this.isPlaying = true;
    this.currentRepetition = 1;
    this.phase = 'spanish';
    this.triggerCurrentPhase();
  }

  public pause() {
    this.isPlaying = false;
    this.cancelSpeech();
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.notify();
  }

  public next() {
    if (this.sentences.length === 0) return;
    this.cancelSpeech();
    this.currentIndex = (this.currentIndex + 1) % this.sentences.length;
    this.currentRepetition = 1;
    this.phase = 'spanish';
    if (this.isPlaying) this.triggerCurrentPhase();
    else this.notify();
  }

  public previous() {
    if (this.sentences.length === 0) return;
    this.cancelSpeech();
    this.currentIndex = (this.currentIndex - 1 + this.sentences.length) % this.sentences.length;
    this.currentRepetition = 1;
    this.phase = 'spanish';
    if (this.isPlaying) this.triggerCurrentPhase();
    else this.notify();
  }

  public selectIndex(idx: number) {
    this.cancelSpeech();
    this.currentIndex = Math.max(0, Math.min(idx, this.sentences.length - 1));
    this.currentRepetition = 1;
    this.phase = 'spanish';
    if (this.isPlaying) this.triggerCurrentPhase();
    else this.notify();
  }

  public playSingle(idx: number) {
    this.cancelSpeech();
    this.currentIndex = Math.max(0, Math.min(idx, this.sentences.length - 1));
    const item = this.sentences[this.currentIndex];
    if (!item) return;

    this.speakText(item.spanish, 'es-ES', this.config.playbackRate, () => {});
  }

  public destroy() {
    this.pause();
  }

  private cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  private triggerCurrentPhase() {
    if (!this.isPlaying) return;
    const item = this.sentences[this.currentIndex];
    if (!item) return;

    this.notify();

    if (this.phase === 'silence') {
      this.timeoutId = setTimeout(() => {
        this.advance();
      }, this.config.pauseDuration * 1000);
      return;
    }

    const isSpanish = this.phase === 'spanish';
    const textToSpeak = isSpanish ? item.spanish : item.translation;
    
    // Automatická volba dialektu podle nastaveného jazyka aplikace
    const langCode = isSpanish
      ? 'es-ES'
      : item.langCode === 'sk'
      ? 'sk-SK'
      : item.langCode === 'en'
      ? 'en-US'
      : 'cs-CZ';

    const rate = isSpanish ? this.config.playbackRate : 1.0;

    this.speakText(textToSpeak, langCode, rate, () => {
      if (!this.isPlaying) return;

      if (this.phase === 'spanish') {
        this.phase = this.config.readTranslation ? 'translation' : 'silence';
        this.triggerCurrentPhase();
      } else if (this.phase === 'translation') {
        this.phase = 'silence';
        this.triggerCurrentPhase();
      }
    });
  }

  private speakText(text: string, langCode: string, rate: number, onEnd: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd();
      return;
    }

    this.cancelSpeech();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = rate;

    // Najdeme nejvhodnější nainstalovaný hlas v systému
    const voices = window.speechSynthesis.getVoices();
    const prefix = langCode.slice(0, 2).toLowerCase();
    const matchedVoice = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // Ochrana před Garbage Collectorem prohlížeče Chrome
    this.currentUtterance = utterance;
    (window as any).__ttsRef = utterance;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.currentUtterance = null;
      (window as any).__ttsRef = null;
      onEnd();
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Bezpečnostní pojistka proti zamrznutí
    const safetyTimeout = Math.max(3000, (text.length / 8) * 1000 + 2000);
    setTimeout(() => {
      if (!finished) finish();
    }, safetyTimeout);

    window.speechSynthesis.speak(utterance);
  }

  private advance() {
    this.phase = 'spanish';
    if (this.currentRepetition < this.config.repetitions) {
      this.currentRepetition += 1;
      this.triggerCurrentPhase();
    } else {
      this.currentRepetition = 1;
      this.currentIndex = (this.currentIndex + 1) % this.sentences.length;
      this.triggerCurrentPhase();
    }
  }

  private notify() {
    if (this.onStateChangeCb) {
      this.onStateChangeCb({
        currentIndex: this.currentIndex,
        currentRep: this.currentRepetition,
        isPlaying: this.isPlaying,
        phase: this.phase,
      });
    }
  }
}