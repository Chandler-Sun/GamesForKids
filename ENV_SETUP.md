# 环境变量配置说明

本项目需要配置 OpenRouter API Key 才能使用 AI 智能分析功能。

## 📝 创建 .env.local 文件

在项目根目录创建 `.env.local` 文件（与 package.json 同级），内容如下：

```bash
# OpenRouter API Key（必需）
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# 以下为可选配置

# 自定义 API 基础 URL（默认：https://openrouter.ai/api/v1）
# NEXT_PUBLIC_OPENAI_COMPATIBLE_BASE_URL=https://openrouter.ai/api/v1

# 指定默认使用的 AI 模型（默认：anthropic/claude-3.5-sonnet）
# NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet

# API URL 的额外查询参数
# NEXT_PUBLIC_OPENAI_COMPATIBLE_URL_QUERY_STRING=
```

## 🔑 获取 API Key

1. 访问 [OpenRouter](https://openrouter.ai/)
2. 注册或登录账号
3. 进入 [Keys](https://openrouter.ai/keys) 页面
4. 点击 "Create Key" 创建新的 API Key
5. 复制 API Key 并粘贴到 `.env.local` 文件中

## ✅ 验证配置

配置完成后：

1. 重启开发服务器：
```bash
npm run dev
```

2. 访问时间线复盘工具：
```
http://localhost:3000/tools/timeline-review
```

3. 添加一些事件后，点击 **"🤖 AI 复盘"** 按钮

4. 如果配置正确，AI 将生成详细的分析报告

## ⚠️ 重要提示

- `.env.local` 文件包含敏感信息，**不要**提交到 Git 仓库
- 该文件已在 `.gitignore` 中被忽略
- 如果没有配置 API Key，AI 复盘功能会显示基础统计信息

## 🌍 其他 OpenAI 兼容的服务

本 AI 服务支持任何 OpenAI 兼容的 API，例如：

### 使用自托管的模型

```bash
NEXT_PUBLIC_OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
NEXT_PUBLIC_OPENROUTER_API_KEY=ollama
```

### 使用其他云服务

```bash
NEXT_PUBLIC_OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-xxxxx
NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL=gpt-4-turbo
```

## 💰 费用说明

OpenRouter 按使用量收费：

- 不同模型价格不同
- Claude 3.5 Sonnet: 约 $3/百万 input tokens, $15/百万 output tokens
- GPT-4 Turbo: 约 $10/百万 input tokens, $30/百万 output tokens
- 时间线分析通常消耗 500-2000 tokens

建议：
- 在 OpenRouter 设置预算限制
- 监控使用情况
- 选择合适的模型平衡性能和成本

## 🔧 故障排除

### 配置不生效

1. 确认文件名为 `.env.local`（注意开头的点）
2. 确认文件在项目根目录
3. 重启开发服务器
4. 清除浏览器缓存

### API Key 无效

1. 确认 API Key 复制正确（没有多余空格）
2. 在 OpenRouter 检查 Key 是否有效
3. 检查账户余额是否充足

### 网络问题

如果在中国大陆使用，可能需要：
- 配置网络代理
- 使用国内可访问的 OpenAI 兼容服务

## 📚 更多信息

详细的 AI 服务使用说明请参考：[AI_SERVICE_README.md](./AI_SERVICE_README.md)

