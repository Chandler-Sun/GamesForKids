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
  // 添加文本状态
  const [text, setText] = React.useState("取法于上，仅得为中。\n取法于中，故为其下。");

  // 添加预览状态
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // 添加字体状态
  const [fontData, setFontData] = React.useState<{[key: string]: string}>({});
  
  // 添加新的状态
  const [selectedFont, setSelectedFont] = React.useState('Chun Qiu ChenFeng');
  const [textColor, setTextColor] = React.useState('#333333');
  const [bgColor, setBackgroundColor] = React.useState('#ffffff');
  const [textSize, setTextSize] = React.useState(30);
  const [spacing, setSpacing] = React.useState(60);

  // 添加字间距状态
  const [letterSpacing, setLetterSpacing] = React.useState(-0.25);

  // 添加对齐方式状态
  const [alignment, setAlignment] = React.useState<'left' | 'center' | 'right'>('center');

  // 添加文字方向状态
  const [direction, setDirection] = React.useState<'vertical' | 'horizontal'>('vertical');

  // 添加模版状态
  const [template, setTemplate] = React.useState<'simple' | 'cloud' | 'mountain' | 'bamboo'>('simple');

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
    return text.split('\n').filter(s => s.trim());
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
            <path
              d="M20,40 Q40,20 60,40 Q80,60 100,40"
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform={`translate(0,${svgDimensions.height - 80})`}
            />
            <path
              d="M20,40 Q40,20 60,40 Q80,60 100,40"
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform="translate(200,20)"
            />
          </>
        );
      
      case 'mountain':
        return (
          <>
            <path
              d="M30,40 L60,10 L90,40 L120,10 L150,40"
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform={`translate(0,${svgDimensions.height - 50})`}
            />
            <path
              d="M30,10 L60,40 L90,10 L120,40 L150,10"
              fill="none"
              stroke={textColor}
              strokeWidth="1.5"
              strokeOpacity="0.2"
              transform="translate(100,20)"
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

  // 修改导出图片功能
  const handleExport = () => {
    const svg = document.getElementById('calligraphy');
    if (!svg) return;

    // 获取SVG的实际尺寸
    const width = svg.clientWidth * 2;  // 使用2倍尺寸以获得更清晰的图像
    const height = svg.clientHeight * 2;

    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <style>
          ${Object.entries(fontData).map(([name, data]) => `
            @font-face {
              font-family: '${name}';
              src: url('${data}') format('opentype');
            }
          `).join('\n')}
        </style>
        <g transform="scale(2)">
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

  // 添加确认导出功能
  const handleConfirmExport = () => {
    if (!previewUrl) return;
    
    const link = document.createElement('a');
    link.download = '书法作品.png';
    link.href = previewUrl;
    link.click();
    setPreviewUrl(null);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="flex gap-8">
        <div className="w-80 space-y-4">
          {/* 添加控制面板 */}
          <div className="space-y-2"></div>
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
                靠左
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
                靠右
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

        {/* 更新 SVG 展示区域 */}
        <div className="flex flex-col items-center">
          <svg 
            id="calligraphy"
            width={svgDimensions.width} 
            height={svgDimensions.height} 
            viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`} 
            className="rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm"
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
            {sentences.map((sentence, index) => {
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
          </svg>
          {/* 修改导出按钮文字 */}
            <button
                onClick={handleExport}
                className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 shadow-md"
            >
                预览并导出
            </button>
        </div>
      </div>

      {/* 修改预览对话框样式 */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-fit">
            <h3 className="text-lg font-semibold mb-4">预览图片</h3>
            <div className="overflow-auto max-h-[80vh]">
              <img 
                src={previewUrl} 
                alt="预览" 
                style={{
                  width: '300px',  // 与原始SVG宽度相同
                  height: '400px', // 与原始SVG高度相同
                  objectFit: 'contain'
                }} 
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
                onClick={handleConfirmExport}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChineseCalligraphy;