# 卫黎 3D 内容平台 MVP — 设计文档

**日期**: 2026-04-20  
**状态**: 已确认，待实施  
**项目路径**: `/Users/ivan/Desktop/AI-Native-Projects/yanglei/`

---

## 背景与目标

卫黎是一个面向全息风扇（holographic fan）硬件用户的 3D 内容分发平台。全息风扇需要**纯黑背景的旋转 3D 视频**（黑色=透明），当前市场上缺乏专业化的中立内容供应平台。

本次 MVP 目标：**2–3 天内上线一个中国大陆可访问、客户可真实体验的演示版本**，验证付费意愿，不做支付功能（第二阶段）。

参考产品：达斯琪、光厂、即梦。

---

## 范围边界

### ✅ 本次做

- 素材库（免费下载 + 付费联系）
- AI 图生视频（核心差异化功能，真实调用即梦 I2V API）
- 卖家入驻表单（真实提交，通知到运营微信）
- 定制委托表单
- 部署到 Railway HK，中国大陆可访问

### ❌ 不做（第二阶段）

- 用户注册 / 登录
- 在线支付（需 ICP 经营许可证）
- 数据库 / 素材动态管理
- 分销系统 / 积分 / 推广

---

## 信息架构

单页应用，4 个 Tab 导航：

| Tab | 身份 | 功能 |
|-----|------|------|
| 素材库 | 买家 | 浏览、分类筛选、免费下载、付费弹微信 |
| AI 生成 ⭐ | 买家 | 上传图片或输入关键词 → 图生视频 → 下载 .mp4 |
| 卖家入驻 | 卖家 | 填写信息、上传样品、提交申请 |
| 定制委托 | 买家 | 提交需求描述，人工报价 |

---

## AI 生成模块（核心）

### 用户流程

```
[入口 A] 上传产品图（JPG/PNG）
         ↓
[入口 B] 输入关键词（如"金色腕表"）→ 即梦文生图 → 得到产品图
         ↓ （两条路汇合）
选择必填参数：
  - 旋转方式：水平环绕 / 垂直翻转 / 螺旋上升 / 脉冲呼吸
  - 背景效果：纯黑（标准）/ 粒子流光 / 暗光光晕 / 赛博格栅
         ↓
POST /api/generate-video → 返回 task_id
         ↓
前端轮询 GET /api/task/:id（每 3 秒一次）
         ↓
任务完成 → 显示视频预览 + 下载按钮（.mp4，纯黑背景）
```

### 参数设计（写入 Prompt）

每种旋转方式和背景效果对应固定的 Prompt 后缀，拼接后传给即梦 API：

| 参数 | Prompt 描述 |
|------|------------|
| 水平环绕 | `horizontal 360-degree rotation around Y-axis` |
| 垂直翻转 | `vertical flip rotation around X-axis` |
| 螺旋上升 | `spiral ascending motion with rotation` |
| 脉冲呼吸 | `pulsing scale animation with subtle rotation` |
| 纯黑（标准）| `pure black background #000000` |
| 粒子流光 | `black background with floating particle streams` |
| 暗光光晕 | `dark background with soft radial glow halo` |
| 赛博格栅 | `dark background with cyan cyberpunk grid lines` |

全局后缀（所有生成任务）：`holographic 3D render, neon glow outline, suitable for holographic fan display, loop-ready`

---

## 后端接口设计

基于现有 `server.js`（Express）增强，保留原有文件结构。

### 新增接口

#### `POST /api/generate-video`

```json
// Request
{
  "imageBase64": "data:image/jpeg;base64,...",  // 可选，用户上传图
  "keyword": "金色腕表",                          // 可选，关键词（无图时使用）
  "rotation": "horizontal",                      // 必填
  "background": "pure_black"                     // 必填
}

// Response（立即返回，异步生成）
{
  "taskId": "task_abc123",
  "estimatedSeconds": 45
}
```

**内部逻辑：**
1. 若无 `imageBase64`，先调用 `/api/generate`（现有文生图端点）得到图片 URL
2. 将图片 + 拼接好的 Prompt 提交即梦 I2V API（`doubao-seeddance-1-0-lite-i2v`）
3. 得到 `task_id`，存入内存 Map，立即返回给前端

#### `GET /api/task/:taskId`

```json
// Response（轮询）
{
  "status": "processing" | "completed" | "failed",
  "videoUrl": "https://...",   // completed 时返回
  "progress": 65               // 0-100 估算
}
```

**内部逻辑：** 查询即梦任务状态，转换后返回。

> ⚠️ MVP 限制：task_id 存在内存 Map，服务器重启后丢失。用户需重新生成。第二阶段加数据库后解决。

#### `POST /api/seller/apply`

```json
// Request（multipart/form-data）
{
  "name": "张三",
  "wechat": "zhangsan123",
  "designStyle": "奢品/潮牌",
  "priceRange": "免费 / ¥29.9 / 定价",
  "samples": [File, File, File]   // 最多 3 个文件
}

// Response
{ "message": "申请已提交，我们将在 24 小时内联系你" }
```

