# 卫黎 3D 内容平台 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有的 `mvp_hi_fi.html + server.js` 升级为一个可部署到 Vercel、中国大陆可访问、支持图生视频的 4-Tab 全息内容平台 MVP。

**Architecture:** Vercel Serverless Functions（`/api/*.js`）+ 单页 React HTML（`index.html`）。前端调用 `/api/generate-video` 创建即梦 I2V 任务，得到 `taskId` 后每 3 秒轮询 `/api/task/:taskId` 直到视频生成完成。卖家入驻和定制委托通过飞书 Webhook 通知运营者。

**Tech Stack:** Node.js 18（Vercel Serverless）、React 18 CDN、Tailwind CDN、即梦 ARK API（doubao-seedream T2I + doubao-seeddance I2V）

---

## 文件结构

```
项目根目录/
├── index.html                    ← 由 mvp_hi_fi.html 全量替换（4 个 Tab）
├── assets/                       ← 保持不动（8 张 PNG 素材）
├── api/
│   ├── generate.js               ← T2I 文生图（从 server.js 移植）
│   ├── generate-video.js         ← I2V 任务创建（新增核心）
│   ├── task/
│   │   └── [taskId].js           ← 轮询任务状态（新增）
│   ├── seller-apply.js           ← 卖家入驻表单（新增）
│   └── custom-order.js           ← 定制委托（新增）
├── .env                          ← ARK_API_KEY + FEISHU_WEBHOOK_URL（不提交）
├── .env.example                  ← 环境变量模板（提交）
├── vercel.json                   ← Vercel 配置
├── package.json                  ← 更新 scripts
└── .gitignore                    ← 新增 .env、uploads/
```

**保留不变（不要删）：** `server.js`（本地 Express 调试用）、`mvp.html`（历史备份）

---

## 前置：安装 Vercel CLI

- [ ] **安装 vercel CLI（Task 2、8 的本地测试依赖它）**

```bash
npm install -g vercel
vercel login   # GitHub 登录即可
```

---

## Task 1：项目配置 — vercel.json、.env、.gitignore

**Files:**
- Create: `vercel.json`
- Create: `.env.example`
- Create: `.env`
- Modify: `.gitignore`
- Modify: `package.json`

---

- [ ] **Step 1.1：创建 vercel.json**

