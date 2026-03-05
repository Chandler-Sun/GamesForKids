import { NextResponse } from 'next/server';
import { analyzeTimeline, type AnalyzeTimelineParams } from '@/lib/services/ai_service_server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeTimelineParams | null;
    if (!body?.events || !Array.isArray(body.events) || typeof body.startYear !== 'number' || typeof body.endYear !== 'number') {
      return NextResponse.json(
        { error: '请求体需包含 events（数组）、startYear、endYear' },
        { status: 400 }
      );
    }

    const text = await analyzeTimeline({
      events: body.events,
      yearSummaries: body.yearSummaries,
      startYear: body.startYear,
      endYear: body.endYear,
    });

    return NextResponse.json({ content: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('OPENROUTER_API_KEY')) {
      return NextResponse.json({ error: 'AI 服务未配置' }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
