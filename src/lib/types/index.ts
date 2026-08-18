export type TaskKey = 'islands' | 'anki' | 'input' | 'book' | 'speaking';
export type AppTheme = 'dark' | 'light';
export type PreferredBaseLanguage = 'cs' | 'sk' | 'en';
export type CEFRLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface TaskState {
  islands: boolean;
  anki: boolean;
  input: boolean;
  book: boolean;
  speaking: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  avatar?: string;
  avatarUrl?: string;
  totalPoints: number;
  aiMinutes?: number;
  currentStreak: number;
  fcmToken?: string;
  isOnline?: boolean;
  level?: CEFRLevel;
  nativeLanguage?: PreferredBaseLanguage;
  theme?: AppTheme;
  preferredBaseLanguage?: PreferredBaseLanguage;
  startingLevel?: CEFRLevel;
}

export interface DailyProgress {
  userId: string;
  dayNumber: number; // 1 to 90
  tasks: TaskState;
  allCompleted: boolean;
  pointsEarned: number;
  updatedAt: string;
}

export interface AnkiCard {
  id: string;
  spanishSentence: string;
  clozeDeletion: string; // e.g. "Vivo {{c1::en}} Praga."
  englishTranslation: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  corrections?: string[];
}

export interface PvPDuel {
  id: string;
  challengerId: string;
  opponentId: string;
  status: 'pending' | 'active' | 'completed';
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
  }>;
  scores: Record<string, number>;
  createdAt: string;
}
