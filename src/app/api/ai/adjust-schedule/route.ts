import { NextResponse } from 'next/server';
import { adjustSchedulePlan } from '@/lib/services/ai_service_server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentMarkdown = body?.currentMarkdown;
    const userRequest = body?.userRequest;

    if (typeof currentMarkdown !== 'string' || typeof userRequest !== 'string') {
      return NextResponse.json(
        { error: '请求体需包含 currentMarkdown 和 userRequest（字符串）' },
        { status: 400 }
      );
    }

    const content = await adjustSchedulePlan(currentMarkdown, userRequest);
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json({ error: 'AI 服务未配置' }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
