"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './page.module.css';

interface Letter {
  id: number;
  char: string;
  x: number;
  y: number;
  speed: number;
  rotation: number;
  scale: number;
  glow: number;
}

interface Spaceship {
  x: number;
  y: number;
  rotation: number;
  engineGlow: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
  }>;
}

export default function SpaceLetterShooter() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [spaceship, setSpaceship] = useState<Spaceship>({ x: 50, y: 90, rotation: 0, engineGlow: 0 });
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [spawnRate, setSpawnRate] = useState(3000);
  const [letterSpeed, setLetterSpeed] = useState(0.5);
  const [speedMultiplier, setSpeedMultiplier] = useState(0.8);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const spawnRateRef = useRef<number>(spawnRate);
  const letterSpeedRef = useRef<number>(letterSpeed);
  const speedMultiplierRef = useRef<number>(speedMultiplier);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // 更新 ref 值
  useEffect(() => {
    spawnRateRef.current = spawnRate;
  }, [spawnRate]);

  useEffect(() => {
    letterSpeedRef.current = letterSpeed;
  }, [letterSpeed]);

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  // 初始化游戏
  useEffect(() => {
    const storedHighScore = localStorage.getItem('spaceLetterHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
  }, []);

  // 生成随机字母
  const generateLetter = useCallback((): Letter => {
    const char = alphabet[Math.floor(Math.random() * alphabet.length)];
    const x = Math.random() * 80 + 10; // 10% 到 90% 的宽度
    const speed = (letterSpeedRef.current + Math.random() * 0.5) * speedMultiplierRef.current;
    
    return {
      id: Date.now() + Math.random(),
      char,
      x,
      y: -10,
      speed,
      rotation: Math.random() * 360,
      scale: 0.8 + Math.random() * 0.4,
      glow: Math.random() * 0.5 + 0.5,
    };
  }, [alphabet]);

  // 创建爆炸效果
  const createExplosion = useCallback((x: number, y: number) => {
    const particles = Array.from({ length: 15 }, () => ({
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1
    }));

    setExplosions(prev => [...prev, {
      id: Date.now() + Math.random(),
      x,
      y,
      particles
    }]);
  }, []);

  // 游戏主循环
  const gameLoop = useCallback(() => {
    if (!gameStarted || gameOver) return;

    const now = Date.now();

    // 生成新字母（在setLetters外部处理）
    if (now - lastSpawnRef.current > spawnRateRef.current) {
      const newLetter = generateLetter();
      setLetters(prevLetters => [...prevLetters, newLetter]);
      lastSpawnRef.current = now;
    }

    setLetters(currentLetters => {
      let workingLetters = [...currentLetters];
      const processedKeys = new Set<string>();

      // 1. 处理击中
      keysPressedRef.current.forEach(key => {
        const pressedKey = key.toUpperCase();
        const hittableLetterIndex = workingLetters.findIndex(letter => letter.char === pressedKey);

        if (hittableLetterIndex !== -1) {
          const pressedLetter = workingLetters[hittableLetterIndex];

          // 移除击中的字母
          workingLetters.splice(hittableLetterIndex, 1);
          
          const baseScore = 10;
          setCombo(prevCombo => {
            const newCombo = prevCombo + 1;
            const comboBonus = Math.floor(prevCombo / 5) * 5;
            const totalScore = baseScore + comboBonus;

            setScore(prevScore => {
              const newScore = prevScore + totalScore;
              const newHighScore = Math.max(highScore, newScore);
              setHighScore(newHighScore);
              localStorage.setItem('spaceLetterHighScore', newHighScore.toString());

              if (newScore > 0 && newScore % 100 === 0) {
                setLevel(prevLevel => {
                  const nextLevel = prevLevel + 1;
                  setSpawnRate(prev => Math.max(500, prev - 100));
                  setLetterSpeed(prev => prev + 0.2);
                  toast.info(`升级到第 ${nextLevel} 级！字母下落速度加快！`);
                  return nextLevel;
                });
              }
              return newScore;
            });

            setMaxCombo(prevMax => Math.max(prevMax, newCombo));
            
            const comboText = newCombo > 1 ? ` (连击 x${newCombo})` : '';
            toast.success(`击中字母 ${pressedLetter.char}！+${totalScore}分${comboText}`);
            
            confetti({
              particleCount: 30 + newCombo * 2,
              spread: 30,
              origin: { 
                x: pressedLetter.x / 100, 
                y: (100 - pressedLetter.y) / 100 
              },
              colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57']
            });

            return newCombo;
          });

          createExplosion(pressedLetter.x, pressedLetter.y);
          processedKeys.add(key);
        }
      });

      processedKeys.forEach(key => {
        keysPressedRef.current.delete(key);
      });

      // 2. 移动字母
      let movedLetters = workingLetters.map(letter => ({
        ...letter,
        y: letter.y + letter.speed,
        rotation: letter.rotation + 2,
        scale: letter.scale + Math.sin(now / 500) * 0.05,
        glow: 0.5 + Math.sin(now / 300) * 0.3
      }));

      // 3. 检查错过
      const missedLetters = movedLetters.filter(letter => letter.y >= 85);
      if (missedLetters.length > 0) {
        setLives(prev => {
          const newLives = prev - missedLetters.length;
          if (newLives <= 0) {
            setGameOver(true);
            toast.error('游戏结束！飞船被击中了！');
          } else {
            toast.warning(`错过了 ${missedLetters.length} 个字母！剩余生命：${newLives}`);
          }
          return Math.max(0, newLives);
        });
        setCombo(0);
      }

      // 4. 过滤掉屏幕外的字母
      let finalLetters = movedLetters.filter(letter => letter.y < 85);
      


      return finalLetters;
    });

    // 更新爆炸效果
    setExplosions(prev => 
      prev.map(explosion => ({
        ...explosion,
        particles: explosion.particles.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          life: particle.life - 0.02
        })).filter(particle => particle.life > 0)
      })).filter(explosion => explosion.particles.length > 0)
    );

    // 更新飞船动画
    setSpaceship(prev => ({
      ...prev,
      rotation: Math.sin(now / 1000) * 5,
      engineGlow: Math.sin(now / 200) * 0.5 + 0.5
    }));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, gameOver]);

  // 开始游戏循环
  useEffect(() => {
    if (gameStarted && !gameOver) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameStarted, gameOver]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;
      
      const key = e.key.toUpperCase();
      if (alphabet.includes(key)) {
        keysPressedRef.current.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      keysPressedRef.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver]);

  // 开始游戏
  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setLives(3);
    setLevel(1);
    setCombo(0);
    setMaxCombo(0);
    setLetters([]);
    setExplosions([]);
    setSpaceship({ x: 50, y: 90, rotation: 0, engineGlow: 0 });
    lastSpawnRef.current = Date.now();
    
    // 立即生成第一个字母
    const firstLetter = generateLetter();
    setLetters([firstLetter]);
  };

  // 重新开始游戏
  const restartGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setScore(0);
    setLives(3);
    setLevel(1);
    setCombo(0);
    setMaxCombo(0);
    setLetters([]);
    setExplosions([]);
    setSpaceship({ x: 50, y: 90, rotation: 0, engineGlow: 0 });
  };

  // 清除最高分
  const clearHighScore = () => {
    localStorage.removeItem('spaceLetterHighScore');
    setHighScore(0);
    toast.success('最高分已清除！');
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white relative overflow-hidden">
      {/* 动态背景星星 */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <nav className="fixed top-0 left-0 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 flex justify-between items-center z-50 shadow-lg">
        <a href="/" className="text-base font-bold hover:text-yellow-300 transition-colors">🚀 返回首页</a>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-white text-blue-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
        >
          ⚙️ 选项
        </button>
      </nav>

      {showSettings && (
        <div className="fixed top-12 right-0 w-64 bg-gradient-to-b from-gray-800 to-gray-900 p-4 shadow-xl z-40 rounded-l-lg border-l border-blue-500">
          <div className="mt-4">
            <label htmlFor="difficulty" className="block mb-2 text-blue-300">难度:</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                switch (e.target.value) {
                  case 'easy':
                    setSpawnRate(3000);
                    setLetterSpeed(0.5);
                    break;
                  case 'normal':
                    setSpawnRate(2000);
                    setLetterSpeed(1);
                    break;
                  case 'hard':
                    setSpawnRate(1000);
                    setLetterSpeed(1.5);
                    break;
                }
              }}
              className="w-full p-2 border rounded bg-gray-700 text-white border-blue-500 focus:border-blue-300 focus:outline-none"
            >
              <option value="easy">简单</option>
              <option value="normal">普通</option>
              <option value="hard">困难</option>
            </select>
          </div>
          
          <div className="mt-4">
            <label htmlFor="speedMultiplier" className="block mb-2 text-blue-300">
              速度倍数: {speedMultiplier}x
            </label>
            <input
              type="range"
              id="speedMultiplier"
              min="0.1"
              max="3"
              step="0.1"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.1x</span>
              <span>1x</span>
              <span>3x</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSpeedMultiplier(0.5)}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                慢速
              </button>
              <button
                onClick={() => setSpeedMultiplier(1)}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                正常
              </button>
              <button
                onClick={() => setSpeedMultiplier(2)}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                快速
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <label htmlFor="spawnRate" className="block mb-2 text-blue-300">
              字母生成间隔: {spawnRate}ms
            </label>
            <input
              type="range"
              id="spawnRate"
              min="500"
              max="5000"
              step="100"
              value={spawnRate}
              onChange={(e) => setSpawnRate(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>500ms</span>
              <span>2000ms</span>
              <span>5000ms</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSpawnRate(3000)}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                慢速
              </button>
              <button
                onClick={() => setSpawnRate(2000)}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                正常
              </button>
              <button
                onClick={() => setSpawnRate(1000)}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                快速
              </button>
            </div>
          </div>
          
          <button
            onClick={clearHighScore}
            className="mt-4 bg-red-500 text-white p-2 rounded w-full hover:bg-red-600 transition-colors"
          >
            清除最高分
          </button>
        </div>
      )}

      <div className="flex flex-col h-full pt-12 w-full max-w-full px-2">
        {!gameStarted && !gameOver && (
          <div className="text-center mb-2 bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-3 rounded-xl border border-blue-500/30">
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              🌟 太空飞船打字母 🌟
            </h1>
            <h2 className="text-xl mb-2 text-yellow-300">🎮 游戏说明</h2>
            <div className="space-y-1 text-sm">
              <p className="text-blue-200">✨ 字母会从屏幕顶部掉落</p>
              <p className="text-green-200">🎯 字母一出现就可以击中，无需等待！</p>
              <p className="text-yellow-200">⚡ 连续击中可以获得连击奖励</p>
              <p className="text-red-200">💔 错过字母失去生命</p>
              <p className="text-purple-200">🚀 每100分升一级，难度增加</p>
            </div>
            <p className="mb-2 text-yellow-400 text-sm">💡 点击右上角"选项"可以调节游戏速度</p>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3 rounded-xl text-lg hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg"
            >
              🚀 开始游戏
            </button>
          </div>
        )}

        {gameOver && (
          <div className="text-center mb-2 bg-gradient-to-r from-red-900/50 to-pink-900/50 p-3 rounded-xl border border-red-500/30">
            <h2 className="text-2xl mb-2 text-red-400">💥 游戏结束</h2>
            <div className="space-y-1 text-base">
              <p className="text-yellow-300">最终得分: {score}</p>
              <p className="text-blue-300">最高分: {highScore}</p>
              <p className="text-green-300">最大连击: {maxCombo}</p>
            </div>
            <button
              onClick={restartGame}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-xl text-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg mt-2"
            >
              🔄 重新开始
            </button>
          </div>
        )}

        {(gameStarted || gameOver) && (
          <h1 className="text-2xl font-bold mb-2 text-center bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            🌟 太空飞船打字母 🌟
          </h1>
        )}

        <div className="flex justify-between mb-2 text-sm bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-2 rounded-lg border border-gray-600/30 flex-wrap gap-1">
          <div className="text-green-400">🎯 {score}</div>
          <div className="text-yellow-400">🏆 {highScore}</div>
          <div className="text-red-400">❤️ {lives}</div>
          <div className="text-blue-400">⭐ {level}</div>
          <div className="text-purple-400">⚡ {combo}</div>
          <div className="text-orange-400">📝 {letters.length}</div>
        </div>

        <div 
          ref={gameAreaRef}
          className="relative w-full flex-1 min-h-0 bg-gradient-to-b from-blue-900 via-purple-900 to-black border-2 border-blue-500 rounded-xl overflow-hidden shadow-2xl"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
            `
          }}
        >
          {/* 爆炸效果 */}
          {explosions.map(explosion => (
            <div key={explosion.id} className="absolute" style={{ left: `${explosion.x}%`, top: `${explosion.y}%` }}>
              {explosion.particles.map((particle, index) => (
                <div
                  key={index}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    left: `${particle.x}px`,
                    top: `${particle.y}px`,
                    opacity: particle.life,
                    transform: `scale(${particle.life})`
                  }}
                />
              ))}
            </div>
          ))}

          {/* 掉落的字母 */}
          {letters.map(letter => (
            <div
              key={letter.id}
              className="absolute text-4xl font-bold text-yellow-400"
              style={{
                left: `${letter.x}%`,
                top: `${letter.y}%`,
                transform: `translate(-50%, -50%) rotate(${letter.rotation}deg) scale(${letter.scale})`,
                textShadow: `0 0 ${20 * letter.glow}px #fbbf24, 0 0 ${40 * letter.glow}px #f59e0b`,
                filter: `drop-shadow(0 0 ${10 * letter.glow}px #fbbf24)`
              }}
            >
              {letter.char}
            </div>
          ))}

          {/* 太空飞船 */}
          <div
            className="absolute text-5xl"
            style={{
              left: `${spaceship.x}%`,
              top: `${spaceship.y}%`,
              transform: `translate(-50%, -50%) rotate(${spaceship.rotation}deg)`,
              filter: `drop-shadow(0 0 20px #3b82f6)`
            }}
          >
            🚀
          </div>

          {/* 飞船引擎效果 */}
          <div
            className="absolute w-8 h-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
            style={{
              left: `${spaceship.x - 2}%`,
              top: `${spaceship.y + 2}%`,
              transform: `translate(-50%, -50%) scaleX(${spaceship.engineGlow})`,
              opacity: 0.8
            }}
          />

          {/* 游戏区域边界 */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-red-500 to-pink-500 opacity-60"></div>
        </div>

        {gameStarted && !gameOver && (
          <div className="text-center mt-1 bg-gradient-to-r from-gray-800/30 to-gray-900/30 p-2 rounded-lg border border-gray-600/30">
            <p className="text-sm text-gray-200">
              ⌨️ 按键盘上的字母键来射击掉落的字母！
            </p>
            <p className="text-xs text-gray-400 mt-1">
              🚀 当前速度: {speedMultiplier}x | ⏱️ 生成间隔: {spawnRate}ms
            </p>
            {combo > 0 && (
              <p className="text-sm text-purple-300 mt-1 animate-pulse">
                ⚡ 连击: {combo} | 最大连击: {maxCombo}
              </p>
            )}
          </div>
        )}

        <ToastContainer 
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </div>
  );
} 