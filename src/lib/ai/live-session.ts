// src/lib/ai/live-session.ts
'use client';

/**
 * LiveTutorSession — Native WebSocket connection to Gemini 3.1 Flash Live API
 * with turn boundary signals (onTurnStart / onTurnComplete).
 */

import { NativeLanguage, CEFRLevel, SYSTEM_PROMPTS } from './gemini';

export const LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';

export const LIVE_VOICES = [
  { id: 'Aoede', label: 'Aoede (Žena)', gender: 'female' },
  { id: 'Leda',  label: 'Leda (Žena)',  gender: 'female' },
  { id: 'Kore',  label: 'Kore (Žena)',  gender: 'female' },
  { id: 'Puck',  label: 'Puck (Muž)',   gender: 'male'   },
  { id: 'Charon',label: 'Charon (Muž)', gender: 'male'   },
] as const;

export type LiveVoiceId = (typeof LIVE_VOICES)[number]['id'];

export type LiveStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'speaking'
  | 'error'
  | 'closed';

export interface LiveSessionCallbacks {
  onStatusChange: (status: LiveStatus) => void;
  onTranscript: (role: 'user' | 'model', text: string) => void;
  onTurnStart?: (role: 'user' | 'model') => void;
  onTurnComplete?: () => void;
  onError: (msg: string) => void;
}

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.port.postMessage(input[0]);
    }
    return true;
  }
}
registerProcessor('pcm-recorder-worklet', PCMProcessor);
`;

export function sanitizeTranscript(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/응/g, '')
    .replace(/아주/g, 'muy')
    .replace(/네/g, 'Sí');

  cleaned = cleaned.replace(/[^\w\s\d.,!?'"¿¡áäčďéěíĺľňóôŕřšťúůýžÁÄČĎÉĚÍĹĽŇÓÔŔŘŠŤÚŮÝŽñÑüÜ-]/g, '');
  return cleaned.replace(/\s+/g, ' ').trim();
}

function float32ToBase64PCM(float32Array: Float32Array): string {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export class LiveTutorSession {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private status: LiveStatus = 'idle';
  private isClosed = false;
  private isSetupComplete = false;
  private isModelTurnActive = false;

  constructor(
    private apiKey: string,
    private callbacks: LiveSessionCallbacks,
  ) {}

  private setStatus(s: LiveStatus) {
    this.status = s;
    this.callbacks.onStatusChange(s);
  }

  async connect(opts: {
    mode: string;
    topic: string;
    nativeLanguage: NativeLanguage;
    level: CEFRLevel;
    voiceId: LiveVoiceId;
    situation?: string;
    userName?: string;
    totalPoints?: number;
    currentStreak?: number;
    memories?: { topic: string; summary: string; userFacts: string[] }[];
  }) {
    if (this.ws) return;
    this.isClosed = false;
    this.isSetupComplete = false;
    this.isModelTurnActive = false;
    this.setStatus('connecting');

    const langConfig = {
      cs: { name: 'CZECH', native: 'Čeština' },
      sk: { name: 'SLOVAK', native: 'Slovenčina' },
      en: { name: 'ENGLISH', native: 'English' },
    };
    const activeLang = langConfig[opts.nativeLanguage] || langConfig.cs;
    const studentName = opts.userName || 'Karel';

    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive',
      });

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const studentCtx = {
        userName: studentName,
        totalPoints: opts.totalPoints,
        currentStreak: opts.currentStreak,
      };

      let systemInstruction = `=======================================================
STRICT TWO-LANGUAGE CONVERSATION & PACING DIRECTIVES:
You are an AI Spanish Tutor conversing with student: ${studentName}.
Allowed languages in this session:
1. SPANISH (Español)
2. ${activeLang.name} (${activeLang.native})

