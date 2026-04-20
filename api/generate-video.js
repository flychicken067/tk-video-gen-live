// api/generate-video.js
// 图生视频：接收 imageBase64/imageUrl + rotation + background
// 向即梦 I2V API 提交异步任务，立即返回 taskId
// 前端拿到 taskId 后去 /api/task/:taskId 轮询结果

const I2V_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';
const I2V_MODEL = 'doubao-seeddance-1-0-lite-i2v-250428';

const ROTATION_PROMPTS = {
  horizontal: 'smooth horizontal 360-degree rotation around vertical Y-axis',
  vertical:   'vertical flip rotation around horizontal X-axis',
  spiral:     'spiral ascending motion with continuous rotation upward',
  pulse:      'pulsing scale breathe animation with subtle slow rotation',
};

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

    res.json({ taskId: data.id, estimatedSeconds: 45 });
  } catch (err) {
    res.status(500).json({ error: '网络错误: ' + err.message });
  }
};
