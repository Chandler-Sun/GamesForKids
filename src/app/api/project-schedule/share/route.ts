import { NextResponse } from 'next/server';
import { isR2Configured, uploadScheduleJson } from '@/lib/r2';
import type { SharedPlanPayload } from '@/lib/project-schedule-share';

export const runtime = 'edge';

export async function POST(request: Request) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'R2 未配置，请设置 R2_ENDPOINT（或 R2_ACCOUNT_ID）、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是有效 JSON' }, { status: 400 });
  }

  const payload = body as SharedPlanPayload;
  if (!payload || typeof payload.rawText !== 'string' || typeof payload.projectStart !== 'string' || !Array.isArray(payload.scheduledTasks)) {
    return NextResponse.json(
      { error: '缺少 rawText、projectStart 或 scheduledTasks' },
      { status: 400 }
    );
  }

  const shareId = crypto.randomUUID();
  const toStore: SharedPlanPayload = {
    rawText: payload.rawText,
    projectStart: payload.projectStart,
    scheduledTasks: payload.scheduledTasks,
    sharedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(toStore);
  const ok = await uploadScheduleJson(shareId, json);
  if (!ok) {
    return NextResponse.json({ error: '上传失败' }, { status: 503 });
  }

  return NextResponse.json({ shareId });
}
