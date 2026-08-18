'use client';

import { useState, useEffect } from 'react';
import { DailyProgress, TaskKey } from '@/lib/types';
import { subscribeDailyProgress, toggleTaskState } from '@/lib/firebase/db';

export function useProgress(userId: string, dayNumber: number) {
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const unsubscribe = subscribeDailyProgress(userId, dayNumber, (data) => {
      setProgress(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, dayNumber]);

  const toggleTask = async (taskKey: TaskKey) => {
    if (!progress) return;
    await toggleTaskState(userId, dayNumber, taskKey, progress);
  };

  return { progress, loading, toggleTask };
}
