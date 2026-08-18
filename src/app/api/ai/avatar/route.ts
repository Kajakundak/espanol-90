import { NextResponse } from 'next/server';
import { ai, MODEL_FLASH_LITE } from '@/lib/ai/gemini';

export async function POST(req: Request) {
  try {
    const { imageBase64, style = 'flamenco', userName = 'Amigo' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Chybí obrázek ve formátu Base64' }, { status: 400 });
    }

    if (!ai) {
      return NextResponse.json({ error: 'AI klient není inicializován' }, { status: 500 });
    }

    // Očištění base64 hlavičky
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const stylePrompts: Record<string, string> = {
      flamenco: 'a vibrant, joyful Spanish Flamenco dancer with a red rose and festive Spanish attire',
      torero: 'a heroic, funny Spanish Matador/Torero wearing an ornate golden "traje de luces" jacket',
      chef: 'a passionate Spanish Tapas & Paella Chef holding a wooden spoon with a chef hat',
      quixote: 'a legendary Don Quixote knight with comical shiny armor and a noble mustache',
      madrid: 'a stylish modern Madrid local wearing cool sunglasses and a red-yellow Spanish scarf',
    };

    const selectedStyleDesc = stylePrompts[style] || stylePrompts.flamenco;

    const prompt = `
You are a world-class caricature artist and SVG vector designer.
Analyze the person in this photo (gender, facial features, hair color, haircut, glasses, facial hair, facial expression).

TASK:
Create a funny, charismatic, colorful, Pixar/Disney-inspired cartoon caricature avatar of this person as ${selectedStyleDesc}.

OUTPUT REQUIREMENTS:
1. Return ONLY valid, self-contained SVG code starting with <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"> and ending with </svg>.
2. Include a beautiful circular gradient background, expressive eyes, and stylized Spanish costume elements.
3. Keep the SVG clean, modern, and beautifully shaded using gradients (<defs><linearGradient...>...).
4. Do NOT output any markdown, backticks, or explanation. ONLY raw <svg>...</svg> code.`;

    const response = await ai.models.generateContent({
      model: MODEL_FLASH_LITE,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    });

    let rawSvg = response.text || '';
    // Vyčištění případného markdown obalu
    rawSvg = rawSvg.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();

    const svgStartIndex = rawSvg.indexOf('<svg');
    const svgEndIndex = rawSvg.lastIndexOf('</svg>');

    if (svgStartIndex === -1 || svgEndIndex === -1) {
      throw new Error('Nepodařilo se vygenerovat validní SVG kód');
    }

    const cleanSvg = rawSvg.substring(svgStartIndex, svgEndIndex + 6);
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;

    return NextResponse.json({
      svgCode: cleanSvg,
      dataUri,
      styleName: style,
      userName,
    });
  } catch (error: any) {
    console.error('Avatar Generation Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Chyba při generování avatara' },
      { status: 500 }
    );
  }
}