**内部逻辑：** 用 `multer` 保存文件到 `/uploads/`，通过飞书 Webhook 或邮件推送通知运营。

#### `POST /api/custom/order`

```json
// Request
{
  "description": "需要一个旋转的金色手表，用于展会展示",
  "industry": "奢品",
  "contact": "微信号 xxx"
}

// Response
{ "message": "需求已收到，我们将在 24 小时内报价" }
```

---

## 前端变更（mvp_hi_fi.html）

在现有 React + Tailwind 代码基础上修改，不迁移框架。

### 变更点

1. **AI 实验室 Tab** — 完整重写：
   - 两个子 Tab：「上传图片」和「输入关键词」
   - 旋转方式 + 背景效果必选选项卡（pill 样式，不可跳过）
   - 提交后显示进度条 + 预估时间
   - 轮询逻辑（setInterval 3s，completed 后清除）
   - 结果区：视频 `<video>` 预览 + 下载按钮

2. **素材库 Tab**：
   - 付费素材点击 → 弹出 Modal（「联系微信：xxxxx 购买」）
   - 免费素材保持现有下载逻辑

3. **卖家入驻 Tab**（新增）：
   - 表单：姓名、微信号、设计风格（多选）、定价偏好
   - 文件上传区（拖拽 / 点击，最多 3 个，显示缩略图）
   - 提交 `POST /api/seller/apply`，成功显示确认提示

4. **定制委托 Tab**（新增）：
   - 文本框描述需求、行业下拉、联系方式
   - 提交 `POST /api/custom/order`

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server.js` | 修改 | 新增 4 个接口，引入 multer、node-fetch |
| `mvp_hi_fi.html` | 修改 | AI Tab 重写，新增卖家/定制 Tab |
| `.env` | 新建 | `ARK_API_KEY`、`NOTIFY_WEBHOOK`（飞书） |
| `.env.example` | 新建 | 环境变量说明模板 |
| `package.json` | 修改 | 新增 `multer`、`node-fetch` 依赖 |
| `railway.json` | 新建 | Railway 部署配置 |
| `.gitignore` | 修改 | 添加 `.env`、`uploads/`、`.superpowers/` |
| `uploads/` | 新建目录 | 卖家样品文件暂存 |

---

## 部署方案

**平台**：Vercel（免费，serverless）  
**域名**：`xxx.vercel.app`，客户可直接访问  
**后续**：视中国访问质量，再评估是否迁到正式域名

### Vercel 架构适配（与 Express 版差异）

Vercel 是无服务器函数，无持久文件系统，需调整：

| 原 Express 方案 | Vercel 适配方案 |
|----------------|----------------|
| `server.js` 单文件 | 拆分为 `/api/*.js` 独立函数 |
| 内存 Map 存 task_id | 不需要——直接把即梦 task_id 返回前端，前端轮询时带上 |
| multer 文件上传 | MVP 阶段去掉文件上传，卖家只提交文字信息 |
| `express.static` 服务 HTML | `index.html` 放根目录，Vercel 自动静态服务 |

### 目录结构

```
/
├── index.html              ← mvp_hi_fi.html 重命名
├── assets/                 ← 现有素材图
├── api/
│   ├── generate.js         ← 文生图（保留）
│   ├── generate-video.js   ← 图生视频（新增核心）
│   ├── task/[taskId].js    ← 轮询视频任务状态
│   ├── seller-apply.js     ← 卖家入驻（无文件上传）
│   └── custom-order.js     ← 定制委托
├── .env                    ← ARK_API_KEY 等
└── vercel.json             ← 部署配置
```

### 部署步骤

1. `vercel login` + `vercel --prod`，或连接 GitHub 仓库自动部署
2. 在 Vercel Dashboard 设置环境变量：`ARK_API_KEY`
3. 得到 `xxx.vercel.app` 域名，分享给客户

---

## 即梦 I2V API 参考

```
创建任务：POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
查询任务：GET  https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}
模型：    doubao-seeddance-1-0-lite-i2v-250428（需在火山引擎控制台确认账号已开通此模型）
认证：    Authorization: Bearer {ARK_API_KEY}
```

> ⚠️ 实施前需在 [火山引擎控制台](https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement) 确认视频模型（seeddance）已开通。若未开通，退回文生图模型（seedream）先行演示。

---

## 验证方式

1. 本地运行：`ARK_API_KEY=xxx node server.js`，访问 `http://localhost:3000`
2. 上传一张产品图，选择旋转方式和背景效果，点击生成，30-60 秒后看到视频
3. 测试关键词路径：不上传图，输入「金色腕表」，同样能生成视频
4. 测试卖家入驻：提交表单后确认飞书/微信收到通知
5. 部署后：用中国大陆手机访问 Railway 域名，确认加载正常

---

## API Key

`ARK_API_KEY` 已由客户提供，存入 `.env`，不写入代码。
