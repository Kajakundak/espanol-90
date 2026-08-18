// src/components/VoiceButton.tsx
'use client';

import { useWhisperTranscription } from '@/lib/audio/use-whisper';
import { soundEngine } from '@/lib/audio/sound-engine';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface VoiceButtonProps {
  onSpeechResult: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceButton({ onSpeechResult, disabled }: VoiceButtonProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const { isRecording, startRecording, stopRecording } = useWhisperTranscription((text) => {
    soundEngine.playTick();
    onSpeechResult(text);
  });

  const handleClick = () => {
    if (isRecording) {
      soundEngine.playTick();
      stopRecording();
    } else {
      soundEngine.playTick();
      startRecording();
    }
  };

  return (
    <div className="relative inline-block">
      {isRecording && <div className="mic-ring" />}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`relative z-10 px-4 py-3 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center gap-2 border ${
          isRecording
            ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
            : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200'
        }`}
        title={t.voiceMicTitle}
      >
        <span className="text-base">{isRecording ? '⏹️' : '🎙️'}</span>
        <span className="hidden sm:inline font-mono">
          {isRecording ? t.voiceListening : t.voiceSpeak}
        </span>
      </button>
    </div>
  );
}