'use client';

import { motion } from 'framer-motion';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';

interface ProgressRingProps {
  currentDay: number; // 1 to 90
  totalDays?: number;
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({
  currentDay,
  totalDays = 90,
  size = 150,
  strokeWidth = 10,
}: ProgressRingProps) {
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (currentDay / totalDays) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--card-border)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradientRing)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          fill="transparent"
        />
        <defs>
          <linearGradient id="gradientRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-emerald)" />
            <stop offset="100%" stopColor="var(--accent-cyan)" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center Text */}
      <div className="absolute text-center">
        <span className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight block leading-none">
          {currentDay}
        </span>
        <span className="text-[11px] text-[var(--text-secondary)] font-semibold mt-1 block">
          / {totalDays} {t.daysCount}
        </span>
      </div>
    </div>
  );
}