// api/generate-video.js
// 图转视频：接收 imageBase64 + rotation + background
// 调用 Google Veo API，提交异步任务，返回 operationName 作为 taskId
// 前端拿到 taskId 后轮询 /api/task-status?taskId=...

const VEO_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const VEO_MODEL = 'veo-3.0-generate-preview';

const ROTATION_PROMPTS = {
  horizontal: 'smooth horizontal 360-degree rotation around vertical axis',
  vertical:   'vertical flip rotation around horizontal axis',
  spiral:     'spiral ascending motion with continuous rotation',
  pulse:      'pulsing breathe scale animation with subtle slow rotation',
};

const BG_PROMPTS = {
  pure_black: 'pure black background #000000, no other elements',
  particles:  'pure black background with floating luminous particle streams',
  glow:       'dark background with soft radial neon glow halo around subject',
  cyber:      'dark background with dim cyan cyberpunk grid lines',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 未设置' });
  }

  const { imageBase64, rotation, background } = req.body;

  if (!rotation || !background) {
    return res.status(400).json({ error: '请选择旋转方式和背景效果' });
  }
  if (!ROTATION_PROMPTS[rotation]) {
    return res.status(400).json({ error: `无效的旋转方式: ${rotation}` });
  }
  if (!BG_PROMPTS[background]) {
    return res.status(400).json({ error: `无效的背景效果: ${background}` });
  }
  if (!imageBase64) {
    return res.status(400).json({ error: '请提供图片' });
  }

  const prompt = [
    'holographic 3D render, neon glow outline, seamless loop, suitable for holographic fan display',
    ROTATION_PROMPTS[rotation],
    BG_PROMPTS[background],
  ].join(', ');

  // Strip data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    const resp = await fetch(
      `${VEO_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{
            prompt,
            image: { bytesBase64Encoded: base64Data, mimeType: 'image/jpeg' },
          }],
          parameters: {
            aspectRatio: '1:1',
            sampleCount: 1,
            durationSeconds: 8,
          },
        }),
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      return res.status(resp.status).json({ error: `Veo API 错误: ${msg}` });
    }

    const operationName = data.name; // e.g. "operations/xxx"
    if (!operationName) {
      return res.status(500).json({ error: 'Veo 未返回操作名称，响应: ' + JSON.stringify(data) });
    }

    res.json({ taskId: operationName, estimatedSeconds: 120 });
  } catch (err) {
    res.status(500).json({ error: '网络错误: ' + err.message });
  }
};
