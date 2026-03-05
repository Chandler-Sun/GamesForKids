/**
 * 服务端专用 AI 服务：提示词与 API Key 仅在此处使用，不暴露给前端。
 * 仅可在 Server Components、API Routes、Server Actions 中引用。
 */

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

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
  return key;
}

function getBaseUrl(): string {
  return process.env.OPENAI_COMPATIBLE_BASE_URL || process.env.NEXT_PUBLIC_OPENAI_COMPATIBLE_BASE_URL || 'https://openrouter.ai/api/v1';
}

function getQueryString(): string {
  const q = process.env.OPENAI_COMPATIBLE_URL_QUERY_STRING || process.env.NEXT_PUBLIC_OPENAI_COMPATIBLE_URL_QUERY_STRING || '';
  if (!q) return '';
  return q.startsWith('?') ? q : '?' + q;
}

function getDefaultModel(): string {
  return process.env.OPENROUTER_DEFAULT_MODEL || process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL || 'moonshotai/kimi-k2-thinking';
}

function getChatCompletionsEndpoint(): string {
  return getBaseUrl() + '/chat/completions' + getQueryString();
}

export async function chatCompletion(options: OpenRouterRequestOptions): Promise<OpenRouterResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY 未配置');
  }

  const defaultOptions = {
    temperature: 0.7,
    max_tokens: 4000,
    model: getDefaultModel(),
    stream: false,
  };

  const requestOptions = {
    ...defaultOptions,
    ...options,
  };

  const response = await fetch(getChatCompletionsEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://gamesforkids.app',
      'X-Title': 'GamesForKids',
    },
    body: JSON.stringify(requestOptions),
  });
  console.log({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://gamesforkids.app',
    'X-Title': 'GamesForKids',
  })
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  return (await response.json()) as OpenRouterResponse;
}

// ---------- 时间线复盘（提示词仅在此处） ----------

const TIMELINE_SYSTEM_PROMPT = `你是一个专业的创业公司复盘分析师，擅长从历史事件中提取洞察和规律。
你的任务是分析用户提供的时间线事件数据，生成有价值的复盘报告。

报告应包含以下部分：
1. 整体趋势分析（事件数量、成功率、时间分布等）
2. 关键洞察（重要模式、转折点、关联性等）
3. 改进建议（基于历史经验的实用建议）
4. 下一步行动（具体可执行的建议）

请用清晰、简洁、有洞察力的语言撰写报告。`;

export interface AnalyzeTimelineParams {
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
}

export async function analyzeTimeline(params: AnalyzeTimelineParams): Promise<string> {
  const { events, yearSummaries, startYear, endYear } = params;

  const sortedEvents = [...events].sort((a, b) => {
    if (a.startYear !== b.startYear) return a.startYear - b.startYear;
    const aq = a.startQuarter ?? 1,
      bq = b.startQuarter ?? 1;
    if (aq !== bq) return aq - bq;
    const am = a.startMonth ?? 1,
      bm = b.startMonth ?? 1;
    return am - bm;
  });

  const eventsDescription = sortedEvents
    .map((e) => {
      const timeInfo =
        e.type === 'milestone'
          ? `${e.startYear}年${e.startMonth ? `${e.startMonth}月` : `Q${e.startQuarter || 1}`}`
          : `${e.startYear}年${e.startMonth ? `${e.startMonth}月` : `Q${e.startQuarter || 1}`} - ${e.endYear}年${e.endMonth ? `${e.endMonth}月` : `Q${e.endQuarter || 4}`}`;
      const resultEmoji =
        e.result === 'good' ? '算拿到还可以的结果' : e.result === 'bad' ? '没有拿到好结果' : '结果不好说';
      return `[结果情况: ${resultEmoji}] [${e.category}]: ${e.title} (${timeInfo})${e.notes ? `\n   备注: ${e.notes}` : ''}`;
    })
    .join('\n');

  const summariesDescription =
    yearSummaries && yearSummaries.length > 0
      ? '\n\n年度摘要：\n' + yearSummaries.map((s) => `${s.year}年: ${s.text}`).join('\n')
      : '';

  const userPrompt = `请分析以下时间线数据（${startYear}-${endYear}年）：

共有 ${events.length} 个事件：
${eventsDescription}
${summariesDescription}

请生成一份全面的复盘分析报告。`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: TIMELINE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 30000,
  });

  const content = response.choices[0]?.message?.content || '';
  if (!content) {
    throw new Error('AI 返回了空的响应');
  }
  return content;
}

// ---------- 排期调整（提示词仅在此处） ----------

const SCHEDULE_SYSTEM_PROMPT = `你是一个项目排期助手。用户会提供一段「项目排期」的类 Markdown 文本，以及一句修改需求。请只输出调整后的完整排期文本，不要解释说明。

排期文本格式规则：
- 每个任务以 "- " 开头（注意横杠后有一个空格）
- 任务名称前的感叹号表示优先级：无=普通，一个 ! =低，!! =高，!!! =极高
- 前置依赖用 "-->#数字" 表示，如 "-->#1" 表示依赖第 1 号任务
- 预计耗时天数："[数字d]"，如 "[3d]" 表示 3 天；"[0.5d]" 表示半天
- 预计人天："[数字md]"，如 "[5md]" 表示 5 人天
- 角色/参与方：用 "@xxx" 表示
- 备注：行内用 "> 备注内容"；多行备注在下一行用空格缩进后 "> 备注内容"

请严格保持上述格式，只输出修改后的完整文本。`;

export async function adjustSchedulePlan(currentMarkdown: string, userRequest: string): Promise<string> {
  const userPrompt = `当前排期计划：\n\n${currentMarkdown}\n\n用户的修改需求：${userRequest}\n\n请直接输出修改后的完整排期文本（不要包含任何解释或前后缀）：`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: SCHEDULE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 40000,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';
  if (!content) {
    throw new Error('AI 返回了空的排期文本');
  }
  return content;
}
