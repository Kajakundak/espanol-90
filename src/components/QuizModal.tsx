// src/components/QuizModal.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '@/lib/audio/sound-engine';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import confetti from 'canvas-confetti';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteQuiz: (bonusPoints: number) => void;
}

export default function QuizModal({ isOpen, onClose, onCompleteQuiz }: QuizModalProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const fetchQuiz = async () => {
    setLoading(true);
    setFinished(false);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);

    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const data = await res.json();
      if (data.quiz) setQuiz(data.quiz);
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);

    const isCorrect = idx === quiz[currentIndex].correctIndex;
    if (isCorrect) {
      soundEngine.playTick();
      setScore((s) => s + 1);
    } else {
      soundEngine.playUntick();
    }

    setTimeout(() => {
      if (currentIndex + 1 < quiz.length) {
        setCurrentIndex((c) => c + 1);
        setSelectedOption(null);
      } else {
        setFinished(true);
        const finalScore = score + (isCorrect ? 1 : 0);
        const bonus = finalScore * 5;
        if (bonus > 0) {
          soundEngine.playVictoryFanfare();
          try {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          } catch {
            // ignore
          }
        }
        onCompleteQuiz(bonus);
      }
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="apple-glass w-full max-w-lg p-6 relative bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] shadow-2xl rounded-3xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer w-8 h-8 rounded-full bg-[var(--card-bg-hover)] border border-[var(--card-border)] flex items-center justify-center transition"
          >
            ✕
          </button>

          {quiz.length === 0 && !loading && (
            <div className="text-center py-8 space-y-4">
              <span className="text-5xl">⚡</span>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t.quizTitle}</h2>
              <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">
                {t.quizSubtitle}
              </p>
              <button
                onClick={fetchQuiz}
                className="px-6 py-3 rounded-2xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400 transition cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              >
                {t.quizStartBtn}
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 space-y-3">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm font-mono text-emerald-400">{t.quizLoading}</p>
            </div>
          )}

          {quiz.length > 0 && !finished && !loading && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs font-mono text-[var(--text-secondary)]">
                <span>
                  {t.quizQuestionCount} {currentIndex + 1} {t.quizOf} {quiz.length}
                </span>
                <span>{t.quizCurrentBonus} {score * 5} {t.quizPts}</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{quiz[currentIndex].question}</h3>
              <div className="space-y-3">
                {quiz[currentIndex].options.map((opt, idx) => {
                  let btnStyle = 'bg-[var(--card-bg-hover)] border-[var(--card-border)] text-[var(--text-primary)] hover:border-white/20';
                  if (selectedOption !== null) {
                    if (idx === quiz[currentIndex].correctIndex)
                      btnStyle =
                        'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
                    else if (idx === selectedOption)
                      btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-400';
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={selectedOption !== null}
                      className={`w-full p-4 rounded-2xl text-left font-medium border transition cursor-pointer text-xs sm:text-sm ${btnStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {finished && (
            <div className="text-center py-8 space-y-4">
              <span className="text-5xl">🏆</span>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t.quizCompleted}</h2>
              <p className="text-emerald-400 font-bold text-lg">
                +{score * 5} {t.quizBonusEarned}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl bg-[var(--card-bg-hover)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] font-semibold text-xs text-[var(--text-primary)] cursor-pointer transition"
              >
                {t.close}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}