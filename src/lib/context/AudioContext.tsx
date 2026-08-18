'use client';

import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';

interface AudioContextType {
  play: (url: string, options?: { playbackRate?: number; loop?: boolean }) => Promise<void>;
  pause: () => void;
  stop: () => void;
  setPlaybackRate: (rate: number) => void;
  setLoop: (loop: boolean) => void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (listener: (time: number) => void) => void;
  onDurationChange: (listener: (duration: number) => void) => void;
  onEnded: (listener: () => void) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

/**
 * AudioProvider enables background audio playback on mobile devices
 * Audio continues playing when screen is locked (like Spotify)
 * Single audio instance shared across the app
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const timeUpdateListeners = useRef<Set<(time: number) => void>>(new Set());
  const durationChangeListeners = useRef<Set<(duration: number) => void>>(new Set());
  const endedListeners = useRef<Set<() => void>>(new Set());

  // Initialize audio element with background playback support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a single shared audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();

      // Enable background audio on iOS/Android
      // This requires the audio element to be in the DOM but hidden
      audioRef.current.style.display = 'none';
      document.body.appendChild(audioRef.current);

      // Set CORS for remote MP3s
      audioRef.current.crossOrigin = 'anonymous';

      // Handle time updates
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
        timeUpdateListeners.current.forEach((listener) => {
          listener(audioRef.current?.currentTime || 0);
        });
      });

      // Handle duration change
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
        durationChangeListeners.current.forEach((listener) => {
          listener(audioRef.current?.duration || 0);
        });
      });

      // Handle ended
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        endedListeners.current.forEach((listener) => {
          listener();
        });
      });

      // Handle play
      audioRef.current.addEventListener('play', () => {
        setIsPlaying(true);
      });

      // Handle pause
      audioRef.current.addEventListener('pause', () => {
        setIsPlaying(false);
      });
    }

    return () => {
      // Don't remove audio on unmount - keep it alive for background playback
    };
  }, []);

  const play = useCallback(async (url: string, options?: { playbackRate?: number; loop?: boolean }) => {
    if (!audioRef.current) return;

    try {
      audioRef.current.src = url;
      if (options?.playbackRate) {
        audioRef.current.playbackRate = options.playbackRate;
      }
      if (options?.loop !== undefined) {
        audioRef.current.loop = options.loop;
      }
      await audioRef.current.play();
    } catch (error) {
      console.warn('Audio playback error:', error);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const setPlaybackRateCallback = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setLoopCallback = useCallback((loop: boolean) => {
    if (audioRef.current) {
      audioRef.current.loop = loop;
    }
  }, []);

  const onTimeUpdate = useCallback((listener: (time: number) => void) => {
    timeUpdateListeners.current.add(listener);
    return () => {
      timeUpdateListeners.current.delete(listener);
    };
  }, []);

  const onDurationChange = useCallback((listener: (duration: number) => void) => {
    durationChangeListeners.current.add(listener);
    return () => {
      durationChangeListeners.current.delete(listener);
    };
  }, []);

  const onEnded = useCallback((listener: () => void) => {
    endedListeners.current.add(listener);
    return () => {
      endedListeners.current.delete(listener);
    };
  }, []);

  const value: AudioContextType = {
    play,
    pause,
    stop,
    setPlaybackRate: setPlaybackRateCallback,
    setLoop: setLoopCallback,
    currentTime,
    duration,
    isPlaying,
    onTimeUpdate,
    onDurationChange,
    onEnded,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
