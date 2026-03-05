'use client';

export const runtime = 'edge';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../../page.module.css';
import { deserializeTask } from '@/lib/project-schedule-share';
import type { SharedPlanPayload } from '@/lib/project-schedule-share';
import type { Task, Priority } from '@/lib/schedule-parser';
import { countWorkDays, computeSchedule } from '@/lib/workday-calc';

const PRIORITY_CLASS: Record<Priority, string> = {
  normal: styles.priorityNormal,
  low: styles.priorityLow,
  high: styles.priorityHigh,
  urgent: styles.priorityUrgent,
};

const PRIORITY_LABEL: Record<Priority, string> = {
  normal: '普通',
  low: '低',
  high: '高',
  urgent: '极高',
};

const ROLE_COLORS = [
  '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#a855f7',
];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const toMonday = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - toMonday);
  return x;
}

function getWeeksInRange(rangeStart: Date, rangeEnd: Date): Date[] {
  const weeks: Date[] = [];
  let w = getWeekStart(new Date(rangeStart.getTime()));
  const end = new Date(rangeEnd.getTime());
  while (w <= end) {
    weeks.push(new Date(w.getTime()));
    w.setDate(w.getDate() + 7);
  }
  return weeks;
}

function getMonthSegments(weeks: Date[]): { label: string; startIndex: number; endIndex: number }[] {
  if (weeks.length === 0) return [];
  const segments: { label: string; startIndex: number; endIndex: number }[] = [];
  let i = 0;
  while (i < weeks.length) {
    const d = weeks[i];
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const label = `${y}年${m}月`;
    let j = i + 1;
    while (j < weeks.length && weeks[j].getFullYear() === y && weeks[j].getMonth() + 1 === m) j++;
    segments.push({ label, startIndex: i, endIndex: j - 1 });
    i = j;
  }
  return segments;
}

const TASK_COL_MIN = 200;
const TASK_COL_MAX = 1024;

