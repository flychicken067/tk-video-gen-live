# HoloMax Pro | 战略交付与设计白皮书 (Strategic Handover Report)

> **目标模型**: Gemini 1.5 Pro / Ultra 或其他具备长上下文理解能力的 AI。
> **项目背景**: HoloMax Pro 是一款 AI 原生全息素材分发平台，旨在通过 AI 驱动的内容创作 (AIGC) 打破 3D 全息风扇硬件厂商的内容垄断，建立“创作者-硬件商-合伙人”的分红闭环。

---

## 1. 项目核心愿景 (The Vision)
HoloMax Pro 不是一个简单的播放器，而是一个 **“内容即分红” (Asset-as-a-Service)** 的商业系统。
- **痛点**: 全息风扇持有者缺乏高质量素材；3D 设计师缺乏内容分发渠道。
- **解法**: 利用 AI 将中文 Prompt 秒变“纯黑背景 (Pure Black Background)”的全息 3D 素材，并通过扫码分销系统实现设计师与机器主人的利润共赢。

---

## 2. 技术栈与架构 (Tech Stack)
当前交付版本为 **High-Fidelity MVP (获奖级原型)**：
- **核心框架**: React 18 (CDN 加载) + Tailwind CSS + Babel Standalone (实时转换)。
- **交互设计**: 
  - **沉浸式 AI 实验室**: 采用 Floating Dock (底部悬浮船坞) 设计，最大化渲染画布。
  - **瀑布流素材库**: 采用 Masonry (Pinterest 风格) 布局，支持分类过滤。
  - **组件化**: 封装了 `Nav`, `MaterialCard`, `FloatingDock`, `QRModal` 等高可服用组件。
- **核心素材**: 已生成并存放于 `/assets/` 目录下的 8 个顶级全息素材（金龙、钻表、猛虎、香水、球体等）。

---

## 3. 设计哲学 (Design Philosophy)
为了达到“获奖级别”的视觉质感，遵循以下原则：
1.  **黑底优化 (Holographic-Ready)**: 所有素材必须是纯黑背景（#000000），因为在全息风扇上，“黑”代表透明。
2.  **玻璃态 (Glassmorphism)**: 所有的 UI 元素基于 `backdrop-filter: blur(28px)`，呈现出深邃的科幻质感。
3.  **商业直觉 (FOMO Logic)**: 
    *   素材库目前保持 **95% 填满** 状态（38个真实填充 + 2个待入驻席位）。
    *   通过“Seat Reserved (待入驻)”卡片营造稀缺感，引导潜在合伙人点击二维码入驻。
4.  **极简路径**: 所有的“入驻”和“攻略”动作，最终都收口于一个 **扫码加微信/问卷** 的闭环，减少摩擦。

---

## 4. 文件结构与路径 (File Structure)
- **HTML 文件**: `/Users/ivan/Desktop/AI-Native-Projects/yanglei/mvp_hi_fi.html`
- **素材目录**: `/Users/ivan/Desktop/AI-Native-Projects/yanglei/assets/`
  - `tiger.png`: 金鳞猛虎
  - `dragon.png`: 金鳞神龙 (旗舰版)
  - `watch.png`: 皇家钻表
  - `perfume.png`: 奢牌香水
  - `sneaker.png`: 极光运动鞋
  - `sphere.png`: 黑金流体
  - `core.png`: 能量核心
  - `business.png`: 商务数据魔方

---

## 5. 对接 AI (Gemini) 的后续任务 (Next Steps)
如果你是承接本项目的 AI，请从以下任务开始：

### 任务 A: 迁移至 Next.js (生产级重构)
- 将目前的单页 `mvp_hi_fi.html` 逻辑迁移至 Next.js 14+ 框架。
- 使用 `Framer Motion` 替换目前的 Tailwind 动画，实现更高阶的转场效果。
- 将 `/assets/` 整合进 Next 公共目录。

### 任务 B: 后端逻辑模拟 (API Design)
- 设计 `GET /api/materials` 接口，支持分类过滤和分页。
- 设计 `POST /api/generate` 接口，模拟与 DALL-E 3 或 Stable Diffusion 的对接逻辑。

### 任务 C: 收益逻辑深化 (Dashboard)
- 细化“收益看板”页面。设计能够显示“全国设备分布图”的 Canvas 热力图。
- 完善分红逻辑的展示数据（如：今日扫码量、点击率、分红转换率）。

---

## 6. 系统 Prompt 示例 (For Successor AI)
> *"你现在是 HoloMax Pro 的资深首席技术官。我们已经完成了一个高保真的 React MVP，代码位于 `mvp_hi_fi.html`。该项目目前的视觉风格是顶级暗色玻璃态，商业闭环是全息风扇内容的 AIGC 生产与分发。请你基于这个代码，进行 Next.js 环境的初始化，并将之前的‘待入驻’逻辑扩展为完整的合伙人管理系统。"*

---

**交付负责人**: Antigravity (Advanced Coding AI)
**交付状态**: 获奖版 MVP 已就位，路径清晰，素材完备。
