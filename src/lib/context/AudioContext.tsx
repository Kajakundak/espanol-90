'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ttsEngine } from '@/lib/audio/tts';
import { resolveAudioCandidateUrls, createSilenceDataUri } from '@/lib/audio/audio-urls';

export interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  onSeekTo?: (time: number) => void;
}

export interface PlayOptions {
  playbackRate?: number;
  loop?: boolean;
  fallbackText?: string;
}

interface AudioContextValue {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLooping: boolean;
  play: (urlOrFilename: string | string[], options?: PlayOptions) => Promise<void>;
  playSilence: (seconds: number) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  seekTo: (timeInSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setLoop: (loop: boolean) => void;
  setMediaSessionMetadata: (meta: { title: string; artist?: string; album?: string; artworkUrl?: string }) => void;
  setMediaSessionHandlers: (handlers: MediaSessionHandlers) => void;
  onEnded: (cb: () => void) => () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endedListenersRef = useRef<Set<() => void>>(new Set());
  const handlersRef = useRef<MediaSessionHandlers>({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'auto';
    (audio as any).playsInline = true;
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    const onPause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };
    const onEnded = () => {
      endedListenersRef.current.forEach((cb) => {
        try { cb(); } catch (e) { console.error('Audio ended listener error:', e); }
      });
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const setMediaSessionMetadata = useCallback((meta: { title: string; artist?: string; album?: string; artworkUrl?: string }) => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist || 'Español 90',
      album: meta.album || 'Spanish Training',
      artwork: [
        { src: meta.artworkUrl || '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }, []);

  const setMediaSessionHandlers = useCallback((handlers: MediaSessionHandlers) => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    handlersRef.current = handlers;

    const actionMap: [MediaSessionAction, (() => void) | undefined][] = [
      ['play', () => handlersRef.current.onPlay?.()],
      ['pause', () => handlersRef.current.onPause?.()],
      ['nexttrack', () => handlersRef.current.onNextTrack?.()],
      ['previoustrack', () => handlersRef.current.onPrevTrack?.()],
    ];

    actionMap.forEach(([action, handler]) => {
      try {
        if (handler) {
          navigator.mediaSession.setActionHandler(action, handler);
        } else {
          navigator.mediaSession.setActionHandler(action, null);
        }
      } catch (e) {
        // Starší prohlížeče nemusí podporovat všechny akce
      }
    });

    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && handlersRef.current.onSeekTo) {
          handlersRef.current.onSeekTo(details.seekTime);
        } else if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    } catch {}
  }, []);

  // uvnitř src/lib/context/AudioContext.tsx (nahraďte pouze definici play)

  const play = useCallback(async (urlOrFilename: string | string[], options: PlayOptions = {}) => {
    const audio = audioRef.current;
    if (!audio) return;

    let finalUrl = '';
    if (Array.isArray(urlOrFilename)) {
      finalUrl = urlOrFilename[0];
    } else if (urlOrFilename.startsWith('http') || urlOrFilename.startsWith('data:')) {
      finalUrl = urlOrFilename;
    } else {
      finalUrl = resolveAudioCandidateUrls(urlOrFilename)[0];
    }

    audio.playbackRate = options.playbackRate ?? playbackRate;
    audio.loop = options.loop ?? isLooping;
    audio.src = finalUrl;
    audio.load();

    try {
      await audio.play();
    } catch (err) {
      console.warn(`Přehrání selhalo pro ${finalUrl}`, err);
      // Pokud MP3 skutečně neexistuje, přeskočíme dál, aby se aplikace nezasekla
      setTimeout(() => {
        endedListenersRef.current.forEach((cb) => cb());
      }, 500);
    }
  }, [playbackRate, isLooping]);

  const playSilence = useCallback(async (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const silenceUri = createSilenceDataUri(seconds);
    audio.playbackRate = 1.0;
    audio.loop = false;
    audio.src = silenceUri;
    try {
      await audio.play();
    } catch (e) {
      // Pokud dojde k chybě, probudíme ended listeners časovačem
      setTimeout(() => {
        endedListenersRef.current.forEach((cb) => cb());
      }, seconds * 1000);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    try {
      await audioRef.current?.play();
    } catch (e) {
      console.warn('Resume failed', e);
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (audioRef.current && isFinite(seconds)) {
      audioRef.current.currentTime = Math.max(0, Math.min(seconds, audioRef.current.duration || 0));
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    setIsLooping(loop);
    if (audioRef.current) audioRef.current.loop = loop;
  }, []);

  const onEnded = useCallback((cb: () => void) => {
    endedListenersRef.current.add(cb);
    return () => {
      endedListenersRef.current.delete(cb);
    };
  }, []);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        isLooping,
        play,
        playSilence,
        pause,
        resume,
        seekTo,
        setPlaybackRate,
        setLoop,
        setMediaSessionMetadata,
        setMediaSessionHandlers,
        onEnded,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within an AudioProvider');
  return ctx;
}
