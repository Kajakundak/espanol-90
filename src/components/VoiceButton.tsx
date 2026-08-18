'use client';

import { useVoiceInput } from '@/lib/audio/tts';
import { soundEngine } from '@/lib/audio/sound-engine';

interface VoiceButtonProps {
  onSpeechResult: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceButton({ onSpeechResult, disabled }: VoiceButtonProps) {
  const { isListening, isSupported, error, startListening } = useVoiceInput((text) => {
    soundEngine.playTick();
    onSpeechResult(text);
  });

  const handleClick = () => {
    if (isListening) return;
    soundEngine.playTick();
    startListening();
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative inline-block">
      {isListening && <div className="mic-ring" />}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isListening}
        className={`relative z-10 px-4 py-3 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center gap-2 border ${
          isListening
            ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
            : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200'
        }`}
        title="Mluv španělsky do mikrofonu (Web Speech API)"
      >
        <span className="text-base">{isListening ? '🔴' : '🎙️'}</span>
        <span className="hidden sm:inline font-mono">
          {isListening ? 'Poslouchám...' : 'Mluvit'}
        </span>
      </button>

      {error && (
        <div className="absolute bottom-full mb-2 left-0 right-0 whitespace-nowrap bg-rose-950 border border-rose-500/40 text-rose-200 text-[10px] px-2 py-1 rounded-md z-50">
          {error}
        </div>
      )}
    </div>
  );
}
