# 🚀 AI 功能快速开始指南

本指南帮助您在 5 分钟内完成 AI 服务的配置和测试。

## 📝 第一步：获取 API Key（2 分钟）

1. 访问 [OpenRouter](https://openrouter.ai/)
2. 点击右上角 "Sign In" 登录（支持 Google/GitHub 账号）
3. 登录后，点击左侧菜单的 "[Keys](https://openrouter.ai/keys)"
4. 点击 "Create Key" 按钮
5. 给 Key 起个名字（如 "GamesForKids"），然后点击创建
6. **复制生成的 API Key**（格式类似 `sk-or-v1-xxxxx...`）

💡 **提示**：OpenRouter 新用户通常有免费额度，足够测试使用。

## ⚙️ 第二步：配置环境变量（1 分钟）

1. 在项目根目录（与 `package.json` 同级）创建 `.env.local` 文件：

```bash
# 在项目根目录执行
touch .env.local
```

2. 用文本编辑器打开 `.env.local`，添加以下内容：

```bash
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-你的API密钥
```

**重要**：
- 将 `sk-or-v1-你的API密钥` 替换为第一步复制的真实 API Key
- 不要有多余的空格
- 不要添加引号

示例：
```bash
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

## 🔄 第三步：重启开发服务器（30 秒）

如果开发服务器正在运行，需要重启：

```bash
# 按 Ctrl+C 停止当前服务器
# 然后重新启动
npm run dev
```

## ✅ 第四步：测试 AI 服务（1 分钟）

### 方法一：使用测试页面（推荐）

1. 打开浏览器访问：http://localhost:3000/tools/ai-test
2. 点击 **"💬 测试基础聊天"** 按钮
3. 等待几秒钟，应该会看到 AI 的回复

✅ 如果看到 "✅ 测试成功！"，说明配置正确！

❌ 如果看到错误信息，请检查：
- API Key 是否正确复制
- `.env.local` 文件位置是否正确
- 开发服务器是否已重启

### 方法二：使用时间线工具

1. 访问：http://localhost:3000/tools/timeline-review
2. 点击 "+ 添加事件" 添加几个事件
3. 点击 **"🤖 AI 复盘"** 按钮
4. 查看 AI 生成的分析报告

## 🎉 完成！

现在您已经成功配置了 AI 服务，可以：

- ✨ 使用时间线复盘工具的 AI 分析功能
- 🧪 在测试页面尝试不同的 AI 功能
- 🔧 参考文档开发自己的 AI 功能

## 📚 下一步

- 查看 [AI_SERVICE_README.md](./AI_SERVICE_README.md) 了解详细功能
- 查看 [AI_INTEGRATION_SUMMARY.md](./AI_INTEGRATION_SUMMARY.md) 了解技术实现
- 查看 [ENV_SETUP.md](./ENV_SETUP.md) 了解高级配置

## 💰 费用说明

- OpenRouter 按使用量计费
- Claude 3.5 Sonnet：约 $3-5 / 百万 tokens
- 一次时间线分析通常消耗 500-2000 tokens（约 $0.001-0.01）
- 建议在 OpenRouter 设置预算限制避免超支

## 🐛 遇到问题？

### 问题 1：提示未配置 API Key

**解决方案**：
```bash
# 1. 确认文件名正确（注意开头的点）
ls -la | grep .env.local

# 2. 查看文件内容
cat .env.local

# 3. 重启服务器
npm run dev
```

### 问题 2：API 返回 401 错误

**解决方案**：
- API Key 无效或已过期
- 在 OpenRouter 重新生成 API Key

### 问题 3：网络连接失败

**解决方案**：
- 检查网络连接
- 如在中国大陆，可能需要配置代理
- 或使用支持国内访问的 OpenAI 兼容服务

### 问题 4：仍然无法解决

1. 查看浏览器控制台（F12）的错误信息
2. 查看终端的错误日志
3. 参考 [ENV_SETUP.md](./ENV_SETUP.md) 的故障排除章节

---

**预计总耗时**：约 5 分钟  
**难度**：⭐⭐☆☆☆（简单）  
**需要的工具**：文本编辑器、浏览器

祝您使用愉快！🎉

