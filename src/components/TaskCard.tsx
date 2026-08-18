'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface TaskCardProps {
  id: string;
  title: string;
  duration: string;
  icon: string;
  completed: boolean;
  onToggle: (id: string) => void;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export default function TaskCard({
  id,
  title,
  duration,
  icon,
  completed,
  onToggle,
  actionHref,
  actionLabel,
  onActionClick,
}: TaskCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.005 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full p-4 sm:p-5 rounded-3xl border text-left transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
        completed
          ? 'bg-[var(--card-bg)] border-[var(--accent-emerald)]/40 shadow-sm'
          : 'apple-card-interactive'
      }`}
    >
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
        <div
          onClick={() => onToggle(id)}
          className={`w-14 h-14 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors cursor-pointer shrink-0 ${
            completed
              ? 'bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]'
              : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
          }`}
          aria-label={title}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            onClick={() => onToggle(id)}
            className={`font-bold text-sm sm:text-base transition-colors cursor-pointer ${
              completed ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-1 line-clamp-2 sm:line-clamp-1">{duration}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end w-full sm:w-auto">
        {(actionHref || actionLabel || onActionClick) && (
          actionHref ? (
            <Link
              href={actionHref}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] sm:min-h-auto"
            >
              <span>🚀</span> <span className="hidden sm:inline">{actionLabel || 'Spustit'}</span>
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] sm:min-h-auto"
            >
              <span>🚀</span> <span className="hidden sm:inline">{actionLabel || 'Otevřít'}</span>
            </button>
          )
        )}

        <button
          onClick={() => onToggle(id)}
          className={`w-11 h-11 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
            completed
              ? 'bg-[var(--accent-emerald)] border-[var(--accent-emerald)] text-black font-extrabold shadow-md'
              : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)] text-[var(--text-muted)]'
          }`}
          title={completed ? 'Hotovo (kliknutím zrušíš)' : 'Označit jako hotové'}
        >
          {completed ? <span className="text-base sm:text-sm">✓</span> : <span className="text-sm">○</span>}
        </button>
      </div>
    </motion.div>
  );
}
