export function resolveAudioCandidateUrls(filename: string): string[] {
  const cleanName = filename.replace(/^\/+/, '').replace(/^mp3\//, '');
  return [
    `https://cdn.jsdelivr.net/gh/Kajakundak/espanol-90@main/public/mp3/${cleanName}`
  ];
}

export function resolveSentenceAudioFilename(sentenceId: string): string | null {
  if (!sentenceId) return null;
  const match = sentenceId.match(/(\d+)[_-](\d+)/);
  if (!match) return null;

  const group = match[1];
  const num = match[2]?.padStart(2, '0');
  return `${group}_${num}.mp3`;
}

export function createSilenceDataUri(durationSec: number): string {
  const sampleRate = 8000;
  const numSamples = Math.max(1, Math.floor(sampleRate * Math.max(0.3, durationSec)));
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples, true);

  const pcm = new Uint8Array(buffer, 44, numSamples);
  pcm.fill(128); // Ticho

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}