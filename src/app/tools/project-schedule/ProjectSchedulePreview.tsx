'use client';

import React, { useMemo } from 'react';
import styles from './page.module.css';
import type { Task, Priority } from '@/lib/schedule-parser';

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

export interface ProjectSchedulePreviewProps {
  title: string;
  tasks: Task[];
  weeks: Date[];
  monthSegments: { label: string; startIndex: number; endIndex: number }[];
  rangeStart: Date;
  rangeEnd: Date;
  totalWorkDays: number;
  totalPersonDays: number;
  taskColWidth: number;
  onDividerMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  showNotesInline: boolean;
  uniqueRoles: string[];
  roleToColor: Map<string, string>;
  idToName: Map<number, string>;
  leftPercent: (d: Date) => number;
  widthPercent: (start: Date, end: Date) => number;
  tooltip: { text: string; x: number; y: number } | null;
  setTooltip: (value: { text: string; x: number; y: number } | null) => void;
  previewRef?: React.Ref<HTMLDivElement>;
  emptyMessage: string;
}

export function ProjectSchedulePreview(props: ProjectSchedulePreviewProps) {
  const {
    title,
    tasks,
    weeks,
    monthSegments,
    rangeStart,
    rangeEnd,
    totalWorkDays,
    totalPersonDays,
    taskColWidth,
    onDividerMouseDown,
    showNotesInline,
    uniqueRoles,
    roleToColor,
    idToName,
    leftPercent,
    widthPercent,
    previewRef,
    emptyMessage,
  } = props;

  const axisMinWidth = useMemo(
    () => Math.max(560, weeks.length * 28),
    [weeks.length]
  );
  const summaryRowIndex = 3 + tasks.length;
  const gridRows = useMemo(
    () => `auto auto ${tasks.map(() => 'minmax(40px, auto)').join(' ')} auto`,
    [tasks]
  );

  return (
    <div ref={previewRef} className={styles.ganttWrap}>
      <div className={styles.ganttPreviewContent}>
        <div className={styles.ganttTitle}>{title}</div>
        {tasks.length === 0 ? (
          <div className={styles.emptyState}>{emptyMessage}</div>
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
              {tasks.flatMap((task, i) => [
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
                        <span
                          className={styles.durationPills}
                          title={[
                            task.durationDays != null && `预计 ${task.durationDays} 天`,
                            task.personDays != null && `预计 ${task.personDays} 人天`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        >
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
                          title={task.dependsOn
                            .map((id) => `#${id} ${idToName.get(id) ?? ''}`)
                            .join('\n')}
                          onMouseEnter={(e) => {
                            const names = task.dependsOn
                              .map((id) => `#${id} ${idToName.get(id) ?? ''}`)
                              .join('；');
                            props.setTooltip({ text: `依赖: ${names}`, x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => props.setTooltip(null)}
                        >
                          依赖 {task.dependsOn.map((id) => `#${id}`).join(', ')}
                        </span>
                      )}
                      {task.notes.trim() !== '' && !showNotesInline && (
                        <span
                          className={styles.notesTrigger}
                          onMouseEnter={(e) =>
                            props.setTooltip({
                              text: task.notes.trim(),
                              x: e.clientX,
                              y: e.clientY,
                            })
                          }
                          onMouseLeave={() => props.setTooltip(null)}
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
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

