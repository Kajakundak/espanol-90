'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnkiCard } from '@/lib/types';
import { soundEngine } from '@/lib/audio/sound-engine';
import { ttsEngine } from '@/lib/audio/tts';
import { PREPARSED_ISLANDS } from '@/lib/data/islands-data';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface AnkiPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDay?: number;
  cards?: AnkiCard[];
}

export default function AnkiPracticeModal({ isOpen, onClose, currentDay = 1 }: AnkiPracticeModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);
  const langKey = language === 'sk' ? 'sk' : language === 'en' ? 'en' : 'cs';

  // Sestavení balíčku karet z přeložených vět
  const islandCards = useMemo(() => {
    const allSentences = PREPARSED_ISLANDS.flatMap((cat) => cat.sentences);
    const unlockedCount = Math.min(allSentences.length, 10 + currentDay * 5);
    const sliced = allSentences.slice(0, unlockedCount);

    return sliced.map((s, i) => {
      const translation = s.translations?.[langKey] || s.en || s.es;
      const isCloze = i % 3 === 1;
      const isRecognition = i % 3 === 2;
      const cardType: 'production' | 'recognition' | 'cloze' = isCloze ? 'cloze' : isRecognition ? 'recognition' : 'production';
      return {
        id: s.id || `island-card-${i}`,
        spanishSentence: s.es,
        clozeDeletion: s.es.replace(/\b(\w{4,})\b/, '{{c1::$1}}'),
        englishTranslation: translation,
        createdAt: new Date().toISOString(),
        cardType,
        promptText: cardType === 'production' ? translation : cardType === 'cloze' ? s.es.replace(/\b(\w{4,})\b/, '___') : s.es,
      };
    });
  }, [langKey, currentDay]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionScore, setSessionScore] = useState({ reviewCount: 0, recalled: 0 });
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledDeck, setShuffledDeck] = useState<typeof islandCards | null>(null);

  const toggleShuffle = () => {
    soundEngine.playTick();
    if (!isShuffled) {
      const randomized = [...islandCards].sort(() => Math.random() - 0.5);
      setShuffledDeck(randomized);
      setIsShuffled(true);
    } else {
      setShuffledDeck(null);
      setIsShuffled(false);
    }
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const deck = isShuffled && shuffledDeck ? shuffledDeck : islandCards;
  const currentCard = deck[currentIndex];

  const handleReveal = () => {
    soundEngine.playTick();
    setShowAnswer(true);
    if (currentCard) {
      ttsEngine.speak(currentCard.spanishSentence);
    }
  };

  const handleRating = (rating: 'again' | 'good' | 'easy') => {
    if (rating === 'again') {
      soundEngine.playUntick();
    } else {
      soundEngine.playTick();
      setSessionScore((s) => ({ ...s, recalled: s.recalled + 1 }));
    }

    setSessionScore((s) => ({ ...s, reviewCount: s.reviewCount + 1 }));
    setShowAnswer(false);

    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      soundEngine.playVictoryFanfare();
      setCurrentIndex(0);
    }
  };

  if (!isOpen || !currentCard) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="apple-glass w-full max-w-lg p-6 relative bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer w-8 h-8 rounded-full bg-[var(--card-bg-hover)] border border-[var(--card-border)] flex items-center justify-center transition"
          >
            ✕
          </button>

          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3 mb-4 pr-8">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🧠</span>
              <h2 className="font-bold text-[var(--text-primary)] text-sm sm:text-base">{t.ankiTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleShuffle}
                className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  isShuffled
                    ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                    : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={isShuffled ? t.originalOrder : t.shuffleOrder}
              >
                <span>🔀</span>
                <span>{isShuffled ? t.shuffleOrder : t.originalOrder}</span>
              </button>
              {/* Vysoce čitelný štítek s počtem karet */}
              <span className="text-xs font-mono font-bold text-white bg-purple-600 px-3 py-1 rounded-full shadow-sm shrink-0">
                {currentIndex + 1} / {deck.length}
              </span>
            </div>
          </div>

          {/* Card Viewport */}
          <div className="bg-[var(--card-bg-hover)] border border-[var(--card-border)] rounded-2xl p-6 text-center space-y-4 min-h-[230px] flex flex-col justify-center items-center shadow-inner relative overflow-hidden">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-500/15 px-3 py-1 rounded-full border border-purple-500/30">
              {currentCard.cardType === 'production'
                ? t.productionPrompt
                : currentCard.cardType === 'cloze'
                ? t.clozePrompt
                : t.recognitionPrompt}
            </div>

            <div className="text-xl font-black text-[var(--text-primary)] px-2 leading-relaxed">
              {currentCard.cardType === 'cloze'
                ? currentCard.clozeDeletion.replace(/\{\{c\d+::(.*?)\}\}/g, '___')
                : currentCard.promptText}
            </div>

            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 pt-3 border-t border-[var(--card-border)] w-full"
              >
                <div className="text-2xl font-bold text-emerald-400 flex items-center justify-center gap-2">
                  <span>{currentCard.spanishSentence}</span>
                  <button
                    onClick={() => ttsEngine.speak(currentCard.spanishSentence)}
                    className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm cursor-pointer border border-emerald-500/30 transition"
                    title="Poslech"
                  >
                    🔊
                  </button>
                </div>
                <div className="text-xs text-[var(--text-secondary)] font-medium">
                  {t.translationLabel} {currentCard.englishTranslation}
                </div>
              </motion.div>
            )}
          </div>

          {/* Controls */}
          {!showAnswer ? (
            <button
              onClick={handleReveal}
              className="w-full mt-4 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 font-black text-white text-sm transition cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              {t.showAnswer}
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <button
                onClick={() => handleRating('again')}
                className="py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition cursor-pointer hover:scale-105 active:scale-95"
              >
                {t.ratingAgain}
              </button>
              <button
                onClick={() => handleRating('good')}
                className="py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition cursor-pointer hover:scale-105 active:scale-95"
              >
                {t.ratingGood}
              </button>
              <button
                onClick={() => handleRating('easy')}
                className="py-3 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs transition cursor-pointer hover:scale-105 active:scale-95"
              >
                {t.ratingEasy}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}