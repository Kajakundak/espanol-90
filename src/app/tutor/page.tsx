// src/app/tutor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import LiveTutorModal from '@/components/LiveTutorModal';
import ScrollReveal from '@/components/ScrollReveal';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useActiveUser } from '@/lib/context/UserContext';
import { useAppLanguage } from '@/lib/context/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { CEFRLevel, NativeLanguage } from '@/lib/ai/gemini';
import { getCustomTutorTopics, saveCustomTutorTopic, CustomTutorTopic } from '@/lib/firebase/db';
import { soundEngine } from '@/lib/audio/sound-engine';

export default function TutorPage() {
  const { userId, profiles, updateProfile } = useActiveUser();
  const { users } = useLeaderboard();
  const { language } = useAppLanguage();
  const t = getTranslation(language);

  const currentUser = profiles.find((u) => u.uid === userId) || users.find((u) => u.uid === userId) || {
    uid: userId,
    displayName: userId === 'user_karel' ? 'Karel' : 'Lucka',
    totalPoints: 0,
    currentStreak: 1,
  };

  const isEn = language === 'en';
  const isSk = language === 'sk';

  const PRESET_TOPICS = [
    { 
      id: 'free', 
      title: isEn ? 'Free Conversation' : isSk ? 'Voľná Konverzácia' : 'Volná Konverzace', 
      description: isEn ? 'Stress-free chat about anything from your daily life.' : isSk ? 'Bezstresový rozhovor o čomkoľvek z bežného dňa.' : 'Bezstresový rozhovor o čemkoliv z běžného dne.', 
      prompt: 'Volná přátelská konverzace', 
      icon: '💬' 
    },
    { 
      id: 'travel', 
      title: isEn ? 'Travel & Hotel' : isSk ? 'Cestovanie & Hotel' : 'Cestování & Hotel', 
      description: isEn ? 'Reception, airport, taxi, solving accommodation issues.' : isSk ? 'Recepcia, letisko, taxi, riešenie ubytovania.' : 'Recepce, letiště, taxi, řešení problémů s ubytováním.', 
      prompt: 'Situace v hotelu a na letišti v Madridu', 
      icon: '✈️' 
    },
    { 
      id: 'restaurant', 
      title: isEn ? 'Restaurant & Ordering' : isSk ? 'Reštaurácia & Objednávanie' : 'Restaurace & Objednávání', 
      description: isEn ? 'Table reservation, ordering tapas, bill and tip.' : isSk ? 'Rezervácia stola, otázky na jedlo, platenie.' : 'Rezervace stolu, dotazy na jídlo, placení a spropitné.', 
      prompt: 'Objednávání v tapas baru v Barceloně', 
      icon: '🍕' 
    },
    { 
      id: 'interview', 
      title: isEn ? 'Job Interview' : isSk ? 'Pracovný Pohovor' : 'Pracovní Pohovor', 
      description: isEn ? 'Introducing experience, strengths, motivational questions.' : isSk ? 'Predstavenie skúseností, silné stránky.' : 'Představení zkušeností, silné stránky, motivační otázky.', 
      prompt: 'Pracovní pohovor ve španělské firmě', 
      icon: '💼' 
    },
    { 
      id: 'interrogation', 
      title: isEn ? 'Strict Exam Test' : isSk ? 'Prísny Skúškový Test' : 'Přísný Zkouškový Test', 
      description: isEn ? 'Rigorous grammar, past tenses, and subjunctive test.' : isSk ? 'Dôsledné testovanie gramatiky a časov.' : 'Důsledné testování gramatiky, minulých časů a konjunktivu.', 
      prompt: 'Intenzivní zkoušení gramatiky a časů', 
      icon: '⚔️' 
    },
    { 
      id: 'story', 
      title: isEn ? 'Storytelling & Scene' : isSk ? 'Storytelling & Popis' : 'Storytelling & Popis', 
      description: isEn ? 'Co-create a story and describe image scenarios.' : isSk ? 'Spoločné rozprávanie príbehu a popis situácií.' : 'Společné vyprávění příběhu a popisování situací.', 
      prompt: 'Vyprávění příběhu podle situace', 
      icon: '📖' 
    },
  ];

  const CEFR_LEVELS: { level: CEFRLevel; label: string; desc: string }[] = [
    { level: 'A0', label: 'A0 · Beginner', desc: isEn ? 'Short words & phrases (3-5 words)' : isSk ? 'Slová a krátke frázy (3-5 slov)' : 'Slova a kratičké fráze (3-5 slov), nápovědy' },
    { level: 'A1', label: 'A1 · Elementary', desc: isEn ? 'Present tense, simple questions' : isSk ? 'Prítomný čas, jednoduché otázky' : 'Přítomný čas, jednoduché otázky, zájmena me/te/le' },
    { level: 'A2', label: 'A2 · Intermediate', desc: isEn ? 'Past tenses, describing past events' : isSk ? 'Minulé časy, popis zážitkov' : 'Minulé časy (Indefinido/Perfecto), zážitky' },
    { level: 'B1', label: 'B1 · Fluent', desc: isEn ? 'Expressing opinions, subjunctive basics' : isSk ? 'Plynulé názory, základy subjuntíva' : 'Plynulé vyjadřování názorů, základy subjuntiva' },
    { level: 'B2', label: 'B2 · Advanced', desc: isEn ? 'Natural pace, abstract topics' : isSk ? 'Prirodzené tempo, abstraktné témy' : 'Přirozené tempo, abstraktní témata' },
    { level: 'C1', label: 'C1 · Proficient', desc: isEn ? 'Idioms, nuances, academic Spanish' : isSk ? 'Idiomy, nuansy, akademická reč' : 'Idiomy, nuance, akademická španělština' },
    { level: 'C2', label: 'C2 · Master', desc: isEn ? 'Native speaker level debate & humor' : isSk ? 'Úroveň rodilého mluvčího' : 'Rodilý mluvčí level — debaty, humor' },
  ];

  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
  const [selectedTopicPrompt, setSelectedTopicPrompt] = useState(PRESET_TOPICS[0].prompt);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState(PRESET_TOPICS[0].title);
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage>(language as NativeLanguage);

  useEffect(() => {
    if (currentUser.startingLevel) setSelectedLevel(currentUser.startingLevel);
    setNativeLanguage(language as NativeLanguage);
  }, [currentUser.uid, currentUser.startingLevel, language]);

  useEffect(() => {
    const matched = PRESET_TOPICS.find((p) => p.prompt === selectedTopicPrompt);
    if (matched) {
      setSelectedTopicTitle(matched.title);
    }
  }, [language, selectedTopicPrompt]);

  const [customTopics, setCustomTopics] = useState<CustomTutorTopic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicPrompt, setNewTopicPrompt] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

  useEffect(() => {
    getCustomTutorTopics(userId).then((topics) => setCustomTopics(topics));
    const handler = () => { getCustomTutorTopics(userId).then((topics) => setCustomTopics(topics)); };
    window.addEventListener('espanol90_custom_topics_updated', handler);
    return () => window.removeEventListener('espanol90_custom_topics_updated', handler);
  }, [userId]);

  const handleSaveCustomTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !newTopicPrompt.trim()) return;

    const topicObj: CustomTutorTopic = {
      id: `custom_topic_${Date.now()}`,
      title: newTopicTitle.trim(),
      prompt: newTopicPrompt.trim(),
      level: selectedLevel,
      createdAt: new Date().toISOString(),
    };

    await saveCustomTutorTopic(userId, topicObj);
    setCustomTopics((prev) => [topicObj, ...prev]);
    setSelectedTopicTitle(topicObj.title);
    setSelectedTopicPrompt(topicObj.prompt);
    setNewTopicTitle('');
    setNewTopicPrompt('');
    setShowCustomForm(false);
    soundEngine.playTick();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-x-hidden">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-10 pb-24 sm:pb-10 space-y-12 relative z-10">

        {/* Header Hero */}
        <ScrollReveal animation="fade-up">
          <section className="apple-glass p-8 md:p-12 text-center space-y-4">
            <span className="apple-pill-badge bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30">
              {t.tutorBadge}
            </span>

            <h1 className="apple-heading-xl text-[var(--text-primary)]">
              {t.tutorTitle} 🎙️
            </h1>

            <p className="apple-text-subhead max-w-2xl mx-auto">
              {t.tutorSubtitle}
            </p>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => {
                  setIsLiveOpen(true);
                  soundEngine.playTick();
                }}
                className="apple-button-primary text-base px-8 py-4 shadow-xl"
              >
                <span>🎙️ {t.startCallButton} ({selectedLevel} · {selectedTopicTitle})</span>
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* Výběr úrovně */}
        <ScrollReveal animation="fade-up" delay={0.1}>
          <section className="apple-glass p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="apple-heading-md text-[var(--text-primary)] flex items-center gap-2">
                  🎯 {t.selectLevelTitle}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t.selectLevelSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="apple-pill-badge bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)] font-mono">
                  {t.selectedLabel} {selectedLevel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {CEFR_LEVELS.map((item) => {
                const isSel = selectedLevel === item.level;
                return (
                  <button
                    key={item.level}
                    onClick={() => {
                      setSelectedLevel(item.level);
                      updateProfile(userId, { startingLevel: item.level });
                      soundEngine.playTick();
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSel
                        ? 'bg-[var(--accent-emerald)]/15 border-[var(--accent-emerald)] text-[var(--text-primary)] shadow-sm'
                        : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-[var(--card-bg-hover)]'
                    }`}
                  >
                    <div className="font-extrabold text-sm text-[var(--text-primary)] mb-1">
                      {item.level}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* Výběr témat */}
        <ScrollReveal animation="fade-up" delay={0.2}>
          <section className="apple-glass p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="apple-heading-md text-[var(--text-primary)] flex items-center gap-2">
                  💬 {t.selectTopicTitle}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t.selectTopicSubtitle}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCustomForm(!showCustomForm);
                  soundEngine.playTick();
                }}
                className="px-5 py-2.5 rounded-full bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 text-white font-extrabold text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {showCustomForm ? t.closeFormBtn : `✨ ${t.createCustomTopicBtn}`}
              </button>
            </div>

            {showCustomForm && (
              <form onSubmit={handleSaveCustomTopic} className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--card-border)] space-y-4 animate-fade-in">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  💾 {t.saveTopicBtn}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      {t.tutorCustomTitleLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.tutorCustomTitlePlaceholder}
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      {t.tutorCustomPromptLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.tutorCustomPromptPlaceholder}
                      value={newTopicPrompt}
                      onChange={(e) => setNewTopicPrompt(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer hover:scale-105 active:scale-95"
                >
                  {t.saveTopicBtn}
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRESET_TOPICS.map((item) => {
                const isSel = selectedTopicPrompt === item.prompt;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedTopicTitle(item.title);
                      setSelectedTopicPrompt(item.prompt);
                      soundEngine.playTick();
                    }}
                    className={`apple-card-interactive p-5 space-y-2 cursor-pointer border ${
                      isSel ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{item.icon}</span>
                      {isSel && (
                        <span className="text-[10px] font-bold text-[var(--accent-cyan)] font-mono">
                          ✓
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">{item.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>

            {customTopics.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[var(--card-border)]">
                <h3 className="text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-wider font-mono">
                  ⭐ {t.savedCustomTopicsTitle}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {customTopics.map((ct) => {
                    const isSel = selectedTopicPrompt === ct.prompt;
                    return (
                      <div
                        key={ct.id}
                        onClick={() => {
                          setSelectedTopicTitle(ct.title);
                          setSelectedTopicPrompt(ct.prompt);
                          soundEngine.playTick();
                        }}
                        className={`apple-card-interactive p-4 space-y-1.5 cursor-pointer border ${
                          isSel ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[var(--text-primary)]">✨ {ct.title}</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">{ct.level}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{ct.prompt}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </ScrollReveal>

      </main>

      {isLiveOpen && (
        <LiveTutorModal
          isOpen={isLiveOpen}
          onClose={() => setIsLiveOpen(false)}
          mode="custom_topic"
          topic={selectedTopicPrompt}
          level={selectedLevel}
          nativeLanguage={nativeLanguage}
          userName={currentUser.displayName}
          userAvatar={currentUser.avatar}
          userId={currentUser.uid}
          totalPoints={currentUser.totalPoints}
          currentStreak={currentUser.currentStreak}
        />
      )}
    </div>
  );
}