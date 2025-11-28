'use client';

import { useState } from 'react';
import aiService from '@/lib/services/ai_service';

export default function AITestPage() {
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  // 检查 API Key 是否配置
  const checkApiKey = () => {
    const hasKey = !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    setApiKeyConfigured(hasKey);
    return hasKey;
  };

  // 测试基础聊天
  const testBasicChat = async () => {
    if (!checkApiKey()) {
      setTestResult('❌ 错误：未配置 NEXT_PUBLIC_OPENROUTER_API_KEY\n\n请在 .env.local 文件中配置 API Key');
      return;
    }

    setIsLoading(true);
    setTestResult('🔄 正在测试基础聊天功能...');

    try {
      const response = await aiService.chatCompletion({
        messages: [
          {
            role: 'user',
            content: '请用一句话介绍你自己'
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const content = response.choices[0].message.content;
      setTestResult(`✅ 测试成功！\n\nAI 回复：\n${content}`);
    } catch (error) {
      setTestResult(`❌ 测试失败：\n${error instanceof Error ? error.message : String(error)}\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. 账户余额是否充足`);
    } finally {
      setIsLoading(false);
    }
  };

  // 测试时间线分析
  const testTimelineAnalysis = async () => {
    if (!checkApiKey()) {
      setTestResult('❌ 错误：未配置 NEXT_PUBLIC_OPENROUTER_API_KEY\n\n请在 .env.local 文件中配置 API Key');
      return;
    }

    setIsLoading(true);
    setTestResult('🔄 正在测试时间线分析功能...');

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

      setTestResult(`✅ 测试成功！\n\n时间线分析结果：\n\n${insights}`);
    } catch (error) {
      setTestResult(`❌ 测试失败：\n${error instanceof Error ? error.message : String(error)}\n\n请检查：\n1. API Key 是否正确\n2. 网络连接是否正常\n3. 账户余额是否充足`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>🧪 AI 服务测试</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        测试 OpenRouter AI 服务是否正常工作
      </p>

      {/* 配置状态 */}
      <div style={{
        padding: '20px',
        backgroundColor: apiKeyConfigured ? '#e8f5e9' : '#fff3e0',
        borderRadius: '8px',
        marginBottom: '30px',
        border: `1px solid ${apiKeyConfigured ? '#4caf50' : '#ff9800'}`
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>
          {apiKeyConfigured ? '✅ API Key 已配置' : '⚠️ API Key 未配置'}
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          {apiKeyConfigured 
            ? '您已配置 NEXT_PUBLIC_OPENROUTER_API_KEY 环境变量' 
            : '请在项目根目录创建 .env.local 文件并配置 NEXT_PUBLIC_OPENROUTER_API_KEY'}
        </p>
        {!apiKeyConfigured && (
          <details style={{ marginTop: '15px', fontSize: '14px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>查看配置步骤</summary>
            <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>访问 <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer">OpenRouter</a> 获取 API Key</li>
              <li>在项目根目录创建 <code>.env.local</code> 文件</li>
              <li>添加内容：<code>NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key_here</code></li>
              <li>重启开发服务器</li>
            </ol>
          </details>
        )}
      </div>

      {/* 测试按钮 */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={testBasicChat}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            fontWeight: 'bold'
          }}
        >
          💬 测试基础聊天
        </button>

        <button
          onClick={testTimelineAnalysis}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            fontWeight: 'bold'
          }}
        >
          📊 测试时间线分析
        </button>

        <button
          onClick={checkApiKey}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔍 检查配置
        </button>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{ marginTop: 0 }}>测试结果：</h3>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0
          }}>
            {testResult}
          </pre>
        </div>
      )}

      {/* 说明文档 */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        border: '1px solid #2196F3'
      }}>
        <h3 style={{ marginTop: 0 }}>📚 使用说明</h3>
        <ul style={{ marginBottom: 0, lineHeight: '1.8' }}>
          <li><strong>基础聊天测试</strong>：验证 AI 服务的基本连接和响应</li>
          <li><strong>时间线分析测试</strong>：测试时间线复盘功能（用于 /tools/timeline-review）</li>
          <li><strong>检查配置</strong>：验证环境变量是否正确配置</li>
        </ul>
        <p style={{ marginTop: '15px', marginBottom: 0, fontSize: '14px' }}>
          💡 详细文档请查看：
          <a href="/AI_SERVICE_README.md" style={{ marginLeft: '5px' }}>AI_SERVICE_README.md</a> 和
          <a href="/ENV_SETUP.md" style={{ marginLeft: '5px' }}>ENV_SETUP.md</a>
        </p>
      </div>
    </div>
  );
}

