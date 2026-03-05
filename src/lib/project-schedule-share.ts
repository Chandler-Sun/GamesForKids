/**
 * 项目计划分享：序列化格式与 localStorage 记录类型
 */

import type { Task } from './schedule-parser';

/** 序列化后的任务（日期为 ISO 字符串） */
export interface SerializedTask extends Omit<Task, 'computedStart' | 'computedEnd'> {
  computedStart?: string;
  computedEnd?: string;
}

/** 上传到 R2 的完整项目计划 JSON 结构 */
export interface SharedPlanPayload {
  rawText: string;
  projectStart: string;
  scheduledTasks: SerializedTask[];
  /** 分享创建时间 ISO 字符串 */
  sharedAt: string;
}

/** localStorage 中单条分享记录 */
export interface ShareRecord {
  shareId: string;
  url: string;
  title: string;
  createdAt: string;
}

export const SHARE_HISTORY_KEY = 'project-schedule-share-history';
const MAX_HISTORY = 50;

export function getShareHistory(): ShareRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SHARE_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ShareRecord[];
    return Array.isArray(list) ? list.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function addShareRecord(record: ShareRecord): void {
  const list = getShareHistory();
  const next = [record, ...list.filter((r) => r.shareId !== record.shareId)].slice(0, MAX_HISTORY);
  localStorage.setItem(SHARE_HISTORY_KEY, JSON.stringify(next));
}

/** 将 Task 转为 SerializedTask（Date -> ISO 字符串） */
export function serializeTask(t: Task): SerializedTask {
  const { computedStart, computedEnd, ...rest } = t;
  return {
    ...rest,
    ...(computedStart && { computedStart: computedStart.toISOString() }),
    ...(computedEnd && { computedEnd: computedEnd.toISOString() }),
  };
}

/** 将 SerializedTask 转为 Task（ISO 字符串 -> Date） */
export function deserializeTask(s: SerializedTask): Task {
  const { computedStart, computedEnd, ...rest } = s;
  return {
    ...rest,
    ...(computedStart && { computedStart: new Date(computedStart) }),
    ...(computedEnd && { computedEnd: new Date(computedEnd) }),
  };
}

export const SHARE_BASE_URL = 'https://kids.belloai.xyz';
