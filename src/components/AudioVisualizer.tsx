'use client';

import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  isThinking: boolean;
}

export default function AudioVisualizer({ isThinking }: AudioVisualizerProps) {
  const bars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center justify-center gap-1.5 h-8 px-4 py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-full backdrop-blur-md">
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className="w-1 bg-indigo-400 rounded-full"
          animate={{
            height: isThinking ? [8, 24, 12, 28, 8] : 8,
          }}
          transition={{
            duration: 0.8,
            repeat: isThinking ? Infinity : 0,
            repeatType: 'reverse',
            delay: bar * 0.15,
          }}
        />
      ))}
      <span className="text-xs font-mono text-indigo-300 ml-2">
        {isThinking ? 'AI Thinking...' : 'Ready'}
      </span>
    </div>
  );
}
