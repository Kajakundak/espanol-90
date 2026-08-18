'use client';

import { useState, useRef } from 'react';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { soundEngine } from '@/lib/audio/sound-engine';
import confetti from 'canvas-confetti';

interface AvatarGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onAvatarGenerated: (avatarDataUri: string) => void;
}

const STYLES = [
  { id: 'flamenco', label: '💃 Flamenco Star', desc: 'Vášnivý španělský tanečník / tanečnice' },
  { id: 'torero', label: '🐂 El Matador', desc: 'Zlatem vyšívaný toreadorský oblek' },
  { id: 'chef', label: '👨‍🍳 Mistr Paelly', desc: 'Šéfkuchař vyhlášeného tapas baru' },
  { id: 'quixote', label: '🛡️ Don Quijote', desc: 'Legendární rytíř bojující s větrnými mlýny' },
  { id: 'madrid', label: '🕶️ Madrid Cool', desc: 'Stylový obyvatel slunného Madridu' },
];

export default function AvatarGeneratorModal({
  isOpen,
  onClose,
  userName,
  onAvatarGenerated,
}: AvatarGeneratorModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [selectedStyle, setSelectedStyle] = useState('flamenco');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSvgUri, setGeneratedSvgUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vyberte prosím obrázek (JPEG nebo PNG).');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
      soundEngine.playTick();
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imageBase64) {
      setError('Nejprve nahrajte svou fotku nebo selfie.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedSvgUri(null);
    soundEngine.playTick();

    try {
      const res = await fetch('/api/ai/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          style: selectedStyle,
          userName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generování selhalo');

      setGeneratedSvgUri(data.dataUri);
      soundEngine.playVictoryFanfare();
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setError(err?.message || 'Nastala chyba při tvorbě avatara.');
      soundEngine.playUntick();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAvatar = () => {
    if (!generatedSvgUri) return;
    soundEngine.playTick();
    onAvatarGenerated(generatedSvgUri);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xl animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-scale-in">
        
        {/* ── 1. Fixed Header ── */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 sm:px-7 py-4 bg-[var(--card-bg-hover)] shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">✨</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-emerald)] font-mono">
                Gemini AI Stylizer
              </p>
              <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                Vytvořit Španělského Kresleného Avatara
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUntick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg-hover)] transition flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ── 2. Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar text-xs sm:text-sm">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Upload Box / Image Preview */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
              1. Nahrajte své selfie nebo fotku obličeje
            </label>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--card-border)] hover:border-[var(--accent-emerald)]/50 bg-[var(--card-bg-hover)] rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <span className="text-3xl">📸</span>
                <p className="font-bold text-xs text-[var(--text-primary)]">
                  Klikněte pro nahrání fotky (selfie)
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  PNG, JPEG nebo WebP (max 5 MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-[var(--card-bg-hover)] p-3 rounded-2xl border border-[var(--card-border)]">
                <img
                  src={imagePreview}
                  alt="Selfie preview"
                  className="w-16 h-16 rounded-xl object-cover border border-white/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">Fotka připravena</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">AI zanalyzuje rysy tvého obličeje</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                >
                  Změnit
                </button>
              </div>
            )}
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
              2. Zvolte španělský motiv karikatury
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTick();
                    setSelectedStyle(st.id);
                  }}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedStyle === st.id
                      ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)]/15 shadow-sm'
                      : 'border-[var(--card-border)] bg-[var(--card-bg-hover)] hover:border-white/20'
                  }`}
                >
                  <span className="font-extrabold text-xs text-[var(--text-primary)]">{st.label}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generating Animation Box */}
          {isGenerating && (
            <div className="p-6 rounded-2xl bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/30 text-center space-y-3 animate-pulse">
              <div className="animate-spin w-8 h-8 border-3 border-[var(--accent-emerald)] border-t-transparent rounded-full mx-auto" />
              <p className="font-bold text-xs text-[var(--accent-emerald)] font-mono">
                🎨 Gemini kreslí tvou španělskou karikaturu...
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Vyladění toreadorského pláště, účesu a barevné palety.
              </p>
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedSvgUri && !isGenerating && (
            <div className="p-5 rounded-2xl bg-[var(--card-bg-hover)] border border-[var(--accent-emerald)]/40 text-center space-y-3">
              <span className="apple-pill-badge bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                ✓ Avatar úspěšně vygenerován!
              </span>
              <div className="w-36 h-36 mx-auto rounded-full overflow-hidden border-2 border-[var(--accent-emerald)] shadow-xl bg-slate-950 p-1 flex items-center justify-center">
                <img
                  src={generatedSvgUri}
                  alt="Generated AI Avatar"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>
          )}

        </div>

        {/* ── 3. Bottom Sticky Action Bar ── */}
        <div className="border-t border-[var(--card-border)] px-5 sm:px-7 py-3.5 bg-[var(--card-bg-hover)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            {t.cancel}
          </button>

          {!generatedSvgUri ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !imageBase64}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isGenerating ? 'Kreslím...' : '✨ Vygenerovat Avatara'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyAvatar}
              className="px-6 py-2.5 rounded-full bg-[var(--accent-emerald)] hover:opacity-90 text-black font-black text-xs transition cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              ✓ Použít jako můj avatar
            </button>
          )}
        </div>

      </div>
    </div>
  );
}