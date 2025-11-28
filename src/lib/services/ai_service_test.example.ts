/**
 * AI 服务测试示例
 * 
 * 这个文件展示如何使用 AI 服务
 * 可以在浏览器控制台中运行这些代码来测试
 */

import aiService from './ai_service';

// 示例 1: 简单的聊天测试
export async function testBasicChat() {
  try {
    const response = await aiService.chatCompletion({
      messages: [
        {
          role: 'user',
          content: '请用一句话介绍你自己'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    console.log('AI 回复:', response.choices[0].message.content);
    return response;
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

// 示例 2: 测试时间线分析
export async function testTimelineAnalysis() {
  try {
    const insights = await aiService.analyzeTimeline({
      events: [
        {
          title: '项目启动',
          startYear: 2023,
          startQuarter: 1,
          type: 'milestone',
          category: 'work',
          result: 'good',
          notes: '顺利启动新项目'
        },
        {
          title: '产品开发',
          startYear: 2023,
          startQuarter: 1,
          endYear: 2023,
          endQuarter: 3,
          type: 'duration',
          category: 'work',
          result: 'good',
          notes: '按时完成开发'
        },
        {
          title: '产品发布',
          startYear: 2023,
          startQuarter: 3,
          type: 'milestone',
          category: 'work',
          result: 'bad',
          notes: '用户反馈不佳'
        },
        {
          title: '产品优化',
          startYear: 2023,
          startQuarter: 4,
          endYear: 2024,
          endQuarter: 1,
          type: 'duration',
          category: 'work',
          result: 'good',
          notes: '大幅改进用户体验'
        }
      ],
      yearSummaries: [
        {
          year: 2023,
          text: '充满挑战的一年，从产品开发到发布，经历了失败和改进'
        }
      ],
      startYear: 2023,
      endYear: 2024
    });

    console.log('时间线分析结果:\n', insights);
    return insights;
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

// 示例 3: 测试系统提示词和多轮对话
export async function testMultiTurnConversation() {
  try {
    const response = await aiService.chatCompletion({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的时间管理顾问，擅长帮助人们提高效率'
        },
        {
          role: 'user',
          content: '我经常拖延，有什么建议吗？'
        }
      ],
      temperature: 0.8,
      max_tokens: 500
    });

    console.log('顾问回复:', response.choices[0].message.content);
    return response;
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

// 示例 4: 测试不同温度参数
export async function testTemperatureVariations() {
  const prompt = '写一句关于春天的诗';

  console.log('测试不同温度参数的效果：\n');

  for (const temp of [0.1, 0.5, 0.9]) {
    try {
      const response = await aiService.chatCompletion({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temp,
        max_tokens: 50
      });

      console.log(`温度 ${temp}:`, response.choices[0].message.content);
    } catch (error) {
      console.error(`温度 ${temp} 测试失败:`, error);
    }
  }
}

// 使用方法：
// 在浏览器控制台中运行：
/*

// 1. 导入测试函数（在支持的环境中）
import { testBasicChat, testTimelineAnalysis, testMultiTurnConversation, testTemperatureVariations } from '@/lib/services/ai_service_test.example';

// 2. 运行基础测试
await testBasicChat();

// 3. 运行时间线分析测试
await testTimelineAnalysis();

// 4. 运行多轮对话测试
await testMultiTurnConversation();

// 5. 测试温度参数
await testTemperatureVariations();

*/

// 或者在 Next.js 页面组件中使用：
/*

'use client';

import { useState } from 'react';
import { testBasicChat } from '@/lib/services/ai_service_test.example';

export default function TestPage() {
  const [result, setResult] = useState('');
  
  const handleTest = async () => {
    try {
      const response = await testBasicChat();
      setResult(response.choices[0].message.content);
    } catch (error) {
      setResult('测试失败: ' + error.message);
    }
  };

  return (
    <div>
      <button onClick={handleTest}>测试 AI 服务</button>
      <pre>{result}</pre>
    </div>
  );
}

*/

