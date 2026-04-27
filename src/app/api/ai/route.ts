import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, model = 'gpt-3.5-turbo', providerUrl } = await req.json();

    const apiKey = process.env.AI_API_KEY || '';
    const baseUrl = providerUrl || process.env.AI_BASE_URL || 'http://localhost:11434/v1';

    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    if (!apiKey && !isLocal) {
      return NextResponse.json(
        { error: 'API Key is not configured for remote provider. Please check your settings or .env file.' },
        { status: 400 }
      );
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({ error: `AI Provider Error: ${errorData}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ result: data.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
