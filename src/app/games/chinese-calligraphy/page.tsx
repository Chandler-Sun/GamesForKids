"use client"

import React from 'react';
import './page.module.css';

// 添加字体加载函数
const loadFont = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const ChineseCalligraphy = () => {
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
    { name: '赛博朋克', text: '#00ff9f', bg: '#1a1a2e' },
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

  // 添加检查浏览器环境的函数
  const getLocalStorage = (key: string, defaultValue: any) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      return stored !== null ? stored : defaultValue;
    }
    return defaultValue;
  };

  // 修改所有使用 localStorage 的状态初始化
  const [text, setText] = React.useState(() => 
    getLocalStorage('calligraphy_text', "取法于上，仅得为中。\n取法于中，故为其下。")
  );
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fontData, setFontData] = React.useState<{[key: string]: string}>({});
  
  const [selectedFont, setSelectedFont] = React.useState(() =>
    getLocalStorage('calligraphy_font', 'Chun Qiu ChenFeng')
  );
  const [textColor, setTextColor] = React.useState(() =>
    getLocalStorage('calligraphy_textColor', '#333333')
  );
  const [bgColor, setBackgroundColor] = React.useState(() =>
    getLocalStorage('calligraphy_bgColor', '#ffffff')
  );
  const [textSize, setTextSize] = React.useState(() =>
    parseInt(getLocalStorage('calligraphy_textSize', '30'))
  );
  const [spacing, setSpacing] = React.useState(() =>
    parseInt(getLocalStorage('calligraphy_spacing', '60'))
  );
  const [letterSpacing, setLetterSpacing] = React.useState(() =>
    parseFloat(getLocalStorage('calligraphy_letterSpacing', '-0.25'))
  );
  const [alignment, setAlignment] = React.useState<'left' | 'center' | 'right'>(() =>
    getLocalStorage('calligraphy_alignment', 'center') as 'left' | 'center' | 'right'
  );
  const [direction, setDirection] = React.useState<'vertical' | 'horizontal'>(() =>
    getLocalStorage('calligraphy_direction', 'vertical') as 'vertical' | 'horizontal'
  );
  const [template, setTemplate] = React.useState<'simple' | 'cloud' | 'mountain' | 'bamboo' | 'newyear'>(() =>
    getLocalStorage('calligraphy_template', 'simple') as 'simple' | 'cloud' | 'mountain' | 'bamboo' | 'newyear'
  );
  const [showSignature, setShowSignature] = React.useState(() =>
    getLocalStorage('calligraphy_showSignature', 'false') === 'true'
  );
  const [signatureText, setSignatureText] = React.useState(() =>
    getLocalStorage('calligraphy_signatureText', '某日偶感')
  );
  const [signatureSize, setSignatureSize] = React.useState(() =>
    parseInt(getLocalStorage('calligraphy_signatureSize', '16'))
  );
  const [signatureOffsetX, setSignatureOffsetX] = React.useState(() =>
    parseInt(getLocalStorage('calligraphy_signatureOffsetX', '0'))
  );
  const [signatureOffsetY, setSignatureOffsetY] = React.useState(() =>
    parseInt(getLocalStorage('calligraphy_signatureOffsetY', '0'))
  );

  // 修改保存设置的 Effect
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
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
  }, [text, selectedFont, textColor, bgColor, textSize, spacing, letterSpacing, alignment, direction, template, showSignature, signatureText, signatureSize, signatureOffsetX, signatureOffsetY]);

  // 获取 SVG 尺寸
  const svgDimensions = React.useMemo(() => {
    return direction === 'vertical' 
      ? { width: 300, height: 400 }
      : { width: 400, height: 300 };
  }, [direction]);

  // 加载字体文件
  React.useEffect(() => {
    const loadFonts = async () => {
      try {
        const fonts = {
          'Chun Qiu QiuHong': '/fonts/ChillCalligraphyChunQiu_QiuHong.otf',
          'Chun Qiu ChenFeng': '/fonts/ChillCalligraphyChunQiu_ChenFeng.otf',
          'Long Chang': '/fonts/ChillLongCangKaiShu_Medium.otf'
        };
        
        const loadedFonts: {[key: string]: string} = {};
        for (const [name, path] of Object.entries(fonts)) {
          loadedFonts[name] = await loadFont(path);
        }
        setFontData(loadedFonts);
      } catch (error) {
        console.error('加载字体失败:', error);
      }
    };
    
    loadFonts();
  }, []);

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
              transform="translate(120,20) scale(0.8)"
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
              transform="translate(140,40)"
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
              transform="translate(240,80) scale(0.6)"
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

  // 修改导出功能为打印功能
  const handlePrint = () => {
    const svg = document.getElementById('calligraphy');
    if (!svg) return;

    // 获取SVG的实际尺寸
    const width = svg.clientWidth * 4;  // 使用2倍尺寸以获得更清晰的图像
    const height = svg.clientHeight * 4;

    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <style>
          ${Object.entries(fontData).map(([name, data]) => `
            @font-face {
              font-family: '${name}';
              src: url('${data}') format('opentype');
            }
          `).join('\n')}
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
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      setPreviewUrl(canvas.toDataURL('image/png'));
    };
    img.src = url;
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

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <nav className="fixed top-0 left-0 w-full p-4 flex justify-between items-center mb-16 z-10">
        <a href="/" className="text-lg font-bold">返回首页</a>
        {/* 移动端显示控制面板切换按钮 */}
        {isMobile && (
          <button
            onClick={() => setShowControls(!showControls)}
            className="px-4 py-2 bg-gray-800 text-white rounded-md"
          >
            {showControls ? '隐藏控制' : '显示控制'}
          </button>
        )}
      </nav>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row gap-8'} h-[calc(100vh-120px)] mt-16`}>
        {/* 控制面板 - 移动端时可折叠 */}
        <div 
          className={`
            ${isMobile ? 'fixed bottom-0 left-0 right-0 z-20 bg-white shadow-lg rounded-t-2xl transition-transform duration-300' : 'w-80'} 
            ${isMobile && !showControls ? 'translate-y-full' : 'translate-y-0'}
            overflow-y-auto
            ${isMobile ? 'max-h-[70vh] p-4' : 'pr-4'}
            space-y-4
          `}
        >
          {/* 移动端添加拖动条 */}
          {isMobile && (
            <div className="w-16 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          )}
          
          {/* 现有的控制面板内容 */}
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="请输入书法文本..."
            className="w-full h-32 p-3 rounded-lg border border-gray-200 resize-none"
          />
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-200"
          >
            <option value="Chun Qiu ChenFeng">乘风</option>
            <option value="Chun Qiu QiuHong">秋鸿</option>
            <option value="Long Chang">龙藏</option>
          </select>
          
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
              {colorThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(theme)}
                  className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
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
                  <span className="text-sm">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-600">字体大小: {textSize}px</label>
            <input
              type="range"
              min="20"
              max="50"
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
                <select
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-200"
                >
                  {signatureTexts.map((text) => (
                    <option key={text} value={text}>{text}</option>
                  ))}
                </select>
                
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
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-600">
                    水平偏移: {signatureOffsetX}px
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={signatureOffsetX}
                    onChange={(e) => setSignatureOffsetX(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">
                    垂直偏移: {signatureOffsetY}px
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={signatureOffsetY}
                    onChange={(e) => setSignatureOffsetY(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 预览区域 */}
        <div className={`
          flex flex-col items-center justify-center 
          ${isMobile ? 'mb-[70vh]' : 'sticky top-0'} 
          h-fit
        `}>
          <svg 
            id="calligraphy"
            width={svgDimensions.width} 
            height={svgDimensions.height} 
            viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`} 
            className={`
              rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm
              ${isMobile ? 'max-w-full h-auto' : ''}
            `}
          >
            <defs>
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: bgColor }} />
                <stop offset="100%" style={{ stopColor: bgColor }} />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width={svgDimensions.width} height={svgDimensions.height} fill="url(#bgGradient)" />
            
            {/* 使用模版渲染函数 */}
            {renderTemplate()}
            
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
              <text
                x={direction === 'vertical' 
                  ? 60 + signatureOffsetX 
                  : svgDimensions.width - 60 + signatureOffsetX}
                y={direction === 'vertical' 
                  ? svgDimensions.height - 100 + signatureOffsetY 
                  : svgDimensions.height - 60 + signatureOffsetY}
                style={{
                  fontSize: `${signatureSize}px`,
                  fontFamily: `"${selectedFont}", cursive`,
                  fill: textColor,
                  opacity: 0.85,
                  writingMode: direction === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                  textAnchor: direction === 'vertical' ? 'start' : 'end',
                  dominantBaseline: 'auto'
                }}
              >
                {signatureText}
              </text>
            )}
          </svg>
          
          <button
            onClick={handlePrint}
            className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 shadow-md"
          >
            导出图片
          </button>
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
                className="w-full md:w-[300px] h-auto object-contain"
              />
            </div>
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPrint}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
              >
                打印
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChineseCalligraphy;