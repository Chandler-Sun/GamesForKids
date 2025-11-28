'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './page.module.css';

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
  startQuarter: number; // 1-4
  endYear?: number;
  endQuarter?: number;
  type: 'milestone' | 'duration' | 'annotation';
  category: string; // 用于颜色区分
  result?: 'good' | 'bad' | 'neutral';
  notes?: string;
  position: Point;
  color: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
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

  const yearCount = endYear - startYear + 1;
  const canvasWidth = 1400;
  const canvasHeight = Math.max(800, yearCount * 80 + 200);
  const leftMargin = 180; // 增加左边距以容纳更宽的垂直标注区域
  const topMargin = 80;
  const yearHeight = 70;
  const quarterWidth = 220; // 略微减少以保持总体宽度
  const verticalAnnotationWidth = 150; // 垂直标注区域宽度
  const yearSummaryWidth = 180; // 年度摘要区域宽度（较窄）

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
        endYear
      };
      localStorage.setItem('timeline-review-data', JSON.stringify(data));
    }
  }, [events, yearSummaries, verticalAnnotations, startYear, endYear]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 转换坐标到年份和季度
  const coordsToTime = (x: number, y: number) => {
    const yearIndex = Math.floor((y - topMargin) / yearHeight);
    const year = startYear + yearIndex;
    const quarterIndex = Math.floor((x - leftMargin) / quarterWidth);
    const quarter = Math.max(1, Math.min(4, quarterIndex + 1));
    
    return { year: Math.max(startYear, Math.min(endYear, year)), quarter };
  };

  // 转换年份和季度到坐标
  const timeToCoords = (year: number, quarter: number) => {
    const yearIndex = year - startYear;
    const x = leftMargin + (quarter - 1) * quarterWidth + quarterWidth / 2;
    const y = topMargin + yearIndex * yearHeight + yearHeight / 2;
    return { x, y };
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

    // 绘制年份标签和横线
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.font = 'bold 18px "ChillLongCangKaiShu", sans-serif';
    ctx.fillStyle = '#333';

    for (let i = 0; i <= yearCount; i++) {
      const year = startYear + i;
      const y = topMargin + i * yearHeight;
      
      // 年份标签
      ctx.textAlign = 'right';
      ctx.fillText(year.toString(), leftMargin - 20, y + 5);
      
      // 横线
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(leftMargin + quarterWidth * 4, y);
      ctx.stroke();
    }

    // 绘制季度标签
    ctx.font = '16px "ChillLongCangKaiShu", sans-serif';
    QUARTERS.forEach((q, i) => {
      const x = leftMargin + i * quarterWidth + quarterWidth / 2;
      ctx.textAlign = 'center';
      ctx.fillText(q, x, topMargin - 30);
    });

    // 绘制竖线（季度分隔）
    ctx.strokeStyle = '#EEE';
    for (let i = 0; i <= 4; i++) {
      const x = leftMargin + i * quarterWidth;
      ctx.beginPath();
      ctx.moveTo(x, topMargin);
      ctx.lineTo(x, topMargin + yearCount * yearHeight);
      ctx.stroke();
    }

    // 绘制垂直标注区域
    verticalAnnotations.forEach(annotation => {
      const startY = topMargin + (annotation.startYear - startYear) * yearHeight;
      const endY = topMargin + (annotation.endYear - startYear + 1) * yearHeight;
      
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
      
      if (event.type === 'duration' && event.endYear && event.endQuarter) {
        // 绘制持续性事件（带箭头的线）
        const start = timeToCoords(event.startYear, event.startQuarter);
        const end = timeToCoords(event.endYear, event.endQuarter);
        
        // 绘制箭头
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
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
        
        ctx.strokeStyle = event.color;
        ctx.lineWidth = isSelected ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();
        
        // 如果选中，先绘制高亮背景箭头
        if (isSelected) {
          ctx.fillStyle = event.color + '40';
          const bgArrowSize = arrowSize + 4;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - bgArrowSize * Math.cos(angle - Math.PI / 6),
            end.y - bgArrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            end.x - bgArrowSize * Math.cos(angle + Math.PI / 6),
            end.y - bgArrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
        
        // 绘制主箭头
        ctx.fillStyle = event.color;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - arrowSize * Math.cos(angle - Math.PI / 6),
          end.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          end.x - arrowSize * Math.cos(angle + Math.PI / 6),
          end.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // 绘制文本
        ctx.font = `${isSelected ? 'bold 16px' : 'bold 14px'} "ChillLongCangKaiShu", sans-serif`;
        ctx.fillStyle = event.color;
        ctx.textAlign = 'center';
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
        
        // 结果标记
        if (event.result === 'good') {
          ctx.fillStyle = '#52B788';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✓', end.x + 20, end.y);
        } else if (event.result === 'bad') {
          ctx.fillStyle = '#FF6B6B';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('✗', end.x + 20, end.y);
        }
      } else if (event.type === 'milestone') {
        // 绘制里程碑事件（圆点）
        const pos = timeToCoords(event.startYear, event.startQuarter);
        
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

    // 绘制年度摘要
    yearSummaries.forEach(summary => {
      const y = topMargin + (summary.year - startYear) * yearHeight + yearHeight / 2;
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

    // 绘制当前拖拽的临时线
    if (isDragging && dragStart && currentDrag && newEventType === 'duration') {
      ctx.strokeStyle = selectedColor + '80';
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(currentDrag.x, currentDrag.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [events, yearSummaries, verticalAnnotations, startYear, endYear, yearCount, 
      isDragging, dragStart, currentDrag, newEventType, selectedColor, selectedEvent]);

  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  // 检查点击是否在事件上
  const getEventAtPoint = (x: number, y: number): TimelineEvent | null => {
    for (const event of events) {
      if (event.type === 'milestone') {
        const pos = timeToCoords(event.startYear, event.startQuarter);
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < 15) return event;
      } else if (event.type === 'duration' && event.endYear && event.endQuarter) {
        const start = timeToCoords(event.startYear, event.startQuarter);
        const end = timeToCoords(event.endYear, event.endQuarter);
        
        // 简单的线段距离检测
        const lineLength = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const dot = ((x - start.x) * (end.x - start.x) + (y - start.y) * (end.y - start.y)) / Math.pow(lineLength, 2);
        
        if (dot >= 0 && dot <= 1) {
          const projX = start.x + dot * (end.x - start.x);
          const projY = start.y + dot * (end.y - start.y);
          const distance = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
          if (distance < 10) return event;
        }
      }
    }
    return null;
  };

  // 检查点击是否在垂直标注上
  const getVerticalAnnotationAtPoint = (x: number, y: number): VerticalAnnotation | null => {
    const annotationLeft = leftMargin - verticalAnnotationWidth - 10;
    const annotationRight = leftMargin - 10;
    
    if (x < annotationLeft || x > annotationRight) return null;
    
    for (const annotation of verticalAnnotations) {
      const startY = topMargin + (annotation.startYear - startYear) * yearHeight;
      const endY = topMargin + (annotation.endYear - startYear + 1) * yearHeight;
      
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
      const summaryY = topMargin + (summary.year - startYear) * yearHeight + yearHeight / 2;
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
    if (!isDragging || !dragStart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCurrentDrag({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      type: newEventType,
      category: 'default',
      color: selectedColor,
      position: dragStart,
      result: 'neutral'
    };
    
    if (newEventType === 'duration') {
      newEvent.endYear = endTime.year;
      newEvent.endQuarter = endTime.quarter;
    }
    
    setEvents([...events, newEvent]);
    saveHistory();
    
    setIsDragging(false);
    setDragStart(null);
    setCurrentDrag(null);
    setIsAddingEvent(false);
  };

  // AI 复盘分析
  const performAIAnalysis = async () => {
    setIsAnalyzing(true);
    
    // 模拟 AI 分析（实际应用中应调用真实的 AI API）
    setTimeout(() => {
      const insights = `
📊 时间线复盘分析报告

一、整体趋势
• 在 ${startYear}-${endYear} 期间，共记录了 ${events.length} 个重要事件
• 成功事件：${events.filter(e => e.result === 'good').length} 个
• 遇挫事件：${events.filter(e => e.result === 'bad').length} 个

二、关键洞察
• 事件密集期：${getMostBusyYear()} 是最繁忙的一年
• 建议关注长期项目的完成率和时间管理
• 不同类型事件的分布较为均衡

三、改进建议
• 继续保持记录习惯，有助于长期复盘
• 对于结果不理想的事件，建议深入分析原因
• 可以尝试设定更多里程碑节点，便于追踪进度

四、下一步行动
• 为即将到来的季度设定清晰目标
• 定期回顾时间线，调整策略
• 考虑增加跨年度的战略性项目规划
      `;
      
      setAiInsights(insights.trim());
      setIsAnalyzing(false);
    }, 2000);
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

  // 编辑选中的事件
  const editSelectedEvent = async () => {
    if (!selectedEvent) return;
    
    const title = await showPrompt('事件名称：', selectedEvent.title);
    if (title) {
      setEvents(events.map(e => 
        e.id === selectedEvent.id ? { ...e, title } : e
      ));
      saveHistory();
    }
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
            cursor: isAddingEvent ? 'crosshair' : 'pointer' 
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
          <li>📝 使用"年度摘要"为特定年份添加总结</li>
          <li>📍 使用"垂直标注"为时间范围添加阶段标记</li>
          <li>⌨️ 支持 Cmd/Ctrl + Z 撤销，Cmd/Ctrl + Y 重做</li>
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

