This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## ✨ Features

- 🎮 **数学游戏**: 100以内加减法练习
- 🚀 **太空字母射击**: 英文字母学习游戏
- ✍️ **中文书法练习**: 在线书法创作工具
- 📅 **时间线复盘工具**: 带 AI 智能分析的可视化复盘工具

## 🤖 AI 功能

本项目集成了 OpenRouter AI 服务，为时间线复盘工具提供智能分析功能。

### 配置 AI 服务

1. 访问 [OpenRouter](https://openrouter.ai/) 获取 API Key
2. 在项目根目录创建 `.env.local` 文件
3. 添加配置：
```bash
NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key_here
```

详细配置请参考 [AI_SERVICE_README.md](./AI_SERVICE_README.md)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
