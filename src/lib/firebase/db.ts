import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  increment,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';
import { UserProfile, DailyProgress, TaskKey, TaskState, AppTheme, CEFRLevel, PreferredBaseLanguage } from '@/lib/types';

const INITIAL_TASKS: TaskState = {
  islands: false,
  anki: false,
  input: false,
  book: false,
  speaking: false,
};

export interface IslandProgressSnapshot {
  masteredIds: string[];
  practicedIds: string[];
  totalReps: number;
  stars: Record<string, number>;
  updatedAt: string;
}

// Local storage fallback helpers for smooth instant dev/offline demo testing
const LOCAL_STORAGE_USERS_KEY = 'espanol90_demo_users';
const LOCAL_STORAGE_PROGRESS_KEY = 'espanol90_demo_progress';
const LOCAL_STORAGE_ISLAND_PROGRESS_KEY = 'espanol90_island_progress_';

export function getLocalUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as UserProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }

  const defaultUsers: UserProfile[] = [
    {
      uid: 'user_karel',
      displayName: 'Karel',
      avatar: '🧑‍💻',
      totalPoints: 120,
      currentStreak: 5,
      isOnline: true,
      theme: 'dark',
      preferredBaseLanguage: 'cs',
      startingLevel: 'A1',
    },
    {
      uid: 'user_lucka',
      displayName: 'Lucka',
      avatar: '👩‍💻',
      totalPoints: 90,
      currentStreak: 3,
      isOnline: true,
      theme: 'light',
      preferredBaseLanguage: 'cs',
      startingLevel: 'A2',
    },
  ];
  localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

export function saveLocalUsers(users: UserProfile[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new Event('espanol90_users_updated'));
  }
}

export function saveUserProfile(profile: UserProfile) {
  const users = getLocalUsers();
  const idx = users.findIndex((user) => user.uid === profile.uid);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...profile };
  } else {
    users.push(profile);
  }
  saveLocalUsers(users);
  return users;
}

export function deleteLocalUserProfile(uid: string) {
  const users = getLocalUsers().filter((user) => user.uid !== uid);
  saveLocalUsers(users);
  return users;
}

function getLocalProgress(userId: string, dayNumber: number): DailyProgress {
  if (typeof window === 'undefined') {
    return {
      userId,
      dayNumber,
      tasks: INITIAL_TASKS,
      allCompleted: false,
      pointsEarned: 0,
      updatedAt: new Date().toISOString(),
    };
  }
  const key = `${userId}_day_${dayNumber}`;
  const stored = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
  let map: Record<string, DailyProgress> = {};
  if (stored) {
    try {
      map = JSON.parse(stored);
    } catch {
      map = {};
    }
  }
  if (map[key]) return map[key];

  const initial: DailyProgress = {
    userId,
    dayNumber,
    tasks: INITIAL_TASKS,
    allCompleted: false,
    pointsEarned: 0,
    updatedAt: new Date().toISOString(),
  };
  map[key] = initial;
  localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(map));
  return initial;
}

function saveLocalProgress(progress: DailyProgress) {
  if (typeof window === 'undefined') return;
  const key = `${progress.userId}_day_${progress.dayNumber}`;
  const stored = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
  let map: Record<string, DailyProgress> = {};
  if (stored) {
    try {
      map = JSON.parse(stored);
    } catch {
      map = {};
    }
  }
  map[key] = progress;
  localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('espanol90_progress_updated', { detail: { key, progress } }));
}

// Fetch or initialize user profile
export async function getOrCreateProfile(uid: string, displayName: string): Promise<UserProfile> {
  if (!db) {
    const users = getLocalUsers();
    const existing = users.find((u) => u.uid === uid);
    if (existing) return existing;
    const newProfile: UserProfile = {
      uid,
      displayName,
      totalPoints: 0,
      aiMinutes: 0,
      currentStreak: 1,
      isOnline: true,
    };
    users.push(newProfile);
    saveLocalUsers(users);
    return newProfile;
  }

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const newProfile: UserProfile = {
    uid,
    displayName,
    totalPoints: 0,
    aiMinutes: 0,
    currentStreak: 1,
    isOnline: true,
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

// Subscribe to Leaderboard sorted by totalPoints
export function subscribeLeaderboard(callback: (users: UserProfile[]) => void) {
  if (!db) {
    callback(getLocalUsers());
    const handler = () => callback(getLocalUsers());
    window.addEventListener('espanol90_users_updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('espanol90_users_updated', handler);
      window.removeEventListener('storage', handler);
    };
  }

  const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((d) => d.data() as UserProfile);
    callback(users);
  });
}