export default function ProjectScheduleSharePage() {
  const params = useParams();
  const shareId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [data, setData] = useState<SharedPlanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [showNotesInline, setShowNotesInline] = useState(true);
  const [taskColWidth, setTaskColWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [projectStartStr, setProjectStartStr] = useState('');
  const dragStartRef = useRef<{ x: number; w: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data?.projectStart) setProjectStartStr(data.projectStart);
  }, [data?.projectStart]);

  useEffect(() => {
    if (!shareId) {
      setLoading(false);
      setError('缺少分享 ID');
      return;
    }
    fetch(`/api/project-schedule/share/${encodeURIComponent(shareId)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((body) => Promise.reject(new Error(body?.error || '加载失败')));
        return res.json();
      })
      .then((payload: SharedPlanPayload) => {
        setData(payload);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  const baseTasks = useMemo(() => {
    if (!data?.scheduledTasks?.length) return [];
    return data.scheduledTasks.map(deserializeTask).map(({ computedStart, computedEnd, ...t }) => t as Task);
  }, [data]);

  const projectStart = useMemo(
    () => (projectStartStr ? toLocalDate(projectStartStr) : new Date()),
    [projectStartStr]
  );

  const scheduledTasks = useMemo(() => {
    if (!baseTasks.length || !projectStartStr) return [];
    return computeSchedule(baseTasks, projectStart);
  }, [baseTasks, projectStart]);

  const idToName = useMemo(() => {
    const m = new Map<number, string>();
    scheduledTasks.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [scheduledTasks]);

  const { uniqueRoles, roleToColor } = useMemo(() => {
    const set = new Set<string>();
    scheduledTasks.forEach((t) => t.roles.forEach((r) => set.add(r)));
    const unique = Array.from(set);
    const map = new Map<string, string>();
    unique.forEach((r, i) => map.set(r, ROLE_COLORS[i % ROLE_COLORS.length]));
    return { uniqueRoles: unique, roleToColor: map };
  }, [scheduledTasks]);

  const { rangeStart, rangeEnd, rangeMs, weeks, monthSegments, totalWorkDays, totalPersonDays } = useMemo(() => {
    const starts = scheduledTasks.map((t) => t.computedStart).filter(Boolean) as Date[];
    const ends = scheduledTasks.map((t) => t.computedEnd).filter(Boolean) as Date[];
    const totalPersonDays = scheduledTasks.reduce((sum, t) => sum + (t.personDays ?? 0), 0);
    if (starts.length === 0 || ends.length === 0) {
      return {
        rangeStart: new Date(),
        rangeEnd: new Date(),
        rangeMs: 1,
        weeks: [] as Date[],
        monthSegments: [] as { label: string; startIndex: number; endIndex: number }[],
        totalWorkDays: 0,
        totalPersonDays,
      };
    }
    const rangeStart = new Date(Math.min(...starts.map((d) => d.getTime())));
    const rangeEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
    const rangeMs = Math.max(1, rangeEnd.getTime() - rangeStart.getTime());
    const weeks = getWeeksInRange(rangeStart, rangeEnd);
    const monthSegments = getMonthSegments(weeks);
    const totalWorkDays = countWorkDays(rangeStart, rangeEnd);
    return { rangeStart, rangeEnd, rangeMs, weeks, monthSegments, totalWorkDays, totalPersonDays };
  }, [scheduledTasks]);

  const leftPercent = useCallback(
    (d: Date) => ((d.getTime() - rangeStart.getTime()) / rangeMs) * 100,
    [rangeStart, rangeMs]
  );
  const widthPercent = useCallback(
    (start: Date, end: Date) => Math.max(0, ((end.getTime() - start.getTime()) / rangeMs) * 100),
    [rangeMs]
  );

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, w: taskColWidth };
    setIsDragging(true);
  }, [taskColWidth]);

  useEffect(() => {
    if (!isDragging) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (e: MouseEvent) => {
      if (dragStartRef.current == null) return;
      const next = dragStartRef.current.w + (e.clientX - dragStartRef.current.x);
      setTaskColWidth(Math.min(TASK_COL_MAX, Math.max(TASK_COL_MIN, next)));
    };
    const onUp = () => {
      dragStartRef.current = null;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleExportExcel = useCallback(() => {
    if (scheduledTasks.length === 0) {
      alert('暂无任务可导出');
      return;
    }
    import('xlsx').then((XLSX) => {
      const headers = [
        '序号',
        '任务名称',
        '优先级',
        '预计天数',
        '人天',
        '角色',
        '依赖',
        '备注',
        '计划开始日',
        '计划结束日',
      ];
      const rows = scheduledTasks.map((t) => [
        t.id,
        t.name,
        PRIORITY_LABEL[t.priority],
        t.durationDays ?? '',
        t.personDays ?? '',
        t.roles.join(', '),
        t.dependsOn.map((id) => `#${id}`).join(', '),
        t.notes,
        t.computedStart ? formatDate(t.computedStart) : '',
        t.computedEnd ? formatDate(t.computedEnd) : '',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '排期');
      const ts = new Date();
      const name = `schedule-${formatDate(ts)}-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, name);
    });
  }, [scheduledTasks]);

  const handleExportImage = useCallback(() => {
    const el = previewRef.current;
    if (!el) return;
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      }).then((canvas) => {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `schedule-${formatDate(new Date())}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png', 1);
      }).catch((err) => {
        console.error('导出图片失败', err);
        alert('导出图片失败，请重试');
      });
    });
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.ganttWrap}>
            <div className={styles.emptyState}>加载中…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.ganttWrap}>
            <div className={styles.emptyState}>
              {error || '未找到分享内容'}
              <br />
              <Link href="/tools/project-schedule" className={styles.btnLink}>
                返回排期工具
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const axisMinWidth = Math.max(560, weeks.length * 28);
  const summaryRowIndex = 3 + scheduledTasks.length;
  const gridRows = `auto auto ${scheduledTasks.map(() => 'minmax(40px, auto)').join(' ')} auto`;

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.header}>
          <label className={styles.headerLabel}>
            项目开始日期：
            <input
              type="date"
              className={styles.dateInput}
              value={projectStartStr}
              onChange={(e) => setProjectStartStr(e.target.value)}
            />
          </label>
          <label className={styles.headerCheckbox}>
            <input
              type="checkbox"
              checked={showNotesInline}
              onChange={(e) => setShowNotesInline(e.target.checked)}
            />
            显示备注
          </label>
          <div className={styles.actions} style={{ marginLeft: 'auto' }}>
            <button type="button" className={styles.btn} onClick={handleExportImage}>
              导出图片
            </button>
            <button type="button" className={styles.btn} onClick={handleExportExcel}>
              导出 Excel
            </button>
          </div>
        </div>
        <div ref={previewRef} className={styles.ganttWrap}>
          <div className={styles.ganttPreviewContent}>
            <div className={styles.ganttTitle}>甘特图</div>
            {scheduledTasks.length === 0 ? (
              <div className={styles.emptyState}>暂无任务</div>
            ) : (
              <>
                {uniqueRoles.length > 0 && (
                  <div className={styles.roleLegend}>
                    <span className={styles.roleLegendLabel}>涉及角色：</span>
                    {uniqueRoles.map((r) => (
                      <span
                        key={r}
                        className={styles.roleTag}
                        style={{ backgroundColor: roleToColor.get(r), color: '#fff' }}
                      >
                        @{r}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className={styles.ganttBody}
                  style={{
                    gridTemplateRows: gridRows,
                    gridTemplateColumns: `${taskColWidth}px 8px 1fr`,
                  }}
                >
                  <div
                    className={styles.ganttDivider}
                    style={{ gridRow: '1 / -1' }}
                    onMouseDown={onDividerMouseDown}
                    title="拖动调整任务列与时间轴宽度"
                  />
                  <div className={styles.ganttTaskCell} style={{ gridRow: 1, borderBottom: '1px solid #e2e8f0' }}>
                    <div className={styles.timelineLabels}>任务</div>
                  </div>
                  <div className={styles.ganttTimeCell} style={{ gridRow: 1, borderBottom: '1px solid #e2e8f0' }}>
                    <div className={styles.timelineAxis} style={{ display: 'flex', minWidth: axisMinWidth }}>
                      {monthSegments.map((seg) => (
                        <div
                          key={seg.label}
                          className={styles.timelineMonthCell}
                          style={{
                            flex: `${seg.endIndex - seg.startIndex + 1} 0 0`,
                            minWidth: 0,
                          }}
                        >
                          {seg.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.ganttTaskCell} style={{ gridRow: 2, borderBottom: '1px solid #e2e8f0' }}>
                    <div className={styles.timelineLabels}> </div>
                  </div>
                  <div className={styles.ganttTimeCell} style={{ gridRow: 2, borderBottom: '1px solid #e2e8f0' }}>
                    <div className={styles.timelineAxis} style={{ display: 'flex', minWidth: axisMinWidth }}>
                      {weeks.map((w, idx) => (
                        <div
                          key={idx}
                          className={styles.timelineWeekCell}
                          style={{ flex: '1 0 0', minWidth: 28 }}
                          title={`${formatDate(w)} 起`}
                        >
                          W{idx + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  {scheduledTasks.flatMap((task, i) => [
                    <div
                      key={`task-${task.id}`}
                      className={styles.ganttTaskCell}
                      style={{ gridRow: i + 3, borderBottom: '1px solid #f1f5f9' }}
                    >
                      <div className={styles.taskInfo}>
                        <div className={styles.taskInfoLine}>
                          <span className={styles.taskId}>#{task.id}</span>
                          <span className={styles.taskName}>{task.name}</span>
                          {task.priority !== 'normal' && (
                            <span className={`${styles.priorityTag} ${PRIORITY_CLASS[task.priority]}`}>
                              {PRIORITY_LABEL[task.priority]}
                            </span>
                          )}
                          {task.roles.length > 0 &&
                            task.roles.map((r) => (
                              <span
                                key={r}
                                className={styles.roleTag}
                                title={r}
                                style={{ backgroundColor: roleToColor.get(r), color: '#fff' }}
                              >
                                @{r}
                              </span>
                            ))}
                          {(task.durationDays != null || task.personDays != null) && (
                            <span className={styles.durationPills}>
                              {task.durationDays != null && (
                                <span className={styles.durationPill}>{task.durationDays}d</span>
                              )}
                              {task.personDays != null && (
                                <span className={styles.durationPill}>{task.personDays}md</span>
                              )}
                            </span>
                          )}
                          {task.dependsOn.length > 0 && (
                            <span
                              className={styles.depTag}
                              title={task.dependsOn.map((id) => `#${id} ${idToName.get(id) ?? ''}`).join('\n')}
                              onMouseEnter={(e) => {
                                const names = task.dependsOn
                                  .map((id) => `#${id} ${idToName.get(id) ?? ''}`)
                                  .join('；');
                                setTooltip({ text: `依赖: ${names}`, x: e.clientX, y: e.clientY });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              依赖 {task.dependsOn.map((id) => `#${id}`).join(', ')}
                            </span>
                          )}
                          {task.notes.trim() !== '' && !showNotesInline && (
                            <span
                              className={styles.notesTrigger}
                              onMouseEnter={(e) =>
                                setTooltip({
                                  text: task.notes.trim(),
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              onMouseLeave={() => setTooltip(null)}
                            >
                              ?
                            </span>
                          )}
                        </div>
                        {showNotesInline && task.notes.trim() !== '' && (
                          <div className={styles.taskNotesInline}>{task.notes.trim()}</div>
                        )}
                      </div>
                    </div>,
                    <div
                      key={`bar-${task.id}`}
                      className={styles.ganttTimeCell}
                      style={{ gridRow: i + 3, borderBottom: '1px solid #f1f5f9' }}
                    >
                      <div className={styles.taskBarArea} style={{ minWidth: axisMinWidth }}>
                        {task.computedStart && task.computedEnd && (
                          <div
                            className={styles.taskBar}
                            style={{
                              left: `${leftPercent(task.computedStart)}%`,
                              width: `${widthPercent(task.computedStart, task.computedEnd)}%`,
                              backgroundColor:
                                task.priority === 'urgent'
                                  ? '#fecaca'
                                  : task.priority === 'high'
                                    ? '#fed7aa'
                                    : task.priority === 'low'
                                      ? '#bfdbfe'
                                      : '#cbd5e1',
                            }}
                            title={`${formatDate(task.computedStart)} ~ ${formatDate(task.computedEnd)}`}
                          />
                        )}
                      </div>
                    </div>,
                  ])}
                  <div
                    className={styles.ganttTaskCell}
                    style={{
                      gridRow: summaryRowIndex,
                      borderBottom: 'none',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <div className={styles.summaryRow}>
                      <span>开始：{formatDate(rangeStart)}</span>
                      <span>结束：{formatDate(rangeEnd)}</span>
                      <span>工期：{totalWorkDays} 工作日</span>
                      <span>人天：{totalPersonDays}</span>
                    </div>
                  </div>
                  <div
                    className={styles.ganttTimeCell}
                    style={{
                      gridRow: summaryRowIndex,
                      borderBottom: 'none',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
