/**
 * 前端 AI 服务客户端：仅调用后端 /api/ai/*，不包含提示词与 API Key。
 */

export interface OpenRouterMessage {
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

const API_BASE = '/api/ai';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data && typeof data.error === 'string' ? data.error : res.statusText) || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

/**
 * 通用聊天补全（请求转发到后端，由后端调用 OpenRouter）。
 */
export async function chatCompletion(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
  return post<OpenRouterResponse>('/chat-completion', {
    messages: options.messages,
    temperature: options.temperature,
    max_tokens: options.max_tokens,
    model: options.model,
  });
}

/**
 * 时间线复盘分析（提示词与密钥在后端）。
 */
export async function analyzeTimeline(params: {
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
  yearSummaries?: Array<{ year: number; text: string }>;
  startYear: number;
  endYear: number;
}): Promise<string> {
  const { content } = await post<{ content: string }>('/analyze-timeline', params);
  return content ?? '';
}

/**
 * 根据用户需求调整排期计划（提示词与密钥在后端）。
 */
export async function adjustSchedulePlan(currentMarkdown: string, userRequest: string): Promise<string> {
  const { content } = await post<{ content: string }>('/adjust-schedule', {
    currentMarkdown,
    userRequest,
  });
  return content ?? '';
}

// 兼容原有 default 导出：单例对象，方法与上面一致
const aiService = {
  chatCompletion,
  analyzeTimeline,
  adjustSchedulePlan,
};

export default aiService;
