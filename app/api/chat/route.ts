import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, clinicConfig } = await req.json();

    const systemPrompt = `You are a friendly assistant for ${clinicConfig.name}, a ${clinicConfig.type} in ${clinicConfig.location}.

Your job:
- Answer questions about the clinic warmly and helpfully
- Encourage visitors to book an appointment
- Collect their name and phone number if they want to be contacted
- Keep replies SHORT — 2-3 sentences max
- If you don't know something, say "I'll have our team get back to you"
- Always reply in the same language the user writes in (Hebrew or English)

Clinic Info:
- Name: ${clinicConfig.name}
- Type: ${clinicConfig.type}
- Location: ${clinicConfig.location}
- Phone: ${clinicConfig.phone}
- Hours: ${clinicConfig.hours}
- Services: ${clinicConfig.services.join(', ')}
- Special offer: ${clinicConfig.offer || 'Free first consultation'}

When someone wants to book: tell them to click the "Book Appointment" button on the page, or collect their name and phone and say the team will call them back.`;

    const geminiMessages = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that. Please call us directly!";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ reply: "Something went wrong. Please call us directly!" }, { status: 500 });
  }
}
