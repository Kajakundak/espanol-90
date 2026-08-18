// src/app/debug-audio/page.tsx
'use client';

import { useState } from 'react';

export default function DebugAudioPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => setLogs((prev) => [...prev, msg]);

  const testAudio = async (name: string, url: string) => {
    log(`--- Testuji: ${name} ---`);
    log(`URL: ${url}`);
    
    // 1. Test HTTP dostupnosti (Fetch)
    try {
      const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-100' } });
      log(`[Fetch] HTTP Status: ${res.status} ${res.ok ? '✅' : '❌'}`);
      if (!res.ok) log(`[Fetch] Chyba: Soubor neexistuje nebo je zablokován.`);
    } catch (e: any) {
      log(`[Fetch] Zásadní chyba (CORS nebo Network): ${e.message} ❌`);
    }

    // 2. Test Audio Elementu
    const audio = new Audio(url);
    audio.onerror = () => {
      const err = audio.error;
      log(`[Audio] Selhalo přehrávání! Kód: ${err?.code}, Zpráva: ${err?.message || 'Neznámá chyba'} ❌`);
    };
    audio.oncanplay = () => {
      log(`[Audio] Prohlížeč hlásí, že soubor LZE PŘEHRÁT! ✅`);
    };
    audio.onplay = () => log(`[Audio] Přehrávám... 🔊`);
    
    try {
      audio.muted = true; // Ztlumeno, abychom nenarazili na blokaci autoplay
      await audio.play();
    } catch (e: any) {
      log(`[Audio] Autoplay zablokován: ${e.message}`);
    }
  };

  const runDiagnostics = () => {
    setLogs([]);
    const testFile = '1_07.mp3';
    
    testAudio('1. Lokální složka', `/mp3/${testFile}`);
    setTimeout(() => {
      testAudio('2. GitHub Raw', `https://raw.githubusercontent.com/Kajakundak/espanol-90/main/public/mp3/${testFile}`);
    }, 1000);
    setTimeout(() => {
      testAudio('3. JSDelivr CDN', `https://cdn.jsdelivr.net/gh/Kajakundak/espanol-90@main/public/mp3/${testFile}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-mono text-sm space-y-6">
      <h1 className="text-xl font-bold text-amber-400">Audio Diagnostika</h1>
      <button 
        onClick={runDiagnostics}
        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
      >
        Spustit testy pro "1_07.mp3"
      </button>
      
      <div className="bg-black p-4 rounded-xl border border-white/20 whitespace-pre-wrap space-y-1">
        {logs.length === 0 ? 'Zatím žádné logy...' : logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}