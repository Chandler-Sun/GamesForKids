// OpenRouter API 接口的类型定义
interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterRequestOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  stream?: boolean;
  messages: OpenRouterMessage[];
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    index: number;
  }[];
}

// AI服务类
export class AIService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '') {
    this.apiKey = apiKey;
    this.baseUrl = process.env.NEXT_PUBLIC_OPENAI_COMPATIBLE_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  // 支持额外的query_string参数配置
  private getOpenAICompatibleEndpoint(path: string): string {
    let queryString = process.env.NEXT_PUBLIC_OPENAI_COMPATIBLE_URL_QUERY_STRING || '';
    const endpoint = `${this.baseUrl}${path}`;
    if (queryString) {
      if (!queryString.startsWith('?')) {
        queryString = '?' + queryString;
      }
      return endpoint + queryString;
    }
    return endpoint;
  }

  // 发送聊天完成请求
  async chatCompletion(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'GamesForKids Timeline Review'
    };

    const defaultOptions = {
      temperature: 0.7,
      max_tokens: 4000,
      model: process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet',
      stream: false
    };

    const requestOptions = {
      ...defaultOptions,
      ...options
    };

    console.debug('AI Request Options:', JSON.stringify(requestOptions, null, 2));

    try {
      const response = await fetch(this.getOpenAICompatibleEndpoint('/chat/completions'), {
        method: 'POST',
        headers,
        body: JSON.stringify(requestOptions)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = (await response.json()) as OpenRouterResponse;
      console.debug('AI Response:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('AI请求失败:', error);
      throw new Error(`AI请求失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 生成时间线复盘分析
  async analyzeTimeline(params: {
    events: Array<{
      title: string;
      startYear: number;
      startQuarter?: number;
      startMonth?: number;
      endYear?: number;
      endQuarter?: number;
      endMonth?: number;
      type: string;
      category: string;
      result?: string;
      notes?: string;
    }>;
    yearSummaries?: Array<{
      year: number;
      text: string;
    }>;
    startYear: number;
    endYear: number;
  }): Promise<string> {
    const { events, yearSummaries, startYear, endYear } = params;

    // 构建系统提示词
    const systemPrompt = `你是一个专业的时间线复盘分析师，擅长从历史事件中提取洞察和规律。
你的任务是分析用户提供的时间线事件数据，生成有价值的复盘报告。

报告应包含以下部分：
1. 整体趋势分析（事件数量、成功率、时间分布等）
2. 关键洞察（重要模式、转折点、关联性等）
3. 改进建议（基于历史经验的实用建议）
4. 下一步行动（具体可执行的建议）

请用清晰、简洁、有洞察力的语言撰写报告。`;

    // 构建用户消息
    const eventsDescription = events.map(e => {
      const timeInfo = e.type === 'milestone' 
        ? `${e.startYear}年${e.startMonth ? `${e.startMonth}月` : `Q${e.startQuarter || 1}`}`
        : `${e.startYear}年${e.startMonth ? `${e.startMonth}月` : `Q${e.startQuarter || 1}`} - ${e.endYear}年${e.endMonth ? `${e.endMonth}月` : `Q${e.endQuarter || 4}`}`;
      
      const resultEmoji = e.result === 'good' ? '✓' : e.result === 'bad' ? '✗' : '○';
      
      return `${resultEmoji} [${e.type === 'milestone' ? '里程碑' : '持续事件'}] ${e.title} (${timeInfo})${e.notes ? `\n   备注: ${e.notes}` : ''}`;
    }).join('\n');

    const summariesDescription = yearSummaries && yearSummaries.length > 0
      ? '\n\n年度摘要：\n' + yearSummaries.map(s => `${s.year}年: ${s.text}`).join('\n')
      : '';

    const userPrompt = `请分析以下时间线数据（${startYear}-${endYear}年）：

共有 ${events.length} 个事件：
${eventsDescription}
${summariesDescription}

请生成一份全面的复盘分析报告。`;

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    try {
      const response = await this.chatCompletion({
        messages,
        temperature: 0.7,
        max_tokens: 3000
      });

      const content = response.choices[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('AI 返回了空的响应');
      }

      return content;
    } catch (error) {
      console.error('时间线分析失败:', error);
      throw new Error(`时间线分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 导出默认实例
const aiService = new AIService();
export default aiService;

