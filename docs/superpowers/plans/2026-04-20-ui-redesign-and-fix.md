# UI Redesign + Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix "Failed to fetch" generation error, redesign entire UI per PDF spec, apply GitHub dark-grid design system.

**Architecture:** Single `public/index.html` React 18 CDN app — complete rewrite. Six nav tabs (HOME/免费素材/付费素材/AI生成/内容定制/个人中心). Client-side Canvas compression fixes Vercel 4.5MB body limit. Updated `api/custom-order.js` handles new form fields.

**Tech Stack:** React 18 (jsDelivr CDN), Tailwind CDN, Vercel serverless (`api/*.js`), ByteDance ARK API (I2V), 飞书 Webhook

**Design System (GitHub assets + PDF):**
- Background: `#0a0a0f` with CSS repeating grid overlay (thin `rgba(255,255,255,0.04)` lines every 40px)
- Nav: sticky, glassmorphism dark, active tab = white pill with dark text
- Cards: `rgba(255,255,255,0.03)` border + `rgba(255,255,255,0.06)` border
- Accent blue: `#2563eb` | Purple orb: `#9b8de8`
- Typography: Inter (jsDelivr), bold grotesque style
- Category pills: 11 items — LOGO 奶茶 咖啡 酒水 饮料 动物 植物 节日 人物 科幻 汽车
- Buttons: rounded pill, filled white (primary) or outlined ghost

---

### Task 1: Fix "Failed to fetch" — client-side Canvas image compression

**Root cause:** Vercel serverless functions have a 4.5 MB request-body limit. A raw product photo base64-encoded can exceed this, causing the browser to see "Failed to fetch" (connection dropped, not an HTTP error).

**Fix:** Before calling `/api/generate-video`, compress the image using Canvas API to ≤ 1024×1024 px, JPEG quality 0.75 — resulting base64 ≤ 400 KB.

**Files:**
- Modify: `public/index.html` (handleFileChange function, ~line 265)

- [ ] **Step 1: Replace handleFileChange with compressing version**

In `public/index.html`, replace the `handleFileChange` function (currently reads file → sets dataUrl directly) with:

```js
const compressImage = (file, cb) => {
  const img = new Image();
  const blobUrl = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 1024;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(blobUrl);
    cb({ dataUrl: canvas.toDataURL('image/jpeg', 0.75), name: file.name });
  };
  img.onerror = () => { URL.revokeObjectURL(blobUrl); cb(null); };
  img.src = blobUrl;
};

const handleFileChange = (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { setGenError('请上传图片文件（PNG/JPG/WEBP）'); return; }
  if (file.size > 10 * 1024 * 1024) { setGenError('图片大小不能超过 10MB'); return; }
  setGenError('');
  compressImage(file, (result) => {
    if (!result) { setGenError('图片处理失败，请换一张'); return; }
    setUploadedImg(result);
  });
};
```

- [ ] **Step 2: Verify compression is applied**

Open browser DevTools → Network tab → click 开始生成 with a large image. Confirm the POST body is under 600 KB (was previously potentially multi-MB).

- [ ] **Step 3: Commit**

```bash
git add public/index.html index.html
git commit -m "fix: compress image client-side to fix Vercel 4.5MB body limit"
```

---

### Task 2: Update api/custom-order.js for new form fields

**New form (per PDF page 6):** 公司名称 + 所属行业 + 姓名 + 职位 + 联系电话 + 邮箱 + 详细需求描述

**Files:**
- Modify: `api/custom-order.js`

- [ ] **Step 1: Rewrite api/custom-order.js**

```js
// api/custom-order.js
// 内容定制委托：接收新版表单字段，通过飞书 Webhook 通知运营者

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyName, industry, name, position, phone, email, description } = req.body;

  if (!name?.trim() || !phone?.trim() || !description?.trim()) {
    return res.status(400).json({ error: '姓名、联系电话、需求描述为必填项' });
  }

  const s = (v) => (v || '').replace(/[\r\n]/g, ' ').trim();

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
              '📋 新内容定制委托！',
              `公司：${s(companyName) || '未填'} / 行业：${s(industry) || '未填'}`,
              `姓名：${s(name)} / 职位：${s(position) || '未填'}`,
              `电话：${s(phone)} / 邮箱：${s(email) || '未填'}`,
              `需求：${s(description)}`,
            ].join('\n'),
          },
        }),
      });
    } catch (e) {
      console.error('飞书通知失败:', e.message);
    }
  }

  res.json({ message: '申请已收到，我们将在 24 小时内与您联系！' });
};
```

- [ ] **Step 2: Commit**

```bash
git add api/custom-order.js
git commit -m "feat: update custom-order API for new form fields (company/contact/description)"
```

---

### Task 3: Complete UI redesign — full rewrite of public/index.html

This is the main task. Completely replace `public/index.html` with the new design.

**Design rules:**
- Background: `#0a0a0f` + CSS grid overlay
- Nav: sticky top, glassmorphism, 6 tabs as pill buttons, active = white bg + dark text
- Category bar: 11 pills (LOGO 奶茶 咖啡 酒水 饮料 动物 植物 节日 人物 科幻 汽车) — shown on HOME/免费素材/付费素材/AI生成
- Cards: dark glass, hover lift, price badge
- AI orb: purple glow circle (CSS animation) in AI生成 tab
- Forms: clean dark inputs with focus glow

