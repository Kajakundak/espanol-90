// src/components/islands/CustomIslandModal.tsx
'use client';

import { useState } from 'react';
import { IslandCategory, IslandSentence } from '@/lib/data/islands-parser';
import { saveCustomIslandToStorage } from '@/lib/firebase/db';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface CustomIslandModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newCategory: IslandCategory) => void;
}

const ICONS = ['🏝️', '✈️', '🍕', '💼', '🚗', '⚽', '🎵', '🛍️', '🏥', '💬'];

export default function CustomIslandModal({
  userId,
  isOpen,
  onClose,
  onSaved,
}: CustomIslandModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'A1' | 'A2' | 'B1'>('A1');
  const [icon, setIcon] = useState('🏝️');
  const [rawSentences, setRawSentences] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t.customIslandErrorName);
      return;
    }

    const lines = rawSentences
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setError(t.customIslandErrorSentences);
      return;
    }

    const categoryId = `custom_${Date.now()}`;
    const parsedSentences: IslandSentence[] = lines.map((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      const es = parts[0];
      const en = parts[1] || `${es}`;
      return {
        id: `${categoryId}_${idx + 1}`,
        es,
        en,
        category: categoryId,
        difficulty,
      };
    });

    const newCategory: IslandCategory = {
      categoryId,
      title: title.trim(),
      description: description.trim() || title.trim(),
      icon,
      difficulty,
      sentenceCount: parsedSentences.length,
      sentences: parsedSentences,
    };

    saveCustomIslandToStorage(userId, newCategory);
    onSaved(newCategory);
    onClose();

    setTitle('');
    setDescription('');
    setRawSentences('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xl animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl flex flex-col overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition p-2 rounded-full hover:bg-[var(--card-bg-hover)] cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <span className="text-4xl">{icon}</span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              {t.customIslandTitle}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {t.customIslandSubtitle}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              {t.customIslandNameLabel}
            </label>
            <input
              type="text"
              placeholder={t.customIslandNamePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-[var(--accent-emerald)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              {t.customIslandDescLabel}
            </label>
            <input
              type="text"
              placeholder={t.customIslandDescPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-[var(--accent-emerald)] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                {t.customIslandDiffLabel}
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'A1' | 'A2' | 'B1')}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-emerald)] transition"
              >
                <option value="A1">{t.customIslandDiffA1}</option>
                <option value="A2">{t.customIslandDiffA2}</option>
                <option value="B1">{t.customIslandDiffB1}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                {t.customIslandIconLabel}
              </label>
              <div className="flex space-x-1 overflow-x-auto p-1 bg-[var(--card-bg-hover)] border border-[var(--card-border)] rounded-xl">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`p-1.5 rounded-lg text-base transition cursor-pointer ${
                      icon === ic ? 'bg-emerald-500/30 border border-emerald-400' : 'hover:bg-white/10'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              {t.customIslandSentencesLabel}
            </label>
            <textarea
              rows={5}
              placeholder={`Vivo en Praga. | Bydlím v Praze.\nMe gusta viajar. | Rád cestuji.`}
              value={rawSentences}
              onChange={(e) => setRawSentences(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono text-xs focus:outline-none focus:border-[var(--accent-emerald)] transition"
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {t.customIslandTip}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--card-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer"
            >
              {t.customIslandSubmitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}