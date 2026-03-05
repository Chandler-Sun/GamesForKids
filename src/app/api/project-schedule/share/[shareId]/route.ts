import { NextResponse } from 'next/server';
import { getScheduleJson, uploadScheduleJson, deleteScheduleJson, isR2Configured } from '@/lib/r2';
import type { SharedPlanPayload } from '@/lib/project-schedule-share';

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

export async function PUT(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 未配置' }, { status: 503 });
  }
  const { shareId } = params;
  if (!shareId || shareId.length > 64) {
    return NextResponse.json({ error: '无效的分享 ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是有效 JSON' }, { status: 400 });
  }
  const payload = body as SharedPlanPayload;
  if (!payload || typeof payload.rawText !== 'string' || typeof payload.projectStart !== 'string' || !Array.isArray(payload.scheduledTasks)) {
    return NextResponse.json({ error: '缺少 rawText、projectStart 或 scheduledTasks' }, { status: 400 });
  }

  const toStore: SharedPlanPayload = {
    rawText: payload.rawText,
    projectStart: payload.projectStart,
    scheduledTasks: payload.scheduledTasks,
    sharedAt: new Date().toISOString(),
  };
  const ok = await uploadScheduleJson(shareId, JSON.stringify(toStore));
  if (!ok) return NextResponse.json({ error: '更新失败' }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { shareId: string } }
) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 未配置' }, { status: 503 });
  }
  const { shareId } = params;
  if (!shareId || shareId.length > 64) {
    return NextResponse.json({ error: '无效的分享 ID' }, { status: 400 });
  }
  const ok = await deleteScheduleJson(shareId);
  if (!ok) return NextResponse.json({ error: '删除失败' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