**Tab structures:**

**HOME** = large hero "开始生成您的3D专属素材" + featured asset grid (all 8 assets from ASSETS_BASE + 2 placeholders) + AI quick-generate prompt box

**免费素材** = category filter + grid of 8 free assets (p === '免费') + download button

**付费素材** = category filter + full 30-card grid with prices + click → PurchaseModal (3 tiers: 个人授权 ¥9.9/企业授权 ¥24.9/无限制授权 ¥99, WeChat contact)

**AI生成** = purple orb animation + sub-tabs (上传产品图 / 输入关键词) + rotation/background selectors + generate + polling + result video

**内容定制** = structured form with 3 section headers (公司信息/申请人信息/定制需求) + submit

**个人中心** = 4 stat cards (免费下载/付费下载/AI生成/余额) + "功能即将上线" placeholder

**Files:**
- Modify: `public/index.html` — complete rewrite
- Modify: `index.html` — keep in sync (same content as public/index.html)

- [ ] **Step 1: Write the new public/index.html**

The complete file content (React 18 CDN, no build step):

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>卫黎 3D 内容平台</title>
  <link href="https://fonts.loli.net/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: #0a0a0f;
      background-image:
        repeating-linear-gradient(0deg,   transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px),
        repeating-linear-gradient(90deg,  transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px);
      color: #e2e8f0;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
    }

    /* Nav */
    .nav-pill { display:inline-flex; align-items:center; justify-content:center; padding:8px 18px; border-radius:9999px; font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .2s; white-space:nowrap; }
    .nav-pill.active  { background:#ffffff; color:#0a0a0f; }
    .nav-pill.inactive { background:transparent; color:#94a3b8; border:1px solid rgba(255,255,255,0.1); }
    .nav-pill.inactive:hover { color:#e2e8f0; border-color:rgba(255,255,255,0.25); }

    /* Category pills */
    .cat-pill { padding:6px 16px; border-radius:9999px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid rgba(255,255,255,0.1); color:#64748b; background:transparent; transition:all .2s; white-space:nowrap; }
    .cat-pill.active { background:#2563eb; color:#fff; border-color:#3b82f6; }
    .cat-pill:hover:not(.active) { color:#94a3b8; border-color:rgba(255,255,255,0.2); }

    /* Glass card */
    .glass-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:1.5rem; }
    .card-hover { transition:transform .2s,box-shadow .2s; cursor:pointer; }
    .card-hover:hover { transform:translateY(-4px); box-shadow:0 20px 40px rgba(0,0,0,0.5); }

    /* Inputs */
    input, textarea, select {
      background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
      border-radius:.75rem; color:#e2e8f0; font-family:'Inter',sans-serif;
      font-size:14px; padding:11px 14px; width:100%; outline:none; transition:border-color .2s;
    }
    input:focus, textarea:focus, select:focus { border-color:rgba(99,102,241,0.5); }
    input::placeholder, textarea::placeholder { color:#475569; }
    label.flabel { font-size:12px; font-weight:700; color:#94a3b8; margin-bottom:5px; display:block; }

    /* Buttons */
    .btn-primary { background:#2563eb; color:#fff; border:1px solid #3b82f6; border-radius:.75rem; cursor:pointer; font-weight:700; transition:all .3s; }
    .btn-primary:hover { background:#3b82f6; box-shadow:0 0 30px rgba(59,130,246,0.4); }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .btn-ghost { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; border-radius:.75rem; cursor:pointer; font-weight:700; transition:all .2s; }
    .btn-ghost:hover { background:rgba(255,255,255,0.1); color:#e2e8f0; }

    /* Orb */
    .orb-ring { border-radius:50%; position:relative; display:flex; align-items:center; justify-content:center; }
    .orb-glow { width:120px; height:120px; border-radius:50%; background:radial-gradient(circle at 40% 35%, #c4b5fd, #9b8de8 50%, #6d28d9); box-shadow:0 0 60px rgba(155,141,232,0.5),0 0 120px rgba(109,40,217,0.2); animation:orb-breathe 3s ease-in-out infinite; }
    @keyframes orb-breathe { 0%,100%{transform:scale(1);box-shadow:0 0 60px rgba(155,141,232,0.5),0 0 120px rgba(109,40,217,0.2);} 50%{transform:scale(1.08);box-shadow:0 0 80px rgba(155,141,232,0.7),0 0 160px rgba(109,40,217,0.35);} }

    /* Progress */
    .progress-bar { height:4px; background:rgba(255,255,255,0.07); border-radius:9999px; overflow:hidden; }
    .progress-fill { height:100%; background:linear-gradient(90deg,#2563eb,#9b8de8); border-radius:9999px; animation:prog 2s ease-in-out infinite; }
    @keyframes prog { 0%{width:8%} 50%{width:85%} 100%{width:8%} }

    /* Modal backdrop */
    .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(10px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px; }

    /* Scrollbar */
    .no-sb::-webkit-scrollbar { display:none; }
    .no-sb { -ms-overflow-style:none; scrollbar-width:none; }

    /* Success */
    .success-box { background:rgba(22,163,74,.08); border:1px solid rgba(22,163,74,.25); border-radius:1.5rem; padding:48px 32px; text-align:center; }
    .error-box { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.25); border-radius:.75rem; padding:10px 16px; color:#f87171; font-size:13px; }

    /* Upload zone */
    .upload-zone { border:2px dashed rgba(255,255,255,0.12); border-radius:1.5rem; cursor:pointer; transition:all .2s; }
    .upload-zone:hover { border-color:rgba(99,102,241,0.5); background:rgba(99,102,241,0.04); }

    /* Param pill (rotation/bg selectors) */
    .param-pill { cursor:pointer; border-radius:9999px; padding:6px 16px; font-size:12px; font-weight:700; transition:all .2s; border:1px solid rgba(255,255,255,0.1); color:#64748b; background:transparent; }
    .param-pill.sel { background:#2563eb; color:#fff; border-color:#3b82f6; }
    .param-pill:hover:not(.sel) { color:#94a3b8; border-color:rgba(255,255,255,0.2); }

    /* Badge */
    .badge-free { background:linear-gradient(135deg,#16a34a,#22c55e); color:#fff; font-size:10px; font-weight:900; padding:2px 8px; border-radius:9999px; }
    .wechat-row { background:rgba(37,211,102,.08); border:1px solid rgba(37,211,102,.25); border-radius:1rem; padding:12px 20px; display:flex; align-items:center; gap:10px; }

    /* Section header (内容定制) */
    .section-hd { background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:.75rem; padding:10px 16px; display:flex; align-items:center; gap:10px; color:#a5b4fc; font-weight:700; font-size:14px; margin-bottom:16px; }

    /* Stat card */
    .stat-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:1.5rem; padding:24px; text-align:center; }
  </style>
</head>
<body>
<div id="root"></div>
<script>
'use strict';
const e = React.createElement;
const { useState, useEffect, useRef, useMemo } = React;

// ─── Constants ─────────────────────────────────────────────────────────────
const TABS = ['HOME', '免费素材', '付费素材', 'AI生成', '内容定制', '个人中心'];
const CATEGORIES = ['全部', 'LOGO', '奶茶', '咖啡', '酒水', '饮料', '动物', '植物', '节日', '人物', '科幻', '汽车'];

const ASSETS = [
  { t:'金鳞神龙',   c:'动物', i:'assets/dragon.png',   p:'59.0' },
  { t:'皇家钻表',   c:'奢品', i:'assets/watch.png',    p:'35.0' },
  { t:'金鳞猛虎',   c:'动物', i:'assets/tiger.png',    p:'19.9' },
  { t:'极光运动鞋', c:'潮配', i:'assets/sneaker.png',  p:'免费'  },
  { t:'奢牌香水',   c:'奢品', i:'assets/perfume.png',  p:'29.9' },
  { t:'黑金流体',   c:'抽象', i:'assets/sphere.png',   p:'免费'  },
  { t:'能量核心',   c:'抽象', i:'assets/core.png',     p:'24.9' },
  { t:'商务魔方',   c:'商务', i:'assets/business.png', p:'29.9' },
];

// Build 30-card paid grid (cycle assets) + 2 "coming soon" slots
const PAID_CARDS = (() => {
  const out = [];
  for (let i = 0; i < 30; i++) out.push({ ...ASSETS[i % ASSETS.length], id: i });
  out.push({ t:'即将上线', c:'__soon__', i:null, p:null, id:30 });
  out.push({ t:'即将上线', c:'__soon__', i:null, p:null, id:31 });
  return out;
})();

const FREE_CARDS = ASSETS.filter(a => a.p === '免费');

const ROTATIONS  = [
  { id:'horizontal', label:'水平环绕' },
  { id:'vertical',   label:'垂直翻转' },
  { id:'spiral',     label:'螺旋上升' },
  { id:'pulse',      label:'脉冲呼吸' },
];
const BACKGROUNDS = [
  { id:'pure_black', label:'纯黑（标准）' },
  { id:'particles',  label:'粒子流光' },
  { id:'glow',       label:'暗光光晕' },
  { id:'cyber',      label:'赛博格栅' },
];

// ─── Image compression helper ───────────────────────────────────────────────
function compressImage(file, cb) {
  const img = new Image();
  const blobUrl = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 1024;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(blobUrl);
    cb({ dataUrl: canvas.toDataURL('image/jpeg', 0.75), name: file.name });
  };
  img.onerror = () => { URL.revokeObjectURL(blobUrl); cb(null); };
  img.src = blobUrl;
}

// ─── CategoryBar ────────────────────────────────────────────────────────────
function CategoryBar({ value, onChange }) {
  return e('div', { className:'no-sb', style:{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, marginBottom:24 } },
    CATEGORIES.map(c => e('button', {
      key: c,
      className: 'cat-pill' + (value === c ? ' active' : ''),
      onClick: () => onChange(c),
    }, c))
  );
}

// ─── AssetCard ───────────────────────────────────────────────────────────────
function AssetCard({ card, onClick }) {
  const isFree = card.p === '免费';
  return e('div', {
    className: 'glass-card card-hover',
    style: { overflow:'hidden' },
    onClick: () => onClick && onClick(card),
  },
    e('div', { style:{ position:'relative', aspectRatio:'1', overflow:'hidden' } },
      card.i && e('img', { src:card.i, alt:card.t, style:{ width:'100%', height:'100%', objectFit:'cover', display:'block' } }),
      !card.i && e('div', { style:{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', opacity:.4 } },
        e('span', { style:{ fontSize:32 } }, '🔒')
      ),
      isFree && e('div', { style:{ position:'absolute', top:8, left:8 } }, e('span', { className:'badge-free' }, 'FREE')),
      isFree && e('a', {
        href: card.i, download: card.t + '.mp4',
        onClick: ev => ev.stopPropagation(),
        style:{ position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', textDecoration:'none' },
        'aria-label': '下载',
      },
        e('svg', { width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2.5 },
          e('path', { d:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
          e('polyline', { points:'7 10 12 15 17 10' }),
          e('line', { x1:12, y1:15, x2:12, y2:3 })
        )
      ),
    ),
    e('div', { style:{ padding:'12px 14px' } },
      e('div', { style:{ fontWeight:700, fontSize:13, color:'#e2e8f0', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, card.t),
      e('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center' } },
        e('span', { style:{ fontSize:11, color:'#475569', background:'rgba(255,255,255,0.04)', padding:'2px 8px', borderRadius:9999 } }, card.c === '__soon__' ? '—' : card.c),
        card.p && e('span', { style:{ fontSize:13, fontWeight:900, color: isFree ? '#22c55e' : '#38bdf8' } }, isFree ? '免费' : `¥${card.p}`)
      )
    )
  );
}

// ─── PurchaseModal ───────────────────────────────────────────────────────────
function PurchaseModal({ item, onClose }) {
  const [tier, setTier] = useState(0);
  const tiers = [
    { label:'个人授权', price:'¥9.9',  desc:'仅云平台使用' },
    { label:'企业授权', price:'¥24.9', desc:'企业商用授权' },
    { label:'无限制授权', price:'¥99',  desc:'不限用途永久授权' },
  ];
  return e('div', { className:'modal-bg', onClick:onClose },
    e('div', {
      onClick: ev => ev.stopPropagation(),
      style:{ background:'#12121a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'2rem', maxWidth:440, width:'100%', padding:'36px 32px', position:'relative' }
    },
      e('button', { onClick:onClose, style:{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'#94a3b8', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' } }, '×'),
      e('div', { style:{ display:'flex', gap:16, marginBottom:20 } },
        item.i && e('img', { src:item.i, alt:item.t, style:{ width:80, height:80, objectFit:'cover', borderRadius:'0.75rem', flexShrink:0 } }),
        e('div', null,
          e('h3', { style:{ fontSize:16, fontWeight:900, color:'#e2e8f0', marginBottom:4 } }, item.t),
          e('p', { style:{ color:'#64748b', fontSize:12 } }, '格式：mp4 · 分辨率：1024×1024')
        )
      ),
      e('div', { style:{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 } },
        tiers.map((t, i) => e('div', {
          key:i,
          onClick: () => setTier(i),
          style:{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:'1rem', border:`1px solid ${tier===i ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`, background: tier===i ? 'rgba(37,99,235,0.1)' : 'transparent', cursor:'pointer' }
        },
          e('div', { style:{ width:16, height:16, borderRadius:'50%', border:`2px solid ${tier===i ? '#3b82f6' : '#475569'}`, background: tier===i ? '#2563eb' : 'transparent', flexShrink:0 } }),
          e('div', { style:{ flex:1 } },
            e('span', { style:{ fontWeight:700, color:'#e2e8f0', fontSize:14 } }, t.label),
            e('span', { style:{ color:'#64748b', fontSize:12, marginLeft:8 } }, t.desc)
          ),
          e('span', { style:{ fontWeight:900, color:'#38bdf8', fontSize:16 } }, t.price)
        ))
      ),
      e('div', { className:'wechat-row', style:{ justifyContent:'center', marginBottom:16 } },
        e('svg', { width:18, height:18, viewBox:'0 0 24 24', fill:'#22c55e' },
          e('path', { d:'M8.5 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' }),
          e('path', { fillRule:'evenodd', d:'M12 2C6.477 2 2 6.253 2 11.5c0 2.394.894 4.582 2.36 6.26L3.5 21l3.532-1.765A10.43 10.43 0 0 0 12 21c5.523 0 10-4.253 10-9.5S17.523 2 12 2z' })
        ),
        e('span', { style:{ color:'#22c55e', fontWeight:900, letterSpacing:'.05em' } }, 'weili_3d'),
        e('span', { style:{ color:'#64748b', fontSize:12 } }, '联系购买')
      ),
      e('button', { className:'btn-primary', style:{ width:'100%', padding:'13px 0', fontSize:15 } }, '立即购买 ' + tiers[tier].price)
    )
  );
}

// ─── Tab: HOME ───────────────────────────────────────────────────────────────
function HomeTab({ onTabChange }) {
  const [cat, setCat] = useState('全部');
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    const cards = PAID_CARDS.filter(c => c.c !== '__soon__');
    if (cat === '全部') return cards.slice(0, 16);
    return cards.filter(c => c.c === cat).slice(0, 16);
  }, [cat]);

  return e('div', null,
    // Hero
    e('div', { style:{ textAlign:'center', padding:'48px 0 40px' } },
      e('p', { style:{ fontSize:12, letterSpacing:'.15em', color:'#6366f1', fontWeight:700, textTransform:'uppercase', marginBottom:12 } }, 'WEILI 3D · HOLOGRAPHIC CONTENT PLATFORM'),
      e('h1', { style:{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, color:'#fff', lineHeight:1.15, marginBottom:16 } }, '开始生成您的 3D 专属素材'),
      e('p', { style:{ color:'#64748b', fontSize:15, marginBottom:32 } }, '上传产品图或输入关键词，一键生成全息旋转视频'),
      e('div', { style:{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' } },
        e('button', { className:'btn-primary', style:{ padding:'13px 28px', fontSize:15 }, onClick:() => onTabChange(3) }, '🎬 AI 生成'),
        e('button', { className:'btn-ghost', style:{ padding:'13px 28px', fontSize:15 }, onClick:() => onTabChange(4) }, '📋 内容定制')
      )
    ),
    // Category
    e(CategoryBar, { value:cat, onChange:setCat }),
    // Grid
    e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 } },
      filtered.map((card, idx) => e(AssetCard, { key:idx, card, onClick: c => c.p !== '免费' && setModal(c) }))
    ),
    modal && e(PurchaseModal, { item:modal, onClose:() => setModal(null) })
  );
}

// ─── Tab: 免费素材 ────────────────────────────────────────────────────────────
function FreeTab() {
  const [cat, setCat] = useState('全部');
  const filtered = useMemo(() => {
    if (cat === '全部') return FREE_CARDS;
    return FREE_CARDS.filter(c => c.c === cat);
  }, [cat]);

  return e('div', null,
    e('div', { style:{ marginBottom:24 } },
      e('h2', { style:{ fontSize:22, fontWeight:900, color:'#e2e8f0', marginBottom:4 } }, '免费素材'),
      e('p', { style:{ color:'#64748b', fontSize:14 } }, '所有素材免费下载，直接用于短视频与展示场景')
    ),
    e(CategoryBar, { value:cat, onChange:setCat }),
    filtered.length === 0
      ? e('div', { style:{ textAlign:'center', padding:'60px 0', color:'#475569' } }, '该分类暂无免费素材')
      : e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 } },
          filtered.map((card, i) => e(AssetCard, { key:i, card, onClick:()=>{} }))
        )
  );
}

// ─── Tab: 付费素材 ────────────────────────────────────────────────────────────
function PaidTab() {
  const [cat, setCat] = useState('全部');
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => {
    if (cat === '全部') return PAID_CARDS;
    return PAID_CARDS.filter(c => c.c === cat);
  }, [cat]);

  return e('div', null,
    e('div', { style:{ marginBottom:24 } },
      e('h2', { style:{ fontSize:22, fontWeight:900, color:'#e2e8f0', marginBottom:4 } }, '付费素材'),
      e('p', { style:{ color:'#64748b', fontSize:14 } }, '高品质 3D 全息旋转素材，多种授权方式')
    ),
    e(CategoryBar, { value:cat, onChange:setCat }),
    e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 } },
      filtered.map(card => e(AssetCard, { key:card.id, card, onClick: c => c.c !== '__soon__' && setModal(c) }))
    ),
    modal && e(PurchaseModal, { item:modal, onClose:() => setModal(null) })
  );
}

// ─── Tab: AI生成 ──────────────────────────────────────────────────────────────
function AITab() {
  const [mode, setMode]           = useState('upload');
  const [uploadedImg, setImg]     = useState(null);
  const [keyword, setKeyword]     = useState('');
  const [rotation, setRotation]   = useState('');
  const [bg, setBg]               = useState('');
  const [step, setStep]           = useState('idle'); // idle|t2i|i2v|polling|done|error
  const [videoUrl, setVideoUrl]   = useState(null);
  const [t2iPrev, setT2iPrev]     = useState(null);
  const [genError, setGenError]   = useState('');
  const fileRef  = useRef(null);
  const pollRef  = useRef(null);

  const busy = ['t2i','i2v','polling'].includes(step);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleFile = ev => {
    const file = ev.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setGenError('请上传图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { setGenError('图片大小不能超过 10MB'); return; }
    setGenError('');
    compressImage(file, result => {
      if (!result) { setGenError('图片处理失败，请换一张'); return; }
      setImg(result);
    });
  };

  const startPolling = taskId => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('polling');
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/task/${taskId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setVideoUrl(data.videoUrl);
          setStep('done');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setGenError(data.error || '渲染失败，请重试');
          setStep('error');
        }
      } catch (err) {
        clearInterval(pollRef.current);
        setGenError('轮询出错：' + err.message);
        setStep('error');
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    if (busy) return;
    if (!rotation) { setGenError('请选择旋转方式'); return; }
    if (!bg)       { setGenError('请选择背景效果'); return; }
    if (mode === 'upload'  && !uploadedImg)    { setGenError('请先上传产品图片'); return; }
    if (mode === 'keyword' && !keyword.trim()) { setGenError('请输入产品关键词'); return; }
    setGenError(''); setVideoUrl(null); setT2iPrev(null);

    try {
      let imageUrl = null;
      if (mode === 'keyword') {
        setStep('t2i');
        const r1 = await fetch('/api/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt:keyword, size:'1:1' }) });
        if (!r1.ok) { const d=await r1.json(); throw new Error(d.error||`图像生成失败(${r1.status})`); }
        const d1 = await r1.json();
        if (!d1.url) throw new Error('图像接口未返回图片');
        imageUrl = d1.url; setT2iPrev(imageUrl); setStep('i2v');
        const r2 = await fetch('/api/generate-video', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ imageUrl, rotation, background:bg }) });
        if (!r2.ok) { const d=await r2.json(); throw new Error(d.error||`视频任务失败(${r2.status})`); }
        const d2 = await r2.json();
        if (!d2.taskId) throw new Error('未获得任务ID');
        startPolling(d2.taskId);
      } else {
        setStep('i2v');
        const r2 = await fetch('/api/generate-video', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ imageBase64:uploadedImg.dataUrl, rotation, background:bg }) });
        if (!r2.ok) { const d=await r2.json(); throw new Error(d.error||`视频任务失败(${r2.status})`); }
        const d2 = await r2.json();
        if (!d2.taskId) throw new Error('未获得任务ID');
        startPolling(d2.taskId);
      }
    } catch (err) {
      setGenError('生成失败：' + err.message);
      setStep('error');
    }
  };

  const stepLabel = { t2i:'正在生成参考图…', i2v:'正在提交视频任务…', polling:'正在渲染旋转视频… 约 40 秒' };

  return e('div', null,
    // Header
    e('div', { style:{ marginBottom:28 } },
      e('h2', { style:{ fontSize:22, fontWeight:900, color:'#e2e8f0', marginBottom:4 } }, 'AI 生成'),
      e('p', { style:{ color:'#64748b', fontSize:14 } }, '上传产品图或输入关键词，一键生成 3D 旋转全息视频')
    ),

    // Orb + sub-tabs row
    e('div', { style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, marginBottom:28 } },
      e('div', { className:'orb-ring' },
        e('div', { className:'orb-glow' }),
      ),
      e('div', { className:'glass-card', style:{ borderRadius:'2rem', padding:'6px', display:'inline-flex', gap:4 } },
        e('button', { className:'nav-pill' + (mode==='upload'?' active':' inactive'), onClick:()=>setMode('upload') }, '📸 上传产品图'),
        e('button', { className:'nav-pill' + (mode==='keyword'?' active':' inactive'), onClick:()=>setMode('keyword') }, '✏️ 输入关键词')
      )
    ),

    // Main form
    e('div', { className:'glass-card', style:{ padding:'28px 24px', marginBottom:20 } },
      // Upload zone or keyword input
      mode === 'upload'
        ? e('div', { style:{ marginBottom:20 } },
            e('label', { className:'flabel' }, '产品图片'),
            e('div', {
              className:'upload-zone',
              style:{ padding: uploadedImg ? 12 : 40, textAlign:'center' },
              onClick:()=> fileRef.current && fileRef.current.click()
            },
              uploadedImg
                ? e('div', { style:{ display:'flex', alignItems:'center', gap:16 } },
                    e('img', { src:uploadedImg.dataUrl, alt:'preview', style:{ width:72, height:72, objectFit:'cover', borderRadius:'.75rem' } }),
                    e('div', null,
                      e('div', { style:{ color:'#e2e8f0', fontWeight:700, marginBottom:4 } }, uploadedImg.name),
                      e('div', { style:{ color:'#64748b', fontSize:12 } }, '点击更换图片')
                    )
                  )
                : e('div', null,
                    e('div', { style:{ fontSize:36, marginBottom:10 } }, '📁'),
                    e('div', { style:{ color:'#94a3b8', fontWeight:700, marginBottom:4 } }, '点击上传产品图'),
                    e('div', { style:{ color:'#475569', fontSize:12 } }, 'PNG · JPG · WEBP，最大 10MB')
                  )
            ),
            e('input', { ref:fileRef, type:'file', accept:'image/*', style:{display:'none'}, onChange:handleFile })
          )
        : e('div', { style:{ marginBottom:20 } },
            e('label', { className:'flabel' }, '产品关键词'),
            e('input', { type:'text', placeholder:'例：金色腕表 / 龙形摆件 / 奶茶杯', value:keyword, onChange:ev=>setKeyword(ev.target.value) }),
            t2iPrev && ['i2v','polling'].includes(step) && e('div', { style:{ display:'flex', alignItems:'center', gap:12, marginTop:12, padding:'10px 14px', background:'rgba(99,102,241,0.06)', borderRadius:'.75rem', border:'1px solid rgba(99,102,241,0.2)' } },
              e('img', { src:t2iPrev, alt:'参考图', style:{ width:44, height:44, objectFit:'cover', borderRadius:'.5rem' }, onError:ev=>{ev.target.style.display='none'} }),
              e('span', { style:{ color:'#a5b4fc', fontSize:13 } }, '参考图已生成…')
            )
          ),

      // Rotation
      e('div', { style:{ marginBottom:18 } },
        e('label', { className:'flabel' }, e('span', { style:{ color:'#ef4444' } }, '● '), '旋转方式（必选）'),
        e('div', { style:{ display:'flex', gap:8, flexWrap:'wrap' } },
          ROTATIONS.map(r => e('button', { key:r.id, className:'param-pill'+(rotation===r.id?' sel':''), onClick:()=>setRotation(r.id) }, r.label))
        )
      ),

      // Background
      e('div', { style:{ marginBottom:22 } },
        e('label', { className:'flabel' }, e('span', { style:{ color:'#ef4444' } }, '● '), '背景效果（必选）'),
        e('div', { style:{ display:'flex', gap:8, flexWrap:'wrap' } },
          BACKGROUNDS.map(b => e('button', { key:b.id, className:'param-pill'+(bg===b.id?' sel':''), onClick:()=>setBg(b.id) }, b.label))
        )
      ),

      genError && e('div', { className:'error-box', style:{ marginBottom:14 } }, '⚠ ' + genError),

      busy && e('div', { style:{ marginBottom:14 } },
        e('div', { style:{ color:'#64748b', fontSize:13, marginBottom:8 } }, stepLabel[step] || ''),
        e('div', { className:'progress-bar' }, e('div', { className:'progress-fill' }))
      ),

      e('button', {
        className:'btn-primary',
        disabled:busy,
        onClick:handleGenerate,
        style:{ width:'100%', padding:'14px 0', fontSize:15 }
      }, busy ? '生成中…' : '🎬 开始生成')
    ),

    // Result
    step === 'done' && videoUrl && e('div', { className:'glass-card', style:{ padding:'24px', textAlign:'center' } },
      e('p', { style:{ fontSize:13, fontWeight:700, color:'#22c55e', marginBottom:14 } }, '✅ 视频生成完成！'),
      e('video', { src:videoUrl, autoPlay:true, loop:true, muted:true, controls:true, playsInline:true, style:{ width:'100%', borderRadius:'1rem', maxHeight:400 } }),
      e('div', { style:{ display:'flex', gap:12, marginTop:16, justifyContent:'center' } },
        e('a', { href:videoUrl, download:'hologram.mp4', className:'btn-primary', style:{ padding:'10px 22px', borderRadius:'.75rem', fontWeight:700, textDecoration:'none', fontSize:14 } }, '⬇ 下载视频'),
        e('button', {
          className:'btn-ghost',
          onClick:()=>{ setStep('idle'); setVideoUrl(null); setT2iPrev(null); setGenError(''); },
          style:{ padding:'10px 22px', fontSize:14 }
        }, '重新生成')
      )
    )
  );
}

// ─── Tab: 内容定制 ────────────────────────────────────────────────────────────
function CustomTab() {
  const [form, setForm]       = useState({ companyName:'', industry:'', name:'', position:'', phone:'', email:'', description:'' });
  const [submitting, setSub]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr]         = useState('');

  const set = k => ev => setForm(f => ({ ...f, [k]: ev.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.description.trim()) {
      setErr('姓名、联系电话、需求描述为必填项'); return;
    }
    setErr(''); setSub(true);
    try {
      const res = await fetch('/api/custom-order', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      if (!res.ok) throw new Error('服务器错误');
      setSuccess(true);
    } catch (e) {
      setErr('提交失败：' + e.message);
    } finally { setSub(false); }
  };

  if (success) return e('div', null,
    e('div', { style:{ marginBottom:24 } }, e('h2', { style:{ fontSize:22, fontWeight:900, color:'#e2e8f0' } }, '内容定制')),
    e('div', { className:'success-box' },
      e('div', { style:{ fontSize:52, marginBottom:14 } }, '✅'),
      e('h3', { style:{ fontSize:20, fontWeight:900, color:'#22c55e', marginBottom:8 } }, '申请已提交！'),
      e('p', { style:{ color:'#64748b', fontSize:14 } }, '我们将在 24 小时内通过您的联系方式回复报价方案。')
    )
  );

  const field = (key, label, placeholder, required) => e('div', null,
    e('label', { className:'flabel' }, required ? e('span', { style:{ color:'#ef4444' } }, '* ') : null, label),
    e('input', { type:'text', placeholder, value:form[key], onChange:set(key) })
  );

  return e('div', null,
    e('div', { style:{ marginBottom:24 } },
      e('h2', { style:{ fontSize:22, fontWeight:900, color:'#e2e8f0', marginBottom:4 } }, '内容定制'),
      e('p', { style:{ color:'#64748b', fontSize:14 } }, '告诉我们您的需求，我们为您量身定制专属 3D 全息内容')
    ),

    e('div', { className:'glass-card', style:{ padding:'28px 24px' } },
      // Section 1
      e('div', { className:'section-hd' }, '◆ 公司信息'),
      e('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 } },
        field('companyName', '公司名称', '请输入公司名称', false),
        field('industry',    '所属行业', '请输入所属行业', false)
      ),

      // Section 2
      e('div', { className:'section-hd' }, '◆ 申请人信息'),
      e('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:8 } },
        field('name',     '姓名',   '请输入姓名',   true),
        field('position', '职位',   '请输入职位',   false)
      ),
      e('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 } },
        field('phone', '联系电话', '请输入联系电话', true),
        field('email', '邮箱地址', '请输入邮箱',    false)
      ),

      // Section 3
      e('div', { className:'section-hd' }, '◆ 定制需求'),
      e('div', { style:{ marginBottom:22 } },
        e('label', { className:'flabel' }, e('span', { style:{ color:'#ef4444' } }, '* '), '详细需求描述'),
        e('textarea', { rows:5, placeholder:'请描述您的产品、使用场景和期望效果…', value:form.description, onChange:set('description') })
      ),

      err && e('div', { className:'error-box', style:{ marginBottom:14 } }, '⚠ ' + err),

      e('div', { style:{ textAlign:'center' } },
        e('button', {
          className:'btn-primary',
          disabled:submitting,
          onClick:handleSubmit,
          style:{ padding:'13px 48px', fontSize:15, borderRadius:'2rem' }
        }, submitting ? '提交中…' : '提交申请')
      )
    )
  );
}

// ─── Tab: 个人中心 ────────────────────────────────────────────────────────────
function ProfileTab() {
  const stats = [
    { label:'已下载免费素材', value:'—', icon:'🆓', color:'#22c55e' },
    { label:'已下载付费素材', value:'—', icon:'💎', color:'#38bdf8' },
    { label:'已生成AI素材',   value:'—', icon:'🤖', color:'#a78bfa' },
    { label:'账户余额',       value:'¥0', icon:'💰', color:'#f59e0b' },
  ];
  return e('div', null,
    e('div', { style:{ marginBottom:24 } },
      e('h2', { style:{ fontSize:22, fontWeight:900, color:'#e2e8f0', marginBottom:4 } }, '个人中心'),
      e('p', { style:{ color:'#64748b', fontSize:14 } }, '查看您的下载记录与账户信息')
    ),
    e('div', { style:{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:24 } },
      stats.map(s => e('div', { key:s.label, className:'stat-card' },
        e('div', { style:{ fontSize:32, marginBottom:8 } }, s.icon),
        e('div', { style:{ fontSize:26, fontWeight:900, color:s.color, marginBottom:4 } }, s.value),
        e('div', { style:{ fontSize:12, color:'#64748b' } }, s.label)
      ))
    ),
    e('div', { style:{ display:'flex', gap:12, marginBottom:32 } },
      e('button', { className:'btn-primary', style:{ padding:'10px 24px', fontSize:14, borderRadius:'2rem' } }, '充值'),
      e('button', { className:'btn-ghost', style:{ padding:'10px 24px', fontSize:14, borderRadius:'2rem' } }, '卖家入驻')
    ),
    e('div', { className:'glass-card', style:{ padding:'48px 32px', textAlign:'center' } },
      e('div', { style:{ fontSize:40, marginBottom:12 } }, '🚀'),
      e('p', { style:{ color:'#64748b', fontSize:14 } }, '登录功能即将上线，敬请期待')
    )
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState(0);
  const CONTENT = [HomeTab, FreeTab, PaidTab, AITab, CustomTab, ProfileTab];
  const CurrentTab = CONTENT[tab];

  return e('div', { style:{ minHeight:'100vh' } },
    // Nav
    e('header', {
      style:{ position:'sticky', top:0, zIndex:100, background:'rgba(10,10,15,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 16px' }
    },
      e('div', { style:{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, gap:8 } },
        e('div', { style:{ fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, letterSpacing:'.08em', background:'linear-gradient(90deg,#a5b4fc,#6366f1)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', flexShrink:0 } }, '卫黎 3D'),
        e('nav', { className:'no-sb', style:{ display:'flex', gap:4, overflowX:'auto' } },
          TABS.map((t, i) =>
            e('button', { key:t, className:'nav-pill'+(tab===i?' active':' inactive'), onClick:()=>setTab(i) }, t)
          )
        )
      )
    ),
    // Main
    e('main', { style:{ maxWidth:960, margin:'0 auto', padding:'32px 16px 80px' } },
      e(CurrentTab, { onTabChange: setTab })
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App, null));
</script>
</body>
</html>
```

- [ ] **Step 2: Write file to public/index.html and sync to index.html**

```bash
# Verify line count is reasonable
wc -l public/index.html
```

- [ ] **Step 3: Verify locally**

Open `public/index.html` in a browser. Check:
- All 6 tabs render without errors
- CSS grid background visible
- Purple orb animates in AI生成 tab
- Category pills filter correctly
- Purchase modal opens on paid asset click
- Form fields in 内容定制 render correctly

- [ ] **Step 4: Commit**

```bash
git add public/index.html index.html
git commit -m "feat: complete UI redesign — 6-tab nav, dark grid, orb AI, PDF spec layout"
```

---

### Task 4: Deploy and smoke test

**Files:** No code changes — just deploy + verify.

- [ ] **Step 1: Deploy to Vercel**

```bash
vercel --prod --yes
```

Expected output: `Aliased: https://yanglei-pied.vercel.app`

- [ ] **Step 2: Smoke test all routes**

```bash
curl -s -o /dev/null -w "/ : %{http_code}\n" https://yanglei-pied.vercel.app/
curl -s -o /dev/null -w "/assets/dragon.png : %{http_code}\n" https://yanglei-pied.vercel.app/assets/dragon.png
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"test","phone":"13800000000","description":"test order"}' \
  https://yanglei-pied.vercel.app/api/custom-order | python3 -c "import sys,json; d=json.load(sys.stdin); print('custom-order:', d.get('message','ERROR: '+str(d)))"
```

Expected:
```
/ : 200
/assets/dragon.png : 200
custom-order: 申请已收到，我们将在 24 小时内与您联系！
```

- [ ] **Step 3: Commit any fixes and push**

```bash
git add -A
git commit -m "chore: final deploy and smoke test fixes"
```
