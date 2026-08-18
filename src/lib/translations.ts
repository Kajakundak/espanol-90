import { AppLanguage } from './context/LanguageContext';

export interface TranslationSchema {
  // Navigation & Common
  dashboard: string;
  islands: string;
  ankiDeck: string;
  arena: string;
  aiTutor: string;
  streak: string;
  pts: string;
  profileSwitch: string;
  manageProfiles: string;
  back: string;
  close: string;
  cancel: string;
  save: string;
  create: string;
  delete: string;
  loading: string;
  ready: string;
  error: string;
  themeDark: string;
  themeLight: string;

  // Dashboard Hero & Missions
  phase: string;
  dayOf: string;
  of90: string;
  phase1Subtitle: string;
  phase2Subtitle: string;
  phase3Subtitle: string;
  greeting: string;
  todayWorkingOn: string;
  and: string;
  launchAiTutor: string;
  trainAnki: string;
  prevDay: string;
  nextDay: string;
  daysCount: string;
  todaysMissions: string;
  allCompletedBonus: string;
  loadingMissions: string;

  // Task Actions & Labels
  taskIsland: string;
  taskAnki: string;
  taskBook: string;
  taskDS: string;
  taskSpeaking: string;
  actionPracticeIsland: string;
  actionTrainAnki: string;
  actionViewLesson: string;
  actionOpenYouTube: string;
  actionTalkAi: string;
  actionStart: string;
  actionOpen: string;
  completedCheck: string;
  unmarkCheck: string;

  // Schedule
  scheduleBadge: string;
  weekTitle: string;
  dayLabel: string;

  // Profile Manager Modal
  profilesTitle: string;
  editProfile: string;
  addProfile: string;
  profileName: string;
  profileNamePlaceholder: string;
  avatar: string;
  activeAvatarLabel: string;
  generateAiAvatar: string;
  preferredBaseLanguage: string;
  theme: string;
  startingLevel: string;
  deleteProfileConfirm: string;
  savedSuccessfully: string;

  // Textbook Modal
  textbookTitle: string;
  author: string;
  lessonDetail: string;
  recommendedLesson: string;
  grammarFocus: string;
  audioTrack: string;
  whatToStudy: string;
  whatToSkip: string;
  skipNotice: string;
  stepRoutineTitle: string;
  consistencyTag: string;
  iUnderstandBtn: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;

  // Anki Page & Modal
  ankiBadge: string;
  ankiTitle: string;
  ankiSubtitle: string;
  startAnkiTraining: string;
  featureShuffleTitle: string;
  featureShuffleDesc: string;
  featureUnlockTitle: string;
  featureUnlockDesc: string;
  featureTtsTitle: string;
  featureTtsDesc: string;
  cardsCount: string;
  unlockedCards: string;
  shuffleOrder: string;
  originalOrder: string;
  showAnswer: string;
  ratingAgain: string;
  ratingGood: string;
  ratingEasy: string;
  productionPrompt: string;
  clozePrompt: string;
  recognitionPrompt: string;
  translationLabel: string;

  // Islands Page & Trainer
  islandsBadge: string;
  islandsTitle: string;
  islandsSubtitle: string;
  allIslands: string;
  customIslands: string;
  createCustomIsland: string;
  sentencesCount: string;
  startTraining: string;
  startBtn: string;
  pauseBtn: string;
  shadowMode: string;
  recallMode: string;
  shadowPause: string;
  repCount: string;
  voiceSpeed: string;
  speakNowPrompt: string;
  mastered: string;
  islandStats: string;
  today: string;
  allTime: string;
  practiced: string;
  repetitions: string;
  howToPractice: string;
  shadowGuide: string;
  recallGuide: string;

  // AI Recall Coach & Live Session
  recallCoachTitle: string;
  recallCoachSubtitle: string;
  howItWorksTitle: string;
  howItWorks1: string;
  howItWorks2: string;
  howItWorks3: string;
  startRecallSession: string;
  voiceLabel: string;
  voiceFemale: string;
  voiceMale: string;
  idleStatus: string;
  connectingStatus: string;
  listeningStatus: string;
  speakingStatus: string;
  liveConnecting: string;
  liveListening: string;
  liveSpeaking: string;
  saveMemoryBtn: string;
  hintBtn: string;
  slowerBtn: string;
  repeatBtn: string;
  endSession: string;

  // AI Tutor Page
  tutorBadge: string;
  tutorTitle: string;
  tutorSubtitle: string;
  startCallButton: string;
  selectLevelTitle: string;
  selectLevelSubtitle: string;
  selectedLabel: string;
  selectTopicTitle: string;
  selectTopicSubtitle: string;
  createCustomTopicBtn: string;
  closeFormBtn: string;
  saveTopicBtn: string;
  savedCustomTopicsTitle: string;
  customTopicNameLabel: string;
  customTopicNamePlaceholder: string;
  customTopicPromptLabel: string;
  customTopicPromptPlaceholder: string;
  cheatSheetTitle: string;
  sampleAnswersTitle: string;
  rescuePhrasesTitle: string;

