'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  type: 'text' | 'number' | 'textarea';
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
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
  const baseYearHeight = 120; // 基础年份高度（增加以容纳多个事件）
  const quarterWidth = 220; // 略微减少以保持总体宽度
  const verticalAnnotationWidth = 150; // 垂直标注区域宽度
  const yearSummaryWidth = 180; // 年度摘要区域宽度（较窄）

  // 获取年份高度（如果自定义则使用自定义值，否则使用基础高度）
  const getYearHeight = (year: number) => {
    return yearHeights[year] || baseYearHeight;
  };

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

  // 自动保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = {
        events,
        yearSummaries,
        verticalAnnotations,
        startYear,
        endYear,
        yearHeights
      };
      localStorage.setItem('timeline-review-data', JSON.stringify(data));
    }
  }, [events, yearSummaries, verticalAnnotations, startYear, endYear, yearHeights]);

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

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedEvent) {
        e.preventDefault();
        copySelectedEvent();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedEvent) {
        e.preventDefault();
        pasteEvent();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedEvent, copiedEvent, copySelectedEvent, pasteEvent]);

  // 转换坐标到年份和月份（支持动态年份高度）
  const coordsToTime = (x: number, y: number) => {
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
  };


  // 计算画布总高度（支持动态年份高度）
  const calculateCanvasHeight = useCallback(() => {
    let totalHeight = topMargin;
    for (let year = startYear; year <= endYear; year++) {
      totalHeight += getYearHeight(year);
    }
    totalHeight += 200;
    return Math.max(800, totalHeight);
  }, [startYear, endYear, yearHeights]);

  const canvasHeight = calculateCanvasHeight();

  // 转换年份和月份到坐标（基础位置，支持动态年份高度）
  const timeToBaseCoords = (year: number, quarter: number, month?: number) => {
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
    
    // 计算该年份之前的累计高度
    let y = topMargin;
    for (let yIdx = 0; yIdx < yearIndex; yIdx++) {
      y += getYearHeight(startYear + yIdx);
    }
    // 加上当前年份的一半高度
    y += getYearHeight(year) / 2;
    
    return { x, y };
  };

  // 转换年份和季度/月份到坐标（考虑yOffset）
  const timeToCoords = (year: number, quarter: number, yOffset: number = 0, month?: number) => {
    const base = timeToBaseCoords(year, quarter, month);
    return { x: base.x, y: base.y + yOffset };
  };

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
      
      // 横线（年份分割线，可拖动）
      const isHighlighted = (isDraggingYearLine && draggedYearLine === year) || hoveredYearLine === year;
      ctx.strokeStyle = isHighlighted ? '#4A90E2' : '#DDD';
      ctx.lineWidth = isHighlighted ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(leftMargin, currentY);
      ctx.lineTo(leftMargin + quarterWidth * 4, currentY);
      ctx.stroke();
      
      // 重置样式
      ctx.strokeStyle = '#DDD';
      ctx.lineWidth = 1;
      
      currentY += yearHeight;
    }
    
    // 绘制最后一条横线
    ctx.beginPath();
    ctx.moveTo(leftMargin, currentY);
    ctx.lineTo(leftMargin + quarterWidth * 4, currentY);
    ctx.stroke();

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
        // 绘制持续性事件（带箭头的线）- 确保线条水平
        const start = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        const end = timeToCoords(event.endYear, event.endQuarter, yOffset, event.endMonth);
        
        // 强制保持水平：使用start的Y坐标
        const lineY = start.y;
        const arrowSize = isSelected ? 14 : 12;
        
        // 计算主线的结束点（缩短以便箭头覆盖）
        const lineEndX = end.x - arrowSize * 0.7;
        
        // 如果选中，先绘制高亮背景
        if (isSelected) {
          ctx.strokeStyle = event.color + '40';
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.moveTo(start.x, lineY);
          ctx.lineTo(lineEndX, lineY);
          ctx.stroke();
        }
        
        // 绘制水平线
        ctx.strokeStyle = event.color;
        ctx.lineWidth = isSelected ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(start.x, lineY);
        ctx.lineTo(lineEndX, lineY);
        ctx.stroke();
        
        // 如果选中，绘制可拖动的端点（起点和终点）
        if (isSelected) {
          // 绘制起点控制点
          ctx.fillStyle = '#FFF';
          ctx.strokeStyle = event.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(start.x, lineY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // 绘制终点控制点（箭头位置）
          ctx.beginPath();
          ctx.arc(end.x, lineY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        
        // 如果选中，先绘制高亮背景箭头
        if (isSelected) {
          ctx.fillStyle = event.color + '40';
          const bgArrowSize = arrowSize + 4;
          ctx.beginPath();
          ctx.moveTo(end.x, lineY);
          ctx.lineTo(end.x - bgArrowSize, lineY - bgArrowSize * Math.sin(Math.PI / 6));
          ctx.lineTo(end.x - bgArrowSize, lineY + bgArrowSize * Math.sin(Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
        
        // 绘制主箭头（水平向右）
        ctx.fillStyle = event.color;
        ctx.beginPath();
        ctx.moveTo(end.x, lineY);
        ctx.lineTo(end.x - arrowSize, lineY - arrowSize * Math.sin(Math.PI / 6));
        ctx.lineTo(end.x - arrowSize, lineY + arrowSize * Math.sin(Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        // 绘制文本
        ctx.font = `${isSelected ? 'bold 16px' : 'bold 14px'} "ChillLongCangKaiShu", sans-serif`;
        ctx.fillStyle = event.color;
        ctx.textAlign = 'center';
        const midX = (start.x + end.x) / 2;
        const midY = lineY - 10;
        
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
        
        // 结果标记
        if (event.result === 'good') {
          ctx.fillStyle = '#52B788';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✓', end.x + 20, lineY);
        } else if (event.result === 'bad') {
          ctx.fillStyle = '#FF6B6B';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✗', end.x + 20, lineY);
        }
      } else if (event.type === 'milestone') {
        // 绘制里程碑事件（圆点）
        const pos = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        
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
        
        // 文本
        ctx.font = `${isSelected ? 'bold 16px' : 'bold 14px'} "ChillLongCangKaiShu", sans-serif`;
        ctx.fillStyle = event.color;
        ctx.textAlign = 'center';
        
        // 如果选中，添加背景
        if (isSelected) {
          ctx.save();
          const textMetrics = ctx.measureText(event.title);
          ctx.fillStyle = '#FFF';
          ctx.fillRect(pos.x - textMetrics.width / 2 - 5, pos.y - 30, textMetrics.width + 10, 24);
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
  }, [events, yearSummaries, verticalAnnotations, startYear, endYear, yearCount, 
      isDragging, dragStart, currentDrag, newEventType, selectedColor, selectedEvent,
      yearHeights, isDraggingYearLine, draggedYearLine, hoveredYearLine]);

  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  // 检查点击是否在事件的端点上（用于调整长度）
  const getEventHandleAtPoint = (x: number, y: number, event: TimelineEvent): 'start' | 'end' | null => {
    const yOffset = event.yOffset || 0;
    const handleRadius = 10; // 端点检测半径
    
    if (event.type === 'duration' && event.endYear && event.endQuarter) {
      const start = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
      const end = timeToCoords(event.endYear, event.endQuarter, yOffset, event.endMonth);
      const lineY = start.y;
      
      // 检查是否点击在起点
      const startDistance = Math.sqrt(Math.pow(x - start.x, 2) + Math.pow(y - lineY, 2));
      if (startDistance < handleRadius) {
        return 'start';
      }
      
      // 检查是否点击在终点（箭头位置）
      const endDistance = Math.sqrt(Math.pow(x - end.x, 2) + Math.pow(y - lineY, 2));
      if (endDistance < handleRadius) {
        return 'end';
      }
    }
    
    return null;
  };

  // 检查点击是否在事件上
  const getEventAtPoint = (x: number, y: number): TimelineEvent | null => {
    for (const event of events) {
      const yOffset = event.yOffset || 0;
      
      if (event.type === 'milestone') {
        const pos = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < 15) return event;
      } else if (event.type === 'duration' && event.endYear && event.endQuarter) {
        const start = timeToCoords(event.startYear, event.startQuarter, yOffset, event.startMonth);
        const end = timeToCoords(event.endYear, event.endQuarter, yOffset, event.endMonth);
        
        // 水平线距离检测
        const lineY = start.y; // 水平线
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        
        // 检查X坐标是否在线段范围内，Y坐标是否接近
        if (x >= minX && x <= maxX && Math.abs(y - lineY) < 15) {
          return event;
        }
      }
    }
    return null;
  };

  // 检查点击是否在年份分割线上
  const getYearLineAtPoint = (x: number, y: number): number | null => {
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
  };

  // 检查点击是否在垂直标注上
  const getVerticalAnnotationAtPoint = (x: number, y: number): VerticalAnnotation | null => {
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
  };

  // 检查点击是否在年度摘要上
  const getYearSummaryAtPoint = (x: number, y: number): YearSummary | null => {
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
  };

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
      
      // 检查是否点击了事件
      const clickedEvent = getEventAtPoint(x, y);
      if (clickedEvent) {
        setSelectedEvent(clickedEvent);
        
        // 检查是否点击在事件的端点上（用于调整长度）
        const handle = getEventHandleAtPoint(x, y, clickedEvent);
        if (handle && clickedEvent.type === 'duration') {
          // 拖动端点调整长度
          setIsDraggingEvent(true);
          setDraggedEvent(clickedEvent);
          setDragMode(handle === 'start' ? 'resize-start' : 'resize-end');
          setDragStartX(x);
          setDragStartY(y);
          setDragStartTime({ 
            year: clickedEvent.startYear, 
            quarter: clickedEvent.startQuarter,
            month: clickedEvent.startMonth 
          });
          // 对于resize模式，dragStartMouseTime 不需要使用，但为了一致性也设置
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
    if (!isDraggingYearLine && !isDraggingEvent && !isDragging) {
      const yearLine = getYearLineAtPoint(x, y);
      setHoveredYearLine(yearLine);
      
      // 检查鼠标是否悬停在事件端点上
      let foundHandle = null;
      for (const event of events) {
        if (event.type === 'duration' && selectedEvent?.id === event.id) {
          const handle = getEventHandleAtPoint(x, y, event);
          if (handle) {
            foundHandle = { event, handle };
            break;
          }
        }
      }
      setHoveredEventHandle(foundHandle);
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
        
        // 移动距离超过阈值才确定方向
        if (deltaX > 5 || deltaY > 5) {
          // 判断是垂直拖动还是水平拖动
          if (deltaY > deltaX) {
            setDragMode('vertical');
          } else {
            setDragMode('move');
          }
        }
        return; // 等待确定方向
      }
      
      if (dragMode === 'vertical') {
        // 垂直拖动：调整 yOffset
        const deltaY = y - dragStartY;
        const newYOffset = dragStartYOffset + deltaY;
        const updatedEvents = events.map(ev =>
          ev.id === draggedEvent.id
            ? { ...ev, yOffset: newYOffset }
            : ev
        );
        setEvents(updatedEvents);
        const updated = updatedEvents.find(ev => ev.id === draggedEvent.id);
        if (updated) setDraggedEvent(updated);
      } else if (dragMode === 'move') {
        // 水平拖动：移动整个事件（使用月份计算）
        if (dragStartTime && dragStartMouseTime) {
          const currentTime = coordsToTime(x, y);
          
          // 计算鼠标移动的时间差（基于月份）
          const dragStartMouseMonthTotal = (dragStartMouseTime.year - startYear) * 12 + (dragStartMouseTime.month || (dragStartMouseTime.quarter - 1) * 3 + 1.5);
          const currentMouseMonthTotal = (currentTime.year - startYear) * 12 + currentTime.month;
          const deltaMonths = Math.round(currentMouseMonthTotal - dragStartMouseMonthTotal);
          
          const updatedEvents = events.map(ev => {
            if (ev.id !== draggedEvent.id) return ev;
            
            // 计算新的开始时间（将鼠标移动的偏移量应用到事件的原始时间）
            const originalStartMonthTotal = (dragStartTime.year - startYear) * 12 + (dragStartTime.month || (dragStartTime.quarter - 1) * 3 + 1.5);
            const newStartMonthTotal = originalStartMonthTotal + deltaMonths;
            const newStartYear = Math.max(startYear, Math.min(endYear, startYear + Math.floor(newStartMonthTotal / 12)));
            const newStartMonth = Math.max(1, Math.min(12, Math.round(newStartMonthTotal % 12) || 12));
            const newStartQuarter = Math.ceil(newStartMonth / 3);
            
            if (ev.type === 'milestone') {
              return {
                ...ev,
                startYear: newStartYear,
                startQuarter: newStartQuarter,
                startMonth: newStartMonth
              };
            } else if (ev.type === 'duration' && dragEndTime) {
              // 计算新的结束时间（同样应用偏移量）
              const originalEndMonthTotal = (dragEndTime.year - startYear) * 12 + (dragEndTime.month || (dragEndTime.quarter - 1) * 3 + 1.5);
              const newEndMonthTotal = originalEndMonthTotal + deltaMonths;
              const newEndYear = Math.max(startYear, Math.min(endYear, startYear + Math.floor(newEndMonthTotal / 12)));
              const newEndMonth = Math.max(1, Math.min(12, Math.round(newEndMonthTotal % 12) || 12));
              const newEndQuarter = Math.ceil(newEndMonth / 3);
              
              return {
                ...ev,
                startYear: newStartYear,
                startQuarter: newStartQuarter,
                startMonth: newStartMonth,
                endYear: newEndYear,
                endQuarter: newEndQuarter,
                endMonth: newEndMonth
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
      yOffset: 0 // 初始偏移为0
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
    
    const title = await showPrompt('事件名称：', eventToEdit.title);
    if (title) {
      setEvents(prevEvents => prevEvents.map(e => 
        e.id === eventToEdit.id ? { ...e, title } : e
      ));
      // 如果编辑的是选中的事件，更新选中状态
      if (selectedEvent?.id === eventToEdit.id) {
        setSelectedEvent({ ...eventToEdit, title });
      }
      saveHistory();
    }
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
      endYear
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-review-${Date.now()}.json`;
    a.click();
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
        saveHistory();
      } catch (e) {
        await showAlert('导入失败', '文件格式错误，请检查文件内容');
      }
    };
    reader.readAsText(file);
  };

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
          <label>
            事件类型：
            <select 
              value={newEventType} 
              onChange={(e) => setNewEventType(e.target.value as 'milestone' | 'duration')}
            >
              <option value="duration">持续事件</option>
              <option value="milestone">里程碑</option>
            </select>
          </label>
          
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
            className={`${styles.btn} ${isAddingEvent ? styles.active : ''}`}
            onClick={() => setIsAddingEvent(!isAddingEvent)}
          >
            {isAddingEvent ? '✓ 添加模式' : '+ 添加事件'}
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
            💾 导出
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
            disabled={isAnalyzing || events.length === 0}
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
            cursor: isDraggingYearLine ? 'ns-resize' : 
                    (hoveredYearLine !== null ? 'ns-resize' : 
                    (hoveredEventHandle !== null ? 'ew-resize' :
                    (isDraggingEvent && dragMode === 'vertical' ? 'ns-resize' : 
                    (isDraggingEvent && (dragMode === 'resize-start' || dragMode === 'resize-end') ? 'ew-resize' :
                    (isDraggingEvent && dragMode === 'move' ? 'move' :
                    (isAddingEvent ? 'crosshair' : 'pointer'))))))
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
          <li>🎨 选择颜色和事件类型后，点击"添加事件"进入添加模式</li>
          <li>🖱️ 在画布上拖拽创建持续事件，单击创建里程碑</li>
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
                    <div key={field.name} className={styles.formField}>
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

