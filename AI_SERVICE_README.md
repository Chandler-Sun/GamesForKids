# AI 服务配置指南

本项目已集成 OpenRouter AI 服务，用于时间线复盘工具的智能分析功能。

## 🚀 快速开始

### 1. 获取 OpenRouter API Key

访问 [OpenRouter](https://openrouter.ai/) 并注册账号，然后获取您的 API Key。

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件（如果还没有的话），添加以下配置：

```bash
# 必需：OpenRouter API Key
NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key_here

# 可选：自定义基础 URL（默认使用 OpenRouter）
# NEXT_PUBLIC_OPENAI_COMPATIBLE_BASE_URL=https://openrouter.ai/api/v1

# 可选：指定默认模型（默认使用 Claude 3.5 Sonnet）
# NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet

# 可选：URL 查询字符串
# NEXT_PUBLIC_OPENAI_COMPATIBLE_URL_QUERY_STRING=
```

### 3. 重启开发服务器

配置完成后，重启 Next.js 开发服务器：

```bash
npm run dev
```

## 📖 使用方法

1. 打开时间线复盘工具：访问 `/tools/timeline-review`
2. 添加一些事件到时间线
3. 点击工具栏中的 **"🤖 AI 复盘"** 按钮
4. AI 将分析您的时间线并生成详细的复盘报告

## 🎯 功能特点

AI 复盘分析会提供：

- **整体趋势分析**：事件数量、成功率、时间分布等统计信息
- **关键洞察**：识别重要模式、转折点和事件之间的关联性
- **改进建议**：基于历史经验提供实用的改进建议
- **下一步行动**：具体可执行的行动建议

## 🔧 技术实现

### AI 服务架构

```
src/lib/services/
  └── ai_service.ts          # AI 服务核心实现
```

### 主要类和方法

#### `AIService` 类

```typescript
class AIService {
  // 通用聊天完成接口
  async chatCompletion(options: OpenRouterRequestOptions): Promise<OpenRouterResponse>
  
  // 时间线分析专用接口
  async analyzeTimeline(params: {
    events: Array<...>;
    yearSummaries?: Array<...>;
    startYear: number;
    endYear: number;
  }): Promise<string>
}
```

### 在其他组件中使用

您可以在任何组件中导入并使用 AI 服务：

```typescript
import aiService from '@/lib/services/ai_service';

// 调用通用聊天接口
const response = await aiService.chatCompletion({
  messages: [
    { role: 'system', content: '你是一个助手' },
    { role: 'user', content: '你好' }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

console.log(response.choices[0].message.content);
```

## 🔐 安全注意事项

- **不要**将 `.env.local` 文件提交到版本控制系统
- **不要**在客户端代码中暴露敏感的 API Key
- 本项目使用 `NEXT_PUBLIC_` 前缀是因为需要在客户端调用 API（适用于个人项目）
- 对于生产环境，建议通过服务端 API 路由来调用 AI 服务，避免暴露 API Key

## 💰 费用说明

OpenRouter 采用按使用付费模式：

- Claude 3.5 Sonnet：约 $3-5 / 百万 tokens
- 时间线分析通常消耗 500-2000 tokens
- 建议设置账户预算限制

## 🐛 故障排除

### 问题：点击 AI 复盘按钮没有反应

**解决方案：**
1. 检查浏览器控制台是否有错误信息
2. 确认 API Key 已正确配置
3. 检查网络连接

### 问题：API 返回 401 错误

**解决方案：**
- API Key 无效或已过期，请在 OpenRouter 重新生成

### 问题：API 返回 429 错误

**解决方案：**
- 超出请求频率限制，请稍后重试
- 考虑升级 OpenRouter 账户

### 问题：分析结果不准确

**解决方案：**
- 确保时间线中有足够的事件（建议至少 5 个）
- 为事件添加详细的备注信息
- 尝试调整 `temperature` 参数（在 `ai_service.ts` 中）

## 🌟 高级配置

### 使用其他 AI 模型

编辑 `.env.local` 文件：

```bash
# 使用 GPT-4
NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL=openai/gpt-4-turbo

# 使用其他模型
# 查看可用模型：https://openrouter.ai/models
```

### 自定义分析提示词

编辑 `src/lib/services/ai_service.ts` 中的 `analyzeTimeline` 方法，修改 `systemPrompt` 变量来自定义 AI 的分析风格。

## 📚 相关资源

- [OpenRouter 文档](https://openrouter.ai/docs)
- [OpenRouter 模型列表](https://openrouter.ai/models)
- [OpenRouter API 参考](https://openrouter.ai/docs/api-reference)

## 🤝 贡献

如果您发现问题或有改进建议，欢迎提交 Issue 或 Pull Request！

---

**注意**：本 AI 服务实现参考了 `internal-talent-pool` 项目的 AI 服务架构，但进行了简化以适应本项目的需求。

