'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { UserProfile, AppTheme, PreferredBaseLanguage, CEFRLevel } from '@/lib/types';
import { getLocalUsers, saveLocalUsers } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/config';

interface UserContextType {
  userId: string;
  setUserId: (id: string) => void;
  switchUser: () => void;
  profiles: UserProfile[];
  createProfile: (input: {
    displayName: string;
    avatar?: string;
    theme?: AppTheme;
    preferredBaseLanguage?: PreferredBaseLanguage;
    startingLevel?: CEFRLevel;
  }) => UserProfile;
  updateProfile: (uid: string, updates: Partial<UserProfile>) => UserProfile | undefined;
  deleteProfile: (uid: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>('user_karel');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const firebaseDb = db;
    if (firebaseDb) {
      const usersRef = collection(firebaseDb, 'users');
      const unsubscribe = onSnapshot(
        usersRef,
        (snapshot) => {
          const remoteProfiles = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as UserProfile),
            uid: docSnap.id,
          }));

          if (remoteProfiles.length === 0) {
            const defaults = getLocalUsers();
            defaults.forEach((profile) => {
              setDoc(doc(firebaseDb, 'users', profile.uid), profile, { merge: true }).catch((error) => {
                console.warn('Could not seed default Firebase profile:', error);
              });
            });
            setProfiles(defaults);
            return;
          }

          setProfiles(remoteProfiles);
        },
        (error) => {
          console.warn('Could not sync profiles from Firestore, falling back to local storage:', error);
          const savedProfiles = getLocalUsers();
          setProfiles(savedProfiles);
        }
      );

      const stored = localStorage.getItem('espanol90_active_user');
      if (stored) {
        setUserIdState(stored);
      } else {
        const defaults = getLocalUsers();
        setUserIdState(defaults[0]?.uid || 'user_karel');
      }

      return () => unsubscribe();
    }

    const savedProfiles = getLocalUsers();
    setProfiles(savedProfiles);

    const stored = localStorage.getItem('espanol90_active_user');
    if (stored && savedProfiles.some((profile) => profile.uid === stored)) {
      setUserIdState(stored);
      return;
    }

    setUserIdState(savedProfiles[0]?.uid || 'user_karel');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('espanol90_active_user', userId);
    }
  }, [userId]);

  const setUserId = (id: string) => {
    setUserIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('espanol90_active_user', id);
    }
  };

  const refreshProfiles = (next: UserProfile[]) => {
    setProfiles(next);
    saveLocalUsers(next);
  };

  const createProfile = (input: {
    displayName: string;
    avatar?: string;
    theme?: AppTheme;
    preferredBaseLanguage?: PreferredBaseLanguage;
    startingLevel?: CEFRLevel;
  }) => {
    const safeName = input.displayName.trim();
    const newProfile: UserProfile = {
      uid: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      displayName: safeName || 'New Profile',
      avatar: input.avatar || '🧑‍💻',
      totalPoints: 0,
      currentStreak: 1,
      isOnline: true,
      theme: input.theme ?? 'dark',
      preferredBaseLanguage: input.preferredBaseLanguage ?? 'cs',
      startingLevel: input.startingLevel ?? 'A1',
    };

    const nextProfiles = [...profiles, newProfile];
    setProfiles(nextProfiles);
    const firebaseDb = db;
    if (firebaseDb) {
      setDoc(doc(firebaseDb, 'users', newProfile.uid), newProfile, { merge: true }).catch((error) => {
        console.warn('Could not save new profile to Firestore:', error);
      });
    } else {
      saveLocalUsers(nextProfiles);
    }
    setUserIdState(newProfile.uid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('espanol90_active_user', newProfile.uid);
    }
    return newProfile;
  };

  const updateProfile = (uid: string, updates: Partial<UserProfile>) => {
    const nextProfiles = profiles.map((profile) =>
      profile.uid === uid ? { ...profile, ...updates } : profile
    );
    setProfiles(nextProfiles);

    const firebaseDb = db;
    if (firebaseDb) {
      const target = nextProfiles.find((profile) => profile.uid === uid) || profiles.find((profile) => profile.uid === uid);
      if (target) {
        setDoc(doc(firebaseDb, 'users', uid), { ...target, ...updates }, { merge: true }).catch((error) => {
          console.warn('Could not save profile update to Firestore:', error);
        });
      }
    } else {
      saveLocalUsers(nextProfiles);
    }

    return nextProfiles.find((profile) => profile.uid === uid);
  };

  const deleteProfile = (uid: string) => {
    const remaining = profiles.filter((profile) => profile.uid !== uid);
    if (remaining.length === 0) return;

    setProfiles(remaining);
    const firebaseDb = db;
    if (firebaseDb) {
      deleteDoc(doc(firebaseDb, 'users', uid)).catch((error) => {
        console.warn('Could not delete profile from Firestore:', error);
      });
    } else {
      saveLocalUsers(remaining);
    }

    if (userId === uid) {
      setUserIdState(remaining[0].uid);
      if (typeof window !== 'undefined') {
        localStorage.setItem('espanol90_active_user', remaining[0].uid);
      }
    }
  };

  const switchUser = () => {
    if (profiles.length === 0) return;
    const currentIndex = profiles.findIndex((profile) => profile.uid === userId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % profiles.length : 0;
    setUserId(profiles[nextIndex].uid);
  };

  return (
    <UserContext.Provider value={{ userId, setUserId, switchUser, profiles, createProfile, updateProfile, deleteProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useActiveUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useActiveUser must be used within a UserProvider');
  }
  return context;
}
