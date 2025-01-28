"use client"

import React from 'react';

// 统一的字体配置
const FONTS = [
  {
    id: 'Chun Qiu ChenFeng',
    name: '寒蝉书体 春秋',
    path: '/fonts/ChillCalligraphyChunQiu_ChenFeng.otf'
  },
  {
    id: 'Chun Qiu QiuHong',
    name: '寒蝉书体 秋鸿',
    path: '/fonts/ChillCalligraphyChunQiu_QiuHong.otf'
  },
  {
    id: 'Long Chang',
    name: '寒蝉龙藏 楷书',
    path: '/fonts/ChillLongCangKaiShu_Medium.otf'
  },
  {
    id: 'Hetang',
    name: '荷塘手写体',
    path: '/fonts/hetang-regular.ttf'
  },
  {
    id: 'Feibo',
    name: '飞波正点体',
    path: '/fonts/feibo.otf'
  },
  {
    id: 'Slidefu',
    name: '演示佛系体',
    path: '/fonts/Slidefu-Regular.ttf'
  }
] as const;

// 生成字体路径映射
const fontPaths: {[key: string]: string} = Object.fromEntries(
  FONTS.map(font => [font.id, font.path])
);

const ChineseCalligraphy = () => {
  // 添加状态来追踪组件是否已经挂载
  const [isClient, setIsClient] = React.useState(false);

  // 在组件挂载后设置 isClient 为 true
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // 添加预设的颜色主题
  const colorThemes = [
    { name: '经典黑白', text: '#000000', bg: '#ffffff' },
    { name: '宣纸淡雅', text: '#2c1810', bg: '#f5e6d3' },
    { name: '青花瓷韵', text: '#1a4c8a', bg: '#ffffff' },
    { name: '朱砂典雅', text: '#bc2f32', bg: '#f8f0e5' },
    { name: '墨韵青灰', text: '#2f2f2f', bg: '#e6eef0' },
    { name: '翠竹清新', text: '#2d5a27', bg: '#f0f7e6' },
    { name: '紫气东来', text: '#4b0082', bg: '#f8f4ff' },
    { name: '金石典藏', text: '#8b4513', bg: '#faf0e6' },
    { name: '新年喜庆', text: '#d4000f', bg: '#fff1f0' },
    { name: '赛博朋克', text: '#ff7b00', bg: '#1a1a2e' },
  ];

  // 添加预设的落款文字选项
  const signatureTexts = [
    '今日偶感',
    '茶余饭后',
    '今日小记',
    '今日小结',
    `农历${['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'][Math.floor((new Date().getFullYear() - 4) % 10)]}${['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][Math.floor((new Date().getFullYear() - 4) % 12)]}年`,
    `${['一','二','三','四','五','六','七','八','九','十','十一','十二'][new Date().getMonth()]}月${['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八','二十九','三十','三十一'][new Date().getDate()-1]}日`,
  ];

  // 修改检查浏览器环境的函数
  const getLocalStorage = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') {
      return defaultValue;  // 服务端渲染时始终返回默认值
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      try {
        return JSON.parse(stored);
      } catch {
        return stored; // 如果解析失败则返回原始字符串
      }
    } catch {
      return defaultValue;
    }
  };

  // 修改所有使用 localStorage 的状态初始化，使用普通值作为初始状态
  const [text, setText] = React.useState("春节快乐！");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fontData, setFontData] = React.useState<{[key: string]: string}>({});
  const [selectedFont, setSelectedFont] = React.useState('Chun Qiu ChenFeng');
  const [textColor, setTextColor] = React.useState('#d4000f');
  const [bgColor, setBackgroundColor] = React.useState('#fff1f0');
  const [textSize, setTextSize] = React.useState(55);
  const [spacing, setSpacing] = React.useState(60);
  const [letterSpacing, setLetterSpacing] = React.useState(-0.19);
  const [alignment, setAlignment] = React.useState<'left' | 'center' | 'right'>('center');
  const [direction, setDirection] = React.useState<'vertical' | 'horizontal'>('vertical');
  const [template, setTemplate] = React.useState<'simple' | 'cloud' | 'mountain' | 'bamboo' | 'newyear'>('simple');
  const [showSignature, setShowSignature] = React.useState(false);
  const [signatureText, setSignatureText] = React.useState('农历乙巳年');
  const [signatureSize, setSignatureSize] = React.useState(16);
  const [signatureOffsetX, setSignatureOffsetX] = React.useState(0);
  const [signatureOffsetY, setSignatureOffsetY] = React.useState(0);
  const [showTitle, setShowTitle] = React.useState(false);
  const [titleText, setTitleText] = React.useState('敬祝：');
  const [titleSize, setTitleSize] = React.useState(20);
  const [titleOffsetX, setTitleOffsetX] = React.useState(0);
  const [titleOffsetY, setTitleOffsetY] = React.useState(0);

  // 在组件挂载后从 localStorage 加载数据
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setText(getLocalStorage('calligraphy_text', text));
      setSelectedFont(getLocalStorage('calligraphy_font', selectedFont));
      setTextColor(getLocalStorage('calligraphy_textColor', textColor));
      setBackgroundColor(getLocalStorage('calligraphy_bgColor', bgColor));
      setTextSize(parseInt(getLocalStorage('calligraphy_textSize', textSize)));
      setSpacing(parseInt(getLocalStorage('calligraphy_spacing', spacing)));
      setLetterSpacing(parseFloat(getLocalStorage('calligraphy_letterSpacing', letterSpacing)));
      setAlignment(getLocalStorage('calligraphy_alignment', alignment));
      setDirection(getLocalStorage('calligraphy_direction', direction));
      setTemplate(getLocalStorage('calligraphy_template', template));
      setShowSignature(getLocalStorage('calligraphy_showSignature', 'false') === true);
      setSignatureText(getLocalStorage('calligraphy_signatureText', signatureText));
      setSignatureSize(parseInt(getLocalStorage('calligraphy_signatureSize', signatureSize)));
      setSignatureOffsetX(parseInt(getLocalStorage('calligraphy_signatureOffsetX', signatureOffsetX)));
      setSignatureOffsetY(parseInt(getLocalStorage('calligraphy_signatureOffsetY', signatureOffsetY)));
      setShowTitle(getLocalStorage('calligraphy_showTitle', false));
      setTitleText(getLocalStorage('calligraphy_titleText', titleText));
      setTitleSize(parseInt(getLocalStorage('calligraphy_titleSize', titleSize)));
      setTitleOffsetX(parseInt(getLocalStorage('calligraphy_titleOffsetX', titleOffsetX)));
      setTitleOffsetY(parseInt(getLocalStorage('calligraphy_titleOffsetY', titleOffsetY)));
    }
  }, []);

  // 添加保存到 localStorage 的 useEffect
  React.useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      localStorage.setItem('calligraphy_text', text);
      localStorage.setItem('calligraphy_font', selectedFont);
      localStorage.setItem('calligraphy_textColor', textColor);
      localStorage.setItem('calligraphy_bgColor', bgColor);
      localStorage.setItem('calligraphy_textSize', textSize.toString());
      localStorage.setItem('calligraphy_spacing', spacing.toString());
      localStorage.setItem('calligraphy_letterSpacing', letterSpacing.toString());
      localStorage.setItem('calligraphy_alignment', alignment);
      localStorage.setItem('calligraphy_direction', direction);
      localStorage.setItem('calligraphy_template', template);
      localStorage.setItem('calligraphy_showSignature', showSignature.toString());
      localStorage.setItem('calligraphy_signatureText', signatureText);
      localStorage.setItem('calligraphy_signatureSize', signatureSize.toString());
      localStorage.setItem('calligraphy_signatureOffsetX', signatureOffsetX.toString());
      localStorage.setItem('calligraphy_signatureOffsetY', signatureOffsetY.toString());
      localStorage.setItem('calligraphy_showTitle', showTitle.toString());
      localStorage.setItem('calligraphy_titleText', titleText);
      localStorage.setItem('calligraphy_titleSize', titleSize.toString());
      localStorage.setItem('calligraphy_titleOffsetX', titleOffsetX.toString());
      localStorage.setItem('calligraphy_titleOffsetY', titleOffsetY.toString());
    }
  }, [
    isClient,
    text,
    selectedFont,
    textColor,
    bgColor,
    textSize,
    spacing,
    letterSpacing,
    alignment,
    direction,
    template,
    showSignature,
    signatureText,
    signatureSize,
    signatureOffsetX,
    signatureOffsetY,
    showTitle,
    titleText,
    titleSize,
    titleOffsetX,
    titleOffsetY
  ]);

  // 获取 SVG 尺寸
  const svgDimensions = React.useMemo(() => {
    return direction === 'vertical' 
      ? { width: 300, height: 400 }
      : { width: 400, height: 300 };
  }, [direction]);

  // 修改字体加载函数
  const loadFont = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('加载字体失败:', error);
      return '';
    }
  };

  // 将文本分割成句子
  const sentences = React.useMemo(() => {
    return text.split('\n').filter((s: string) => s.trim());
  }, [text]);

  // 处理文本变化
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // 修改获取文字位置的函数
  const getTextPosition = (index: number, totalSentences: number) => {
    const totalSpace = (totalSentences - 1) * spacing;
    
    if (direction === 'vertical') {
      // 竖排布局
      switch (alignment) {
        case 'left':
          return { x: 80 + (index * spacing), y: 60 };
        case 'right':
          return { x: (220 - totalSpace) + (index * spacing), y: 60 };
        case 'center':
          const startX = 150 + (totalSpace / 2);
          return { x: startX - (index * spacing), y: 60 };
      }
    } else {
      // 横排布局
      switch (alignment) {
        case 'left':
          return { x: 60, y: 80 + (index * spacing) };
        case 'right':
          return { x: 60, y: (220 - totalSpace) + (index * spacing) };
        case 'center':
          const startY = 150 + (totalSpace / 2);
          return { x: 60, y: startY - (index * spacing) };
      }
    }
  };

  // 添加模版渲染函数
  const renderTemplate = () => {
    switch (template) {
      case 'cloud':
        return (
          <>
            {/* 左下角的云纹 */}
            <path
              d="M20,40 Q40,20 60,40 T100,40 T140,40"
              fill="none" 
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform={`translate(0,${svgDimensions.height - 80})`}
            />
            <path
              d="M30,50 Q50,30 70,50 T110,50 T150,50" 
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform={`translate(0,${svgDimensions.height - 90})`}
            />

            {/* 右上角的云纹 */}
            <path
              d="M20,40 Q40,20 60,40 T100,40 T140,40"
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform="translate(160,20)"
            />
            <path
              d="M30,50 Q50,30 70,50 T110,50 T150,50"
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform="translate(160,10)"
            />

            {/* 中间装饰性的小云纹 */}
            <path
              d="M20,40 Q35,25 50,40 T80,40"
              fill="none"
              stroke={textColor}
              strokeWidth="1"
              strokeOpacity="0.15"
              transform="translate(100,200) scale(0.7)"
            />
          </>
        );
      
      case 'mountain':
        return (
          <>
            {/* 远山 */}
            <path
              d="M20,40 C30,35 40,20 60,25 C80,30 90,40 110,35 C130,30 140,20 160,30"
              fill="none"
              stroke={textColor} 
              strokeWidth="1"
              strokeOpacity="0.1"
              transform={`translate(${svgDimensions.width - 160},20) scale(0.8)`}
            />
            
            {/* 近山 */}
            <path
              d="M10,50 C30,30 50,45 70,25 C90,5 110,30 130,20 C150,10 170,30 190,25"
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform={`translate(-10,${svgDimensions.height - 60})`}
            />

            {/* 瀑布 */}
            <path
              d="M100,20 C95,40 105,60 100,80 C95,100 105,120 100,140"
              fill="none"
              stroke={textColor}
              strokeWidth="1"
              strokeOpacity="0.15"
              transform={`translate(${svgDimensions.width - 140},40)`}
            />

<path
              d="M100,20 C95,40 105,60 100,80 C95,100 105,120 100,140"
              fill="none"
              stroke={textColor}
              strokeWidth="1"
              strokeOpacity="0.15"
              transform={`translate(${svgDimensions.width - 110},40) scale(0.8)`}
            />

            {/* 树木 */}
            <path
              d="M0,0 C5,-10 15,-10 20,0 M10,-5 L10,10"
              fill="none"
              stroke={textColor}
              strokeWidth="1"
              strokeOpacity="0.2"
              transform="translate(40,100) scale(0.8)"
            />
            
            <path
              d="M0,0 C5,-10 15,-10 20,0 M10,-5 L10,10"
              fill="none"
              stroke={textColor}
              strokeWidth="1"
              strokeOpacity="0.2"
              transform={`translate(${svgDimensions.width - 90},70) scale(0.6)`}
            />
          </>
        );
      
      case 'bamboo':
        return (
          <>
            <line
              x1="30" y1="30" x2="30" y2={svgDimensions.height - 30}
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
            />
            <line
              x1={svgDimensions.width - 30} y1="30" 
              x2={svgDimensions.width - 30} y2={svgDimensions.height - 30}
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
            />
            {[40, 80, 120].map((y, i) => (
              <React.Fragment key={i}>
                <path
                  d="M25,0 Q30,-5 35,0"
                  fill="none"
                  stroke={textColor}
                  strokeWidth="1.5"
                  strokeOpacity="0.2"
                  transform={`translate(0,${y})`}
                />
                <path
                  d="M25,0 Q30,-5 35,0"
                  fill="none"
                  stroke={textColor}
                  strokeWidth="1.5"
                  strokeOpacity="0.2"
                  transform={`translate(${svgDimensions.width - 60},${y})`}
                />
              </React.Fragment>
            ))}
          </>
        );

      default: // simple
        return (
          <>
            <rect 
              x="20" y="20"
              width={svgDimensions.width - 40}
              height={svgDimensions.height - 40}
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              rx="4"
            />
            <circle cx="40" cy="40" r="3" fill={textColor} opacity="0.2" />
            <circle cx={svgDimensions.width - 40} cy="40" r="3" fill={textColor} opacity="0.2" />
            <circle cx="40" cy={svgDimensions.height - 40} r="3" fill={textColor} opacity="0.2" />
            <circle cx={svgDimensions.width - 40} cy={svgDimensions.height - 40} r="3" fill={textColor} opacity="0.2" />
          </>
        );
    }
  };

  // 修改导出功能
  const handlePrint = async () => {
    const svg = document.getElementById('calligraphy');
    if (!svg) return;

    try {
      // 在导出前加载字体并等待加载完成
      let fontDataBlob = fontData[fontPaths[selectedFont]];
      if (!fontDataBlob) {
        fontDataBlob = await loadFont(fontPaths[selectedFont]);
        setFontData(prev => ({
          ...prev,
          [fontPaths[selectedFont]]: fontDataBlob
        }));
      }

      // 创建并加载字体
      const tempFont = new FontFace(selectedFont, `url(${fontDataBlob})`);
      await tempFont.load();
      document.fonts.add(tempFont);

      // 确保字体已经完全加载并可用
      await document.fonts.ready;
      
      // 额外检查字体是否已加载
      const fontLoaded = await document.fonts.check(`1em "${selectedFont}"`);
      if (!fontLoaded) {
        throw new Error('字体加载失败');
      }

      // 增加等待时间以确保字体渲染完成
    //   await new Promise(resolve => setTimeout(resolve, 100));

      // 获取SVG的实际尺寸
      const width = svg.clientWidth * 4;
      const height = svg.clientHeight * 4;

      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <style>
            @font-face {
              font-family: '${selectedFont}';
              src: url('${fontDataBlob}') format('opentype');
            }
            @media print {
              body { margin: 0; }
              svg { page-break-inside: avoid; }
            }
          </style>
          <g transform="scale(4)">
            ${svg.innerHTML}
          </g>
        </svg>
      `;

      const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob);

      const img = new Image();
      const loadImagePromise = new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建canvas上下文'));
            return;
          }

          ctx.font = `1em "${selectedFont}"`;
          ctx.drawImage(img, 0, 0);
          setPreviewUrl(canvas.toDataURL('image/png'));
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = url;
      });

      await loadImagePromise;

    } catch (error) {
      console.error('生成预览图片时出错:', error);
      alert('生成预览图片失败，请重试');
    }
  };

  // 修改确认导出为确认打印
  const handleConfirmPrint = () => {
    if (!previewUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>书法作品打印预览</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; }
                img { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <img src="${previewUrl}" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setPreviewUrl(null);
      }, 250);
    }
  };

  // 添加主题切换函数
  const handleThemeChange = (theme: { text: string; bg: string }) => {
    setTextColor(theme.text);
    setBackgroundColor(theme.bg);
  };

  // 添加移动端检测
  const [isMobile, setIsMobile] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);

  // 检测设备类型
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 添加下载处理函数
  const handleDownload = () => {
    if (!previewUrl) return;
    
    const link = document.createElement('a');
    link.download = `书法作品_${new Date().toLocaleDateString('zh-CN')}.png`;
    link.href = previewUrl;
    link.click();
  };
  // 添加控制面板高度的状态
  const [panelHeight, setPanelHeight] = React.useState(40);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(0);
  const dragStartHeight = React.useRef(0);

  // 处理拖动开始
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // 防止默认行为
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = panelHeight;
  };

  // 处理拖动过程
  const handleDrag = React.useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault(); // 防止默认行为
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const delta = dragStartY.current - clientY;
    const windowHeight = window.innerHeight;
    const newHeight = Math.min(Math.max(dragStartHeight.current + (delta / windowHeight) * 100, 30), 90);
    
    setPanelHeight(newHeight);
  }, [isDragging]);

  // 处理拖动结束
  const handleDragEnd = (e: MouseEvent | TouchEvent) => {
    e.preventDefault(); // 防止默认行为
    setIsDragging(false);
  };

  // 添加拖动事件监听
  React.useEffect(() => {
    const handleDragWithPrevent = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); // 防止默认行为
      handleDrag(e);
    };

    const handleDragEndWithPrevent = (e: MouseEvent | TouchEvent) => {
      e.preventDefault(); // 防止默认行为
      handleDragEnd(e);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragWithPrevent, { passive: false });
      window.addEventListener('touchmove', handleDragWithPrevent, { passive: false });
      window.addEventListener('mouseup', handleDragEndWithPrevent);
      window.addEventListener('touchend', handleDragEndWithPrevent);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragWithPrevent);
      window.removeEventListener('touchmove', handleDragWithPrevent);
      window.removeEventListener('mouseup', handleDragEndWithPrevent);
      window.removeEventListener('touchend', handleDragEndWithPrevent);
    };
  }, [isDragging, handleDrag]);

  // 添加拖拽相关状态
  const [isDraggingTitle, setIsDraggingTitle] = React.useState(false);
  const [isDraggingSignature, setIsDraggingSignature] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragStartPos = React.useRef({ x: 0, y: 0 });
  const elementStartPos = React.useRef({ x: 0, y: 0 });

  // 处理拖拽开始
  const handleElementDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    type: 'title' | 'signature'
  ) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = type === 'title' 
      ? { x: titleOffsetX, y: titleOffsetY }
      : { x: signatureOffsetX, y: signatureOffsetY };
    
    if (type === 'title') {
      setIsDraggingTitle(true);
    } else {
      setIsDraggingSignature(true);
    }
  };

  // 处理拖拽过程
  const handleElementDrag = React.useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingTitle && !isDraggingSignature) return;
    if (!svgRef.current) return;

    e.preventDefault();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

    const svgRect = svgRef.current.getBoundingClientRect();
    const scale = svgDimensions.width / svgRect.width;
    
    const deltaX = (clientX - dragStartPos.current.x) * scale;
    const deltaY = (clientY - dragStartPos.current.y) * scale;

    if (isDraggingTitle) {
      setTitleOffsetX(elementStartPos.current.x + deltaX);
      setTitleOffsetY(elementStartPos.current.y + deltaY);
    } else {
      setSignatureOffsetX(elementStartPos.current.x + deltaX);
      setSignatureOffsetY(elementStartPos.current.y + deltaY);
    }
  }, [isDraggingTitle, isDraggingSignature, svgDimensions.width]);

  // 处理拖拽结束
  const handleElementDragEnd = () => {
    setIsDraggingTitle(false);
    setIsDraggingSignature(false);
  };

  // 添加拖拽事件监听
  React.useEffect(() => {
    if (isDraggingTitle || isDraggingSignature) {
      window.addEventListener('mousemove', handleElementDrag);
      window.addEventListener('touchmove', handleElementDrag);
      window.addEventListener('mouseup', handleElementDragEnd);
      window.addEventListener('touchend', handleElementDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleElementDrag);
      window.removeEventListener('touchmove', handleElementDrag);
      window.removeEventListener('mouseup', handleElementDragEnd);
      window.removeEventListener('touchend', handleElementDragEnd);
    };
  }, [isDraggingTitle, isDraggingSignature, handleElementDrag]);

  // 添加微信 JS-SDK 检测函数
  const isWeixinBrowser = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return ua.indexOf('micromessenger') !== -1;
  }, []);

  // 只在客户端渲染时显示内容
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
    </div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <nav className="fixed top-0 left-0 w-full p-4 flex justify-between items-center mb-16 z-10 bg-white/80 backdrop-blur-sm shadow-sm">
        <a href="/" className="text-lg font-bold">返回首页</a>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
          >
            导出图片
          </button>
          
          {/* 移动端显示控制面板切换按钮 - 使用图标 */}
          {isMobile && (
            <button
              onClick={() => setShowControls(!showControls)}
              className={`p-2 rounded-full transition-colors duration-200 ${
                showControls ? 'bg-gray-200' : 'bg-gray-100'
              }`}
              aria-label={showControls ? '隐藏设置' : '显示设置'}
            >
              {showControls ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </nav>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row gap-8'} h-[calc(100vh-120px)] mt-16`}>
        {/* 控制面板 - 移动端时可拖动 */}
        <div 
          className={`
            ${isMobile ? `fixed bottom-0 left-0 right-0 z-20 bg-white shadow-lg rounded-t-2xl transition-transform duration-300` : 'w-80'} 
            ${isMobile && !showControls ? 'translate-y-full' : 'translate-y-0'}
            overflow-y-auto
            ${isMobile ? 'p-4 pt-0' : 'pr-4'}
            space-y-4
          `}
          style={isMobile ? {
            maxHeight: `${panelHeight}vh`,
            touchAction: isDragging ? 'none' : 'auto'
          } : undefined}
        >
          {/* 可拖动的手柄 */}
          {isMobile && (
            <div 
              className={`sticky top-0 pt-4 pb-2 bg-white z-10 flex justify-center w-full cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div 
                className={`w-24 h-4 bg-gray-300 rounded-full`}
              />
            </div>
          )}
          
          {/* 现有的控制面板内容 */}
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="请输入书法文本..."
            className="w-full h-20 p-3 rounded-lg border border-gray-200 resize-none"
          />

        <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200"
          >
            {FONTS.map(font => (
              <option key={font.id} value={font.id}>
                {font.name}
              </option>
            ))}
          </select>
          



<div className="space-y-2">
            <label className="text-sm text-gray-600">字体大小: {textSize}px</label>
            <input
              type="range"
              min="20"
              max="60"
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-600">行间距: {spacing}px</label>
            <input
              type="range"
              min="40"
              max="100"
              value={spacing}
              onChange={(e) => setSpacing(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-600">字间距: {letterSpacing.toFixed(2)}em</label>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.01"
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* 在控制面板中添加称谓控制，放在落款控制之前 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">显示称谓</label>
              <input
                type="checkbox"
                checked={showTitle}
                onChange={(e) => setShowTitle(e.target.checked)}
                className="rounded"
              />
            </div>
            
            {showTitle && (
              <>
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  placeholder="请输入称谓文字"
                  className="w-full p-2 rounded-lg border border-gray-200"
                />
                
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">称谓字号: {titleSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={titleSize}
                    onChange={(e) => setTitleSize(Number(e.target.value))}
                    className="w-full"
                  />
                <span className="text-xs text-gray-400">拖动图中文字调整位置</span>
                </div>
              </>
            )}
          </div>
          {/* 添加落款控制 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">显示落款</label>
              <input
                type="checkbox"
                checked={showSignature}
                onChange={(e) => setShowSignature(e.target.checked)}
                className="rounded"
              />
            </div>
            {showSignature && (
              <>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)} 
                  placeholder="输入自定义落款"
                  className="w-full p-2 mt-2 rounded-lg border border-gray-200"
                />
                
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">落款字号: {signatureSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={signatureSize}
                    onChange={(e) => setSignatureSize(Number(e.target.value))}
                    className="w-full"
                  />
                 <span className="text-xs text-gray-400">拖动图中文字调整位置</span>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-4">
            <div>
              <label className="text-sm text-gray-600">文字颜色</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="block w-full h-8 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">背景颜色</label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="block w-full h-8 mt-1"
              />
            </div>
          </div>
          
          {/* 添加颜色主题选择器 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">快捷配色</label>
            <div className="grid grid-cols-2 gap-2">
              {colorThemes.map((theme) => {
                // 判断当前主题是否被选中
                const isSelected = theme.text === textColor && theme.bg === bgColor;
                
                return (
                  <button
                    key={theme.name}
                    onClick={() => handleThemeChange(theme)}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg 
                      ${isSelected 
                        ? 'border border-blue-500 bg-blue-50' 
                        : 'border border-gray-200 hover:bg-gray-50'
                      }
                      transition-all duration-200
                    `}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded border border-gray-200 overflow-hidden">
                      <div
                        style={{
                          width: '100%',
                          height: '50%',
                          backgroundColor: theme.text
                        }}
                      />
                      <div
                        style={{
                          width: '100%',
                          height: '50%',
                          backgroundColor: theme.bg
                        }}
                      />
                    </div>
                    <span className={`text-sm ${isSelected ? 'font-medium text-blue-600' : ''}`}>
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-600">排版对齐</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAlignment('left')}
                className={`flex-1 py-2 px-4 rounded-lg ${
                  alignment === 'left' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {direction === 'vertical' ? '靠左': '靠上'}
              </button>
              <button
                onClick={() => setAlignment('center')}
                className={`flex-1 py-2 px-4 rounded-lg ${
                  alignment === 'center' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                居中
              </button>
              <button
                onClick={() => setAlignment('right')}
                className={`flex-1 py-2 px-4 rounded-lg ${
                  alignment === 'right' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {direction === 'vertical' ? '靠右' : '靠下'}
              </button>
            </div>
          </div>

          {/* 添加文字方向控制 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">文字方向</label>
            <div className="flex gap-2">
              <button
                onClick={() => setDirection('vertical')}
                className={`flex-1 py-2 px-4 rounded-lg ${
                  direction === 'vertical' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                竖排
              </button>
              <button
                onClick={() => setDirection('horizontal')}
                className={`flex-1 py-2 px-4 rounded-lg ${
                  direction === 'horizontal' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                横排
              </button>
            </div>
          </div>

          {/* 添加模版选择器 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">边框样式</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTemplate('simple')}
                className={`py-2 px-4 rounded-lg ${
                  template === 'simple' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                简约
              </button>
              <button
                onClick={() => setTemplate('cloud')}
                className={`py-2 px-4 rounded-lg ${
                  template === 'cloud' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                云纹
              </button>
              <button
                onClick={() => setTemplate('mountain')}
                className={`py-2 px-4 rounded-lg ${
                  template === 'mountain' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                山水
              </button>
              <button
                onClick={() => setTemplate('bamboo')}
                className={`py-2 px-4 rounded-lg ${
                  template === 'bamboo' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                竹简
              </button>
            </div>
          </div>
        </div>

        {/* 预览区域 */}
        <div className={`
          flex flex-col items-center justify-center 
          ${isMobile ? 'mb-[70vh]' : 'sticky top-0'} 
          h-fit
        `}>
          <svg 
            ref={svgRef}
            id="calligraphy"
            width={svgDimensions.width} 
            height={svgDimensions.height} 
            viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
            className={`rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm ${isMobile ? 'max-w-full h-auto' : ''}`}
          >
            <defs>
              <style type="text/css">
                {`
                  @font-face {
                    font-family: "${selectedFont}";
                    src: url("${fontPaths[selectedFont]}") format("opentype");
                  }
                `}
              </style>
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: bgColor }} />
                <stop offset="100%" style={{ stopColor: bgColor }} />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width={svgDimensions.width} height={svgDimensions.height} fill="url(#bgGradient)" />
            
            {/* 使用模版渲染函数 */}
            {renderTemplate()}
            
            {/* 在 SVG 中添加称谓渲染，放在主文本渲染之前 */}
            {showTitle && (
              <g
                onMouseDown={(e) => handleElementDragStart(e, 'title')}
                onTouchStart={(e) => handleElementDragStart(e, 'title')}
                style={{ cursor: 'move' }}
              >
                <text
                  x={direction === 'vertical' 
                    ? svgDimensions.width - 50 + titleOffsetX
                    : 60 + titleOffsetX}
                  y={direction === 'vertical'
                    ? 60 + titleOffsetY
                    : 60 + titleOffsetY}
                  style={{
                    fontSize: `${titleSize}px`,
                    fontFamily: `"${selectedFont}", cursive`,
                    fill: textColor,
                    opacity: isDraggingTitle ? 0.7 : 0.85,
                    writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                    textAnchor: direction === 'vertical' ? 'start' : 'start',
                    dominantBaseline: direction === 'vertical' ? 'hanging' : 'hanging',
                    userSelect: 'none'
                  }}
                >
                  {titleText}
                </text>
              </g>
            )}
            
            {/* 更新文字渲染 */}
            {sentences.map((sentence: string, index: number) => {
              const pos = getTextPosition(index, sentences.length);
              return (
                <text 
                  key={index}
                  x={pos.x}
                  y={pos.y}
                  style={{
                    fontSize: `${textSize}px`,
                    fontFamily: `"${selectedFont}", cursive`,
                    writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                    dominantBaseline: 'middle',
                    letterSpacing: `${letterSpacing}em`,
                    fill: textColor
                  }}
                >
                  {sentence}
                </text>
              );
            })}

            {showSignature && (
              <g
                onMouseDown={(e) => handleElementDragStart(e, 'signature')}
                onTouchStart={(e) => handleElementDragStart(e, 'signature')}
                style={{ cursor: 'move' }}
              >
                <text
                  x={direction === 'vertical' 
                    ? 60 + signatureOffsetX 
                    : svgDimensions.width - 60 + signatureOffsetX}
                  y={direction === 'vertical' 
                    ? svgDimensions.height - 128 + signatureOffsetY 
                    : svgDimensions.height - 60 + signatureOffsetY}
                  style={{
                    fontSize: `${signatureSize}px`,
                    fontFamily: `"${selectedFont}", cursive`,
                    fill: textColor,
                    opacity: isDraggingSignature ? 0.7 : 0.85,
                    writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                    textAnchor: direction === 'vertical' ? 'start' : 'end',
                    dominantBaseline: 'auto',
                    userSelect: 'none'
                  }}
                >
                  {signatureText}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 预览对话框 - 调整移动端样式 */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-xl w-[95vw] md:w-fit max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">预览图片</h3>
            <div className="overflow-auto">
              <img 
                src={previewUrl} 
                alt="预览" 
                className={`w-full md:w-[300px] h-auto object-contain ${isWeixinBrowser ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isWeixinBrowser && typeof wx !== 'undefined') {
                    // 调用微信图片预览
                    wx.previewImage({
                      current: previewUrl,
                      urls: [previewUrl]
                    });
                  }
                }}
              />
              {isWeixinBrowser && (
                <div className="text-sm text-gray-500 mt-2 text-center">
                  点击图片可在微信中预览
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
              >
                下载
              </button>
              {!isWeixinBrowser && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                <button
                  onClick={handleConfirmPrint}
                  className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                >
                  打印
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChineseCalligraphy;