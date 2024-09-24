"use client"

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function MathQuizGame() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [timeLimit, setTimeLimit] = useState(60);
  const [showSettings, setShowSettings] = useState(false);
  const [questionType, setQuestionType] = useState('twoDigit'); // 新增状态变量
  const [crabs, setCrabs] = useState<number[]>([]); // 新增状态变量

  const inputRef = useRef<HTMLInputElement>(null);

  const generateQuestion = () => {
    let num1, num2, operation, newQuestion;
    switch (questionType) {
      case 'twoDigit':
        do {
          num1 = Math.floor(Math.random() * 90) + 10; // 确保num1是10到99之间的数字
          num2 = Math.floor(Math.random() * 90) + 10; // 确保num2是10到99之间的数字
          operation = Math.random() < 0.5 ? '+' : '-';
        } while ((operation === '-' && num2 > num1) || (operation === '+' && num1 + num2 > 100));
        newQuestion = `${num1} ${operation} ${num2}`;
        break;
      case 'anyNumber':
        num1 = Math.floor(Math.random() * 100);
        num2 = Math.floor(Math.random() * 100);
        operation = Math.random() < 0.5 ? '+' : '-';
        newQuestion = `${num1} ${operation} ${num2}`;
        break;
      case 'twoStep':
        let num3, operation2;
        do {
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 90) + 10;
          num3 = Math.floor(Math.random() * 90) + 10;
          operation = Math.random() < 0.5 ? '+' : '-';
          operation2 = Math.random() < 0.5 ? '+' : '-';
        } while ((operation === '-' && num2 > num1) || (operation === '+' && num1 + num2 > 100) ||
                 (operation2 === '-' && num3 > (operation === '+' ? num1 + num2 : num1 - num2)) ||
                 (operation2 === '+' && (operation === '+' ? num1 + num2 : num1 - num2) + num3 > 100) ||
                 (operation === '+' && num1 + num2 > 100) || (operation2 === '+' && num2 + num3 > 100));
        newQuestion = `${num1} ${operation} ${num2} ${operation2} ${num3}`;
        break;
      default:
        newQuestion = '1 + 1';
    }
    setQuestion(newQuestion);
    setCorrectAnswer(eval(newQuestion.replace(/ /g, '')));
    setTimeLeft(timeLimit);
  };

  useEffect(() => {
    generateQuestion();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const storedHighScore = localStorage.getItem('highScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameOver) {
      handleSubmit();
    }
  }, [timeLeft, gameOver]);

  useEffect(() => {
    generateQuestion();
  }, [questionType]);

  const handleSubmit = () => {
    const userAnswer = parseInt(answer, 10);
    if (userAnswer === correctAnswer) {
      const newScore = score + 10;
      setScore(newScore);
      const newHighScore = Math.max(highScore, newScore);
      setHighScore(newHighScore);
      localStorage.setItem('highScore', newHighScore.toString()); // 立即存储最高分
      toast.success('答对了！继续加油！');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      (document.getElementById('hooraySound') as HTMLAudioElement)?.play(); // 播放欢呼声
      setCrabs([...crabs, crabs.length + 1]); // 增加一个小螃蟹
      setTimeout(() => {
        generateQuestion();
        setAnswer('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 2000);
    } else {
      setGameOver(true);
      if (Math.abs(userAnswer - correctAnswer) === 10) {
        setShowAnimation(true);
        (document.getElementById('carryOverErrorSound') as HTMLAudioElement)?.play(); // 播放进位退位错误提示音
        setTimeout(() => setShowAnimation(false), 3000);
      } else {
        (document.getElementById('generalErrorSound') as HTMLAudioElement)?.play(); // 播放一般错误提示音
      }
      toast.error(`答错了。正确答案是 ${correctAnswer}。重新开始吧！最高分是 ${highScore}。`);
    }
  };

  const restartGame = () => {
    setScore(0);
    setGameOver(false);
    generateQuestion();
    setAnswer('');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  const formatVerticalEquation = (question: string, questionType: string) => {
    if (!question) return null;
    const parts = question.split(' ');
    const maxLength = Math.max(...parts.filter((_, i) => i % 2 === 0).map(num => num.length));
    const formattedParts = parts.map((part, i) => i % 2 === 0 ? part.padStart(maxLength, ' ') : part);

    return (
      <div className="vertical-equation" style={{ textAlign: 'right' }}>
        {formattedParts.slice(0, questionType === 'twoStep' ? 4 : 2).map((part, i) => (
          i === 0 ? (
            <div key={i}>
              {part}
            </div>
          ) : (i % 2 === 1 ? (
            <div key={i}>
              {`${part} ${formattedParts[i + 1]}`}
            </div>
          ) : null)
        ))}
        <div style={{ borderBottom: '2px solid black', width: '100%' }}></div>
      </div>
    );
  };

  const clearHighScore = () => {
    localStorage.removeItem('highScore');
    setHighScore(0);
    toast.success('最高分已清除！');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <nav className="fixed top-0 left-0 w-full bg-blue-500 text-white p-4 flex justify-between items-center">
        <a href="/" className="text-lg font-bold">返回首页</a>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-white text-blue-500 p-2 rounded"
        >
          选项
        </button>
      </nav>
      {showSettings && (
        <div className="fixed top-16 right-0 w-64 bg-white p-4 shadow-md">
          <div className="mt-4">
            <label htmlFor="timeLimit" className="block mb-2">答题时间 (秒):</label>
            <input
              type="number"
              id="timeLimit"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value, 10)))}
              className="w-full p-2 border rounded"
              min="1"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="questionType" className="block mb-2">出题方案:</label>
            <select
              id="questionType"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="twoDigit">100以内两位数加减法</option>
              <option value="anyNumber">两位数加减法</option>
              <option value="twoStep">100以内连续两次两位数加减法</option>
            </select>
          </div>
          <button
            onClick={clearHighScore}
            className="mt-4 bg-red-500 text-white p-2 rounded w-full"
          >
            清除最高分
          </button>
        </div>
      )}
      <div className="mt-16 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4">数学练习游戏</h1>
        <div className="bg-white p-6 rounded-lg shadow-md w-full">
          <div className="flex justify-between mb-4">
            <div className="text-xl font-bold text-green-500">得分: {score}</div>
            <div className="text-xl font-bold text-red-500">最高分: {highScore}</div>
            <div>倒计时: {timeLeft}秒</div>
          </div>
          <div className="text-2xl font-bold mb-4">
            {formatVerticalEquation(question, questionType)}
          </div>
          <input
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full p-2 border rounded mb-4 text-2xl font-bold text-right"
            placeholder="输入答案"
            disabled={gameOver}
          />
          <button
            onClick={gameOver ? restartGame : handleSubmit}
            className={`w-full p-2 rounded hover:bg-opacity-75 ${
              gameOver ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {gameOver ? '重新开始' : '提交'}
          </button>

          <button
            onClick={generateQuestion}
            className="w-full p-2 mt-2 rounded bg-yellow-500 text-white hover:bg-yellow-600"
          >
            换一题
          </button>

          <ToastContainer />
          <audio id="generalErrorSound" src="/audio/general-error.wav"></audio>
          <audio id="carryOverErrorSound" src="/audio/carry-over-error.mp3"></audio>
          <audio id="hooraySound" src="/audio/hooray.wav"></audio>
          {showAnimation && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75">
              <div className="text-red-500 text-6xl font-extrabold animate-pulse">
                注意进位或退位！
              </div>
            </div>
          )}
          <div className="flex flex-wrap mt-4">
            {crabs.map((_, index) => (
              <img
                key={index}
                src="/images/crab.png"
                alt="小螃蟹"
                className="w-12 h-12 animate-bounce"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
