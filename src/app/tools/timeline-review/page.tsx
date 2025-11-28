'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import aiService from '@/lib/services/ai_service';

interface Point {
  x: number;
  y: number;
}

interface DialogConfig {
  type: 'alert' | 'confirm' | 'prompt' | 'form';
  title: string;
  message?: string;
  defaultValue?: string;
  fields?: FormField[];
  onConfirm?: (value?: any) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[]; // 用于 select 类型
}

interface FormData {
  [key: string]: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  startYear: number;
  startQuarter: number; // 1-4 (保留用于兼容)
  startMonth?: number; // 1-12 (新增，更细粒度)
  endYear?: number;
  endQuarter?: number;
  endMonth?: number; // 1-12 (新增)
  type: 'milestone' | 'duration' | 'annotation';
  category: string; // 用于颜色区分
  result?: 'good' | 'bad' | 'neutral';
  notes?: string;
  position: Point;
  color: string;
  yOffset?: number; // 垂直偏移量，用于手动调整位置
}

interface YearSummary {
  year: number;
  text: string;
}

interface VerticalAnnotation {
  id: string;
  startYear: number;
  endYear: number;
  text: string;
  color: string;
}

interface HistoryState {
  events: TimelineEvent[];
  yearSummaries: YearSummary[];
  verticalAnnotations: VerticalAnnotation[];
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#52B788'
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// Category 到图标的映射
const getCategoryIcon = (category: string): string => {
  const iconMap: { [key: string]: string } = {
    '产品开发': '🔧',
    '产品发布': '🚀',
    '产品迭代': '🔄',
    '人事变动': '👥',
    '组织架构': '🏢',
    '业务拓展': '📈',
    '合作项目': '🤝',
    '技术探索': '🔬',
    '技术突破': '💥',
    '内部项目': '🏠',
    '其他': '⚪',
    'default': '📍'
  };
  
  return iconMap[category] || iconMap['default'];
};

export default function TimelineReview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 使用懒初始化从 localStorage 加载数据
  const [startYear, setStartYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-review-data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.startYear || 2018;
        } catch (e) {
          console.error('Failed to load startYear', e);
        }
      }
    }
    return 2018;
  });
  
  const [endYear, setEndYear] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-review-data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.endYear || 2025;
        } catch (e) {
          console.error('Failed to load endYear', e);
        }
      }
    }
    return 2025;
  });
  
  const [events, setEvents] = useState<TimelineEvent[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-review-data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.events || [];
        } catch (e) {
          console.error('Failed to load events', e);
        }
      }
    }
    return [];
  });
  
  const [yearSummaries, setYearSummaries] = useState<YearSummary[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-review-data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.yearSummaries || [];
        } catch (e) {
          console.error('Failed to load yearSummaries', e);
        }
      }
    }
    return [];
  });
  
  const [verticalAnnotations, setVerticalAnnotations] = useState<VerticalAnnotation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-review-data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.verticalAnnotations || [];
        } catch (e) {
          console.error('Failed to load verticalAnnotations', e);
        }
      }
    }
    return [];
  });
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [copiedEvent, setCopiedEvent] = useState<TimelineEvent | null>(null); // 剪贴板中的事件
  const [isDragging, setIsDragging] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isDraggingEvent, setIsDraggingEvent] = useState(false); // 是否正在拖拽事件
  const [draggedEvent, setDraggedEvent] = useState<TimelineEvent | null>(null); // 被拖拽的事件
  const [dragStartY, setDragStartY] = useState<number>(0); // 拖拽开始时的Y坐标
  const [dragStartYOffset, setDragStartYOffset] = useState<number>(0); // 拖拽开始时的yOffset
  const [dragStartX, setDragStartX] = useState<number>(0); // 拖拽开始时的X坐标
  const [dragStartTime, setDragStartTime] = useState<{ year: number; quarter: number; month?: number } | null>(null); // 拖拽开始时的时间位置（事件的原始时间）
  const [dragStartMouseTime, setDragStartMouseTime] = useState<{ year: number; quarter: number; month?: number } | null>(null); // 拖拽开始时鼠标点击位置的时间
  const [dragEndTime, setDragEndTime] = useState<{ year: number; quarter: number; month?: number } | null>(null); // 拖拽开始时的时间位置（持续事件的结束时间）
  const [dragMode, setDragMode] = useState<'move' | 'resize-start' | 'resize-end' | 'vertical' | null>(null); // 拖动模式
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [currentDrag, setCurrentDrag] = useState<Point | null>(null);
  const [newEventType, setNewEventType] = useState<'milestone' | 'duration'>('duration');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // 自定义弹框状态
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [dialogInputValue, setDialogInputValue] = useState('');
  const [formData, setFormData] = useState<FormData>({});
  
  // Undo/Redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 年份高度管理（支持每个年份自定义高度）
  const [yearHeights, setYearHeights] = useState<{ [year: number]: number }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-review-data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.yearHeights || {};
        } catch (e) {
          console.error('Failed to load yearHeights', e);
        }
      }
    }
    return {};
  });

  const yearCount = endYear - startYear + 1;
  const canvasWidth = 1400;
  const leftMargin = 180; // 增加左边距以容纳更宽的垂直标注区域
  const topMargin = 80;
  const baseYearHeight = 180; // 基础年份高度（增加以容纳多个事件）
  const quarterWidth = 220; // 略微减少以保持总体宽度
  const verticalAnnotationWidth = 150; // 垂直标注区域宽度
  const yearSummaryWidth = 180; // 年度摘要区域宽度（较窄）

  // 获取年份高度（如果自定义则使用自定义值，否则使用基础高度）
  const getYearHeight = useCallback((year: number) => {
    return yearHeights[year] || baseYearHeight;
  }, [yearHeights]);

  // 画布高度状态（支持持久化）
  const [savedCanvasHeight, setSavedCanvasHeight] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeline-review-data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.canvasHeight || null;
        } catch (e) {
          console.error('Failed to load canvasHeight', e);
        }
      }
    }
    return null;
  });

  // 计算画布总高度（支持动态年份高度）
  const canvasHeight = useMemo(() => {
    // 如果有保存的高度，且年份范围没有变化，使用保存的高度
    if (savedCanvasHeight !== null) {
      // 验证保存的高度是否仍然合理（基于当前的年份高度）
      let calculatedHeight = topMargin;
      for (let year = startYear; year <= endYear; year++) {
        calculatedHeight += getYearHeight(year);
      }
      calculatedHeight += 200;
      const minHeight = Math.max(800, calculatedHeight);
      
      // 如果保存的高度仍然合理（不小于计算的最小高度），使用保存的高度
      if (savedCanvasHeight >= minHeight) {
        return savedCanvasHeight;
      }
    }
    
    // 否则重新计算
    let totalHeight = topMargin;
    for (let year = startYear; year <= endYear; year++) {
      totalHeight += getYearHeight(year);
    }
    totalHeight += 200;
    return Math.max(800, totalHeight);
  }, [startYear, endYear, getYearHeight, savedCanvasHeight, topMargin]);

  // 年份分割线拖动状态
  const [isDraggingYearLine, setIsDraggingYearLine] = useState(false);
  const [draggedYearLine, setDraggedYearLine] = useState<number | null>(null); // 被拖动的年份（调整该年份下方的高度）
  const [yearLineDragStartY, setYearLineDragStartY] = useState<number>(0); // 拖动开始时的Y坐标
  const [yearLineDragStartHeight, setYearLineDragStartHeight] = useState<number>(0); // 拖动开始时的年份高度
  const [hoveredYearLine, setHoveredYearLine] = useState<number | null>(null); // 鼠标悬停的年份分割线
  const [hoveredEventHandle, setHoveredEventHandle] = useState<{ event: TimelineEvent; handle: 'start' | 'end' } | null>(null); // 鼠标悬停的事件端点

  // 自定义弹框辅助函数
  const showAlert = (title: string, message?: string) => {
    return new Promise<void>((resolve) => {
      setDialog({
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setDialog(null);
          resolve();
        }
      });
    });
  };

  const showConfirm = (title: string, message?: string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        }
      });
    });
  };

  const showPrompt = (title: string, defaultValue: string = '') => {
    return new Promise<string | null>((resolve) => {
      setDialogInputValue(defaultValue);
      setDialog({
        type: 'prompt',
        title,
        defaultValue,
        onConfirm: (value) => {
          setDialog(null);
          resolve(value || null);
        },
        onCancel: () => {
          setDialog(null);
          resolve(null);
        }
      });
    });
  };

  const showForm = (title: string, fields: FormField[], options?: { onDelete?: () => void }) => {
    return new Promise<FormData | null>((resolve) => {
      const initialData: FormData = {};
      fields.forEach(field => {
        initialData[field.name] = field.defaultValue || '';
      });
      setFormData(initialData);
      setDialog({
        type: 'form',
        title,
        fields,
        onConfirm: (value) => {
          setDialog(null);
          resolve(value as FormData || null);
        },
        onCancel: () => {
          setDialog(null);
          resolve(null);
        },
        onDelete: options?.onDelete
      });
    });
  };

  // 保存历史状态
  const saveHistory = useCallback(() => {
    const newState: HistoryState = {
      events: [...events],
      yearSummaries: [...yearSummaries],
      verticalAnnotations: [...verticalAnnotations]
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) newHistory.shift(); // 限制历史记录数量
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [events, yearSummaries, verticalAnnotations, history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setEvents(prevState.events);
      setYearSummaries(prevState.yearSummaries);
      setVerticalAnnotations(prevState.verticalAnnotations);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setEvents(nextState.events);
      setYearSummaries(nextState.yearSummaries);
      setVerticalAnnotations(nextState.verticalAnnotations);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // 当画布高度变化时，更新保存的高度
  useEffect(() => {
    setSavedCanvasHeight(canvasHeight);
  }, [canvasHeight]);

  // 自动保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = {
        events,
        yearSummaries,
        verticalAnnotations,
        startYear,
        endYear,
        yearHeights,
        canvasHeight: savedCanvasHeight || canvasHeight
      };
      localStorage.setItem('timeline-review-data', JSON.stringify(data));
    }
  }, [events, yearSummaries, verticalAnnotations, startYear, endYear, yearHeights, canvasHeight, savedCanvasHeight]);

  // 复制选中的事件
  const copySelectedEvent = useCallback(() => {
    if (selectedEvent) {
      setCopiedEvent(selectedEvent);
    }
  }, [selectedEvent]);

  // 粘贴事件
  const pasteEvent = useCallback(() => {
    if (!copiedEvent) return;
    
    // 创建新事件，使用新的 ID，保持相同时间但通过垂直偏移区分
    const newEvent: TimelineEvent = {
      ...copiedEvent,
      id: Date.now().toString(),
      // 保持相同的时间
      startYear: copiedEvent.startYear,
      startQuarter: copiedEvent.startQuarter,
      startMonth: copiedEvent.startMonth,
      // 垂直偏移30像素，避免完全重叠
      yOffset: (copiedEvent.yOffset || 0) + 30,
    };
    
    // 如果是持续事件，保持相同的结束时间
    if (newEvent.type === 'duration' && copiedEvent.endYear && copiedEvent.endQuarter) {
      newEvent.endYear = copiedEvent.endYear;
      newEvent.endQuarter = copiedEvent.endQuarter;
      newEvent.endMonth = copiedEvent.endMonth;
    }
    
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    setSelectedEvent(newEvent);
    saveHistory();
  }, [copiedEvent, events, saveHistory]);

  // 键盘快捷键和全局事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC键取消拖动
      if (e.key === 'Escape') {
        if (isDragging || isDraggingEvent || isDraggingYearLine) {
          e.preventDefault();
          // 取消拖动，恢复到拖动前的状态
          setIsDragging(false);
          setIsDraggingEvent(false);
          setIsDraggingYearLine(false);
          setDragStart(null);
          setCurrentDrag(null);
          setDraggedEvent(null);
          setDraggedYearLine(null);
          setDragMode(null);
          // 如果是添加事件模式，也退出
          if (isAddingEvent) {
            setIsAddingEvent(false);
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !dialog) {
        // 撤销：仅在画布界面有效，对话框打开时无效
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !dialog) {
        // 重做：仅在画布界面有效，对话框打开时无效
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedEvent && !dialog) {
        // 复制：仅在画布界面有效，对话框打开时无效
        e.preventDefault();
        copySelectedEvent();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedEvent && !dialog) {
        // 粘贴：仅在画布界面有效，对话框打开时无效
        e.preventDefault();
        pasteEvent();
      }
    };
    
    // 全局mouseup监听，确保即使鼠标移出画布也能正确结束拖动
    const handleGlobalMouseUp = () => {
      if (isDraggingYearLine && draggedYearLine !== null) {
        setIsDraggingYearLine(false);
        setDraggedYearLine(null);
        setYearLineDragStartY(0);
        setYearLineDragStartHeight(0);
        saveHistory();
      } else if (isDraggingEvent) {
        setIsDraggingEvent(false);
        setDraggedEvent(null);
        setDragMode(null);
        setDragStartX(0);
        setDragStartY(0);
        setDragStartYOffset(0);
        setDragStartTime(null);
        setDragStartMouseTime(null);
        setDragEndTime(null);
        saveHistory();
      } else if (isDragging && dragStart) {
        // 创建新事件的拖动完成（只在画布内部处理）
        setIsDragging(false);
        setDragStart(null);
        setCurrentDrag(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [undo, redo, selectedEvent, copiedEvent, copySelectedEvent, pasteEvent, 
      isDragging, isDraggingEvent, isDraggingYearLine, dragStart, draggedYearLine,
      isAddingEvent, saveHistory, dialog]);

  // 转换坐标到年份和月份（支持动态年份高度）
  const coordsToTime = useCallback((x: number, y: number) => {
    let currentY = topMargin;
    let yearIndex = 0;
    
    for (let year = startYear; year <= endYear; year++) {
      const yearHeight = getYearHeight(year);
      if (y >= currentY && y < currentY + yearHeight) {
        yearIndex = year - startYear;
        break;
      }
      currentY += yearHeight;
      yearIndex++;
    }
    
    const year = Math.max(startYear, Math.min(endYear, startYear + yearIndex));
    
    // 计算月份（每个季度宽度对应3个月）
    const relativeX = x - leftMargin;
    const totalWidth = quarterWidth * 4; // 一年的总宽度
    const monthWidth = totalWidth / 12; // 每个月的宽度
    const monthIndex = Math.floor(relativeX / monthWidth);
    const month = Math.max(1, Math.min(12, monthIndex + 1));
    
    // 同时计算季度（用于向后兼容）
    const quarter = Math.ceil(month / 3);
    
    return { year, quarter, month };
  }, [startYear, endYear, getYearHeight]);

  // 转换年份和月份到坐标（基础位置，支持动态年份高度）
  // 返回年份顶部位置（而不是中心），以便yOffset相对于顶部保持不变
  const timeToBaseCoords = useCallback((year: number, quarter: number, month?: number) => {
    const yearIndex = year - startYear;
    
    // 如果提供了月份，使用月份计算更精确的位置
    let x: number;
    if (month !== undefined && month >= 1 && month <= 12) {
      const totalWidth = quarterWidth * 4; // 一年的总宽度
      const monthWidth = totalWidth / 12; // 每个月的宽度
      x = leftMargin + (month - 1) * monthWidth + monthWidth / 2;
    } else {
      // 否则使用季度计算（向后兼容）
      x = leftMargin + (quarter - 1) * quarterWidth + quarterWidth / 2;
    }
    
    // 计算该年份之前的累计高度（年份顶部位置）
    let y = topMargin;
    for (let yIdx = 0; yIdx < yearIndex; yIdx++) {
      y += getYearHeight(startYear + yIdx);
    }
    // 不再加上年份的一半高度，直接返回顶部位置
    // yOffset 将相对于这个顶部位置计算
    
    return { x, y };
  }, [startYear, getYearHeight]);

  // 转换年份和季度/月份到坐标（考虑yOffset）
  // yOffset 现在相对于年份顶部（起始线）计算，而不是中心
  const timeToCoords = useCallback((year: number, quarter: number, yOffset: number = 0, month?: number) => {
    const base = timeToBaseCoords(year, quarter, month);
    // yOffset 直接加到年份顶部位置
    return { x: base.x, y: base.y + yOffset };
  }, [timeToBaseCoords]);

  // 绘制时间线
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取设备像素比，提高清晰度
    const dpr = window.devicePixelRatio || 1;
    
    // 设置画布的实际尺寸为显示尺寸的 dpr 倍
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    
    // 缩放绘图上下文以匹配
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.fillStyle = '#FEFEF5';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制年份标签和横线（支持动态年份高度）
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.font = 'bold 18px "ChillLongCangKaiShu", sans-serif';
    ctx.fillStyle = '#333';

    let currentY = topMargin;
    for (let year = startYear; year <= endYear; year++) {
      const yearHeight = getYearHeight(year);
      
      // 年份标签
      ctx.textAlign = 'right';
      ctx.fillText(year.toString(), leftMargin - 20, currentY + 5);
      
      // 横线（年份顶部分割线）
      // 如果上一年正在被拖动/悬停，高亮这条线（因为这条线是上一年的底部线）
      const prevYear = year - 1;
      const isTopLineHighlighted = prevYear >= startYear && 
        ((isDraggingYearLine && draggedYearLine === prevYear) || hoveredYearLine === prevYear);
      ctx.strokeStyle = isTopLineHighlighted ? '#4A90E2' : '#DDD';
      ctx.lineWidth = isTopLineHighlighted ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(leftMargin, currentY);
      ctx.lineTo(leftMargin + quarterWidth * 4, currentY);
      ctx.stroke();
      
      // 重置样式
      ctx.strokeStyle = '#DDD';
      ctx.lineWidth = 1;
      
      currentY += yearHeight;
    }
    
    // 绘制最后一条横线（最后一年的底部线）
    const isLastLineHighlighted = (isDraggingYearLine && draggedYearLine === endYear) || hoveredYearLine === endYear;
    ctx.strokeStyle = isLastLineHighlighted ? '#4A90E2' : '#DDD';
    ctx.lineWidth = isLastLineHighlighted ? 3 : 1;
    ctx.beginPath();
    ctx.moveTo(leftMargin, currentY);
    ctx.lineTo(leftMargin + quarterWidth * 4, currentY);
    ctx.stroke();
    
    // 重置样式
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;

    // 绘制季度标签
    ctx.font = '16px "ChillLongCangKaiShu", sans-serif';
    QUARTERS.forEach((q, i) => {
      const x = leftMargin + i * quarterWidth + quarterWidth / 2;
      ctx.textAlign = 'center';
      ctx.fillText(q, x, topMargin - 30);
    });

    // 绘制竖线（季度分隔，需要计算总高度）
    ctx.strokeStyle = '#EEE';
    let totalHeight = topMargin;
    for (let year = startYear; year <= endYear; year++) {
      totalHeight += getYearHeight(year);
    }
    for (let i = 0; i <= 4; i++) {
      const x = leftMargin + i * quarterWidth;
      ctx.beginPath();
      ctx.moveTo(x, topMargin);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }

    // 绘制垂直标注区域（支持动态年份高度）
    verticalAnnotations.forEach(annotation => {
      let startY = topMargin;
      for (let year = startYear; year < annotation.startYear; year++) {
        startY += getYearHeight(year);
      }
      
      let endY = topMargin;
      for (let year = startYear; year <= annotation.endYear; year++) {
        endY += getYearHeight(year);
      }
      
      ctx.fillStyle = annotation.color + '20';
      ctx.fillRect(leftMargin - verticalAnnotationWidth - 10, startY, verticalAnnotationWidth, endY - startY);
      
      ctx.fillStyle = annotation.color;
      ctx.font = 'bold 16px "ChillLongCangKaiShu", sans-serif';
      ctx.save();
      ctx.translate(leftMargin - verticalAnnotationWidth / 2 - 10, (startY + endY) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(annotation.text, 0, 0);
      ctx.restore();
    });

    // 绘制事件
    events.forEach(event => {
      const isSelected = selectedEvent?.id === event.id;
      const yOffset = event.yOffset || 0;
      
      if (event.type === 'duration' && event.endYear && event.endQuarter) {
        // 绘制持续性事件（带箭头的线）- 支持跨年份
        const start = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        const end = timeToCoords(event.endYear, event.endQuarter, yOffset, event.endMonth);
        const categoryIcon = getCategoryIcon(event.category);
        
        // 检查是否跨年份
        const isCrossYear = event.startYear !== event.endYear;
        
        // 计算箭头方向（从起点指向终点）
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const arrowSize = isSelected ? 14 : 12;
        
        // 计算主线的结束点（缩短以便箭头覆盖）
        const lineEndX = end.x - arrowSize * 0.7 * Math.cos(angle);
        const lineEndY = end.y - arrowSize * 0.7 * Math.sin(angle);
        
        // 如果选中，先绘制高亮背景
        if (isSelected) {
          ctx.strokeStyle = event.color + '40';
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(lineEndX, lineEndY);
          ctx.stroke();
        }
        
        // 绘制线条（支持跨年份的斜线）
        ctx.strokeStyle = event.color;
        ctx.lineWidth = isSelected ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();
        
        // 绘制Category图标（在起点上方）
        ctx.font = `${isSelected ? '20px' : '18px'} sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(categoryIcon, start.x, start.y - (isSelected ? 30 : 28));
        
        // 如果选中，绘制可拖动的端点（起点和终点）
        if (isSelected) {
          // 绘制起点控制点
          ctx.fillStyle = '#FFF';
          ctx.strokeStyle = event.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // 绘制终点控制点（箭头位置）
          ctx.beginPath();
          ctx.arc(end.x, end.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        
        // 如果选中，先绘制高亮背景箭头
        if (isSelected) {
          ctx.fillStyle = event.color + '40';
          const bgArrowSize = arrowSize + 4;
          ctx.save();
          ctx.translate(end.x, end.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-bgArrowSize, -bgArrowSize * Math.sin(Math.PI / 6));
          ctx.lineTo(-bgArrowSize, bgArrowSize * Math.sin(Math.PI / 6));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        
        // 绘制主箭头（指向终点方向）
        ctx.fillStyle = event.color;
        ctx.save();
        ctx.translate(end.x, end.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize * Math.sin(Math.PI / 6));
        ctx.lineTo(-arrowSize, arrowSize * Math.sin(Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // 绘制文本
        ctx.font = `${isSelected ? 'bold 16px' : 'bold 14px'} "ChillLongCangKaiShu", sans-serif`;
        ctx.fillStyle = event.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2 - 10;
        
        // 如果选中，添加背景
        if (isSelected) {
          ctx.save();
          const textMetrics = ctx.measureText(event.title);
          ctx.fillStyle = '#FFF';
          ctx.fillRect(midX - textMetrics.width / 2 - 5, midY - 18, textMetrics.width + 10, 24);
          ctx.fillStyle = event.color;
          ctx.restore();
        }
        
        ctx.fillText(event.title, midX, midY);
        
        // 结果标记（在终点附近）
        if (event.result === 'good') {
          ctx.fillStyle = '#52B788';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✓', end.x + 20 * Math.cos(angle), end.y + 20 * Math.sin(angle));
        } else if (event.result === 'bad') {
          ctx.fillStyle = '#FF6B6B';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✗', end.x + 20 * Math.cos(angle), end.y + 20 * Math.sin(angle));
        }
      } else if (event.type === 'milestone') {
        // 绘制里程碑事件（圆点 + 图标）
        const pos = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        const categoryIcon = getCategoryIcon(event.category);
        
        // 如果选中，先绘制高亮外圈
        if (isSelected) {
          ctx.fillStyle = event.color + '40';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.fillStyle = event.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSelected ? 10 : 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
        
        // 绘制Category图标（在圆点上方）
        ctx.font = `${isSelected ? '20px' : '18px'} sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(categoryIcon, pos.x, pos.y - (isSelected ? 35 : 32));
        
        // 文本
        ctx.font = `${isSelected ? 'bold 16px' : 'bold 14px'} "ChillLongCangKaiShu", sans-serif`;
        ctx.fillStyle = event.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        
        // 如果选中，添加背景
        if (isSelected) {
          ctx.save();
          const textMetrics = ctx.measureText(event.title);
          ctx.fillStyle = '#FFF';
          ctx.fillRect(pos.x - textMetrics.width / 2 - 5, pos.y - 15, textMetrics.width + 10, 24);
          ctx.fillStyle = event.color;
          ctx.restore();
        }
        
        ctx.fillText(event.title, pos.x, pos.y - 15);
        
        // 结果标记
        if (event.result === 'good') {
          ctx.fillStyle = '#52B788';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✓', pos.x + 15, pos.y - 15);
        } else if (event.result === 'bad') {
          ctx.fillStyle = '#FF6B6B';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✗', pos.x + 15, pos.y - 15);
        }
      }
    });

    // 绘制年度摘要（支持动态年份高度）
    yearSummaries.forEach(summary => {
      let y = topMargin;
      for (let year = startYear; year < summary.year; year++) {
        y += getYearHeight(year);
      }
      y += getYearHeight(summary.year) / 2;
      const x = leftMargin + quarterWidth * 4 + 20;
      
      ctx.font = '12px "ChillLongCangKaiShu", sans-serif';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      const lines = summary.text.split('\n');
      lines.forEach((line, i) => {
        // 截断过长的文本以适应窄区域
        const maxWidth = yearSummaryWidth - 20;
        let displayLine = line;
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) {
          // 简单截断
          let truncated = line;
          while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
          }
          displayLine = truncated + '...';
        }
        ctx.fillText(displayLine, x, y + i * 16 - (lines.length * 8));
      });
    });

    // 绘制当前拖拽的临时线（支持月份精确定位预览）
    if (isDragging && dragStart && currentDrag) {
      if (newEventType === 'duration') {
        // 持续事件：绘制虚线，但起点和终点都对齐到月份位置
        const startTime = coordsToTime(dragStart.x, dragStart.y);
        const endTime = coordsToTime(currentDrag.x, currentDrag.y);
        const startPos = timeToCoords(startTime.year, startTime.quarter, 0, startTime.month);
        const endPos = timeToCoords(endTime.year, endTime.quarter, 0, endTime.month);
        
        ctx.strokeStyle = selectedColor + '80';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (newEventType === 'milestone') {
        // 里程碑事件：在月份对齐位置显示预览点
        const previewTime = coordsToTime(currentDrag.x, currentDrag.y);
        const previewPos = timeToCoords(previewTime.year, previewTime.quarter, 0, previewTime.month);
        
        ctx.fillStyle = selectedColor + '80';
        ctx.beginPath();
        ctx.arc(previewPos.x, previewPos.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 绘制resize模式的预览反馈
    if (isDraggingEvent && draggedEvent && (dragMode === 'resize-start' || dragMode === 'resize-end')) {
      const currentEvent = events.find(ev => ev.id === draggedEvent.id);
      if (currentEvent && currentEvent.type === 'duration' && currentEvent.endYear && currentEvent.endQuarter) {
        const yOffset = currentEvent.yOffset || 0;
        const start = timeToCoords(currentEvent.startYear, currentEvent.startQuarter, yOffset, currentEvent.startMonth);
        const end = timeToCoords(currentEvent.endYear, currentEvent.endQuarter, yOffset, currentEvent.endMonth);
        
        // 绘制虚线预览，显示调整后的位置（支持跨年份）
        ctx.strokeStyle = currentEvent.color + '60';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 在正在调整的端点上绘制脉动效果
        const pulsePoint = dragMode === 'resize-start' ? start : end;
        ctx.fillStyle = currentEvent.color + '40';
        ctx.beginPath();
        ctx.arc(pulsePoint.x, pulsePoint.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [events, yearSummaries, verticalAnnotations, startYear, endYear, yearCount, 
      isDragging, dragStart, currentDrag, newEventType, selectedColor, selectedEvent,
      getYearHeight, timeToCoords, coordsToTime, isDraggingYearLine, draggedYearLine, hoveredYearLine, 
      isDraggingEvent, draggedEvent, dragMode, canvasHeight, canvasWidth, savedCanvasHeight]);

  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  // 检查点击是否在事件的端点上（用于调整长度）
  const getEventHandleAtPoint = useCallback((x: number, y: number, event: TimelineEvent): 'start' | 'end' | null => {
    const yOffset = event.yOffset || 0;
    const handleRadius = 10; // 端点检测半径
    
    if (event.type === 'duration' && event.endYear && event.endQuarter) {
      const start = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
      const end = timeToCoords(event.endYear, event.endQuarter, yOffset, event.endMonth);
      
      // 检查是否点击在起点（使用实际坐标，支持跨年份）
      const startDistance = Math.sqrt(Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2));
      if (startDistance < handleRadius) {
        return 'start';
      }
      
      // 检查是否点击在终点（箭头位置，使用实际坐标，支持跨年份）
      const endDistance = Math.sqrt(Math.pow(x - end.x, 2) + Math.pow(y - end.y, 2));
      if (endDistance < handleRadius) {
        return 'end';
      }
    }
    
    return null;
  }, [timeToCoords]);

  // 检查点击是否在事件上
  const getEventAtPoint = useCallback((x: number, y: number): TimelineEvent | null => {
    for (const event of events) {
      const yOffset = event.yOffset || 0;
      
      if (event.type === 'milestone') {
        const pos = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < 15) return event;
      } else if (event.type === 'duration' && event.endYear && event.endQuarter) {
        const start = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        const end = timeToCoords(event.endYear, event.endQuarter, yOffset, event.endMonth);
        
        // 计算点到线段的距离（支持跨年份的斜线）
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) {
          // 起点和终点重合，按点处理
          const distance = Math.sqrt(Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2));
          if (distance < 15) return event;
        } else {
          // 计算点到线段的距离
          const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / (length * length)));
          const projX = start.x + t * dx;
          const projY = start.y + t * dy;
          const distance = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
          
          // 检查是否在线段范围内且距离足够近
          if (distance < 15 && t >= 0 && t <= 1) {
            return event;
          }
        }
      }
    }
    return null;
  }, [events, timeToCoords]);

  // 检查点击是否在年份分割线上
  const getYearLineAtPoint = useCallback((x: number, y: number): number | null => {
    // 只检查年份分割线区域（横线）
    if (x < leftMargin || x > leftMargin + quarterWidth * 4) return null;
    
    const lineThreshold = 5; // 分割线检测阈值（像素）
    let currentY = topMargin;
    
    for (let year = startYear; year <= endYear; year++) {
      const yearHeight = getYearHeight(year);
      // 检查是否在分割线附近（年份底部）
      if (Math.abs(y - (currentY + yearHeight)) < lineThreshold) {
        return year; // 返回该年份，表示调整该年份下方的高度
      }
      currentY += yearHeight;
    }
    
    // 检查第一条线（第一个年份的顶部）
    if (Math.abs(y - topMargin) < lineThreshold) {
      return startYear;
    }
    
    return null;
  }, [startYear, endYear, getYearHeight]);

  // 检查点击是否在垂直标注上
  const getVerticalAnnotationAtPoint = useCallback((x: number, y: number): VerticalAnnotation | null => {
    const annotationLeft = leftMargin - verticalAnnotationWidth - 10;
    const annotationRight = leftMargin - 10;
    
    if (x < annotationLeft || x > annotationRight) return null;
    
    for (const annotation of verticalAnnotations) {
      let startY = topMargin;
      for (let year = startYear; year < annotation.startYear; year++) {
        startY += getYearHeight(year);
      }
      
      let endY = topMargin;
      for (let year = startYear; year <= annotation.endYear; year++) {
        endY += getYearHeight(year);
      }
      
      if (y >= startY && y <= endY) {
        return annotation;
      }
    }
    return null;
  }, [verticalAnnotations, startYear, getYearHeight]);

  // 检查点击是否在年度摘要上
  const getYearSummaryAtPoint = useCallback((x: number, y: number): YearSummary | null => {
    const summaryLeft = leftMargin + quarterWidth * 4 + 20;
    const summaryRight = summaryLeft + yearSummaryWidth;
    
    if (x < summaryLeft || x > summaryRight) return null;
    
    for (const summary of yearSummaries) {
      let summaryY = topMargin;
      for (let year = startYear; year < summary.year; year++) {
        summaryY += getYearHeight(year);
      }
      summaryY += getYearHeight(summary.year) / 2;
      
      const lines = summary.text.split('\n');
      const textHeight = lines.length * 16;
      const textTop = summaryY - textHeight / 2 - 8;
      const textBottom = summaryY + textHeight / 2 + 8;
      
      if (y >= textTop && y <= textBottom) {
        return summary;
      }
    }
    return null;
  }, [yearSummaries, startYear, getYearHeight]);

  // 鼠标事件处理
  const handleMouseDown = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // 检查是否点击了年份分割线
    const yearLine = getYearLineAtPoint(x, y);
    if (yearLine !== null && !isAddingEvent) {
      setIsDraggingYearLine(true);
      setDraggedYearLine(yearLine);
      setYearLineDragStartY(y);
      setYearLineDragStartHeight(getYearHeight(yearLine));
      return;
    }
    
    if (!isAddingEvent) {
      // 检查是否点击了垂直标注
      const clickedAnnotation = getVerticalAnnotationAtPoint(x, y);
      if (clickedAnnotation) {
        const result = await showForm('编辑垂直标注', [
          {
            name: 'startYear',
            label: '起始年份',
            type: 'number',
            defaultValue: clickedAnnotation.startYear.toString(),
            required: true
          },
          {
            name: 'endYear',
            label: '结束年份',
            type: 'number',
            defaultValue: clickedAnnotation.endYear.toString(),
            required: true
          },
          {
            name: 'text',
            label: '标注文字',
            type: 'text',
            defaultValue: clickedAnnotation.text,
            required: true
          }
        ], {
          onDelete: async () => {
            const shouldDelete = await showConfirm('确定删除此垂直标注？');
            if (shouldDelete) {
              setVerticalAnnotations(verticalAnnotations.filter(a => a.id !== clickedAnnotation.id));
              saveHistory();
            }
          }
        });
        
        if (result) {
          const startYearNum = parseInt(result.startYear);
          const endYearNum = parseInt(result.endYear);
          
          if (startYearNum > endYearNum) {
            await showAlert('错误', '起始年份不能大于结束年份');
            return;
          }
          
          setVerticalAnnotations(verticalAnnotations.map(a =>
            a.id === clickedAnnotation.id ? { 
              ...a, 
              startYear: startYearNum, 
              endYear: endYearNum, 
              text: result.text.trim() 
            } : a
          ));
          saveHistory();
        }
        return;
      }
      
      // 检查是否点击了年度摘要
      const clickedSummary = getYearSummaryAtPoint(x, y);
      if (clickedSummary) {
        const result = await showForm('编辑年度摘要', [
          {
            name: 'year',
            label: '年份',
            type: 'number',
            defaultValue: clickedSummary.year.toString(),
            required: true
          },
          {
            name: 'text',
            label: '摘要内容',
            type: 'textarea',
            defaultValue: clickedSummary.text,
            required: true
          }
        ], {
          onDelete: async () => {
            const shouldDelete = await showConfirm('确定删除此年度摘要？');
            if (shouldDelete) {
              setYearSummaries(yearSummaries.filter(s => s.year !== clickedSummary.year));
              saveHistory();
            }
          }
        });
        
        if (result) {
          const year = parseInt(result.year);
          if (!year || year < startYear || year > endYear) {
            await showAlert('错误', `请输入 ${startYear} 到 ${endYear} 之间的有效年份`);
            return;
          }
          
          const text = result.text.trim();
          if (!text) return;
          
          // 如果修改了年份，检查新年份是否已存在摘要
          if (year !== clickedSummary.year) {
            const existing = yearSummaries.find(s => s.year === year);
            if (existing) {
              await showAlert('错误', `${year}年已有摘要，请先删除该年份的摘要`);
              return;
            }
          }
          
          setYearSummaries(yearSummaries.map(s =>
            s.year === clickedSummary.year ? { year, text } : s
          ));
          saveHistory();
        }
        return;
      }
      
      // 先检查是否点击在事件的端点上（优先检测，用于调整长度）
      // 对所有持续事件进行检测，确保与悬停检测一致
      let clickedHandle: { event: TimelineEvent; handle: 'start' | 'end' } | null = null;
      for (const event of events) {
        if (event.type === 'duration' && event.endYear && event.endQuarter) {
          const handle = getEventHandleAtPoint(x, y, event);
          if (handle) {
            clickedHandle = { event, handle };
            break;
          }
        }
      }
      
      if (clickedHandle) {
        // 点击在端点上，直接进入 resize 模式
        setSelectedEvent(clickedHandle.event);
        setIsDraggingEvent(true);
        setDraggedEvent(clickedHandle.event);
        setDragMode(clickedHandle.handle === 'start' ? 'resize-start' : 'resize-end');
        setDragStartX(x);
        setDragStartY(y);
        setDragStartTime({ 
          year: clickedHandle.event.startYear, 
          quarter: clickedHandle.event.startQuarter,
          month: clickedHandle.event.startMonth 
        });
        // 对于resize模式，dragStartMouseTime 不需要使用，但为了一致性也设置
        const mouseTime = coordsToTime(x, y);
        setDragStartMouseTime({
          year: mouseTime.year,
          quarter: mouseTime.quarter,
          month: mouseTime.month
        });
        if (clickedHandle.event.endYear && clickedHandle.event.endQuarter) {
          setDragEndTime({ 
            year: clickedHandle.event.endYear, 
            quarter: clickedHandle.event.endQuarter,
            month: clickedHandle.event.endMonth 
          });
        }
        return;
      }
      
      // 检查是否点击了事件主体
      const clickedEvent = getEventAtPoint(x, y);
      if (clickedEvent) {
        setSelectedEvent(clickedEvent);
        
        // 开始拖动事件（稍后根据拖动方向判断是垂直还是水平移动）
        setIsDraggingEvent(true);
        setDraggedEvent(clickedEvent);
        setDragMode(null); // 初始不确定模式，根据移动方向判断
        setDragStartX(x);
        setDragStartY(y);
        setDragStartYOffset(clickedEvent.yOffset || 0);
        // 记录事件的原始时间
        setDragStartTime({ 
          year: clickedEvent.startYear, 
          quarter: clickedEvent.startQuarter,
          month: clickedEvent.startMonth 
        });
        // 记录鼠标点击位置对应的时间（用于计算拖动偏移）
        const mouseTime = coordsToTime(x, y);
        setDragStartMouseTime({
          year: mouseTime.year,
          quarter: mouseTime.quarter,
          month: mouseTime.month
        });
        if (clickedEvent.endYear && clickedEvent.endQuarter) {
          setDragEndTime({ 
            year: clickedEvent.endYear, 
            quarter: clickedEvent.endQuarter,
            month: clickedEvent.endMonth 
          });
        }
        return;
      }
      
      setSelectedEvent(null);
      return;
    }
    
    setIsDragging(true);
    setDragStart({ x, y });
    setCurrentDrag({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // 检查鼠标是否悬停在年份分割线上（仅在非拖动状态下）
    // 优化：只有在值变化时才更新状态，避免频繁重渲染
    if (!isDraggingYearLine && !isDraggingEvent && !isDragging) {
      const yearLine = getYearLineAtPoint(x, y);
      if (yearLine !== hoveredYearLine) {
        setHoveredYearLine(yearLine);
      }
      
      // 检查鼠标是否悬停在事件端点上（对所有持续事件进行检测，与点击检测一致）
      let foundHandle = null;
      for (const event of events) {
        if (event.type === 'duration' && event.endYear && event.endQuarter) {
          const handle = getEventHandleAtPoint(x, y, event);
          if (handle) {
            foundHandle = { event, handle };
            break;
          }
        }
      }
      // 只有在值变化时才更新
      const currentHandleKey = foundHandle ? `${foundHandle.event.id}-${foundHandle.handle}` : null;
      const hoveredHandleKey = hoveredEventHandle ? `${hoveredEventHandle.event.id}-${hoveredEventHandle.handle}` : null;
      if (currentHandleKey !== hoveredHandleKey) {
        setHoveredEventHandle(foundHandle);
      }
    }
    
    // 处理年份分割线拖动
    if (isDraggingYearLine && draggedYearLine !== null) {
      const deltaY = y - yearLineDragStartY;
      const newHeight = Math.max(60, Math.min(300, yearLineDragStartHeight + deltaY)); // 限制高度范围
      setYearHeights(prev => ({
        ...prev,
        [draggedYearLine]: newHeight
      }));
      return;
    }
    
    // 处理事件拖拽
    if (isDraggingEvent && draggedEvent) {
      // 如果还没确定拖动模式，根据移动距离判断
      if (dragMode === null) {
        const deltaX = Math.abs(x - dragStartX);
        const deltaY = Math.abs(y - dragStartY);
        
        // 移动距离超过阈值才确定方向（增加到10px，提供更好的"粘性"体验）
        const threshold = 10;
        if (deltaX > threshold || deltaY > threshold) {
          // 判断是垂直拖动还是水平拖动（需要明显的方向差异）
          if (deltaY > deltaX * 1.5) {
            setDragMode('vertical');
          } else if (deltaX > deltaY * 1.5) {
            setDragMode('move');
          }
          // 如果方向不明确（45度左右），继续等待更明确的方向
        }
        return; // 等待确定方向
      }
      
      if (dragMode === 'vertical') {
        // 垂直拖动：支持跨年移动
        // 检测鼠标当前所在的年份
        const currentTime = coordsToTime(dragStartX, y); // 使用拖动开始时的X坐标和当前Y坐标
        const targetYear = currentTime.year;
        
        // 如果年份改变，更新事件的年份
        if (targetYear !== draggedEvent.startYear) {
          // 计算目标年份顶部位置的Y坐标
          const targetTopPos = timeToBaseCoords(targetYear, draggedEvent.startQuarter, draggedEvent.startMonth);
          const currentMouseY = y;
          const newYOffset = currentMouseY - targetTopPos.y;
          
          // 限制在目标年份的合理范围内（相对于顶部）
          const targetYearHeight = getYearHeight(targetYear);
          const minOffset = 20; // 距离顶部至少20px
          const maxOffset = targetYearHeight - 20; // 距离底部至少20px
          const clampedYOffset = Math.max(minOffset, Math.min(maxOffset, newYOffset));
          
          const updatedEvents = events.map(ev => {
            if (ev.id !== draggedEvent.id) return ev;
            
            if (ev.type === 'milestone') {
              return {
                ...ev,
                startYear: targetYear,
                yOffset: clampedYOffset
              };
            } else if (ev.type === 'duration' && ev.endYear && ev.endQuarter) {
              // 持续事件：保持持续时长不变，同时移动起止年份
              // 计算原始的总月数持续时长
              const startMonth = ev.startMonth || (ev.startQuarter - 1) * 3 + 1;
              const endMonth = ev.endMonth || (ev.endQuarter - 1) * 3 + 1;
              const originalStartMonths = ev.startYear * 12 + startMonth;
              const originalEndMonths = ev.endYear * 12 + endMonth;
              const durationMonths = originalEndMonths - originalStartMonths;
              
              // 计算新的起止时间
              const newStartMonth = ev.startMonth || (ev.startQuarter - 1) * 3 + 1;
              const newStartMonths = targetYear * 12 + newStartMonth;
              const newEndMonths = newStartMonths + durationMonths;
              
              let finalStartYear = targetYear;
              let finalEndYear = Math.floor((newEndMonths - 1) / 12);
              let finalEndMonth = ((newEndMonths - 1) % 12) + 1;
              let finalEndQuarter = Math.ceil(finalEndMonth / 3);
              
              // 如果结束年份超出范围，调整起始年份使结束年份刚好在范围内
              if (finalEndYear > endYear) {
                finalEndYear = endYear;
                const adjustedEndMonths = finalEndYear * 12 + (ev.endMonth || (ev.endQuarter - 1) * 3 + 1);
                const adjustedStartMonths = adjustedEndMonths - durationMonths;
                finalStartYear = Math.floor((adjustedStartMonths - 1) / 12);
                if (finalStartYear < startYear) {
                  // 如果持续时间太长，无法完全容纳，则保持原位不变
                  return ev;
                }
              } else if (finalStartYear < startYear) {
                finalStartYear = startYear;
                const adjustedStartMonths = finalStartYear * 12 + newStartMonth;
                const adjustedEndMonths = adjustedStartMonths + durationMonths;
                finalEndYear = Math.floor((adjustedEndMonths - 1) / 12);
                finalEndMonth = ((adjustedEndMonths - 1) % 12) + 1;
                finalEndQuarter = Math.ceil(finalEndMonth / 3);
                if (finalEndYear > endYear) {
                  // 如果持续时间太长，无法完全容纳，则保持原位不变
                  return ev;
                }
              }
              
              return {
                ...ev,
                startYear: finalStartYear,
                endYear: finalEndYear,
                endMonth: finalEndMonth,
                endQuarter: finalEndQuarter,
                yOffset: clampedYOffset
              };
            }
            return ev;
          });
          
          setEvents(updatedEvents);
          const updated = updatedEvents.find(ev => ev.id === draggedEvent.id);
          if (updated) {
            setDraggedEvent(updated);
            setSelectedEvent(updated);
            // 更新拖动起始点，以便后续平滑拖动
            setDragStartY(y);
            setDragStartYOffset(clampedYOffset);
          }
        } else {
          // 同一年份内的垂直移动
          const deltaY = y - dragStartY;
          const rawYOffset = dragStartYOffset + deltaY;
          
          // 限制在当前年份的合理范围内（相对于顶部）
          const yearHeight = getYearHeight(draggedEvent.startYear);
          const minOffset = 20; // 距离顶部至少20px
          const maxOffset = yearHeight - 20; // 距离底部至少20px
          const newYOffset = Math.max(minOffset, Math.min(maxOffset, rawYOffset));
          
          const updatedEvents = events.map(ev =>
            ev.id === draggedEvent.id
              ? { ...ev, yOffset: newYOffset }
              : ev
          );
          setEvents(updatedEvents);
          const updated = updatedEvents.find(ev => ev.id === draggedEvent.id);
          if (updated) setDraggedEvent(updated);
        }
      } else if (dragMode === 'move') {
        // 水平拖动：移动整个事件（使用月份计算）
        if (dragStartTime && dragStartMouseTime) {
          const currentTime = coordsToTime(x, y);
          
          // 辅助函数：将年月转换为总月数（从startYear开始计算）
          const toTotalMonths = (year: number, month?: number, quarter?: number) => {
            const m = month || (quarter ? (quarter - 1) * 3 + 2 : 1); // 如果没有月份，季度使用中间月
            return (year - startYear) * 12 + (m - 1); // 转换为0基数，便于计算
          };
          
          // 辅助函数：将总月数转换回年月
          const fromTotalMonths = (totalMonths: number) => {
            const clampedMonths = Math.max(0, Math.min((endYear - startYear + 1) * 12 - 1, totalMonths));
            const yearOffset = Math.floor(clampedMonths / 12);
            const month = (clampedMonths % 12) + 1; // 转回1-12
            const year = startYear + yearOffset;
            const quarter = Math.ceil(month / 3);
            return { year, month, quarter };
          };
          
          // 计算鼠标移动的时间差（基于月份）
          const dragStartMouseMonths = toTotalMonths(dragStartMouseTime.year, dragStartMouseTime.month, dragStartMouseTime.quarter);
          const currentMouseMonths = toTotalMonths(currentTime.year, currentTime.month, currentTime.quarter);
          const deltaMonths = Math.round(currentMouseMonths - dragStartMouseMonths);
          
          const updatedEvents = events.map(ev => {
            if (ev.id !== draggedEvent.id) return ev;
            
            // 计算新的开始时间（将鼠标移动的偏移量应用到事件的原始时间）
            const originalStartMonths = toTotalMonths(dragStartTime.year, dragStartTime.month, dragStartTime.quarter);
            const newStartMonths = originalStartMonths + deltaMonths;
            const newStart = fromTotalMonths(newStartMonths);
            
            if (ev.type === 'milestone') {
              return {
                ...ev,
                startYear: newStart.year,
                startQuarter: newStart.quarter,
                startMonth: newStart.month
              };
            } else if (ev.type === 'duration' && dragEndTime) {
              // 计算新的结束时间（同样应用偏移量）
              const originalEndMonths = toTotalMonths(dragEndTime.year, dragEndTime.month, dragEndTime.quarter);
              const newEndMonths = originalEndMonths + deltaMonths;
              const newEnd = fromTotalMonths(newEndMonths);
              
              return {
                ...ev,
                startYear: newStart.year,
                startQuarter: newStart.quarter,
                startMonth: newStart.month,
                endYear: newEnd.year,
                endQuarter: newEnd.quarter,
                endMonth: newEnd.month
              };
            }
            return ev;
          });
          
          setEvents(updatedEvents);
          const updated = updatedEvents.find(ev => ev.id === draggedEvent.id);
          if (updated) {
            setDraggedEvent(updated);
            setSelectedEvent(updated);
          }
        }
      } else if (dragMode === 'resize-start') {
        // 拖动起点：调整开始时间（支持月份）
        const currentTime = coordsToTime(x, y);
        const newStartYear = Math.max(startYear, Math.min(endYear, currentTime.year));
        const newStartMonth = Math.max(1, Math.min(12, currentTime.month));
        const newStartQuarter = Math.ceil(newStartMonth / 3);
        
        // 获取当前事件的结束时间
        const currentEvent = events.find(ev => ev.id === draggedEvent.id);
        if (currentEvent && currentEvent.type === 'duration' && currentEvent.endYear && currentEvent.endQuarter) {
          const endMonthTotal = currentEvent.endYear * 12 + (currentEvent.endMonth || (currentEvent.endQuarter - 1) * 3 + 1.5);
          const newStartMonthTotal = newStartYear * 12 + newStartMonth;
          
          // 确保开始时间不晚于结束时间
          if (newStartMonthTotal <= endMonthTotal) {
            const updatedEvents = events.map(ev =>
              ev.id === draggedEvent.id
                ? { ...ev, startYear: newStartYear, startQuarter: newStartQuarter, startMonth: newStartMonth }
                : ev
            );
            setEvents(updatedEvents);
            const updated = updatedEvents.find(ev => ev.id === draggedEvent.id);
            if (updated) {
              setDraggedEvent(updated);
              setSelectedEvent(updated);
            }
          }
        }
      } else if (dragMode === 'resize-end') {
        // 拖动终点：调整结束时间（支持月份）
        const currentTime = coordsToTime(x, y);
        const newEndYear = Math.max(startYear, Math.min(endYear, currentTime.year));
        const newEndMonth = Math.max(1, Math.min(12, currentTime.month));
        const newEndQuarter = Math.ceil(newEndMonth / 3);
        
        // 获取当前事件的开始时间
        const currentEvent = events.find(ev => ev.id === draggedEvent.id);
        if (currentEvent && currentEvent.type === 'duration') {
          const startMonthTotal = currentEvent.startYear * 12 + (currentEvent.startMonth || (currentEvent.startQuarter - 1) * 3 + 1.5);
          const newEndMonthTotal = newEndYear * 12 + newEndMonth;
          
          // 确保结束时间不早于开始时间
          if (newEndMonthTotal >= startMonthTotal) {
            const updatedEvents = events.map(ev =>
              ev.id === draggedEvent.id
                ? { ...ev, endYear: newEndYear, endQuarter: newEndQuarter, endMonth: newEndMonth }
                : ev
            );
            setEvents(updatedEvents);
            const updated = updatedEvents.find(ev => ev.id === draggedEvent.id);
            if (updated) {
              setDraggedEvent(updated);
              setSelectedEvent(updated);
            }
          }
        }
      }
      return;
    }
    
    // 处理添加新事件的拖拽
    if (isDragging && dragStart) {
      setCurrentDrag({ x, y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 处理年份分割线拖动结束
    if (isDraggingYearLine) {
      setIsDraggingYearLine(false);
      setDraggedYearLine(null);
      setYearLineDragStartY(0);
      setYearLineDragStartHeight(0);
      saveHistory();
      return;
    }
    
    // 处理事件拖拽结束
    if (isDraggingEvent) {
      setIsDraggingEvent(false);
      setDraggedEvent(null);
      setDragMode(null);
      setDragStartX(0);
      setDragStartY(0);
      setDragStartYOffset(0);
      setDragStartTime(null);
      setDragStartMouseTime(null);
      setDragEndTime(null);
      saveHistory();
      return;
    }
    
    if (!isDragging || !dragStart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;
    
    const startTime = coordsToTime(dragStart.x, dragStart.y);
    const endTime = coordsToTime(endX, endY);
    
    // 计算相对于年份顶部的 yOffset
    const yearTopPos = timeToBaseCoords(startTime.year, startTime.quarter, startTime.month);
    const yOffset = dragStart.y - yearTopPos.y;
    // 限制在合理范围内
    const yearHeight = getYearHeight(startTime.year);
    const clampedYOffset = Math.max(20, Math.min(yearHeight - 20, yOffset));
    
    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      title: '新事件',
      startYear: startTime.year,
      startQuarter: startTime.quarter,
      startMonth: startTime.month, // 使用月份精确定位
      type: newEventType,
      category: 'default',
      color: selectedColor,
      position: dragStart,
      result: 'neutral',
      yOffset: clampedYOffset // 相对于年份顶部的偏移
    };
    
    if (newEventType === 'duration') {
      newEvent.endYear = endTime.year;
      newEvent.endQuarter = endTime.quarter;
      newEvent.endMonth = endTime.month; // 使用月份精确定位
    }
    
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    setSelectedEvent(newEvent);
    saveHistory();
    
    setIsDragging(false);
    setDragStart(null);
    setCurrentDrag(null);
    setIsAddingEvent(false);
    
    // 自动打开编辑对话框
    setTimeout(() => {
      editEvent(newEvent);
    }, 0);
  };

  // AI 复盘分析
  const performAIAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // 检查是否配置了 API Key
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (!apiKey) {
        const fallbackInsights = `
📊 时间线复盘分析报告

⚠️ 未配置 OpenRouter API Key，显示基础统计信息

一、整体趋势
• 在 ${startYear}-${endYear} 期间，共记录了 ${events.length} 个重要事件
• 成功事件：${events.filter(e => e.result === 'good').length} 个
• 遇挫事件：${events.filter(e => e.result === 'bad').length} 个
• 中性事件：${events.filter(e => e.result === 'neutral' || !e.result).length} 个

二、关键洞察
• 事件密集期：${getMostBusyYear()} 是最繁忙的一年
• 里程碑事件：${events.filter(e => e.type === 'milestone').length} 个
• 持续事件：${events.filter(e => e.type === 'duration').length} 个

💡 提示：配置 NEXT_PUBLIC_OPENROUTER_API_KEY 环境变量以启用 AI 深度分析功能。
        `;
        
        setAiInsights(fallbackInsights.trim());
        setIsAnalyzing(false);
        return;
      }

      // 调用真实的 AI 服务
      const insights = await aiService.analyzeTimeline({
        events: events.map(e => ({
          title: e.title,
          startYear: e.startYear,
          startQuarter: e.startQuarter,
          startMonth: e.startMonth,
          endYear: e.endYear,
          endQuarter: e.endQuarter,
          endMonth: e.endMonth,
          type: e.type,
          category: e.category,
          result: e.result,
          notes: e.notes
        })),
        yearSummaries,
        startYear,
        endYear
      });
      
      setAiInsights(insights);
    } catch (error) {
      console.error('AI 分析失败:', error);
      
      // 如果 AI 调用失败，显示错误信息和基础统计
      const errorInsights = `
📊 时间线复盘分析报告

❌ AI 分析失败: ${error instanceof Error ? error.message : '未知错误'}

基础统计信息：
• 时间范围：${startYear}-${endYear} 期间
• 总事件数：${events.length} 个
• 成功事件：${events.filter(e => e.result === 'good').length} 个
• 遇挫事件：${events.filter(e => e.result === 'bad').length} 个
• 中性事件：${events.filter(e => e.result === 'neutral' || !e.result).length} 个
• 事件密集期：${getMostBusyYear()} 年

💡 提示：请检查 API Key 配置和网络连接。
      `;
      
      setAiInsights(errorInsights.trim());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMostBusyYear = () => {
    const yearCounts: { [key: number]: number } = {};
    events.forEach(event => {
      yearCounts[event.startYear] = (yearCounts[event.startYear] || 0) + 1;
    });
    
    let maxYear = startYear;
    let maxCount = 0;
    Object.entries(yearCounts).forEach(([year, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxYear = parseInt(year);
      }
    });
    
    return maxYear;
  };

  // 计算鼠标光标样式（简化逻辑）
  const getCursorStyle = () => {
    if (isDraggingYearLine) return 'ns-resize';
    if (hoveredYearLine !== null) return 'ns-resize';
    if (hoveredEventHandle !== null) return 'ew-resize';
    if (isDraggingEvent) {
      if (dragMode === 'vertical') return 'ns-resize';
      if (dragMode === 'resize-start' || dragMode === 'resize-end') return 'ew-resize';
      if (dragMode === 'move') return 'move';
    }
    if (isAddingEvent) return 'crosshair';
    return 'pointer';
  };

  // 添加年度摘要
  const addYearSummary = async () => {
    const result = await showForm('添加年度摘要', [
      {
        name: 'year',
        label: '年份',
        type: 'number',
        placeholder: `${startYear}-${endYear}`,
        required: true
      },
      {
        name: 'text',
        label: '摘要内容',
        type: 'textarea',
        placeholder: '输入该年度的总结或重要事件...',
        required: true
      }
    ]);
    
    if (!result) return;
    
    const year = parseInt(result.year);
    if (!year || year < startYear || year > endYear) {
      await showAlert('错误', `请输入 ${startYear} 到 ${endYear} 之间的有效年份`);
      return;
    }
    
    const text = result.text.trim();
    if (!text) return;
    
    const existing = yearSummaries.find(s => s.year === year);
    if (existing) {
      const shouldReplace = await showConfirm(
        '该年份已有摘要',
        `${year}年已存在摘要，是否替换？`
      );
      if (!shouldReplace) return;
      
      setYearSummaries(yearSummaries.map(s => 
        s.year === year ? { ...s, text } : s
      ));
    } else {
      setYearSummaries([...yearSummaries, { year, text }]);
    }
    saveHistory();
  };

  // 添加垂直标注
  const addVerticalAnnotation = async () => {
    const result = await showForm('添加垂直标注', [
      {
        name: 'startYear',
        label: '起始年份',
        type: 'number',
        placeholder: `${startYear}`,
        required: true
      },
      {
        name: 'endYear',
        label: '结束年份',
        type: 'number',
        placeholder: `${endYear}`,
        required: true
      },
      {
        name: 'text',
        label: '标注文字',
        type: 'text',
        placeholder: '例如：创业期、高速发展期...',
        required: true
      }
    ]);
    
    if (!result) return;
    
    const startYearNum = parseInt(result.startYear);
    const endYearNum = parseInt(result.endYear);
    
    if (!startYearNum || !endYearNum) {
      await showAlert('错误', '请输入有效的年份');
      return;
    }
    
    if (startYearNum > endYearNum) {
      await showAlert('错误', '起始年份不能大于结束年份');
      return;
    }
    
    const text = result.text.trim();
    if (!text) return;
    
    const newAnnotation: VerticalAnnotation = {
      id: Date.now().toString(),
      startYear: startYearNum,
      endYear: endYearNum,
      text,
      color: selectedColor
    };
    
    setVerticalAnnotations([...verticalAnnotations, newAnnotation]);
    saveHistory();
  };

  // 编辑事件（可以传入事件对象或使用选中的事件）
  const editEvent = async (event?: TimelineEvent) => {
    const eventToEdit = event || selectedEvent;
    if (!eventToEdit) return;
    
    // 准备表单字段
    const fields: FormField[] = [
      {
        name: 'title',
        label: '事件名称',
        type: 'text',
        defaultValue: eventToEdit.title,
        required: true
      },
      {
        name: 'type',
        label: '事件类型',
        type: 'select',
        defaultValue: eventToEdit.type,
        required: true,
        options: [
          { value: 'milestone', label: '📍 里程碑' },
          { value: 'duration', label: '📊 持续性事件' }
        ]
      },
      {
        name: 'category',
        label: '分类',
        type: 'select',
        defaultValue: eventToEdit.category || 'default',
        required: true,
        options: [
          { value: '产品开发', label: '🔧 产品开发' },
          { value: '产品发布', label: '🚀 产品发布' },
          { value: '产品迭代', label: '🔄 产品迭代' },
          { value: '人事变动', label: '👥 人事变动' },
          { value: '组织架构', label: '🏢 组织架构' },
          { value: '业务拓展', label: '📈 业务拓展' },
          { value: '合作项目', label: '🤝 合作项目' },
          { value: '技术探索', label: '🔬 技术探索' },
          { value: '技术突破', label: '💥 技术突破' },
          { value: '内部项目', label: '🏠 内部项目' },
          { value: '其他', label: '⚪ 其他' },
          { value: 'default', label: '📍 默认' }
        ]
      },
      {
        name: 'startYear',
        label: '开始年份',
        type: 'number',
        defaultValue: eventToEdit.startYear.toString(),
        required: true
      },
      {
        name: 'startMonth',
        label: '开始月份 (1-12)',
        type: 'number',
        defaultValue: (eventToEdit.startMonth || (eventToEdit.startQuarter - 1) * 3 + 1).toString(),
        required: true
      }
    ];
    
    // 如果是持续性事件，添加结束时间字段
    // 注意：即使当前是里程碑，如果用户切换到持续性事件，也需要这些字段
    // 所以如果当前是持续性事件，显示这些字段；如果是里程碑，字段会在类型切换时自动处理
    if (eventToEdit.type === 'duration') {
      // 计算默认结束时间
      const defaultEndYear = eventToEdit.endYear || eventToEdit.startYear;
      const defaultEndMonth = eventToEdit.endMonth || 
        (eventToEdit.endQuarter ? (eventToEdit.endQuarter - 1) * 3 + 1 : 
         (eventToEdit.startMonth || (eventToEdit.startQuarter - 1) * 3 + 1));
      
      fields.push(
        {
          name: 'endYear',
          label: '结束年份',
          type: 'number',
          defaultValue: defaultEndYear.toString(),
          required: true
        },
        {
          name: 'endMonth',
          label: '结束月份 (1-12)',
          type: 'number',
          defaultValue: defaultEndMonth.toString(),
          required: true
        }
      );
    } else {
      // 当前是里程碑，但如果用户切换到持续性事件，需要结束时间
      // 预计算一个合理的默认结束时间（开始时间后3个月）
      const startMonth = eventToEdit.startMonth || (eventToEdit.startQuarter - 1) * 3 + 1;
      const totalMonths = eventToEdit.startYear * 12 + startMonth + 3;
      const defaultEndYear = Math.floor((totalMonths - 1) / 12);
      const defaultEndMonth = ((totalMonths - 1) % 12) + 1;
      
      // 添加结束时间字段，但标记为非必填（因为当前是里程碑）
      // 当用户切换到持续性事件时，这些字段会被使用
      fields.push(
        {
          name: 'endYear',
          label: '结束年份（切换到持续性事件时需要）',
          type: 'number',
          defaultValue: defaultEndYear.toString(),
          required: false
        },
        {
          name: 'endMonth',
          label: '结束月份 (1-12)（切换到持续性事件时需要）',
          type: 'number',
          defaultValue: defaultEndMonth.toString(),
          required: false
        }
      );
    }
    
    // 添加备注字段
    fields.push({
      name: 'notes',
      label: '备注',
      type: 'textarea',
      defaultValue: eventToEdit.notes || '',
      required: false
    });
    
    const result = await showForm('编辑事件', fields, {
      onDelete: async () => {
        const shouldDelete = await showConfirm('确定删除此事件？');
        if (shouldDelete) {
          setEvents(events.filter(e => e.id !== eventToEdit.id));
          setSelectedEvent(null);
          saveHistory();
        }
      }
    });
    
    if (!result) return;
    
    // 处理开始时间
    const newStartYear = parseInt(result.startYear || '');
    const newStartMonth = parseInt(result.startMonth || '1');
    
    // 验证开始时间
    if (!newStartYear || newStartYear < startYear || newStartYear > endYear) {
      await showAlert('错误', `开始年份必须在 ${startYear} 到 ${endYear} 之间`);
      return;
    }
    
    if (newStartMonth < 1 || newStartMonth > 12) {
      await showAlert('错误', '开始月份必须在 1 到 12 之间');
      return;
    }
    
    const newStartQuarter = Math.ceil(newStartMonth / 3);
    
    // 处理事件类型切换和数据更新
    const newType = result.type as 'milestone' | 'duration';
    const updatedEvent: Partial<TimelineEvent> = {
      title: result.title.trim(),
      type: newType,
      category: result.category,
      notes: result.notes?.trim() || undefined,
      startYear: newStartYear,
      startQuarter: newStartQuarter,
      startMonth: newStartMonth
    };
    
    // 处理类型切换
    if (newType === 'duration') {
      // 切换到持续性事件：需要设置结束时间
      // 如果表单中没有结束时间字段（从里程碑切换过来），使用默认值
      let newEndYear: number;
      let newEndMonth: number;
      
      if (result.endYear && result.endMonth) {
        newEndYear = parseInt(result.endYear);
        newEndMonth = parseInt(result.endMonth);
      } else {
        // 从里程碑切换：默认结束时间为新的开始时间后3个月
        const totalMonths = newStartYear * 12 + newStartMonth + 3;
        newEndYear = Math.floor((totalMonths - 1) / 12);
        newEndMonth = ((totalMonths - 1) % 12) + 1;
      }
      
      if (!newEndYear || newEndYear < startYear || newEndYear > endYear) {
        await showAlert('错误', `结束年份必须在 ${startYear} 到 ${endYear} 之间`);
        return;
      }
      
      if (newEndMonth < 1 || newEndMonth > 12) {
        await showAlert('错误', '结束月份必须在 1 到 12 之间');
        return;
      }
      
      const newEndQuarter = Math.ceil(newEndMonth / 3);
      
      // 确保结束时间不早于开始时间（使用新的开始时间）
      const startMonthTotal = newStartYear * 12 + newStartMonth;
      const endMonthTotal = newEndYear * 12 + newEndMonth;
      
      if (endMonthTotal < startMonthTotal) {
        await showAlert('错误', '结束时间不能早于开始时间');
        return;
      }
      
      updatedEvent.endYear = newEndYear;
      updatedEvent.endQuarter = newEndQuarter;
      updatedEvent.endMonth = newEndMonth;
    } else {
      // 切换到里程碑：清除结束时间
      updatedEvent.endYear = undefined;
      updatedEvent.endQuarter = undefined;
      updatedEvent.endMonth = undefined;
    }
    
    // 更新事件
    const finalEvent = { ...eventToEdit, ...updatedEvent };
    setEvents(prevEvents => prevEvents.map(e => 
      e.id === eventToEdit.id ? finalEvent : e
    ));
    
    // 如果编辑的是选中的事件，更新选中状态
    if (selectedEvent?.id === eventToEdit.id) {
      setSelectedEvent(finalEvent);
    }
    
    saveHistory();
  };

  // 编辑选中的事件
  const editSelectedEvent = async () => {
    await editEvent();
  };

  // 删除选中的事件
  const deleteSelectedEvent = async () => {
    if (!selectedEvent) return;
    
    const confirmed = await showConfirm('确定删除此事件？');
    if (!confirmed) return;
    
    setEvents(events.filter(e => e.id !== selectedEvent.id));
    setSelectedEvent(null);
    saveHistory();
  };

  // 改变事件结果
  const changeEventResult = (result: 'good' | 'bad' | 'neutral') => {
    if (!selectedEvent) return;
    
    setEvents(events.map(e => 
      e.id === selectedEvent.id ? { ...e, result } : e
    ));
    saveHistory();
  };

  // 改变事件颜色
  const changeEventColor = (color: string) => {
    if (!selectedEvent) return;
    
    setEvents(events.map(e => 
      e.id === selectedEvent.id ? { ...e, color } : e
    ));
    setSelectedEvent({ ...selectedEvent, color });
    saveHistory();
  };

  // 导出数据
  const exportData = () => {
    const data = {
      events,
      yearSummaries,
      verticalAnnotations,
      startYear,
      endYear,
      yearHeights
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-review-${Date.now()}.json`;
    a.click();
  };

  // 导出画布为图片
  const exportCanvasAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      showAlert('导出失败', '画布未初始化');
      return;
    }

    try {
      // 使用 toDataURL 将画布转换为图片
      // 使用 PNG 格式以保持高质量
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      // 创建下载链接
      const link = document.createElement('a');
      link.download = `timeline-review-${Date.now()}.png`;
      link.href = dataURL;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出图片失败:', error);
      showAlert('导出失败', '导出图片时发生错误，请稍后重试');
    }
  };

  // 导入数据
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setEvents(data.events || []);
        setYearSummaries(data.yearSummaries || []);
        setVerticalAnnotations(data.verticalAnnotations || []);
        if (data.startYear) setStartYear(data.startYear);
        if (data.endYear) setEndYear(data.endYear);
        if (data.yearHeights) setYearHeights(data.yearHeights);
        saveHistory();
      } catch (e) {
        await showAlert('导入失败', '文件格式错误，请检查文件内容');
      }
    };
    reader.readAsText(file);
  };

  // 计算按钮的 disabled 状态，确保正确响应 events 的变化
  const isAIAnalysisDisabled = useMemo(() => {
    return isAnalyzing || events.length === 0;
  }, [isAnalyzing, events]);

  return (
    <div className={styles.timelineReviewContainer}>
      <div className={styles.toolbar}>
        <h1>📅 时间线复盘工具</h1>
        
        <div className={styles.toolbarSection}>
          <label>
            起始年份：
            <input 
              type="number" 
              value={startYear} 
              onChange={(e) => setStartYear(parseInt(e.target.value))}
              min="2000"
              max="2030"
            />
          </label>
          
          <label>
            结束年份：
            <input 
              type="number" 
              value={endYear} 
              onChange={(e) => setEndYear(parseInt(e.target.value))}
              min="2000"
              max="2030"
            />
          </label>
        </div>

        <div className={styles.toolbarSection}>
          <div className={styles.colorPicker}>
            颜色：
            {COLORS.map(color => (
              <button
                key={color}
                className={`${styles.colorBtn} ${selectedColor === color ? styles.active : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <div className={styles.toolbarSection}>
          <button 
            className={`${styles.btn} ${isAddingEvent && newEventType === 'milestone' ? styles.active : ''}`}
            onClick={() => {
              setNewEventType('milestone');
              setIsAddingEvent(true);
            }}
          >
            {isAddingEvent && newEventType === 'milestone' ? '✓ 添加里程碑' : '📍 添加里程碑'}
          </button>
          
          <button 
            className={`${styles.btn} ${isAddingEvent && newEventType === 'duration' ? styles.active : ''}`}
            onClick={() => {
              setNewEventType('duration');
              setIsAddingEvent(true);
            }}
          >
            {isAddingEvent && newEventType === 'duration' ? '✓ 添加持续事件' : '📊 添加持续事件'}
          </button>
          
          <button className={styles.btn} onClick={addYearSummary}>
            📝 年度摘要
          </button>
          
          <button className={styles.btn} onClick={addVerticalAnnotation}>
            📍 垂直标注
          </button>
        </div>

        <div className={styles.toolbarSection}>
          <button className={styles.btn} onClick={undo} disabled={historyIndex <= 0}>
            ↶ 撤销
          </button>
          
          <button className={styles.btn} onClick={redo} disabled={historyIndex >= history.length - 1}>
            ↷ 重做
          </button>
        </div>

        <div className={styles.toolbarSection}>
          <button className={styles.btn} onClick={exportData}>
            💾 导出数据
          </button>
          
          <button className={styles.btn} onClick={exportCanvasAsImage}>
            🖼️ 导出图片
          </button>
          
          <label className={styles.btn}>
            📂 导入
            <input 
              type="file" 
              accept=".json" 
              onChange={importData}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className={styles.toolbarSection}>
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={performAIAnalysis}
            disabled={isAIAnalysisDisabled}
          >
            {isAnalyzing ? '🤔 分析中...' : '🤖 AI 复盘'}
          </button>
        </div>

        {selectedEvent && (
          <div className={`${styles.toolbarSection} ${styles.eventActions}`}>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={editSelectedEvent}>
              ✏️ 编辑
            </button>
            <div className={styles.colorPicker}>
              颜色：
              {COLORS.map(color => (
                <button
                  key={color}
                  className={`${styles.colorBtn} ${styles.colorBtnSm} ${selectedEvent.color === color ? styles.active : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => changeEventColor(color)}
                  title="修改事件颜色"
                />
              ))}
            </div>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => changeEventResult('good')}>
              ✓ 好结果
            </button>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => changeEventResult('bad')}>
              ✗ 坏结果
            </button>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => changeEventResult('neutral')}>
              ○ 中性
            </button>
            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={deleteSelectedEvent}>
              🗑️ 删除
            </button>
          </div>
        )}
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ 
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            cursor: getCursorStyle()
          }}
        />
      </div>

      {aiInsights && (
        <div className={styles.aiInsights}>
          <h2>💡 AI 复盘洞察</h2>
          <pre>{aiInsights}</pre>
          <button className={styles.btn} onClick={() => setAiInsights('')}>
            关闭
          </button>
        </div>
      )}

      <div className={styles.instructions}>
        <h3>使用说明：</h3>
        <ul>
          <li>🎨 选择颜色后，点击"添加里程碑"或"添加持续事件"按钮进入添加模式</li>
          <li>📍 里程碑模式：在画布上单击或拖拽创建里程碑事件</li>
          <li>📊 持续事件模式：在画布上拖拽创建持续事件</li>
          <li>👆 点击已有事件进行选中，然后可在工具栏编辑、标记结果或删除</li>
          <li>↕️ 点击并上下拖拽事件，可调整事件位置（避免重叠）</li>
          <li>↔️ 点击并左右拖拽事件，可移动事件（改变年份和季度）</li>
          <li>📏 对于持续事件，点击并拖拽起点或终点的白色圆点，可调整事件长度</li>
          <li>📏 点击并拖拽年份分割线（横线），可调整该年份区域的高度</li>
          <li>📝 使用"年度摘要"为特定年份添加总结</li>
          <li>📍 使用"垂直标注"为时间范围添加阶段标记</li>
          <li>⌨️ 支持 Cmd/Ctrl + Z 撤销，Cmd/Ctrl + Y 重做</li>
          <li>📋 选中事件后，支持 Cmd/Ctrl + C 复制，Cmd/Ctrl + V 粘贴</li>
          <li>💾 数据自动保存到浏览器，也可导出/导入 JSON 文件</li>
          <li>🤖 点击"AI 复盘"获取智能分析和建议</li>
        </ul>
      </div>

      {/* 自定义弹框 */}
      {dialog && (
        <div className={styles.dialogOverlay} onClick={() => dialog.onCancel?.()}>
          <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <h3>{dialog.title}</h3>
            </div>
            
            <div className={styles.dialogBody}>
              {dialog.message && <p>{dialog.message}</p>}
              
              {dialog.type === 'prompt' && (
                <input
                  type="text"
                  value={dialogInputValue}
                  onChange={(e) => setDialogInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      dialog.onConfirm?.(dialogInputValue);
                    } else if (e.key === 'Escape') {
                      dialog.onCancel?.();
                    }
                  }}
                  autoFocus
                  className={styles.dialogInput}
                />
              )}
              
              {dialog.type === 'form' && dialog.fields && (
                <div className={styles.formFields}>
                  {dialog.fields.map((field, index) => (
                    <div 
                      key={field.name} 
                      className={`${styles.formField} ${field.type === 'textarea' ? styles.fullWidth : ''}`}
                    >
                      <label className={styles.formLabel}>
                        {field.label}
                        {field.required && <span className={styles.required}>*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          placeholder={field.placeholder}
                          className={styles.dialogTextarea}
                          rows={4}
                          autoFocus={index === 0}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className={styles.dialogInput}
                          autoFocus={index === 0}
                        >
                          {field.options?.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          placeholder={field.placeholder}
                          className={styles.dialogInput}
                          autoFocus={index === 0}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.dialogFooter}>
              {dialog.type === 'confirm' && (
                <>
                  <button 
                    className={`${styles.dialogBtn} ${styles.dialogBtnCancel}`}
                    onClick={() => dialog.onCancel?.()}
                  >
                    取消
                  </button>
                  <button 
                    className={`${styles.dialogBtn} ${styles.dialogBtnConfirm}`}
                    onClick={() => dialog.onConfirm?.()}
                  >
                    确定
                  </button>
                </>
              )}
              
              {dialog.type === 'prompt' && (
                <>
                  <button 
                    className={`${styles.dialogBtn} ${styles.dialogBtnCancel}`}
                    onClick={() => dialog.onCancel?.()}
                  >
                    取消
                  </button>
                  <button 
                    className={`${styles.dialogBtn} ${styles.dialogBtnConfirm}`}
                    onClick={() => dialog.onConfirm?.(dialogInputValue)}
                  >
                    确定
                  </button>
                </>
              )}
              
              {dialog.type === 'form' && (
                <>
                  {dialog.onDelete && (
                    <button 
                      className={`${styles.dialogBtn} ${styles.dialogBtnDanger}`}
                      onClick={() => {
                        setDialog(null);
                        dialog.onDelete?.();
                      }}
                      style={{ marginRight: 'auto' }}
                    >
                      🗑️ 删除
                    </button>
                  )}
                  <button 
                    className={`${styles.dialogBtn} ${styles.dialogBtnCancel}`}
                    onClick={() => dialog.onCancel?.()}
                  >
                    取消
                  </button>
                  <button 
                    className={`${styles.dialogBtn} ${styles.dialogBtnConfirm}`}
                    onClick={() => {
                      // 验证必填字段
                      const fields = dialog.fields || [];
                      const hasEmpty = fields.some(field => 
                        field.required && !formData[field.name]?.trim()
                      );
                      if (hasEmpty) {
                        return; // 不提交，字段会显示为空
                      }
                      dialog.onConfirm?.(formData);
                    }}
                  >
                    保存
                  </button>
                </>
              )}
              
              {dialog.type === 'alert' && (
                <button 
                  className={`${styles.dialogBtn} ${styles.dialogBtnConfirm}`}
                  onClick={() => dialog.onConfirm?.()}
                  autoFocus
                >
                  确定
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