  // Arena & Leaderboard
  arenaBadge: string;
  arenaTitle: string;
  arenaSubtitle: string;
  startDailyQuiz: string;
  liveLeaderboard: string;
  challengeAndPoints: string;
  realTimeSync: string;
  dayStreakLabel: string;
  pointsUnit: string;
}

export const translations: Record<AppLanguage, TranslationSchema> = {
  cs: {
    // Navigation & Common
    dashboard: 'Dashboard',
    islands: 'Ostrovy',
    ankiDeck: 'Anki Balíček',
    arena: 'Aréna',
    aiTutor: 'AI Tutor',
    streak: 'dní',
    pts: 'bodů',
    profileSwitch: 'Změnit profil',
    manageProfiles: '⚙️ Spravovat profily',
    back: '‹ Zpět',
    close: 'Zavřít',
    cancel: 'Zrušit',
    save: 'Uložit změny',
    create: 'Vytvořit profil',
    delete: 'Smazat profil',
    loading: 'Načítání...',
    ready: 'Připraveno',
    error: 'Chyba',
    themeDark: 'Tmavý režim',
    themeLight: 'Světlý režim',

    // Dashboard Hero & Missions
    phase: 'Fáze',
    dayOf: 'Den',
    of90: 'z 90',
    phase1Subtitle: 'Přežiju ve španělštině',
    phase2Subtitle: 'Více mluvení a minulost',
    phase3Subtitle: 'A2/B1 Plynulá komunikace',
    greeting: '¡Hola',
    todayWorkingOn: 'Dnes pracuješ na:',
    and: 'a',
    launchAiTutor: 'Spustit AI Tutora',
    trainAnki: 'Trénovat Anki',
    prevDay: '← Předchozí',
    nextDay: 'Další Den →',
    daysCount: 'Dní',
    todaysMissions: '🎯 Dnešní mise — Den',
    allCompletedBonus: '✓ Vše splněno (+20 bonus)',
    loadingMissions: 'Načítání misí...',

    // Task Actions & Labels
    taskIsland: 'Ostrov',
    taskAnki: 'Anki Opakování',
    taskBook: 'Kniha Prokopová',
    taskDS: 'Dreaming Spanish',
    taskSpeaking: 'AI Tutor',
    actionPracticeIsland: 'Procvičit ostrov',
    actionTrainAnki: 'Trénovat Anki',
    actionViewLesson: 'Zobrazit lekci',
    actionOpenYouTube: 'Sledovat na YouTube ↗',
    actionTalkAi: 'Mluvit s AI',
    actionStart: 'Spustit',
    actionOpen: 'Otevřít',
    completedCheck: 'Hotovo',
    unmarkCheck: 'Označit jako hotové',

    // Schedule
    scheduleBadge: 'Harmonogram výuky',
    weekTitle: 'Týden',
    dayLabel: 'Den',

    // Profile Manager Modal
    profilesTitle: 'Profily',
    editProfile: 'Upravit profil',
    addProfile: '+ Přidat profil',
    profileName: 'Jméno profilu',
    profileNamePlaceholder: 'Například Karel, Lucka...',
    avatar: 'Avatar',
    activeAvatarLabel: 'Aktivní:',
    generateAiAvatar: 'Vytvořit Španělského AI Avatara',
    preferredBaseLanguage: 'Preferovaný základní jazyk',
    theme: 'Téma aplikace',
    startingLevel: 'Výchozí úroveň',
    deleteProfileConfirm: 'Opravdu chcete smazat tento profil?',
    savedSuccessfully: 'Profil byl úspěšně uložen!',

    // Textbook Modal
    textbookTitle: 'Španělština nejen pro samouky',
    author: 'Lída Prokopová',
    lessonDetail: 'Detail lekce',
    recommendedLesson: 'Doporučená lekce z knihy:',
    grammarFocus: 'Gramatické zaměření:',
    audioTrack: 'Audio stopa:',
    whatToStudy: 'Co projít v knize:',
    whatToSkip: 'Co přeskočit (ušetři čas):',
    skipNotice: 'Ignoruj nudná písemná cvičení a překlady do sešitu. Soustřeď se na dialog!',
    stepRoutineTitle: 'Doporučený 4-krokový postup (max 15 min):',
    consistencyTag: 'Konzistence > Vyplňování cvičení',
    iUnderstandBtn: '✓ Rozumím, jdu na dialog',
    step1Title: '1. Poslech dialogu (10 min)',
    step1Desc: 'Pusť si MP3 nahrávku a sleduj text dialogu v knize očima.',
    step2Title: '2. Pochopení principu (5 min)',
    step2Desc: 'Přečti si gramatické okénko a řekni si "Aha, takhle to funguje".',
    step3Title: '3. Výber vět do Anki (5 min)',
    step3Desc: 'Vypiš si 2–4 nejužitečnější věty z dialogu.',
    step4Title: '4. Aktivní použití s AI (10 min)',
    step4Desc: 'Použij nové věty večer při hovoru s AI lektorkou.',

    // Anki Page & Modal
    ankiBadge: 'Spaced Repetition & Active Recall',
    ankiTitle: 'Anki Balíček',
    ankiSubtitle: 'Chytrý algoritmus pro zautomatizování španělských vět. Nové kartičky se odemykají postupně s každým dnem plánu.',
    startAnkiTraining: 'Spustit Anki Trénink',
    featureShuffleTitle: 'Náhodné Míchání',
    featureShuffleDesc: 'Tlačítko Shuffle promíchá pořadí kartiček pro trénink reakce bez závislosti na kontextu.',
    featureUnlockTitle: 'Postupné Odemykání',
    featureUnlockDesc: 'Každý den se odemknou 3 nové věty ze zvládnutých ostrovů, aby vás záplava nezahltila.',
    featureTtsTitle: 'Native TTS Hlas',
    featureTtsDesc: 'Nativní španělská výslovnost (es-ES) s nastavitelnou rychlostí přehrávání pro stínování.',
    cardsCount: 'karet',
    unlockedCards: 'Odemčeno',
    shuffleOrder: 'Náhodně',
    originalOrder: 'Původní',
    showAnswer: 'Zobrazit odpověď (Mezerník)',
    ratingAgain: '🔴 Znovu (Again)',
    ratingGood: '🟢 Dobře (+1)',
    ratingEasy: '⚡ Snadné',
    productionPrompt: '🇨🇿 Česká věta ➔ Řekni španělsky',
    clozePrompt: '📝 Doplň chybějící slovo (Cloze)',
    recognitionPrompt: '🇪🇸 Španělská věta ➔ Překlad',
    translationLabel: 'Překlad:',

    // Islands Page & Trainer
    islandsBadge: 'Metoda Jazykových Ostrovů',
    islandsTitle: 'Jazykové Ostrovy',
    islandsSubtitle: 'Trénujte 100 nejčastějších zautomatizovaných vět, fráze pro přežití, restaurace a každodenní témata s okamžitou AI výslovností.',
    allIslands: 'Všechny Ostrovy',
    customIslands: 'Vlastní Ostrovy',
    createCustomIsland: 'Vytvořit AI Ostrov na Míru',
    sentencesCount: 'vět',
    startTraining: 'Spustit Trénink →',
    startBtn: 'Spustit',
    pauseBtn: 'Pozastavit',
    shadowMode: 'Shadowing',
    recallMode: 'Active Recall',
    shadowPause: 'Pauza pro stínování:',
    repCount: 'Opakování věty:',
    voiceSpeed: 'Rychlost hlasu:',
    speakNowPrompt: '🗣️ TEĎ MLUVTE VY!',
    mastered: 'Zvládnuto',
    islandStats: 'Statistiky ostrova',
    today: 'Dnes',
    allTime: 'Celkem',
    practiced: 'Procvičeno',
    repetitions: 'Opakování',
    howToPractice: 'JAK NEJLÉPE CVIČIT',
    shadowGuide: '🎧 Shadowing: Poslouchejte, dělejte pauzy a opakujte věty nahlas.',
    recallGuide: '💬 Recall: Překládejte z češtiny z paměti s AI koučem.',

    // AI Recall Coach & Live Session
    recallCoachTitle: 'AI Recall Coach',
    recallCoachSubtitle: 'Hands-free trénink vybavování z paměti',
    howItWorksTitle: 'Jak to funguje (Hands-Free):',
    howItWorks1: '• AI ti řekne větu v češtině',
    howItWorks2: '• Ty odpovíš španělsky do mikrofonu',
    howItWorks3: '• AI okamžitě vyhodnotí a přejde na další',
    startRecallSession: 'Spustit AI Recall Session',
    voiceLabel: 'Hlas:',
    voiceFemale: 'Žena',
    voiceMale: 'Muž',
    idleStatus: 'Připraveno ke spuštění',
    connectingStatus: 'Připojuji se k AI...',
    listeningStatus: '🎙️ Tvůj tah — mluv!',
    speakingStatus: '🔊 AI mluví...',
    liveConnecting: 'Připojuji se k Gemini Live API...',
    liveListening: '🎙️ Poslouchám tě — mluv!',
    liveSpeaking: '🔊 Lektorka mluví...',
    saveMemoryBtn: 'Uložit Paměť',
    hintBtn: 'Poraď mi',
    slowerBtn: 'Mluv pomaleji',
    repeatBtn: 'Zopakuj to',
    endSession: 'Ukončit Session',

    // AI Tutor Page
    tutorBadge: 'Personalizovaný AI Tutor • Gemini 3.1 Flash Live',
    tutorTitle: 'AI Voice Tutor',
    tutorSubtitle: 'Nastavte si svou přesnou úroveň, vyberte nebo vytvořte téma a trénujte živou konverzaci s okamžitou učitelskou opravou.',
    startCallButton: 'Spustit Hovor',
    selectLevelTitle: '1. Vyberte vaši úroveň (A0 – C2)',
    selectLevelSubtitle: 'Lektorka přizpůsobí tempo, složitost větné skladby a míru gramatických oprav.',
    selectedLabel: 'Zvoleno:',
    selectTopicTitle: '2. Vyberte Téma nebo Vlastní Prompt',
    selectTopicSubtitle: 'Předdefinované scény nebo vlastní témata uložená v profile.',
    createCustomTopicBtn: 'Vytvořit Vlastní Téma',
    closeFormBtn: '✕ Zavřít formulář',
    saveTopicBtn: 'Uložit Téma Do Profilu',
    savedCustomTopicsTitle: 'Vaše Uložená Vlastní Témata',
    customTopicNameLabel: 'Název Tématu',
    customTopicNamePlaceholder: 'např. Nákup na trhu',
    customTopicPromptLabel: 'Prompt pro AI',
    customTopicPromptPlaceholder: 'Chci trénovat smlouvání o ceně ovoce',
    cheatSheetTitle: 'Tahák na odpovědi',
    sampleAnswersTitle: 'Vzorové věty:',
    rescuePhrasesTitle: 'Záchranné fráze:',

    // Arena & Leaderboard
    arenaBadge: 'Soutěžní Aréna',
    arenaTitle: 'Aréna & AI Kvízy',
    arenaSubtitle: 'Testujte své znalosti v denním AI kvízu vygenerovaném přes Gemini a sbírejte bonusové body do žebříčku.',
    startDailyQuiz: 'Spustit Denní Kvíz (+15 Bodů)',
    liveLeaderboard: 'Živý žebříček',
    challengeAndPoints: 'Výzva & Body',
    realTimeSync: '● Real-time Sync',
    dayStreakLabel: 'denní série',
    pointsUnit: 'bodů',
  },

  sk: {
    // Navigation & Common
    dashboard: 'Dashboard',
    islands: 'Ostrovy',
    ankiDeck: 'Anki Balíček',
    arena: 'Aréna',
    aiTutor: 'AI Tutor',
    streak: 'dní',
    pts: 'bodov',
    profileSwitch: 'Zmeniť profil',
    manageProfiles: '⚙️ Spravovať profily',
    back: '‹ Späť',
    close: 'Zavrieť',
    cancel: 'Zrušiť',
    save: 'Uložiť zmeny',
    create: 'Vytvoriť profil',
    delete: 'Zmazať profil',
    loading: 'Načítava sa...',
    ready: 'Pripravené',
    error: 'Chyba',
    themeDark: 'Tmavý režim',
    themeLight: 'Svetlý režim',

    // Dashboard Hero & Missions
    phase: 'Fáza',
    dayOf: 'Deň',
    of90: 'z 90',
    phase1Subtitle: 'Prežijem v španielčine',
    phase2Subtitle: 'Viac rozprávania a minulosť',
    phase3Subtitle: 'A2/B1 Plynulá komunikácia',
    greeting: '¡Hola',
    todayWorkingOn: 'Dnes pracuješ na:',
    and: 'a',
    launchAiTutor: 'Spustiť AI Tutora',
    trainAnki: 'Trénovať Anki',
    prevDay: '← Predchádzajúci',
    nextDay: 'Ďalší Deň →',
    daysCount: 'Dní',
    todaysMissions: '🎯 Dnešné misie — Deň',
    allCompletedBonus: '✓ Všetko splnené (+20 bonus)',
    loadingMissions: 'Načítavam misie...',

    // Task Actions & Labels
    taskIsland: 'Ostrov',
    taskAnki: 'Anki Opakovanie',
    taskBook: 'Kniha Prokopová',
    taskDS: 'Dreaming Spanish',
    taskSpeaking: 'AI Tutor',
    actionPracticeIsland: 'Precvičiť ostrov',
    actionTrainAnki: 'Trénovať Anki',
    actionViewLesson: 'Zobraziť lekciu',
    actionOpenYouTube: 'Sledovať na YouTube ↗',
    actionTalkAi: 'Hovoriť s AI',
    actionStart: 'Spustiť',
    actionOpen: 'Otvoriť',
    completedCheck: 'Hotovo',
    unmarkCheck: 'Označiť ako hotové',

    // Schedule
    scheduleBadge: 'Harmonogram výučby',
    weekTitle: 'Týždeň',
    dayLabel: 'Deň',

    // Profile Manager Modal
    profilesTitle: 'Profily',
    editProfile: 'Upraviť profil',
    addProfile: '+ Pridať profil',
    profileName: 'Meno profilu',
    profileNamePlaceholder: 'Napríklad Karel, Lucka...',
    avatar: 'Avatar',
    activeAvatarLabel: 'Aktívne:',
    generateAiAvatar: 'Vytvoriť Španielskeho AI Avatara',
    preferredBaseLanguage: 'Preferovaný základný jazyk',
    theme: 'Téma aplikácie',
    startingLevel: 'Východisková úroveň',
    deleteProfileConfirm: 'Naozaj chcete zmazať tento profil?',
    savedSuccessfully: 'Profil bol úspešne uložený!',

    // Textbook Modal
    textbookTitle: 'Španielčina nielen pre samoukov',
    author: 'Lída Prokopová',
    lessonDetail: 'Detail lekcie',
    recommendedLesson: 'Odporúčaná lekcia z knihy:',
    grammarFocus: 'Gramatické zameranie:',
    audioTrack: 'Audio stopa:',
    whatToStudy: 'Čo prejsť v knihe:',
    whatToSkip: 'Čo preskočiť (ušetri čas):',
    skipNotice: 'Ignoruj nudné písomné cvičenia a preklady do zošita. Sústreď sa na dialóg!',
    stepRoutineTitle: 'Odporúčaný 4-krokový postup (max 15 min):',
    consistencyTag: 'Konzistencia > Vyplňovanie cvičení',
    iUnderstandBtn: '✓ Rozumiem, idem na dialóg',
    step1Title: '1. Počúvanie dialógu (10 min)',
    step1Desc: 'Pusti si MP3 nahrávku a sleduj text dialógu v knihe očami.',
    step2Title: '2. Pochopenie princípu (5 min)',
    step2Desc: 'Prečítaj si gramatické okienko a povedz si "Aha, takto to funguje".',
    step3Title: '3. Výber viet do Anki (5 min)',
    step3Desc: 'Vypíš si 2–4 najužitočnejšie vety z dialógu.',
    step4Title: '4. Aktívne použitie s AI (10 min)',
    step4Desc: 'Použi nové vety večer pri hovore s AI lektorkou.',

    // Anki Page & Modal
    ankiBadge: 'Spaced Repetition & Active Recall',
    ankiTitle: 'Anki Balíček',
    ankiSubtitle: 'Múdry algoritmus pre zautomatizovanie španielskych viet. Nové kartičky sa odomykajú postupne s každým dňom plánu.',
    startAnkiTraining: 'Spustiť Anki Tréning',
    featureShuffleTitle: 'Náhodné Miešanie',
    featureShuffleDesc: 'Tlačidlo Shuffle premieša poradie kartičiek pre tréning reakcie bez závislosti na kontexte.',
    featureUnlockTitle: 'Postupné Odomykanie',
    featureUnlockDesc: 'Každý deň sa odomknú 3 nové vety zo zvládnutých ostrovov, aby vás záplava nezahltila.',
    featureTtsTitle: 'Native TTS Hlas',
    featureTtsDesc: 'Natívna španielska výslovnosť (es-ES) s nastaviteľnou rýchlosťou prehrávania pre tieňovanie.',
    cardsCount: 'kariet',
    unlockedCards: 'Odomknuté',
    shuffleOrder: 'Náhodne',
    originalOrder: 'Pôvodné',
    showAnswer: 'Zobraziť odpoveď (Medzerník)',
    ratingAgain: '🔴 Znova (Again)',
    ratingGood: '🟢 Dobre (+1)',
    ratingEasy: '⚡ Ľahké',
    productionPrompt: '🇸🇰 Slovenská veta ➔ Povedz španielsky',
    clozePrompt: '📝 Doplň chýbajúce slovo (Cloze)',
    recognitionPrompt: '🇪🇸 Španielska veta ➔ Preklad',
    translationLabel: 'Preklad:',

    // Islands Page & Trainer
    islandsBadge: 'Metóda Jazykových Ostrovov',
    islandsTitle: 'Jazykové Ostrovy',
    islandsSubtitle: 'Trénujte 100 najčastejších zautomatizovaných viet, frázy pre prežitie, reštaurácie a každodenné témy s okamžitou AI výslovnosťou.',
    allIslands: 'Všetky Ostrovy',
    customIslands: 'Vlastné Ostrovy',
    createCustomIsland: 'Vytvoriť AI Ostrov na Mieru',
    sentencesCount: 'viet',
    startTraining: 'Spustiť Tréning →',
    startBtn: 'Spustiť',
    pauseBtn: 'Pozastaviť',
    shadowMode: 'Shadowing',
    recallMode: 'Active Recall',
    shadowPause: 'Pauza pre tieňovanie:',
    repCount: 'Opakovanie vety:',
    voiceSpeed: 'Rýchlosť hlasu:',
    speakNowPrompt: '🗣️ TERAZ HOVORTE VY!',
    mastered: 'Zvládnuté',
    islandStats: 'Štatistiky ostrova',
    today: 'Dnes',
    allTime: 'Celkovo',
    practiced: 'Precvičené',
    repetitions: 'Opakovanie',
    howToPractice: 'AKO NAJLEPŠIE TRÉNOVAŤ',
    shadowGuide: '🎧 Shadowing: Počúvajte, robte pauzy a opakujte vety nahlas.',
    recallGuide: '💬 Recall: Prekladajte zo slovenčiny z pamäte s AI koučom.',

    // AI Recall Coach & Live Session
    recallCoachTitle: 'AI Recall Coach',
    recallCoachSubtitle: 'Hands-free tréning vybavovania z pamäte',
    howItWorksTitle: 'Ako to funguje (Hands-Free):',
    howItWorks1: '• AI ti povie vetu v slovenčine',
    howItWorks2: '• Ty odpovieš španielsky do mikrofónu',
    howItWorks3: '• AI okamžite vyhodnotí a prejde na ďalšiu',
    startRecallSession: 'Spustiť AI Recall Session',
    voiceLabel: 'Hlas:',
    voiceFemale: 'Žena',
    voiceMale: 'Muž',
    idleStatus: 'Pripravené na spustenie',
    connectingStatus: 'Pripájam sa k AI...',
    listeningStatus: '🎙️ Tvoj ťah — hovor!',
    speakingStatus: '🔊 AI hovorí...',
    liveConnecting: 'Pripájam sa k Gemini Live API...',
    liveListening: '🎙️ Počúvam ťa — hovor!',
    liveSpeaking: '🔊 Lektorka hovorí...',
    saveMemoryBtn: 'Uložiť Pamäť',
    hintBtn: 'Poraď mi',
    slowerBtn: 'Hovor pomalšie',
    repeatBtn: 'Zopakuj to',
    endSession: 'Ukončiť Session',

    // AI Tutor Page
    tutorBadge: 'Personalizovaný AI Tutor • Gemini 3.1 Flash Live',
    tutorTitle: 'AI Voice Tutor',
    tutorSubtitle: 'Nastavte si svoju presnú úroveň, vyberte tému a trénujte živú konverzáciu s okamžitou lektorskou opravou.',
    startCallButton: 'Spustiť Hovor',
    selectLevelTitle: '1. Vyberte vašu úroveň (A0 – C2)',
    selectLevelSubtitle: 'Lektorka prispôsobí tempo, zložitosť vetnej skladby a mieru gramatických opráv.',
    selectedLabel: 'Zvolené:',
    selectTopicTitle: '2. Vyberte Tému alebo Vlastný Prompt',
    selectTopicSubtitle: 'Preddefinované scény alebo vlastné témy uložené v profile.',
    createCustomTopicBtn: 'Vytvoriť Vlastnú Tému',
    closeFormBtn: '✕ Zavrieť formulár',
    saveTopicBtn: 'Uložiť Tému Do Profilu',
    savedCustomTopicsTitle: 'Vaše Uložené Vlastné Témy',
    customTopicNameLabel: 'Názov Témy',
    customTopicNamePlaceholder: 'napr. Nákup na trhu',
    customTopicPromptLabel: 'Prompt pre AI',
    customTopicPromptPlaceholder: 'Chcem trénovať zjednávanie ceny',
    cheatSheetTitle: 'Ťahák na odpovede',
    sampleAnswersTitle: 'Vzorové vety:',
    rescuePhrasesTitle: 'Záchranné frázy:',

    // Arena & Leaderboard
    arenaBadge: 'Súťažná Aréna',
    arenaTitle: 'Aréna & AI Kvízy',
    arenaSubtitle: 'Testujte svoje znalosti v dennom AI kvíze vygenerovanom cez Gemini a zbierajte bonusové body do rebríčka.',
    startDailyQuiz: 'Spustiť Denný Kvíz (+15 Bodov)',
    liveLeaderboard: 'Živý rebríček',
    challengeAndPoints: 'Výzva & Body',
    realTimeSync: '● Real-time Sync',
    dayStreakLabel: 'denná séria',
    pointsUnit: 'bodov',
  },

  en: {
    // Navigation & Common
    dashboard: 'Dashboard',
    islands: 'Islands',
    ankiDeck: 'Anki Deck',
    arena: 'Arena',
    aiTutor: 'AI Tutor',
    streak: 'days',
    pts: 'pts',
    profileSwitch: 'Switch Profile',
    manageProfiles: '⚙️ Manage Profiles',
    back: '‹ Back',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save Changes',
    create: 'Create Profile',
    delete: 'Delete Profile',
    loading: 'Loading...',
    ready: 'Ready',
    error: 'Error',
    themeDark: 'Dark Theme',
    themeLight: 'Light Theme',

    // Dashboard Hero & Missions
    phase: 'Phase',
    dayOf: 'Day',
    of90: 'of 90',
    phase1Subtitle: 'Survival Spanish',
    phase2Subtitle: 'More Speaking & Past Tenses',
    phase3Subtitle: 'A2/B1 Fluent Communication',
    greeting: '¡Hola',
    todayWorkingOn: 'Today you are working on:',
    and: 'and',
    launchAiTutor: 'Launch AI Tutor',
    trainAnki: 'Practice Anki',
    prevDay: '← Previous',
    nextDay: 'Next Day →',
    daysCount: 'Days',
    todaysMissions: '🎯 Today’s Missions — Day',
    allCompletedBonus: '✓ All Done (+20 bonus)',
    loadingMissions: 'Loading missions...',

    // Task Actions & Labels
    taskIsland: 'Island',
    taskAnki: 'Anki Review',
    taskBook: 'Prokopová Textbook',
    taskDS: 'Dreaming Spanish',
    taskSpeaking: 'AI Tutor',
    actionPracticeIsland: 'Practice Island',
    actionTrainAnki: 'Train Anki',
    actionViewLesson: 'View Lesson',
    actionOpenYouTube: 'Watch on YouTube ↗',
    actionTalkAi: 'Talk to AI',
    actionStart: 'Start',
    actionOpen: 'Open',
    completedCheck: 'Completed',
    unmarkCheck: 'Mark as done',

    // Schedule
    scheduleBadge: 'Curriculum Schedule',
    weekTitle: 'Week',
    dayLabel: 'Day',

    // Profile Manager Modal
    profilesTitle: 'Profiles',
    editProfile: 'Edit Profile',
    addProfile: '+ Add Profile',
    profileName: 'Profile Name',
    profileNamePlaceholder: 'e.g. Karel, Lucka...',
    avatar: 'Avatar',
    activeAvatarLabel: 'Active:',
    generateAiAvatar: 'Create Spanish AI Avatar',
    preferredBaseLanguage: 'Preferred Base Language',
    theme: 'App Theme',
    startingLevel: 'Starting Level',
    deleteProfileConfirm: 'Are you sure you want to delete this profile?',
    savedSuccessfully: 'Profile saved successfully!',

    // Textbook Modal
    textbookTitle: 'Spanish for Self-Learners',
    author: 'Lída Prokopová',
    lessonDetail: 'Lesson Details',
    recommendedLesson: 'Recommended Lesson:',
    grammarFocus: 'Grammar Focus:',
    audioTrack: 'Audio Track:',
    whatToStudy: 'What to Study:',
    whatToSkip: 'What to Skip (Save Time):',
    skipNotice: 'Skip tedious fill-in grammar exercises. Focus on the core dialogue and audio!',
    stepRoutineTitle: 'Recommended 4-Step Routine (max 15 min):',
    consistencyTag: 'Consistency > Fill-in Drills',
    iUnderstandBtn: '✓ Understood, let’s go to dialogue',
    step1Title: '1. Listen to Dialogue (10 min)',
    step1Desc: 'Play the MP3 audio and follow the dialogue text with your eyes.',
    step2Title: '2. Understand Pattern (5 min)',
    step2Desc: 'Read the short grammar box to understand how the syntax works.',
    step3Title: '3. Sentence Mining (5 min)',
    step3Desc: 'Pick 2–4 useful sentences from the dialogue for your deck.',
    step4Title: '4. Active Practice with AI (10 min)',
    step4Desc: 'Use your newly learned sentences in your evening AI conversation.',

    // Anki Page & Modal
    ankiBadge: 'Spaced Repetition & Active Recall',
    ankiTitle: 'Anki Deck',
    ankiSubtitle: 'Smart algorithm to automate Spanish sentences. New flashcards unlock gradually with each day of the program.',
    startAnkiTraining: 'Start Anki Training',
    featureShuffleTitle: 'Random Shuffle',
    featureShuffleDesc: 'Shuffle button randomizes card order for rapid reaction training independent of context.',
    featureUnlockTitle: 'Gradual Unlocking',
    featureUnlockDesc: '3 new sentences unlock every day from mastered islands so you never feel overwhelmed.',
    featureTtsTitle: 'Native TTS Voice',
    featureTtsDesc: 'Native Spanish pronunciation (es-ES) with adjustable playback speed for shadowing.',
    cardsCount: 'cards',
    unlockedCards: 'Unlocked',
    shuffleOrder: 'Random',
    originalOrder: 'Original',
    showAnswer: 'Show Answer (Spacebar)',
    ratingAgain: '🔴 Again',
    ratingGood: '🟢 Good (+1)',
    ratingEasy: '⚡ Easy',
    productionPrompt: '🇬🇧 English sentence ➔ Speak in Spanish',
    clozePrompt: '📝 Fill in the missing word (Cloze)',
    recognitionPrompt: '🇪🇸 Spanish sentence ➔ Translation',
    translationLabel: 'Translation:',

    // Islands Page & Trainer
    islandsBadge: 'Language Islands Method',
    islandsTitle: 'Language Islands',
    islandsSubtitle: 'Master 100 high-frequency automated sentences, survival phrases, restaurants and daily topics with instant AI pronunciation feedback.',
    allIslands: 'All Islands',
    customIslands: 'Custom Islands',
    createCustomIsland: 'Create Custom AI Island',
    sentencesCount: 'sentences',
    startTraining: 'Start Training →',
    startBtn: 'Start',
    pauseBtn: 'Pause',
    shadowMode: 'Shadowing',
    recallMode: 'Active Recall',
    shadowPause: 'Shadowing Pause:',
    repCount: 'Sentence Repetitions:',
    voiceSpeed: 'Voice Speed:',
    speakNowPrompt: '🗣️ NOW SPEAK ALOUD!',
    mastered: 'Mastered',
    islandStats: 'Island Stats',
    today: 'Today',
    allTime: 'All-time',
    practiced: 'Practiced',
    repetitions: 'Reps',
    howToPractice: 'BEST PRACTICE GUIDE',
    shadowGuide: '🎧 Shadowing: Listen, pause, and repeat sentences out loud.',
    recallGuide: '💬 Recall: Translate from memory with your AI coach.',

    // AI Recall Coach & Live Session
    recallCoachTitle: 'AI Recall Coach',
    recallCoachSubtitle: 'Hands-free Active Recall speaking session',
    howItWorksTitle: 'How it works (Hands-Free):',
    howItWorks1: '• AI says the sentence in English',
    howItWorks2: '• You speak Spanish into your microphone',
    howItWorks3: '• AI evaluates instantly and moves to the next',
    startRecallSession: 'Start AI Recall Session',
    voiceLabel: 'Voice:',
    voiceFemale: 'Female',
    voiceMale: 'Male',
    idleStatus: 'Ready to start',
    connectingStatus: 'Connecting to AI...',
    listeningStatus: '🎙️ Your turn — speak!',
    speakingStatus: '🔊 AI speaking...',
    liveConnecting: 'Connecting to Gemini Live API...',
    liveListening: '🎙️ Listening to you — speak!',
    liveSpeaking: '🔊 Tutor speaking...',
    saveMemoryBtn: 'Save Memory',
    hintBtn: 'Give Hint',
    slowerBtn: 'Speak Slower',
    repeatBtn: 'Repeat That',
    endSession: 'End Session',

    // AI Tutor Page
    tutorBadge: 'Personalized AI Tutor • Gemini 3.1 Flash Live',
    tutorTitle: 'AI Voice Tutor',
    tutorSubtitle: 'Set your precise CEFR level, choose a scenario, and practice real-time conversational speaking with instant corrective feedback.',
    startCallButton: 'Start Live Call',
    selectLevelTitle: '1. Select your Level (A0 – C2)',
    selectLevelSubtitle: 'The tutor adapts tempo, sentence structure complexity, and feedback frequency.',
    selectedLabel: 'Selected:',
    selectTopicTitle: '2. Choose Topic or Custom Prompt',
    selectTopicSubtitle: 'Predefined roleplay scenarios or custom topics saved to your profile.',
    createCustomTopicBtn: 'Create Custom Topic',
    closeFormBtn: '✕ Close form',
    saveTopicBtn: 'Save Topic to Profile',
    savedCustomTopicsTitle: 'Your Saved Custom Topics',
    customTopicNameLabel: 'Topic Title',
    customTopicNamePlaceholder: 'e.g. Market Shopping',
    customTopicPromptLabel: 'AI Prompt / Instructions',
    customTopicPromptPlaceholder: 'I want to practice bargaining for fruit prices',
    cheatSheetTitle: 'Cheat Sheet',
    sampleAnswersTitle: 'Sample sentences:',
    rescuePhrasesTitle: 'Rescue phrases:',

    // Arena & Leaderboard
    arenaBadge: 'Competition Arena',
    arenaTitle: 'Arena & AI Quizzes',
    arenaSubtitle: 'Test your Spanish knowledge with daily AI quizzes generated via Gemini and collect bonus points for the leaderboard.',
    startDailyQuiz: 'Start Daily Quiz (+15 Pts)',
    liveLeaderboard: 'Live Leaderboard',
    challengeAndPoints: 'Challenge & Points',
    realTimeSync: '● Real-time Sync',
    dayStreakLabel: 'day streak',
    pointsUnit: 'pts',
  },
};

export const getTranslation = (lang: AppLanguage): TranslationSchema => {
  return translations[lang] || translations.cs;
};