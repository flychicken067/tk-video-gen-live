const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
// Serve static files from public/ first, then root
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));
// Explicit root handler
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const JIMENG_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const JIMENG_MODEL = 'doubao-seedream-5-0-260128'; // 账号已开通的最新版本

// Holographic-specific prompt suffix - black background is "transparent" on holographic fans
const HOLO_SUFFIX = '，纯黑背景(#000000)，全息3D效果，霓虹发光轮廓，粒子光效，无背景底色，适配全息风扇播放';

app.post('/api/generate', async (req, res) => {
  const ARK_API_KEY = process.env.ARK_API_KEY;
  if (!ARK_API_KEY) {
    return res.status(500).json({ error: 'ARK_API_KEY 未设置，请在启动命令中设置环境变量' });
  }

  // size: '2k' (2048x2048) | '3k' (3072x3072) | 'WIDTHxHEIGHT' e.g. '1024x1792'
  const { prompt, size = '2k' } = req.body;
  if (!prompt?.trim()) {
    return res.status(400).json({ error: '请输入生成描述' });
  }

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
        size,
        n: 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || data?.message || JSON.stringify(data);
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
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: JIMENG_MODEL,
    api_key_set: !!process.env.ARK_API_KEY,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌌 HoloMax Pro 服务已启动 → http://localhost:${PORT}`);
  console.log(`   API Key: ${process.env.ARK_API_KEY ? '✅ 已设置' : '❌ 未设置 (请设置 ARK_API_KEY)'}\n`);
});
