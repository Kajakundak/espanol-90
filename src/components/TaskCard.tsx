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
      className={`w-full p-5 rounded-3xl border text-left transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        completed
          ? 'bg-[var(--card-bg)] border-[var(--accent-emerald)]/40 shadow-sm'
          : 'apple-card-interactive'
      }`}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div
          onClick={() => onToggle(id)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors cursor-pointer shrink-0 ${
            completed
              ? 'bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]'
              : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
          }`}
          aria-label={title}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3
            onClick={() => onToggle(id)}
            className={`font-bold text-base transition-colors cursor-pointer ${
              completed ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">{duration}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-between sm:justify-end">
        {(actionHref || actionLabel || onActionClick) && (
          actionHref ? (
            <Link
              href={actionHref}
              className="px-4 py-2 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>🚀</span> {actionLabel || 'Spustit'}
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="px-4 py-2 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>🚀</span> {actionLabel || 'Otevřít'}
            </button>
          )
        )}

        <button
          onClick={() => onToggle(id)}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            completed
              ? 'bg-[var(--accent-emerald)] border-[var(--accent-emerald)] text-black font-extrabold shadow-md'
              : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)] text-[var(--text-muted)]'
          }`}
          title={completed ? 'Hotovo (kliknutím zrušíš)' : 'Označit jako hotové'}
        >
          {completed ? <span className="text-sm">✓</span> : <span className="text-xs">○</span>}
        </button>
      </div>
    </motion.div>
  );
}