// Subscribe to Daily Progress
export function subscribeDailyProgress(
  userId: string,
  dayNumber: number,
  callback: (progress: DailyProgress) => void
) {
  if (!db) {
    const targetKey = `${userId}_day_${dayNumber}`;
    callback(getLocalProgress(userId, dayNumber));

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string; progress: DailyProgress }>;
      if (customEvent.detail && customEvent.detail.key === targetKey) {
        callback(customEvent.detail.progress);
      } else {
        callback(getLocalProgress(userId, dayNumber));
      }
    };

    window.addEventListener('espanol90_progress_updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('espanol90_progress_updated', handler);
      window.removeEventListener('storage', handler);
    };
  }

  const docId = `${userId}_day_${dayNumber}`;
  const docRef = doc(db, 'progress', docId);

  return onSnapshot(docRef, async (snap) => {
    if (snap.exists()) {
      callback(snap.data() as DailyProgress);
    } else {
      const initialProgress: DailyProgress = {
        userId,
        dayNumber,
        tasks: INITIAL_TASKS,
        allCompleted: false,
        pointsEarned: 0,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, initialProgress);
      callback(initialProgress);
    }
  });
}

// Toggle task with point updates
export async function toggleTaskState(
  userId: string,
  dayNumber: number,
  taskKey: TaskKey,
  currentProgress: DailyProgress
) {
  const newTasks = {
    ...currentProgress.tasks,
    [taskKey]: !currentProgress.tasks[taskKey],
  };

  const wasAllCompleted = currentProgress.allCompleted;
  const isNowAllCompleted = Object.values(newTasks).every(Boolean);

  let pointDelta = 0;
  if (newTasks[taskKey]) {
    pointDelta += 10; // +10 for checking
  } else {
    pointDelta -= 10; // -10 for unchecking
  }

  if (!wasAllCompleted && isNowAllCompleted) {
    pointDelta += 20; // +20 Bonus for full day completion
  } else if (wasAllCompleted && !isNowAllCompleted) {
    pointDelta -= 20; // Revoke bonus if unchecking
  }

  if (!db) {
    const updatedProgress: DailyProgress = {
      ...currentProgress,
      tasks: newTasks,
      allCompleted: isNowAllCompleted,
      pointsEarned: currentProgress.pointsEarned + pointDelta,
      updatedAt: new Date().toISOString(),
    };
    saveLocalProgress(updatedProgress);

    const users = getLocalUsers();
    const userIndex = users.findIndex((u) => u.uid === userId);
    if (userIndex !== -1) {
      users[userIndex].totalPoints = Math.max(0, users[userIndex].totalPoints + pointDelta);
      saveLocalUsers(users);
    }
    return;
  }

  const docId = `${userId}_day_${dayNumber}`;
  const progressRef = doc(db, 'progress', docId);
  const userRef = doc(db, 'users', userId);

  await updateDoc(progressRef, {
    tasks: newTasks,
    allCompleted: isNowAllCompleted,
    pointsEarned: increment(pointDelta),
    updatedAt: new Date().toISOString(),
  });

  await updateDoc(userRef, {
    totalPoints: increment(pointDelta),
  });
}

// Award custom points to user (e.g. +5 pts for mastering an island sentence card)
export async function addPointsToUser(userId: string, points: number) {
  if (!db) {
    const users = getLocalUsers();
    const idx = users.findIndex((u) => u.uid === userId);
    if (idx !== -1) {
      users[idx].totalPoints += points;
      saveLocalUsers(users);
    }
    return;
  }
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    totalPoints: increment(points),
  });
}

export async function addAiMinutesToUser(userId: string, minutes: number, pointsPerMinute = 2) {
  if (minutes <= 0 || !userId) return;

  if (!db) {
    const users = getLocalUsers();
    const idx = users.findIndex((u) => u.uid === userId);
    if (idx !== -1) {
      users[idx].aiMinutes = (users[idx].aiMinutes || 0) + minutes;
      users[idx].totalPoints += minutes * pointsPerMinute;
      saveLocalUsers(users);
    }
    return;
  }

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    aiMinutes: increment(minutes),
    totalPoints: increment(minutes * pointsPerMinute),
  });
}

