'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'cs' | 'sk' | 'en';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'cs',
  setLanguage: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('cs');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('espanol90_app_lang') as AppLanguage;
      if (saved && (saved === 'cs' || saved === 'sk' || saved === 'en')) {
        setLanguageState(saved);
      }
    }
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('espanol90_app_lang', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useAppLanguage = () => useContext(LanguageContext);
