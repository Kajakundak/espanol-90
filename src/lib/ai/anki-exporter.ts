import { AnkiCard } from '@/lib/types';

export function convertCardsToAnkiCSV(cards: AnkiCard[]): string {
  // Format: ClozeText;Translation;Tag
  return cards
    .map((c) => `"${c.clozeDeletion}";"${c.englishTranslation}";"Espanol90"`)
    .join('\n');
}

export function downloadAnkiCSVFile(cards: AnkiCard[], fileName = 'espanol90_cards.txt') {
  const csvContent = convertCardsToAnkiCSV(cards);
  const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