```json
{
  "version": 2,
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

- [ ] **Step 1.2：创建 .env.example**

```
# 即梦 API Key（火山引擎控制台获取）
ARK_API_KEY=ark-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 飞书群机器人 Webhook（可选，用于卖家申请和定制委托通知）
# 创建方式：飞书群 → 设置 → 机器人 → 添加机器人 → 自定义机器人 → 复制 Webhook URL
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxx
```

- [ ] **Step 1.3：创建 .env（填入真实 Key，不提交）**

```
ARK_API_KEY=ark-4b5e52b8-4b47-4e41-b1fc-5f48ca85996b-13b44
FEISHU_WEBHOOK_URL=
```

- [ ] **Step 1.4：更新 .gitignore（追加以下内容）**

```
.env
uploads/
.superpowers/
node_modules/
```

- [ ] **Step 1.5：更新 package.json**

```json
{
  "name": "holomax-pro",
  "version": "1.0.0",
  "description": "HoloMax Pro - AI Holographic Asset Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "vercel dev",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

- [ ] **Step 1.6：验证 .gitignore 生效**

```bash
git check-ignore -v .env
```

Expected 输出：`.gitignore:1:.env  .env`

- [ ] **Step 1.7：Commit**

```bash
git add vercel.json .env.example .gitignore package.json
git commit -m "chore: add vercel config and env template"
```

---

## Task 2：api/generate.js — 文生图（从 server.js 移植）

**Files:**
- Create: `api/generate.js`

---

- [ ] **Step 2.1：创建 `api/generate.js`**

```javascript
// api/generate.js
// 文生图：接收 prompt + size，调用即梦 doubao-seedream 返回图片 URL
// 被前端 AI 生成 Tab「关键词」模式调用

const JIMENG_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const JIMENG_MODEL = 'doubao-seedream-5-0-260128';
const HOLO_SUFFIX = '，纯黑背景(#000000)，全息3D效果，霓虹发光轮廓，适配全息风扇播放';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ARK_API_KEY = process.env.ARK_API_KEY;
  if (!ARK_API_KEY) {
    return res.status(500).json({ error: 'ARK_API_KEY 未设置' });
  }

  const { prompt, size = '1:1' } = req.body;
  if (!prompt?.trim()) {
    return res.status(400).json({ error: '请输入生成描述' });
  }

  // Vercel 传来的 size 可能是 '1:1' 格式，统一转为 像素格式
  const sizeMap = { '1:1': '1024x1024', '2k': '2048x2048', '3k': '3072x3072' };
  const resolvedSize = sizeMap[size] || size;

  const fullPrompt = prompt.trim() + HOLO_SUFFIX;

  try {
    const response = await fetch(JIMENG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: JIMENG_MODEL,
        prompt: fullPrompt,
        size: resolvedSize,
        n: 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      return res.status(response.status).json({ error: `即梦 API 错误: ${msg}` });
    }

    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) {
      return res.status(500).json({ error: '即梦未返回图片，响应: ' + JSON.stringify(data) });
    }

    res.json({ url: imageUrl, revised_prompt: data?.data?.[0]?.revised_prompt });
  } catch (err) {
    res.status(500).json({ error: '网络错误: ' + err.message });
  }
};
```

- [ ] **Step 2.2：本地验证（需要先启动 vercel dev）**

```bash
ARK_API_KEY=你的key vercel dev &
sleep 3
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"金色腕表","size":"1:1"}' | jq .
```

Expected：返回 `{"url":"https://..."}`

- [ ] **Step 2.3：Commit**

```bash
git add api/generate.js
git commit -m "feat: add T2I serverless function"
```

---

## Task 3：api/generate-video.js — 图生视频任务创建

**Files:**
- Create: `api/generate-video.js`

---

- [ ] **Step 3.1：在火山引擎控制台确认视频模型已开通**

访问 https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement  
搜索 `seeddance`，确认 `doubao-seeddance-1-0-lite-i2v` 已开通。

⚠️ 若未开通，先不做 Step 3.2，改为在 Task 8 前端中注释掉 I2V 调用，用 T2I 图片演示，等模型开通后再解注。

- [ ] **Step 3.2：创建 `api/generate-video.js`**

```javascript
// api/generate-video.js
// 图生视频：接收 imageBase64/imageUrl + rotation + background
// 向即梦 I2V API 提交异步任务，立即返回 taskId
// 前端拿到 taskId 后去 /api/task/:taskId 轮询结果

const I2V_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';
const I2V_MODEL = 'doubao-seeddance-1-0-lite-i2v-250428';

// 旋转方式 → Prompt 描述
const ROTATION_PROMPTS = {
  horizontal: 'smooth horizontal 360-degree rotation around vertical Y-axis',
  vertical:   'vertical flip rotation around horizontal X-axis',
  spiral:     'spiral ascending motion with continuous rotation upward',
  pulse:      'pulsing scale breathe animation with subtle slow rotation',
};

// 背景效果 → Prompt 描述
const BG_PROMPTS = {
  pure_black: 'pure black background #000000, no background elements',
  particles:  'pure black background with floating luminous particle streams',
  glow:       'dark background with soft radial neon glow halo around subject',
  cyber:      'dark background with dim cyan cyberpunk grid lines',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ARK_API_KEY = process.env.ARK_API_KEY;
  if (!ARK_API_KEY) {
    return res.status(500).json({ error: 'ARK_API_KEY 未设置' });
  }

  const { imageBase64, imageUrl, rotation, background } = req.body;

  if (!rotation || !background) {
    return res.status(400).json({ error: '请选择旋转方式和背景效果' });
  }
  if (!imageBase64 && !imageUrl) {
    return res.status(400).json({ error: '请提供图片（上传或文生图 URL）' });
  }

  const prompt = [
    ROTATION_PROMPTS[rotation] || ROTATION_PROMPTS.horizontal,
    BG_PROMPTS[background]    || BG_PROMPTS.pure_black,
    'holographic 3D render, neon glow outline, seamless loop, suitable for holographic fan display',
  ].join(', ');

  const content = [
    { type: 'image_url', image_url: { url: imageBase64 || imageUrl } },
    { type: 'text', text: prompt },
  ];

  try {
    const response = await fetch(I2V_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({ model: I2V_MODEL, content }),
    });

    const data = await response.json();

    if (!response.ok || !data.id) {
      const msg = data?.error?.message || JSON.stringify(data);
      return res.status(response.status || 500).json({ error: `I2V 任务创建失败: ${msg}` });
    }

    // 立即返回，不等视频生成完成
    res.json({ taskId: data.id, estimatedSeconds: 45 });
  } catch (err) {
    res.status(500).json({ error: '网络错误: ' + err.message });
  }
};
```

- [ ] **Step 3.3：Commit**

```bash
git add api/generate-video.js
git commit -m "feat: add I2V task creation serverless function"
```

---

## Task 4：api/task/[taskId].js — 轮询任务状态

**Files:**
- Create: `api/task/[taskId].js`（Vercel 动态路由，`[taskId]` 是文件夹中的方括号文件名）

---

- [ ] **Step 4.1：创建目录和文件**

```bash
mkdir -p api/task
```

- [ ] **Step 4.2：创建 `api/task/[taskId].js`**

```javascript
// api/task/[taskId].js
// 轮询即梦视频任务状态
// Vercel 动态路由：/api/task/abc123 → req.query.taskId = 'abc123'

const TASK_BASE = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

module.exports = async function handler(req, res) {
  const { taskId } = req.query;
  const ARK_API_KEY = process.env.ARK_API_KEY;

  if (!ARK_API_KEY) return res.status(500).json({ error: 'ARK_API_KEY 未设置' });
  if (!taskId) return res.status(400).json({ error: '缺少 taskId' });

  try {
    const response = await fetch(`${TASK_BASE}/${taskId}`, {
      headers: { 'Authorization': `Bearer ${ARK_API_KEY}` },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: JSON.stringify(data) });
    }

    // 即梦任务状态 → 统一状态
    const statusMap = {
      queued:    'processing',
      running:   'processing',
      succeeded: 'completed',
      failed:    'failed',
    };

    // 从 content 数组中找到视频
    const videoItem = (data.content || []).find(c => c.type === 'video_url');

    res.json({
      status:    statusMap[data.status] || 'processing',
      videoUrl:  videoItem?.video_url?.url || null,
      rawStatus: data.status,
    });
  } catch (err) {
    res.status(500).json({ error: '查询失败: ' + err.message });
  }
};
```

- [ ] **Step 4.3：本地验证（用一个已存在的 taskId 测试，或用假 ID 确认不崩溃）**

```bash
curl -s http://localhost:3000/api/task/fake_task_id | jq .
```

Expected：返回错误 JSON，但 HTTP 状态 200/500（不崩溃）

- [ ] **Step 4.4：Commit**

```bash
git add api/task/
git commit -m "feat: add task polling serverless function"
```

---

## Task 5：api/seller-apply.js — 卖家入驻

**Files:**
- Create: `api/seller-apply.js`

---

- [ ] **Step 5.1：创建 `api/seller-apply.js`**

```javascript
// api/seller-apply.js
// 卖家入驻申请：接收表单数据，可选通过飞书 Webhook 通知运营者

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, wechat, designStyle, priceRange } = req.body;

  if (!name?.trim() || !wechat?.trim()) {
    return res.status(400).json({ error: '姓名和微信号为必填项' });
  }

  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: {
            text: [
              '🎨 新卖家入驻申请！',
              `姓名：${name}`,
              `微信：${wechat}`,
              `设计风格：${designStyle || '未填'}`,
              `定价偏好：${priceRange || '未填'}`,
            ].join('\n'),
          },
        }),
      });
    } catch (e) {
      // 通知失败不影响用户请求
      console.error('飞书通知失败:', e.message);
    }
  }

  res.json({ message: '申请已提交，我们将在 24 小时内联系你！' });
};
```

- [ ] **Step 5.2：验证**

```bash
curl -s -X POST http://localhost:3000/api/seller-apply \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","wechat":"zhangsan123","designStyle":"奢品","priceRange":"¥29.9"}' | jq .
```

Expected：`{"message":"申请已提交，我们将在 24 小时内联系你！"}`

```bash
# 验证空字段校验
curl -s -X POST http://localhost:3000/api/seller-apply \
  -H "Content-Type: application/json" \
  -d '{"name":""}' | jq .
```

Expected：`{"error":"姓名和微信号为必填项"}`，HTTP 400

- [ ] **Step 5.3：Commit**

```bash
git add api/seller-apply.js
git commit -m "feat: add seller onboarding API"
```

---

## Task 6：api/custom-order.js — 定制委托

**Files:**
- Create: `api/custom-order.js`

---

- [ ] **Step 6.1：创建 `api/custom-order.js`**

```javascript
// api/custom-order.js
// 定制委托：接收需求描述，通过飞书通知运营者

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, industry, contact } = req.body;

  if (!description?.trim() || !contact?.trim()) {
    return res.status(400).json({ error: '需求描述和联系方式为必填项' });
  }

  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: {
            text: [
              '📋 新定制委托！',
              `需求：${description}`,
              `行业：${industry || '未填'}`,
              `联系方式：${contact}`,
            ].join('\n'),
          },
        }),
      });
    } catch (e) {
      console.error('飞书通知失败:', e.message);
    }
  }

  res.json({ message: '需求已收到，我们将在 24 小时内报价！' });
};
```

- [ ] **Step 6.2：Commit**

```bash
git add api/custom-order.js
git commit -m "feat: add custom order API"
```

---

## Task 7：index.html — 骨架重构（Nav + 状态 + 付费弹窗）

**Files:**
- Create: `index.html`（mvp_hi_fi.html 的全量升级版）

说明：这个 Task 写 index.html 的骨架结构（App state、Nav、付费弹窗），后续 Task 8–10 填充各 Tab 内容。

---

- [ ] **Step 7.1：创建 index.html 基础骨架**

整个文件替换，把 `index.html` 写为下面的内容（Tasks 8–10 会在此基础上补充 Tab 内容）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>卫黎 3D 内容平台</title>
  <script src="https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #020408; --accent: #38bdf8; }
    body { background: var(--bg); color: #f1f5f9; font-family: 'Inter', sans-serif; margin: 0; overflow-x: hidden; }
    .orbitron { font-family: 'Orbitron', sans-serif; }
    .glass { background: rgba(255,255,255,0.02); backdrop-filter: blur(28px); border: 1px solid rgba(255,255,255,0.06); }
    .btn-blue { background: #2563eb; color: #fff; border: 1px solid #3b82f6; transition: all 0.3s; cursor: pointer; }
    .btn-blue:hover { background: #3b82f6; box-shadow: 0 0 30px rgba(59,130,246,0.5); transform: translateY(-1px); }
    .pill-active { background: white; color: black; box-shadow: 0 10px 20px rgba(255,255,255,0.2); }
    .category-pill { border-radius: 9999px; transition: all 0.3s; white-space: nowrap; }
    #page-loading { position: fixed; inset: 0; z-index: 9999; background: #020408; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.5s; }
    .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.05); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loaded #page-loading { opacity: 0; visibility: hidden; }
    .hologram-asset { animation: float-h 6s ease-in-out infinite; }
    @keyframes float-h { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
    /* 隐藏横向滚动条（分类 pills） */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    /* 选项卡选中态 */
    .param-pill { cursor: pointer; border-radius: 9999px; padding: 6px 18px; font-size: 12px; font-weight: 700; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.08); color: #64748b; }
    .param-pill.selected { background: #2563eb; color: white; border-color: #3b82f6; box-shadow: 0 0 12px rgba(59,130,246,0.4); }
    .param-pill:hover:not(.selected) { color: #cbd5e1; border-color: rgba(255,255,255,0.2); }
  </style>
</head>
<body>
  <div id="page-loading">
    <div class="spinner"></div>
    <p class="orbitron text-[10px] mt-6 tracking-[0.6em] text-slate-500 uppercase">Loading...</p>
  </div>
  <div id="root"></div>

  <script>
    const e = React.createElement;
    const { useState, useEffect, useCallback, useRef } = React;

    // ── 工具函数 ──────────────────────────────────────────────────────────
    function Icon({ name, className = "w-5 h-5" }) {
      useEffect(() => { if (window.lucide) window.lucide.createIcons(); }, [name]);
      return e('i', { 'data-lucide': name, className });
    }

    // ── 顶部导航 ──────────────────────────────────────────────────────────
    const TABS = ['素材库', 'AI生成', '卖家入驻', '定制委托'];

    function Nav({ activeTab, setActiveTab }) {
      return e('nav', {
        className: "fixed top-0 left-0 w-full z-50 glass border-b border-white/5 px-6 lg:px-10 py-5 flex justify-between items-center shadow-2xl"
      },
        // Logo
        e('div', { className: "flex items-center gap-3 cursor-pointer" },
          e('div', { className: "w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg" },
            e(Icon, { name: "atom", className: "text-white w-5 h-5" })
          ),
          e('span', { className: "orbitron text-xl font-black text-white tracking-tighter" },
            "卫黎 ", e('span', { className: "text-blue-500" }, "3D")
          )
        ),
        // Tabs（桌面端）
        e('div', { className: "hidden lg:flex gap-8 bg-white/5 px-8 py-3 rounded-full border border-white/5" },
          TABS.map(tab => e('button', {
            key: tab,
            onClick: () => setActiveTab(tab),
            className: `text-[10px] tracking-[0.3em] font-black uppercase transition-all ${activeTab === tab ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`
          }, tab))
        ),
        // Tabs（移动端：小图标 + 文字）
        e('div', { className: "flex lg:hidden gap-2" },
          TABS.map(tab => e('button', {
            key: tab,
            onClick: () => setActiveTab(tab),
            className: `px-3 py-1.5 text-[9px] tracking-wider font-black uppercase rounded-full transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-400'}`
          }, tab))
        )
      );
    }

    // ── 付费内容联系弹窗 ─────────────────────────────────────────────────
    function PaidModal({ item, onClose }) {
      return e('div', {
        className: "fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl",
        onClick: (ev) => ev.target === ev.currentTarget && onClose()
      },
        e('div', { className: "glass rounded-[3rem] w-full max-w-sm p-12 text-center relative" },
          e('button', { onClick: onClose, className: "absolute top-8 right-8 text-slate-500 hover:text-white" },
            e(Icon, { name: "x", className: "w-5 h-5" })
          ),
          e('div', { className: "w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6" },
            e(Icon, { name: "lock", className: "w-8 h-8 text-blue-400" })
          ),
          e('h3', { className: "text-xl font-black orbitron text-white mb-2" }, item?.title || '付费素材'),
          e('p', { className: "text-3xl font-black text-blue-400 orbitron mb-6" }, `¥${item?.price}`),
          e('p', { className: "text-slate-400 text-sm mb-8 leading-relaxed" }, "请添加微信联系购买，获得高清 .mp4 全息视频文件"),
          e('div', { className: "bg-white/5 rounded-2xl p-4 text-sm text-slate-300 font-mono tracking-wider" }, "微信：weili_3d"),
          e('p', { className: "text-slate-600 text-xs mt-4" }, "备注「购买素材」即可")
        )
      );
    }

    // ── 素材卡片 ─────────────────────────────────────────────────────────
    function MaterialCard({ m, onPaid }) {
      const isFree = m.price === '免费' || m.price === 0 || m.price === '0';

      if (m.isPlaceholder) {
        return e('div', {
          className: "mb-8 glass rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 cursor-pointer border-dashed border-white/10 opacity-40 hover:opacity-80 transition-all min-h-[300px]"
        },
          e('div', { className: "w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-slate-700" },
            e(Icon, { name: "plus", className: "w-6 h-6" })
          ),
          e('p', { className: "text-[10px] orbitron font-black uppercase tracking-[0.3em] text-slate-700 italic" }, "Seat Reserved")
        );
      }

      return e('div', {
        className: "mb-8 glass rounded-[2.5rem] p-3 hover:border-blue-500/40 transition-all duration-700 cursor-pointer group shadow-2xl",
        onClick: () => !isFree && onPaid(m)
      },
        e('div', { className: `relative overflow-hidden rounded-[2rem] bg-black ${m.h}` },
          e('img', {
            src: m.img,
            onError: (ev) => { ev.target.src = 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80'; },
            className: "w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[2000ms]"
          }),
          e('div', { className: "absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" }),
          e('div', { className: "absolute top-4 left-4 flex gap-2" },
            e('span', { className: "px-3 py-1.5 bg-black/40 glass border-white/10 rounded-full text-[9px] orbitron font-black text-blue-400 uppercase tracking-widest" }, m.type),
            isFree && e('span', { className: "px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full text-[9px] orbitron font-black text-green-400 uppercase" }, "FREE")
          ),
          e('div', { className: "absolute bottom-5 left-6 right-6 flex justify-between items-end" },
            e('div', null,
              e('h3', { className: "text-base font-bold text-white group-hover:text-blue-400 transition-colors" }, m.title)
            ),
            isFree
              ? e('a', {
                  href: m.img, download: m.title + '.png',
                  onClick: (ev) => ev.stopPropagation(),
                  className: "w-8 h-8 bg-green-600/80 rounded-full flex items-center justify-center hover:bg-green-500 transition-all"
                }, e(Icon, { name: "download", className: "w-4 h-4 text-white" }))
              : e('span', { className: "orbitron font-black text-white text-lg" }, `¥${m.price}`)
          )
        )
      );
    }

    // ── 占位 Tab（Task 8–10 会替换这里） ──────────────────────────────────
    function AiTab() {
      return e('div', { className: "py-40 text-center opacity-20" },
        e(Icon, { name: "aperture", className: "w-20 h-20 mx-auto" }),
        e('p', { className: "orbitron text-sm mt-4 tracking-widest" }, "AI 生成 — Coming in Task 8")
      );
    }

    function SellerTab() {
      return e('div', { className: "py-40 text-center opacity-20" },
        e(Icon, { name: "store", className: "w-20 h-20 mx-auto" }),
        e('p', { className: "orbitron text-sm mt-4 tracking-widest" }, "卖家入驻 — Coming in Task 9")
      );
    }

    function CustomTab() {
      return e('div', { className: "py-40 text-center opacity-20" },
        e(Icon, { name: "pen-tool", className: "w-20 h-20 mx-auto" }),
        e('p', { className: "orbitron text-sm mt-4 tracking-widest" }, "定制委托 — Coming in Task 10")
      );
    }

    // ── 素材库数据 ────────────────────────────────────────────────────────
    const ASSETS_BASE = [
      { t: "金鳞神龙", c: "动物", i: "assets/dragon.png",   h: "aspect-[14/21]", p: "59.0" },
      { t: "皇家钻表", c: "奢品", i: "assets/watch.png",    h: "aspect-[14/15]", p: "35.0" },
      { t: "金鳞猛虎", c: "动物", i: "assets/tiger.png",    h: "aspect-[14/19]", p: "19.9" },
      { t: "极光运动鞋", c: "潮配", i: "assets/sneaker.png", h: "aspect-[14/14]", p: "免费"  },
      { t: "奢牌香水", c: "奢品", i: "assets/perfume.png",  h: "aspect-[14/18]", p: "29.9" },
      { t: "黑金流体", c: "抽象", i: "assets/sphere.png",   h: "aspect-[14/14]", p: "免费"  },
      { t: "能量核心", c: "抽象", i: "assets/core.png",     h: "aspect-[14/14]", p: "24.9" },
      { t: "商务魔方", c: "商务", i: "assets/business.png", h: "aspect-[14/14]", p: "29.9" },
    ];

    function buildMaterials() {
      const list = [];
      for (let i = 1; i <= 32; i++) {
        const b = ASSETS_BASE[i % ASSETS_BASE.length];
        list.push({ id: `HMX_${String(i).padStart(3,'0')}`, title: `${b.t} v${i}`, type: b.c, img: b.i, h: b.h, price: b.p });
      }
      list.push({ id: 'P1', isPlaceholder: true }, { id: 'P2', isPlaceholder: true });
      return list;
    }

    // ── 主 App ────────────────────────────────────────────────────────────
    function App() {
      const [activeTab, setActiveTab] = useState('素材库');
      const [selectedCat, setSelectedCat] = useState('全部');
      const [paidItem, setPaidItem] = useState(null);   // 付费弹窗
      const materials = React.useMemo(buildMaterials, []);
      const filtered = selectedCat === '全部' ? materials : materials.filter(m => m.isPlaceholder || m.type === selectedCat);

      useEffect(() => { setTimeout(() => document.body.classList.add('loaded'), 400); }, []);

      return e('div', { className: "min-h-screen bg-[#020408]" },
        e(Nav, { activeTab, setActiveTab }),

        // 页面内容区
        e('div', { className: "pt-28 px-4 sm:px-6 lg:px-16 xl:px-24 mx-auto pb-24 max-w-[1920px]" },

          // ── Tab: 素材库 ────────────────────────────────────────────────
          activeTab === '素材库' && e('div', null,
            // 页头
            e('header', { className: "mb-12 mt-4" },
              e('h1', { className: "text-5xl lg:text-7xl font-black tracking-tighter text-white italic mb-2" }, "素材库"),
              e('p', { className: "text-slate-500 text-sm" }, "全息风扇 3D 素材 — 免费下载 & 付费购买")
            ),
            // 搜索 + 分类
            e('div', { className: "flex flex-col lg:flex-row gap-4 items-center justify-between glass p-2 rounded-full px-6 border-white/5 mb-10" },
              e('div', { className: "w-full lg:w-1/3 relative" },
                e(Icon, { name: "search", className: "absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 w-4 h-4" }),
                e('input', { type: "text", placeholder: "搜索素材...", className: "w-full bg-transparent border-none py-4 px-12 text-sm focus:outline-none text-slate-200 placeholder-slate-700" })
              ),
              e('div', { className: "flex gap-2 overflow-x-auto py-2 no-scrollbar" },
                ['全部','动物','奢品','潮配','抽象','商务'].map(c => e('button', {
                  key: c,
                  onClick: () => setSelectedCat(c),
                  className: `category-pill px-6 py-2.5 text-[10px] orbitron font-black uppercase tracking-[0.2em] border border-white/5 ${selectedCat===c?'pill-active':'glass text-slate-500 hover:text-white'}`
                }, c))
              )
            ),
            // 网格
            e('div', { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" },
              filtered.map(m => e(MaterialCard, { key: m.id, m, onPaid: setPaidItem }))
            )
          ),

          // ── Tab: AI生成、卖家入驻、定制委托（Task 8–10 填充）──────────────
          activeTab === 'AI生成'  && e(AiTab, null),
          activeTab === '卖家入驻' && e(SellerTab, null),
          activeTab === '定制委托' && e(CustomTab, null)
        ),

        // 付费弹窗
        paidItem && e(PaidModal, { item: paidItem, onClose: () => setPaidItem(null) })
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(e(App));
  </script>
</body>
</html>
```

- [ ] **Step 7.2：本地验证素材库 Tab（需要 vercel dev，不能直接 open file://）**

```bash
vercel dev
# 浏览器打开 http://localhost:3000
```

检查：素材库有网格、分类筛选有效、点击付费素材弹出联系微信弹窗、点击免费素材的下载按钮能触发下载。  
注意：此步 API 调用（如生成功能）会 404，是正常的——Task 2-6 的 API 还没创建完毕。

- [ ] **Step 7.3：Commit**

```bash
git add index.html
git commit -m "feat: index.html scaffold with material library and paid modal"
```

---

## Task 8：index.html — AI 生成 Tab（图生视频核心功能）

**Files:**
- Modify: `index.html`（替换 `AiTab` 占位函数）

---

- [ ] **Step 8.1：用以下代码替换 index.html 中的 `function AiTab()` 函数**

找到并替换：
```javascript
    function AiTab() {
      return e('div', { className: "py-40 text-center opacity-20" },
        e(Icon, { name: "aperture", className: "w-20 h-20 mx-auto" }),
        e('p', { className: "orbitron text-sm mt-4 tracking-widest" }, "AI 生成 — Coming in Task 8")
      );
    }
```

替换为：

```javascript
    // ── 旋转方式 & 背景效果配置 ────────────────────────────────────────────
    const ROTATIONS = [
      { id: 'horizontal', label: '水平环绕' },
      { id: 'vertical',   label: '垂直翻转' },
      { id: 'spiral',     label: '螺旋上升' },
      { id: 'pulse',      label: '脉冲呼吸' },
    ];
    const BACKGROUNDS = [
      { id: 'pure_black', label: '纯黑（标准）' },
      { id: 'particles',  label: '粒子流光' },
      { id: 'glow',       label: '暗光光晕' },
      { id: 'cyber',      label: '赛博格栅' },
    ];

    function AiTab() {
      const [aiMode, setAiMode]           = useState('upload');  // 'upload' | 'keyword'
      const [uploadedImg, setUploadedImg] = useState(null);      // { dataUrl, name }
      const [keyword, setKeyword]         = useState('');
      const [rotation, setRotation]       = useState('');
      const [background, setBackground]   = useState('');
      const [genStep, setGenStep]         = useState('idle');    // idle|t2i|i2v|polling|done|error
      const [taskId, setTaskId]           = useState(null);
      const [videoUrl, setVideoUrl]       = useState(null);
      const [genError, setGenError]       = useState('');
      const [t2iPreview, setT2iPreview]   = useState(null);      // keyword 模式中间产物
      const fileInputRef = useRef(null);

      // ── 轮询 ────────────────────────────────────────────────────────────
      useEffect(() => {
        if (genStep !== 'polling' || !taskId) return;
        const interval = setInterval(async () => {
          try {
            const res  = await fetch(`/api/task/${taskId}`);
            const data = await res.json();
            if (data.status === 'completed' && data.videoUrl) {
              setVideoUrl(data.videoUrl);
              setGenStep('done');
            } else if (data.status === 'failed') {
              setGenError('视频生成失败，请重试');
              setGenStep('error');
            }
          } catch (err) {
            setGenError(err.message);
            setGenStep('error');
          }
        }, 3000);
        return () => clearInterval(interval);
      }, [genStep, taskId]);

      // ── 文件上传处理 ─────────────────────────────────────────────────────
      function handleFileChange(ev) {
        const file = ev.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setUploadedImg({ dataUrl: e.target.result, name: file.name });
        reader.readAsDataURL(file);
      }

      // ── 生成处理 ─────────────────────────────────────────────────────────
      async function handleGenerate() {
        if (!rotation)   { setGenError('请选择旋转方式'); return; }
        if (!background) { setGenError('请选择背景效果'); return; }
        if (aiMode === 'keyword' && !keyword.trim()) { setGenError('请输入关键词'); return; }
        if (aiMode === 'upload'  && !uploadedImg)    { setGenError('请上传产品图片'); return; }

        setGenError('');
        setVideoUrl(null);
        setTaskId(null);
        setT2iPreview(null);

        try {
          let imageBase64 = null;
          let imageUrl    = null;

          if (aiMode === 'keyword') {
            // Step 1: 文生图
            setGenStep('t2i');
            const t2iRes  = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: keyword.trim(), size: '1:1' }),
            });
            const t2iData = await t2iRes.json();
            if (!t2iRes.ok) throw new Error(t2iData.error || '文生图失败');
            imageUrl = t2iData.url;
            setT2iPreview(imageUrl);
          } else {
            imageBase64 = uploadedImg.dataUrl;
          }

          // Step 2: 图生视频
          setGenStep('i2v');
          const i2vRes  = await fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(imageBase64 ? { imageBase64 } : { imageUrl }),
              rotation,
              background,
            }),
          });
          const i2vData = await i2vRes.json();
          if (!i2vRes.ok) throw new Error(i2vData.error || '视频任务创建失败');

          setTaskId(i2vData.taskId);
          setGenStep('polling');
        } catch (err) {
          setGenError(err.message);
          setGenStep('error');
        }
      }

      function handleReset() {
        setGenStep('idle'); setVideoUrl(null); setTaskId(null);
        setGenError(''); setT2iPreview(null); setUploadedImg(null);
        setKeyword(''); setRotation(''); setBackground('');
      }

      const isGenerating = ['t2i','i2v','polling'].includes(genStep);
      const STEP_LABELS  = { t2i: '正在生成参考图…', i2v: '正在提交视频任务…', polling: '正在渲染旋转视频…约 40 秒' };

      // ── 渲染 ──────────────────────────────────────────────────────────
      return e('div', { className: "max-w-3xl mx-auto py-8" },
        // 标题
        e('header', { className: "mb-10" },
          e('h1', { className: "text-5xl lg:text-7xl font-black tracking-tighter text-white italic mb-2" }, "AI 生成"),
          e('p', { className: "text-slate-500 text-sm" }, "上传产品图或输入关键词 → 选参数 → 生成全息旋转视频 .mp4")
        ),

        // ── 输入方式切换 ──────────────────────────────────────────────────
        e('div', { className: "flex gap-3 mb-6" },
          ['upload','keyword'].map((mode, idx) => e('button', {
            key: mode,
            onClick: () => { setAiMode(mode); setGenError(''); },
            className: `px-6 py-2.5 rounded-full text-sm font-bold transition-all border ${aiMode===mode?'bg-blue-600 text-white border-blue-500':'glass text-slate-400 border-white/10 hover:text-white'}`
          }, idx===0 ? '📸 上传产品图' : '✏️ 输入关键词'))
        ),

        // ── 上传区 ───────────────────────────────────────────────────────
        aiMode === 'upload' && e('div', { className: "mb-6" },
          e('div', {
            className: `glass rounded-[2rem] border-2 border-dashed ${uploadedImg?'border-blue-500/50':'border-white/10'} p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/40 transition-all min-h-[200px]`,
            onClick: () => fileInputRef.current?.click()
          },
            uploadedImg
              ? e('img', { src: uploadedImg.dataUrl, className: "max-h-40 rounded-xl object-contain" })
              : e('div', { className: "flex flex-col items-center gap-3 opacity-40" },
                  e(Icon, { name: "upload-cloud", className: "w-12 h-12 text-slate-400" }),
                  e('p', { className: "text-sm text-slate-500" }, "点击上传产品图（JPG / PNG）")
                ),
            uploadedImg && e('p', { className: "text-xs text-slate-500 mt-2" }, uploadedImg.name)
          ),
          e('input', { type: "file", accept: "image/*", ref: fileInputRef, style:{display:'none'}, onChange: handleFileChange })
        ),

        // ── 关键词输入 ────────────────────────────────────────────────────
        aiMode === 'keyword' && e('div', { className: "mb-6" },
          e('input', {
            value: keyword,
            placeholder: "例：金色腕表 / 龙形摆件 / 极光运动鞋",
            onChange: ev => setKeyword(ev.target.value),
            className: "w-full glass rounded-2xl px-6 py-4 text-base text-white placeholder-slate-700 border border-white/8 focus:outline-none focus:border-blue-500/50 transition-all"
          }),
          t2iPreview && e('div', { className: "mt-3 flex items-center gap-3" },
            e('img', { src: t2iPreview, className: "w-16 h-16 rounded-xl object-cover" }),
            e('p', { className: "text-xs text-slate-500" }, "参考图已生成，正在转换为视频…")
          )
        ),

        // ── 旋转方式（必选）─────────────────────────────────────────────
        e('div', { className: "glass rounded-2xl p-5 mb-4" },
          e('p', { className: "text-xs text-red-400 font-bold tracking-widest uppercase mb-3" }, "🔴 旋转方式（必选）"),
          e('div', { className: "flex flex-wrap gap-2" },
            ROTATIONS.map(r => e('button', {
              key: r.id,
              onClick: () => setRotation(r.id),
              className: `param-pill ${rotation===r.id?'selected':''}`
            }, r.label))
          )
        ),

        // ── 背景效果（必选）─────────────────────────────────────────────
        e('div', { className: "glass rounded-2xl p-5 mb-6" },
          e('p', { className: "text-xs text-red-400 font-bold tracking-widest uppercase mb-3" }, "🔴 背景效果（必选）"),
          e('div', { className: "flex flex-wrap gap-2" },
            BACKGROUNDS.map(b => e('button', {
              key: b.id,
              onClick: () => setBackground(b.id),
              className: `param-pill ${background===b.id?'selected':''}`
            }, b.label))
          )
        ),

        // ── 错误提示 ──────────────────────────────────────────────────────
        genError && e('div', { className: "flex items-center gap-2 text-red-400 text-sm mb-4 glass rounded-xl p-3 border border-red-500/20" },
          e(Icon, { name: "alert-circle", className: "w-4 h-4 flex-shrink-0" }),
          e('span', null, genError)
        ),

        // ── 生成按钮 & 进度 ───────────────────────────────────────────────
        e('div', { className: "flex gap-3 items-center mb-8" },
          e('button', {
            onClick: handleGenerate,
            disabled: isGenerating,
            className: "btn-blue flex-1 py-4 rounded-2xl text-sm orbitron font-black tracking-[0.2em] uppercase disabled:opacity-40 disabled:cursor-not-allowed"
          }, isGenerating ? STEP_LABELS[genStep] : '🎬 开始生成'),
          genStep !== 'idle' && e('button', {
            onClick: handleReset,
            className: "glass px-5 py-4 rounded-2xl text-sm text-slate-500 hover:text-white transition-all"
          }, e(Icon, { name: "refresh-ccw", className: "w-4 h-4" }))
        ),

        // ── 进度条（生成中） ──────────────────────────────────────────────
        isGenerating && e('div', { className: "mb-8" },
          e('div', { className: "h-1.5 bg-white/5 rounded-full overflow-hidden" },
            e('div', {
              className: "h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000",
              style: { width: genStep==='t2i'?'25%': genStep==='i2v'?'40%':'85%', animation: genStep==='polling'?'progress-pulse 2s ease-in-out infinite':'' }
            })
          ),
          e('p', { className: "text-xs text-slate-500 mt-2 text-center" }, STEP_LABELS[genStep])
        ),

        // ── 生成结果 ──────────────────────────────────────────────────────
        genStep === 'done' && videoUrl && e('div', { className: "glass rounded-[2rem] p-6 border border-green-500/20" },
          e('video', {
            src: videoUrl, autoPlay: true, loop: true, muted: true, playsInline: true,
            className: "w-full rounded-2xl max-h-80 object-contain bg-black mb-4"
          }),
          e('div', { className: "flex gap-3" },
            e('a', {
              href: videoUrl, download: `hologram_${rotation}_${background}.mp4`, target: "_blank",
              className: "btn-blue flex-1 py-3 rounded-xl text-center text-sm orbitron font-black tracking-[0.2em] uppercase"
            }, '⬇ 下载 .mp4'),
            e('button', { onClick: handleReset, className: "glass px-6 py-3 rounded-xl text-sm text-slate-400 hover:text-white transition-all" }, "重新生成")
          ),
          e('p', { className: "text-xs text-slate-600 mt-3 text-center" }, "纯黑背景，可直接放入全息风扇播放")
        )
      );
    }
```

- [ ] **Step 8.2：在 `<style>` 中追加进度条动画**

在 `index.html` 的 `<style>` 块末尾追加：

```css
    @keyframes progress-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
```

- [ ] **Step 8.3：本地测试 AI 生成 Tab**

```bash
# 启动 vercel dev（需要 .env 已配置 ARK_API_KEY）
vercel dev
```

打开 http://localhost:3000，切换到「AI生成」Tab：
1. 上传一张产品图，选旋转方式 + 背景效果，点击「开始生成」
2. 观察进度条变化：i2v → polling
3. 约 40-60 秒后看到视频预览和下载按钮
4. 切换到「关键词」模式，输入「金色腕表」，同样测试完整流程

- [ ] **Step 8.4：Commit**

```bash
git add index.html
git commit -m "feat: AI lab tab with image-to-video generation"
```

---

## Task 9：index.html — 卖家入驻 Tab

**Files:**
- Modify: `index.html`（替换 `SellerTab` 占位函数）

---

- [ ] **Step 9.1：替换 `function SellerTab()` 为以下实现**

找到并替换：
```javascript
    function SellerTab() {
      return e('div', { className: "py-40 text-center opacity-20" },
        e(Icon, { name: "store", className: "w-20 h-20 mx-auto" }),
        e('p', { className: "orbitron text-sm mt-4 tracking-widest" }, "卖家入驻 — Coming in Task 9")
      );
    }
```

替换为：

```javascript
    function SellerTab() {
      const [form, setForm]         = useState({ name:'', wechat:'', designStyle:'', priceRange:'' });
      const [submitting, setSubmitting] = useState(false);
      const [submitted, setSubmitted]   = useState(false);
      const [error, setError]           = useState('');

      function setField(k, v) { setForm(f => ({...f, [k]: v})); }

      async function handleSubmit(ev) {
        ev.preventDefault();
        if (!form.name.trim() || !form.wechat.trim()) { setError('姓名和微信号为必填项'); return; }
        setSubmitting(true); setError('');
        try {
          const res  = await fetch('/api/seller-apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || '提交失败');
          setSubmitted(true);
        } catch (err) {
          setError(err.message);
        } finally {
          setSubmitting(false);
        }
      }

      if (submitted) return e('div', { className: "max-w-lg mx-auto py-24 text-center" },
        e('div', { className: "w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6" },
          e(Icon, { name: "check", className: "w-10 h-10 text-green-400" })
        ),
        e('h2', { className: "text-2xl font-black orbitron text-white mb-3" }, "申请已提交！"),
        e('p', { className: "text-slate-400" }, "我们将在 24 小时内通过微信联系你，确认入驻事项。")
      );

      return e('div', { className: "max-w-lg mx-auto py-8" },
        e('header', { className: "mb-10" },
          e('h1', { className: "text-5xl lg:text-7xl font-black tracking-tighter text-white italic mb-2" }, "卖家入驻"),
          e('p', { className: "text-slate-500 text-sm" }, "填写信息，24 小时内联系确认，素材上架后按销售分成")
        ),

        e('form', { onSubmit: handleSubmit, className: "space-y-4" },

          // 姓名
          e('div', null,
            e('label', { className: "block text-xs text-slate-500 uppercase tracking-widest mb-2" }, "姓名 *"),
            e('input', {
              value: form.name, required: true,
              onChange: ev => setField('name', ev.target.value),
              placeholder: "你的名字",
              className: "w-full glass rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-700 border border-white/8 focus:outline-none focus:border-blue-500/50 transition-all"
            })
          ),

          // 微信号
          e('div', null,
            e('label', { className: "block text-xs text-slate-500 uppercase tracking-widest mb-2" }, "微信号 *"),
            e('input', {
              value: form.wechat, required: true,
              onChange: ev => setField('wechat', ev.target.value),
              placeholder: "你的微信号",
              className: "w-full glass rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-700 border border-white/8 focus:outline-none focus:border-blue-500/50 transition-all"
            })
          ),

          // 设计风格
          e('div', null,
            e('label', { className: "block text-xs text-slate-500 uppercase tracking-widest mb-2" }, "擅长风格"),
            e('div', { className: "flex flex-wrap gap-2" },
              ['动物', '奢品', '潮配', '抽象', '商务', '自然', '赛博朋克'].map(style =>
                e('button', {
                  key: style, type: 'button',
                  onClick: () => setField('designStyle', style),
                  className: `param-pill ${form.designStyle===style?'selected':''}`
                }, style)
              )
            )
          ),

          // 定价偏好
          e('div', null,
            e('label', { className: "block text-xs text-slate-500 uppercase tracking-widest mb-2" }, "定价偏好"),
            e('div', { className: "flex flex-wrap gap-2" },
              ['免费分享', '¥9.9–29.9', '¥29.9–99', '面议'].map(p =>
                e('button', {
                  key: p, type: 'button',
                  onClick: () => setField('priceRange', p),
                  className: `param-pill ${form.priceRange===p?'selected':''}`
                }, p)
              )
            )
          ),

          error && e('div', { className: "flex items-center gap-2 text-red-400 text-sm glass rounded-xl p-3 border border-red-500/20" },
            e(Icon, { name: "alert-circle", className: "w-4 h-4 flex-shrink-0" }),
            e('span', null, error)
          ),

          e('button', {
            type: 'submit', disabled: submitting,
            className: "btn-blue w-full py-4 rounded-2xl text-sm orbitron font-black tracking-[0.2em] uppercase mt-2 disabled:opacity-40"
          }, submitting ? '提交中…' : '提交申请')
        ),

        // 分成说明
        e('div', { className: "mt-8 glass rounded-2xl p-5 border-white/5" },
          e('p', { className: "text-xs text-slate-500 uppercase tracking-widest mb-3" }, "分成说明"),
          e('div', { className: "grid grid-cols-3 gap-4 text-center" },
            [['50%','平台分成'],['50%','创作者'],['免费','素材不收费']].map(([v,l]) =>
              e('div', { key: l },
                e('p', { className: "text-xl font-black text-blue-400 orbitron" }, v),
                e('p', { className: "text-[10px] text-slate-600 mt-1" }, l)
              )
            )
          )
        )
      );
    }
```

- [ ] **Step 9.2：验证卖家入驻 Tab**

```bash
# 确保 vercel dev 运行中
# 切换到「卖家入驻」Tab
# 填写姓名 + 微信号 → 提交 → 看到成功提示
# 测试空提交 → 看到错误提示
```

- [ ] **Step 9.3：Commit**

```bash
git add index.html
git commit -m "feat: seller onboarding tab"
```

---

## Task 10：index.html — 定制委托 Tab

**Files:**
- Modify: `index.html`（替换 `CustomTab` 占位函数）

---

- [ ] **Step 10.1：替换 `function CustomTab()` 为以下实现**

找到并替换：
```javascript
    function CustomTab() {
      return e('div', { className: "py-40 text-center opacity-20" },
        e(Icon, { name: "pen-tool", className: "w-20 h-20 mx-auto" }),
        e('p', { className: "orbitron text-sm mt-4 tracking-widest" }, "定制委托 — Coming in Task 10")
      );
    }
```

替换为：

```javascript
    function CustomTab() {
      const [form, setForm]             = useState({ description:'', industry:'', contact:'' });
      const [submitting, setSubmitting] = useState(false);
      const [submitted, setSubmitted]   = useState(false);
      const [error, setError]           = useState('');

      function setField(k, v) { setForm(f => ({...f, [k]: v})); }

      async function handleSubmit(ev) {
        ev.preventDefault();
        if (!form.description.trim() || !form.contact.trim()) { setError('需求描述和联系方式为必填项'); return; }
        setSubmitting(true); setError('');
        try {
          const res  = await fetch('/api/custom-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || '提交失败');
          setSubmitted(true);
        } catch (err) {
          setError(err.message);
        } finally {
          setSubmitting(false);
        }
      }

      if (submitted) return e('div', { className: "max-w-lg mx-auto py-24 text-center" },
        e('div', { className: "w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6" },
          e(Icon, { name: "check", className: "w-10 h-10 text-blue-400" })
        ),
        e('h2', { className: "text-2xl font-black orbitron text-white mb-3" }, "需求已收到！"),
        e('p', { className: "text-slate-400" }, "我们将在 24 小时内报价，请保持联系方式畅通。")
      );

      return e('div', { className: "max-w-lg mx-auto py-8" },
        e('header', { className: "mb-10" },
          e('h1', { className: "text-5xl lg:text-7xl font-black tracking-tighter text-white italic mb-2" }, "定制委托"),
          e('p', { className: "text-slate-500 text-sm" }, "描述你的需求，我们生成专属全息视频，24 小时内报价")
        ),

        e('form', { onSubmit: handleSubmit, className: "space-y-4" },

          // 需求描述
          e('div', null,
            e('label', { className: "block text-xs text-slate-500 uppercase tracking-widest mb-2" }, "需求描述 *"),
            e('textarea', {
              value: form.description, required: true, rows: 4,
              onChange: ev => setField('description', ev.target.value),
              placeholder: "例：需要一个旋转的金色腕表展示视频，用于展会展示，要有粒子特效",
              className: "w-full glass rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-700 border border-white/8 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
            })
          ),

          // 行业
          e('div', null,
            e('label', { className: "block text-xs text-slate-500 uppercase tracking-widest mb-2" }, "行业"),
            e('div', { className: "flex flex-wrap gap-2" },
              ['奢品', '电商', '餐饮', '汽车', '娱乐', '教育', '其他'].map(ind =>
                e('button', {
                  key: ind, type: 'button',
                  onClick: () => setField('industry', ind),
                  className: `param-pill ${form.industry===ind?'selected':''}`
                }, ind)
              )
            )
          ),

          // 联系方式
          e('div', null,
            e('label', { className: "block text-xs text-slate-500 uppercase tracking-widest mb-2" }, "联系方式 *"),
            e('input', {
              value: form.contact, required: true,
              onChange: ev => setField('contact', ev.target.value),
              placeholder: "微信号 / 手机号",
              className: "w-full glass rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-700 border border-white/8 focus:outline-none focus:border-blue-500/50 transition-all"
            })
          ),

          error && e('div', { className: "flex items-center gap-2 text-red-400 text-sm glass rounded-xl p-3 border border-red-500/20" },
            e(Icon, { name: "alert-circle", className: "w-4 h-4 flex-shrink-0" }),
            e('span', null, error)
          ),

          e('button', {
            type: 'submit', disabled: submitting,
            className: "btn-blue w-full py-4 rounded-2xl text-sm orbitron font-black tracking-[0.2em] uppercase mt-2 disabled:opacity-40"
          }, submitting ? '提交中…' : '提交需求')
        ),

        // 价格参考
        e('div', { className: "mt-8 glass rounded-2xl p-5 border-white/5" },
          e('p', { className: "text-xs text-slate-500 uppercase tracking-widest mb-3" }, "价格参考"),
          e('div', { className: "space-y-2" },
            [['标准定制', '¥199', '1 条旋转视频，5 秒，1080×1080'],
             ['品牌套餐', '¥599', '5 条不同效果，含修改 2 次'],
             ['展会套装', '¥1,299', '10 条 + 专属背景 + 极速 48h 交付']].map(([t,p,d]) =>
              e('div', { key: t, className: "flex justify-between items-center py-2 border-b border-white/5" },
                e('div', null,
                  e('p', { className: "text-sm text-white font-bold" }, t),
                  e('p', { className: "text-xs text-slate-600" }, d)
                ),
                e('span', { className: "text-blue-400 orbitron font-black" }, p)
              )
            )
          )
        )
      );
    }
```

- [ ] **Step 10.2：全量验证**

```bash
# 测试所有 4 个 Tab 功能
# 1. 素材库：分类筛选、免费下载、付费弹窗
# 2. AI生成：上传图片 → 选参数 → 生成（真实调用 API）
# 3. 卖家入驻：填表单 → 提交 → 成功提示
# 4. 定制委托：填表单 → 提交 → 成功提示
```

- [ ] **Step 10.3：Commit**

```bash
git add index.html
git commit -m "feat: custom order tab — all 4 tabs complete"
```

---

## Task 11：部署到 Vercel

**Files:**
- No code changes，纯部署操作

---

- [ ] **Step 11.1：安装 Vercel CLI（若未安装）**

```bash
npm install -g vercel
```

- [ ] **Step 11.2：登录 Vercel**

```bash
vercel login
```

选择 GitHub 登录或邮箱登录，按提示操作。

- [ ] **Step 11.3：部署**

```bash
cd /Users/ivan/Desktop/AI-Native-Projects/yanglei
vercel --prod
```

提示配置时：
- Project name: `weili-3d-platform`（或保持默认）
- Which directory: `.`（当前目录）
- Override settings: No

部署完成后输出类似：`✅ Production: https://weili-3d-platform-xxx.vercel.app`

- [ ] **Step 11.4：设置环境变量（重要，.env 不会上传到 Vercel）**

```bash
vercel env add ARK_API_KEY production
# 粘贴：ark-4b5e52b8-4b47-4e41-b1fc-5f48ca85996b-13b44
# 按 Enter

vercel env add FEISHU_WEBHOOK_URL production
# 粘贴你的飞书 Webhook URL（没有的话直接按 Enter 跳过）
```

- [ ] **Step 11.5：重新部署（让环境变量生效）**

```bash
vercel --prod
```

- [ ] **Step 11.6：验证部署**

```bash
# 测试 API 健康
curl -s https://weili-3d-platform-xxx.vercel.app/api/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt":"金色腕表测试","size":"1:1"}' | jq .url
```

Expected：返回一个 `https://` 图片 URL

```bash
# 用中国手机测试
# 打开微信 → 右上角 + → 扫一扫 → 扫 Vercel 部署 URL 的二维码
# 确认页面可以打开
```

- [ ] **Step 11.7：把 URL 发给客户测试**

将 `https://weili-3d-platform-xxx.vercel.app` 链接发给第一批客户。

---

## 验证清单（全量）

- [ ] 素材库：网格正常显示，分类过滤有效
- [ ] 素材库：点免费素材能下载文件
- [ ] 素材库：点付费素材弹出「联系微信」Modal
- [ ] AI生成：上传图片路径 → 选旋转 + 背景 → 约 60 秒内出视频
- [ ] AI生成：关键词路径 → 约 70 秒内出视频（含 T2I 步骤）
- [ ] AI生成：未选参数直接点生成 → 显示错误提示（不崩溃）
- [ ] 卖家入驻：正常提交 → 成功提示
- [ ] 卖家入驻：空提交 → 错误提示（不崩溃）
- [ ] 定制委托：正常提交 → 成功提示
- [ ] Vercel URL：中国大陆手机可访问