PACING & CONVERSATIONAL RULES (VERY IMPORTANT):
- Speak ONLY 1-2 SHORT sentences per turn.
- Ask ONE clear question at a time and then STOP speaking so the student can reply.
- NEVER speak long monologues or combine multiple questions into one turn.
- Student speaks to you in ${activeLang.name} or SPANISH.
=======================================================\n\n`;

      switch (opts.mode) {
        case '__textbook_lesson__':
        case '__island_recall__':
          systemInstruction += opts.situation || '';
          break;
        case 'travel_mode':
          systemInstruction += SYSTEM_PROMPTS.TRAVEL_MODE(opts.situation || 'HOTEL', opts.nativeLanguage, opts.level);
          break;
        case 'interrogation_mode':
          systemInstruction += SYSTEM_PROMPTS.INTERROGATION_MODE(opts.nativeLanguage, opts.level);
          break;
        case 'story_mode':
          systemInstruction += SYSTEM_PROMPTS.STORY_MODE(opts.nativeLanguage, opts.level);
          break;
        case 'survival_mode':
          systemInstruction += SYSTEM_PROMPTS.SURVIVAL_MODE(opts.nativeLanguage, opts.level);
          break;
        case 'weekly_review':
          systemInstruction += SYSTEM_PROMPTS.WEEKLY_REVIEW(opts.nativeLanguage, opts.level);
          break;
        default:
          systemInstruction += SYSTEM_PROMPTS.BEGINNER_CONVERSATION(opts.topic, opts.nativeLanguage, opts.level, studentCtx);
      }

      if (opts.memories && opts.memories.length > 0 && opts.mode !== '__textbook_lesson__' && opts.mode !== '__island_recall__') {
        const memoryText = opts.memories
          .map((m, idx) => `[Minulá relace ${idx + 1} - ${m.topic}]: ${m.summary}. (Fakta: ${m.userFacts.join(', ')})`)
          .join('\n');

        systemInstruction += `\n\n🧠 PAMĚŤ MINULÝCH RELACÍ:\n${memoryText}\nNavazuj na tyto informace přirozeně!`;
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        const setupMessage = {
          setup: {
            model: LIVE_MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: opts.voiceId },
                },
              },
            },
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
          },
        };

        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = async (event) => {
        try {
          let text: string;
          if (typeof event.data === 'string') {
            text = event.data;
          } else if (event.data instanceof Blob) {
            text = await event.data.text();
          } else {
            return;
          }

          const response = JSON.parse(text);
          this.handleServerMessage(response);
        } catch (err) {
          console.error('Gemini Live parse error:', err);
        }
      };

      ws.onerror = (e: any) => {
        console.error('Gemini Live WS error:', e);
        this.callbacks.onError('Spojení selhalo.');
        this.setStatus('error');
      };

      ws.onclose = (e: any) => {
        if (!this.isClosed) {
          const reason = e?.reason || e?.code ? ` (Kód: ${e.code}, Důvod: ${e.reason || 'Bez popisu'})` : '';
          this.callbacks.onError(`Spojení ukončeno serverem${reason}`);
          this.setStatus('closed');
        }
      };
    } catch (err: any) {
      this.callbacks.onError('Nelze navázat Live spojení: ' + (err?.message || String(err)));
      this.setStatus('error');
    }
  }

  async disconnect() {
    this.isClosed = true;
    this.isSetupComplete = false;
    this.isModelTurnActive = false;
    this.stopMicrophoneCapture();
    this.stopAudioPlayback();

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { await this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }

    this.setStatus('closed');
  }

  sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete && !this.isClosed) {
      this.isModelTurnActive = false;
      this.ws.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text }],
              },
            ],
            turnComplete: true,
          },
        })
      );
    }
  }

  private async startMicrophoneCapture() {
    if (!this.audioCtx || !this.mediaStream) return;

    try {
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await this.audioCtx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-recorder-worklet');
      workletNode.port.onmessage = (e) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete && !this.isClosed) {
          const pcmBase64 = float32ToBase64PCM(e.data);
          this.ws.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: pcmBase64,
                },
              },
            })
          );
        }
      };

      this.sourceNode.connect(workletNode);
      workletNode.connect(this.audioCtx.destination);
      this.workletNode = workletNode;
    } catch (err) {
      console.error('AudioWorklet initialization error:', err);
    }
  }

  private stopMicrophoneCapture() {
    try {
      this.workletNode?.disconnect();
      this.sourceNode?.disconnect();
      this.mediaStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    this.workletNode = null;
    this.sourceNode = null;
    this.mediaStream = null;
  }

  private handleServerMessage(msg: any) {
    const isSetupComplete = msg.setupComplete || msg.setup_complete;
    const serverContent = msg.serverContent || msg.server_content;

    if (isSetupComplete) {
      this.isSetupComplete = true;
      this.setStatus('listening');
      this.startMicrophoneCapture();
      return;
    }

    if (serverContent?.interrupted) {
      this.stopAudioPlayback();
      this.isModelTurnActive = false;
      this.callbacks.onTurnComplete?.();
      return;
    }

    if (serverContent) {
      const outputTranscription =
        serverContent.outputTranscription ||
        serverContent.output_transcription;

      const modelTurn = serverContent.modelTurn || serverContent.model_turn;

      // Pokud lektorka začíná novou odpověď, vyšleme signál začátku nového tahu (nová bublina)
      if ((outputTranscription?.text || modelTurn?.parts) && !this.isModelTurnActive) {
        this.isModelTurnActive = true;
        this.callbacks.onTurnStart?.('model');
      }

      if (outputTranscription?.text) {
        const cleanModelText = sanitizeTranscript(outputTranscription.text);
        if (cleanModelText) {
          this.callbacks.onTranscript('model', cleanModelText);
        }
      }

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          if (part.text && !outputTranscription?.text && !part.text.startsWith('data:')) {
            const cleanPartText = sanitizeTranscript(part.text);
            if (cleanPartText) {
              this.callbacks.onTranscript('model', cleanPartText);
            }
          }

          const inlineData = part.inlineData || part.inline_data;
          if (inlineData?.data) {
            this.setStatus('speaking');
            this.playPCMAudioChunk(inlineData.data);
          }
        }
      }
    }

    // Dokončení odpovědi lektorky -> uzavřeme tah, další odpověď bude v nové bublině
    if (serverContent?.turnComplete || serverContent?.turn_complete) {
      this.isModelTurnActive = false;
      this.callbacks.onTurnComplete?.();
      setTimeout(() => {
        if (!this.isClosed && this.status !== 'closed') {
          this.setStatus('listening');
        }
      }, 300);
    }
  }

  private playPCMAudioChunk(base64PCM: string) {
    if (!this.audioCtx || this.audioCtx.state === 'closed') return;

    try {
      const binaryStr = atob(base64PCM);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const pcm16 = new Int16Array(bytes.buffer);
      const floatData = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) floatData[i] = pcm16[i] / 32768.0;

      const outputSampleRate = 24000;
      const audioBuffer = this.audioCtx.createBuffer(1, floatData.length, outputSampleRate);
      audioBuffer.getChannelData(0).set(floatData);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now + 0.01;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
      };
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  private stopAudioPlayback() {
    this.activeSources.forEach((s) => {
      try { s.stop(); s.disconnect(); } catch {}
    });
    this.activeSources = [];
    this.nextPlayTime = 0;
  }
}