import { getOrCreateProfile } from './db';

export async function initializeCompetition() {
  try {
    const karel = await getOrCreateProfile('user_karel', 'Karel');
    const lucka = await getOrCreateProfile('user_lucka', 'Lucka');
    console.log('Database initialized successfully:', { karel, lucka });
    return { karel, lucka };
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
