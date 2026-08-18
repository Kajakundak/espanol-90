'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { subscribeLeaderboard } from '@/lib/firebase/db';

export function useLeaderboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeLeaderboard((data) => {
      setUsers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { users, loading };
}
