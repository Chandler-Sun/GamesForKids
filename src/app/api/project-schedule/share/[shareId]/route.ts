import { NextResponse } from 'next/server';
import { getScheduleJson } from '@/lib/r2';

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: { shareId: string } }
) {
  const { shareId } = params;
  if (!shareId || shareId.length > 64) {
    return NextResponse.json({ error: '无效的分享 ID' }, { status: 400 });
  }

  const json = await getScheduleJson(shareId);
  if (json == null) {
    return NextResponse.json({ error: '分享不存在或已过期' }, { status: 404 });
  }

  try {
    const data = JSON.parse(json);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '数据格式错误' }, { status: 500 });
  }
}
