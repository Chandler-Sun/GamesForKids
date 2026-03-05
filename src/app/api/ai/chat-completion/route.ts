import { NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/services/ai_service_server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, temperature, max_tokens, model } = body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages 必须为非空数组' }, { status: 400 });
    }

    const response = await chatCompletion({
      messages,
      ...(typeof temperature === 'number' && { temperature }),
      ...(typeof max_tokens === 'number' && { max_tokens }),
      ...(typeof model === 'string' && model && { model }),
    });

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json({ error: 'AI 服务未配置' }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
