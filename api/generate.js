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

  const { prompt, size = '1:1', provider = 'seedream' } = req.body;
  if (!prompt?.trim()) {
    return res.status(400).json({ error: '请输入生成描述' });
  }

  const fullPrompt = prompt.trim() + HOLO_SUFFIX;

  // ── Pollinations.ai（完全免费，无需 Key）──────────────────────────
  if (provider === 'pollinations') {
    const sizeMap = { '1:1': [1024, 1024], '16:9': [1024, 576], '9:16': [576, 1024] };
    const [w, ht] = sizeMap[size] || [1024, 1024];
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${w}&height=${ht}&nologo=true&model=flux&seed=${Date.now()}`;
    return res.json({ url, revised_prompt: fullPrompt });
  }

  // ── 即梦 Seedream（高质量，需 ARK_API_KEY）───────────────────────
  const ARK_API_KEY = process.env.ARK_API_KEY;
  if (!ARK_API_KEY) {
    return res.status(500).json({ error: 'ARK_API_KEY 未设置' });
  }

  // Model requires ≥ 3,686,400 px; 2048×2048 = 4,194,304 px ✓
  const sizeMap = { '1:1': '2048x2048', '16:9': '2048x1152', '9:16': '1152x2048', '2k': '2048x2048', '3k': '3072x3072' };
  const resolvedSize = sizeMap[size] || size;

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
      console.error('即梦未返回图片，响应体:', JSON.stringify(data));
      return res.status(500).json({ error: '即梦未返回图片，请稍后重试' });
    }

    res.json({ url: imageUrl, revised_prompt: data?.data?.[0]?.revised_prompt });
  } catch (err) {
    res.status(500).json({ error: '网络错误: ' + err.message });
  }
};