export function getIslandProgressSnapshot(userId: string, categoryId: string): IslandProgressSnapshot {
  if (typeof window === 'undefined') {
    return { masteredIds: [], practicedIds: [], totalReps: 0, stars: {}, updatedAt: new Date().toISOString() };
  }

  const raw = localStorage.getItem(`${LOCAL_STORAGE_ISLAND_PROGRESS_KEY}${userId}_${categoryId}`);
  if (!raw) {
    return { masteredIds: [], practicedIds: [], totalReps: 0, stars: {}, updatedAt: new Date().toISOString() };
  }

  try {
    const parsed = JSON.parse(raw) as IslandProgressSnapshot;
    return {
      masteredIds: parsed.masteredIds || [],
      practicedIds: parsed.practicedIds || [],
      totalReps: parsed.totalReps || 0,
      stars: parsed.stars || {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { masteredIds: [], practicedIds: [], totalReps: 0, stars: {}, updatedAt: new Date().toISOString() };
  }
}

export function saveIslandProgressSnapshot(
  userId: string,
  categoryId: string,
  snapshot: Partial<IslandProgressSnapshot>
) {
  if (typeof window === 'undefined') return;

  const previous = getIslandProgressSnapshot(userId, categoryId);
  const next: IslandProgressSnapshot = {
    masteredIds: snapshot.masteredIds ?? previous.masteredIds,
    practicedIds: snapshot.practicedIds ?? previous.practicedIds,
    totalReps: snapshot.totalReps ?? previous.totalReps,
    stars: snapshot.stars ?? previous.stars,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(`${LOCAL_STORAGE_ISLAND_PROGRESS_KEY}${userId}_${categoryId}`, JSON.stringify(next));

  if (db) {
    const progressRef = doc(db, 'users', userId, 'islandProgress', categoryId);
    setDoc(progressRef, { ...next, categoryId }, { merge: true }).catch((err) => {
      console.warn('Could not save island progress snapshot:', err);
    });
  }
}

// Custom Islands storage & Firestore sync helpers
const LOCAL_STORAGE_CUSTOM_ISLANDS_KEY = 'espanol90_custom_islands_';

export function getCustomIslandsFromStorage(userId: string): any[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_ISLANDS_KEY + userId);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveCustomIslandToStorage(userId: string, customIsland: any) {
  if (typeof window !== 'undefined') {
    const existing = getCustomIslandsFromStorage(userId);
    const updated = [customIsland, ...existing.filter((i: any) => i.categoryId !== customIsland.categoryId)];
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_ISLANDS_KEY + userId, JSON.stringify(updated));
    window.dispatchEvent(new Event('espanol90_custom_islands_updated'));
  }

  if (db) {
    const islandRef = doc(db, 'users', userId, 'customIslands', customIsland.categoryId);
    setDoc(islandRef, customIsland, { merge: true }).catch((err) => {
      console.error('Error saving custom island to Firestore:', err);
    });
  }
}

export async function getCustomIslandsFromFirestore(userId: string): Promise<any[]> {
  const localIslands = getCustomIslandsFromStorage(userId);
  if (!db) return localIslands;

  try {
    const colRef = collection(db, 'users', userId, 'customIslands');
    const snap = await getDocs(colRef);
    const remoteIslands = snap.docs.map((d) => d.data());
    
    // Combine and deduplicate
    const map = new Map();
    localIslands.forEach((item) => map.set(item.categoryId, item));
    remoteIslands.forEach((item) => map.set(item.categoryId, item));
    
    return Array.from(map.values());
  } catch (err) {
    console.warn('Could not fetch custom islands from Firestore:', err);
    return localIslands;
  }
}

export async function saveIslandProgressToFirestore(
  userId: string,
  categoryId: string,
  masteredIds: string[],
  extras: Partial<IslandProgressSnapshot> = {}
) {
  const snapshot: IslandProgressSnapshot = {
    masteredIds,
    practicedIds: extras.practicedIds ?? getIslandProgressSnapshot(userId, categoryId).practicedIds,
    totalReps: extras.totalReps ?? getIslandProgressSnapshot(userId, categoryId).totalReps,
    stars: extras.stars ?? getIslandProgressSnapshot(userId, categoryId).stars,
    updatedAt: new Date().toISOString(),
  };

  saveIslandProgressSnapshot(userId, categoryId, snapshot);

  if (db) {
    try {
      const progressRef = doc(db, 'users', userId, 'islandProgress', categoryId);
      await setDoc(
        progressRef,
        {
          categoryId,
          ...snapshot,
          updatedAt: snapshot.updatedAt,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not save island progress to Firestore:', err);
    }
  }
}

export interface CustomTutorTopic {
  id: string;
  title: string;
  prompt: string;
  level: string;
  createdAt: string;
}

const LOCAL_STORAGE_CUSTOM_TOPICS_KEY = 'espanol90_custom_tutor_topics_';

export function getCustomTutorTopicsFromStorage(userId: string): CustomTutorTopic[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TOPICS_KEY + userId);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveCustomTutorTopic(userId: string, topic: CustomTutorTopic) {
  if (typeof window !== 'undefined') {
    const existing = getCustomTutorTopicsFromStorage(userId);
    const updated = [topic, ...existing.filter((t) => t.id !== topic.id)];
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_TOPICS_KEY + userId, JSON.stringify(updated));
    window.dispatchEvent(new Event('espanol90_custom_topics_updated'));
  }

  if (db) {
    try {
      const topicRef = doc(db, 'users', userId, 'customTutorTopics', topic.id);
      await setDoc(topicRef, topic, { merge: true });
    } catch (err) {
      console.warn('Could not save custom topic to Firestore:', err);
    }
  }
}

export async function getCustomTutorTopics(userId: string): Promise<CustomTutorTopic[]> {
  const localTopics = getCustomTutorTopicsFromStorage(userId);
  if (!db) return localTopics;

  try {
    const colRef = collection(db, 'users', userId, 'customTutorTopics');
    const snap = await getDocs(colRef);
    const remoteTopics = snap.docs.map((d) => d.data() as CustomTutorTopic);

    const map = new Map<string, CustomTutorTopic>();
    localTopics.forEach((t) => map.set(t.id, t));
    remoteTopics.forEach((t) => map.set(t.id, t));

    return Array.from(map.values());
  } catch (err) {
    console.warn('Could not fetch custom topics from Firestore:', err);
    return localTopics;
  }
}

export interface TutorMemory {
  id: string;
  topic: string;
  summary: string;
  userFacts: string[];
  createdAt: string;
}

const LOCAL_STORAGE_TUTOR_MEMORIES_KEY = 'espanol90_tutor_memories_';

export function getTutorMemoriesFromStorage(userId: string): TutorMemory[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_TUTOR_MEMORIES_KEY + userId);
  if (stored) {
    try { return JSON.parse(stored); } catch { return []; }
  }
  return [];
}

export async function saveTutorMemory(userId: string, memory: TutorMemory) {
  if (typeof window !== 'undefined') {
    const existing = getTutorMemoriesFromStorage(userId);
    const updated = [memory, ...existing.filter((m) => m.id !== memory.id)];
    localStorage.setItem(LOCAL_STORAGE_TUTOR_MEMORIES_KEY + userId, JSON.stringify(updated));
    window.dispatchEvent(new Event('espanol90_tutor_memories_updated'));
  }

  if (db) {
    try {
      const memoryRef = doc(db, 'users', userId, 'tutorMemories', memory.id);
      await setDoc(memoryRef, memory, { merge: true });
    } catch (err) {
      console.warn('Could not save tutor memory to Firestore:', err);
    }
  }
}

export async function getTutorMemories(userId: string): Promise<TutorMemory[]> {
  const localMemories = getTutorMemoriesFromStorage(userId);
  if (!db) return localMemories;

  try {
    const colRef = collection(db, 'users', userId, 'tutorMemories');
    const snap = await getDocs(colRef);
    const remoteMemories = snap.docs.map((d) => d.data() as TutorMemory);

    const map = new Map<string, TutorMemory>();
    localMemories.forEach((m) => map.set(m.id, m));
    remoteMemories.forEach((m) => map.set(m.id, m));

    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Could not fetch tutor memories from Firestore:', err);
    return localMemories;
  }
}

