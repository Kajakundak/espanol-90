// src/app/api/ai/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    
    // Explicitní slovník klíčových frází zabrání cizojazyčným halucinacím
    const prompt =
      (formData.get('prompt') as string) ||
      'Konverzace ve španělštině a češtině. Ahoj, jak se máš, Me llamo Karel, Soy de Praga, ¿De dónde eres?, ¿Cómo te llamas?, Tengo años, por favor, gracias.';

    if (!file || file.size < 1000) {
      return NextResponse.json({ text: '' });
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file, 'audio.wav');
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('response_format', 'json');
    groqFormData.append('temperature', '0.0');
    groqFormData.append('prompt', prompt);

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Groq Whisper API error:', errText);
      return NextResponse.json({ text: '' });
    }

    const data = await res.json();
    const cleanText = (data.text || '').trim();

    return NextResponse.json({ text: cleanText });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ text: '' });
  }
}