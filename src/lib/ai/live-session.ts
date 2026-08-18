'use client';

/**
 * LiveTutorSession — Native WebSocket connection to Gemini 3.1 Flash Live API.
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
  onError: (msg: string) => void;
}

/** Convert Float32 samples to Int16 PCM, return base64 string */
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
  private processorNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private status: LiveStatus = 'idle';
  private isClosed = false;
  private isSetupComplete = false;

  constructor(
    private apiKey: string,
    private callbacks: LiveSessionCallbacks,
  ) {}

  private setStatus(s: LiveStatus) {
    this.status = s;
    this.callbacks.onStatusChange(s);
  }

  // ── Public Connect ─────────────────────────────────────────────────────────

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
    this.setStatus('connecting');

    try {
      // 1. Initialize Audio Context
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive',
      });

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // 2. Microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 3. Setup system instruction
      const studentCtx = {
        userName: opts.userName,
        totalPoints: opts.totalPoints,
        currentStreak: opts.currentStreak,
      };

      let systemInstruction: string;
      switch (opts.mode) {
        case '__textbook_lesson__':
        case '__island_recall__':
          systemInstruction = opts.situation || '';
          break;
        case 'travel_mode':
          systemInstruction = SYSTEM_PROMPTS.TRAVEL_MODE(opts.situation || 'HOTEL', opts.nativeLanguage, opts.level);
          break;
        case 'interrogation_mode':
          systemInstruction = SYSTEM_PROMPTS.INTERROGATION_MODE(opts.nativeLanguage, opts.level);
          break;
        case 'story_mode':
          systemInstruction = SYSTEM_PROMPTS.STORY_MODE(opts.nativeLanguage, opts.level);
          break;
        case 'survival_mode':
          systemInstruction = SYSTEM_PROMPTS.SURVIVAL_MODE(opts.nativeLanguage, opts.level);
          break;
        case 'weekly_review':
          systemInstruction = SYSTEM_PROMPTS.WEEKLY_REVIEW(opts.nativeLanguage, opts.level);
          break;
        default:
          systemInstruction = SYSTEM_PROMPTS.BEGINNER_CONVERSATION(opts.topic, opts.nativeLanguage, opts.level, studentCtx);
      }

      // Append saved memories ONLY for general free conversation (never pollute textbook or recall sessions)
      if (opts.memories && opts.memories.length > 0 && opts.mode !== '__textbook_lesson__' && opts.mode !== '__island_recall__') {
        const memoryText = opts.memories
          .map((m, idx) => `[Minulá relace ${idx + 1} - ${m.topic}]: ${m.summary}. (Fakta o studentovi: ${m.userFacts.join(', ')})`)
          .join('\n');

        systemInstruction += `\n\n🧠 PAMĚŤ MINULÝCH RELACÍ A FAKTA O STUDENTOVI:\nJako osobní tutor znáš z minulých rozhovorů tyto učené informace o studentovi:\n${memoryText}\nNavazuj na tyto informace přirozeně, když je to vhodné. Netaž se znova na to, co už víš!`;
      }

      // Generic conversation guidelines (skipped for textbook & recall drills)
      if (opts.mode !== '__island_recall__' && opts.mode !== '__textbook_lesson__') {
        const langName = opts.nativeLanguage === 'cs' ? 'Czech' : opts.nativeLanguage === 'sk' ? 'Slovak' : 'English';
        systemInstruction += `\n\nVOICE INSTRUCTION & ADAPTIVE HINTS (STUDENT LEVEL: ${opts.level}):
You are speaking aloud in real-time.
- If student level is A0 (absolute beginner): Speak primarily in ${langName}. Introduce Spanish words one by one very slowly.
- If student level is A1 or higher: Speak Spanish naturally at an appropriate pace. When explaining grammar or giving corrections, switch to ${langName} naturally.`;
      }

      // 4. WebSocket URL (v1beta BidiGenerateContent)
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        console.log('Gemini Live: WebSocket connected. Sending setup message...');
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
          console.error('Gemini Live: Message parse error', err);
        }
      };

      ws.onerror = (e: any) => {
        console.error('Gemini Live: WebSocket error', e);
        this.callbacks.onError('Spojení selhalo.');
        this.setStatus('error');
      };

      ws.onclose = (e: any) => {
        console.log('Gemini Live: WebSocket closed', e);
        if (!this.isClosed) {
          const reason = e?.reason || e?.code ? ` (Kód: ${e.code}, Důvod: ${e.reason || 'Bez popisu'})` : '';
          this.callbacks.onError(`Spojení ukončeno serverem${reason}`);
          this.setStatus('closed');
        }
      };
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live:', err);
      this.callbacks.onError('Nelze navázat Live WebSocket spojení: ' + (err?.message || String(err)));
      this.setStatus('error');
    }
  }

  async disconnect() {
    this.isClosed = true;
    this.isSetupComplete = false;
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

  // ── Audio Input (Microphone → WebSocket) ──────────────────────────────────

  private async startMicrophoneCapture() {
    if (!this.audioCtx || !this.mediaStream) return;

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    const sendAudioChunk = (pcmB64: string) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete && !this.isClosed) {
        this.ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: 'audio/pcm;rate=16000',
                data: pcmB64,
              },
            },
          })
        );
      }
    };

    try {
      if (this.audioCtx.audioWorklet) {
        await this.audioCtx.audioWorklet.addModule('/pcm-processor.js');
        const workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-processor');
        workletNode.port.onmessage = (e) => {
          sendAudioChunk(float32ToBase64PCM(e.data));
        };
        this.sourceNode.connect(workletNode);
        workletNode.connect(this.audioCtx.destination);
        this.processorNode = workletNode;
      } else {
        const scriptNode = this.audioCtx.createScriptProcessor(4096, 1, 1);
        scriptNode.onaudioprocess = (e) => {
          sendAudioChunk(float32ToBase64PCM(e.inputBuffer.getChannelData(0)));
        };
        this.sourceNode.connect(scriptNode);
        scriptNode.connect(this.audioCtx.destination);
        this.processorNode = scriptNode;
      }
    } catch (err) {
      console.error('Microphone capture error:', err);
    }
  }

  private stopMicrophoneCapture() {
    try {
      this.processorNode?.disconnect();
      this.sourceNode?.disconnect();
      this.mediaStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    this.processorNode = null;
    this.sourceNode = null;
    this.mediaStream = null;
  }

  // ── Server Message Handler & Audio Output ─────────────────────────────────

  private handleServerMessage(msg: any) {
    const isSetupComplete = msg.setupComplete || msg.setup_complete;
    const serverContent = msg.serverContent || msg.server_content;

    if (isSetupComplete) {
      console.log('Gemini Live: Setup complete confirmed by server.');
      this.isSetupComplete = true;
      this.setStatus('listening');
      this.startMicrophoneCapture();
      return;
    }

    if (serverContent?.interrupted) {
      console.log('Gemini Live: Interrupted by user speech');
      this.stopAudioPlayback();
      return;
    }

    if (serverContent) {
      const modelTurn = serverContent.modelTurn || serverContent.model_turn;
      const inputTranscription = serverContent.inputTranscription || serverContent.input_transcription;
      const outputTranscription = serverContent.outputTranscription || serverContent.output_transcription;

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          if (part.text) {
            this.callbacks.onTranscript('model', part.text);
          }
          const inlineData = part.inlineData || part.inline_data;
          if (inlineData?.data) {
            this.setStatus('speaking');
            this.playPCMAudioChunk(inlineData.data);
          }
        }
      }

      if (inputTranscription?.text) {
        this.callbacks.onTranscript('user', inputTranscription.text);
      }

      if (outputTranscription?.text) {
        this.callbacks.onTranscript('model', outputTranscription.text);
      }
    }

    if (serverContent?.turnComplete || serverContent?.turn_complete) {
      setTimeout(() => {
        if (!this.isClosed && this.status !== 'closed') {
          this.setStatus('listening');
        }
      }, 400);
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