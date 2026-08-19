// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cz.karel.espanol90',
  appName: 'Español 90',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Povolení stahování MP3 souborů a spojení s Google Gemini a Firebase
    allowNavigation: [
      'cdn.jsdelivr.net',
      'raw.githubusercontent.com',
      'translate.google.com',
      'translate.googleapis.com',
      'generativelanguage.googleapis.com',
      '*.firebaseio.com',
      '*.googleapis.com',
      '*.firebaseapp.com',
    ],
  },
};

export default config;