/**
 * 工作日历：跳过周末与法定节假日，计算任务排期
 */

import type { Task } from './schedule-parser';

/** 日期按 YYYY-MM-DD 字符串比较，忽略时区 */
export function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** 中国大陆法定节假日（示例：2024、2025 年），格式 YYYY-MM-DD */
const HOLIDAYS_2024 = [
  '2024-01-01', // 元旦
  '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17', // 春节
  '2024-04-04', '2024-04-05', '2024-04-06', // 清明
  '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05', // 劳动节
  '2024-06-10', // 端午
  '2024-09-15', '2024-09-16', '2024-09-17', // 中秋
  '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07', // 国庆
];
const HOLIDAYS_2025 = [
  '2025-01-01',
  '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', '2025-02-05', '2025-02-06', '2025-02-07', '2025-02-08',
  '2025-04-04', '2025-04-05', '2025-04-06',
  '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05',
  '2025-05-31', '2025-06-01', '2025-06-02',
  '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
];

/** 2026 年法定节假日（国务院办公厅通知） */
const HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', '2026-01-03', // 元旦
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节
  '2026-04-04', '2026-04-05', '2026-04-06', // 清明
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
  '2026-06-19', '2026-06-20', '2026-06-21', // 端午
  '2026-09-25', '2026-09-26', '2026-09-27', // 中秋
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', // 国庆
];

const ALL_HOLIDAYS = new Set([...HOLIDAYS_2024, ...HOLIDAYS_2025, ...HOLIDAYS_2026]);

export function isHoliday(d: Date, holidaySet: Set<string> = ALL_HOLIDAYS): boolean {
  return holidaySet.has(dateToKey(d));
}

export function isWorkDay(d: Date, holidaySet?: Set<string>): boolean {
  return !isWeekend(d) && !isHoliday(d, holidaySet);
}

/**
 * 从 start 日起，向后推进 days 个工作日（跳过周末与节假日）
 */
export function addWorkDays(
  start: Date,
  days: number,
  holidaySet: Set<string> = ALL_HOLIDAYS
): Date {
  const result = new Date(start);
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (isWorkDay(result, holidaySet)) remaining--;
  }
  return result;
}

/**
 * 统计 [start, end] 区间内的工作日数量（含首尾）
 */
export function countWorkDays(
  start: Date,
  end: Date,
  holidaySet: Set<string> = ALL_HOLIDAYS
): number {
  const s = new Date(start.getTime());
  const e = new Date(end.getTime());
  if (s > e) return 0;
  let count = 0;
  const d = new Date(s.getTime());
  while (d <= e) {
    if (isWorkDay(d, holidaySet)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * 从 start 日的下一个工作日开始；若 start 已是工作日则返回 start
 */
export function nextWorkDay(
  start: Date,
  holidaySet: Set<string> = ALL_HOLIDAYS
): Date {
  const d = new Date(start);
  while (!isWorkDay(d, holidaySet)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * 为任务列表计算 computedStart / computedEnd（按依赖顺序，跳过周末与节假日）
 */
export function computeSchedule(
  tasks: Task[],
  projectStart: Date,
  holidaySet: Set<string> = ALL_HOLIDAYS
): Task[] {
  const byId = new Map<number, Task>();
  const result = tasks.map((t) => ({ ...t }));
  result.forEach((t) => byId.set(t.id, t));

  const getTask = (id: number): Task | undefined => byId.get(id);

  const duration = (t: Task): number => {
    if (t.durationDays != null && t.durationDays > 0) return t.durationDays;
    return 0;
  };

  const sorted = topologicalSort(result);
  for (const task of sorted) {
    let start: Date;
    if (task.dependsOn.length === 0) {
      start = nextWorkDay(projectStart, holidaySet);
    } else {
      let maxEnd = projectStart;
      for (const depId of task.dependsOn) {
        const dep = getTask(depId);
        if (dep?.computedEnd) {
          if (dep.computedEnd > maxEnd) maxEnd = dep.computedEnd;
        }
      }
      start = nextWorkDay(new Date(maxEnd.getTime() + 86400000), holidaySet);
    }
    const days = duration(task);
    const end = days <= 0 ? start : addWorkDays(start, days - 1, holidaySet);
    task.computedStart = start;
    task.computedEnd = end;
  }

  return result;
}

/** 按依赖拓扑排序（无依赖或依赖已处理的在前面） */
function topologicalSort(tasks: Task[]): Task[] {
  const byId = new Map<number, Task>();
  tasks.forEach((t) => byId.set(t.id, t));
  const result: Task[] = [];
  const added = new Set<number>();

  function add(task: Task) {
    if (added.has(task.id)) return;
    for (const depId of task.dependsOn) {
      const dep = byId.get(depId);
      if (dep && !added.has(dep.id)) add(dep);
    }
    added.add(task.id);
    result.push(task);
  }

  tasks.forEach(add);
  return result;
}

export { ALL_HOLIDAYS as defaultHolidays };
