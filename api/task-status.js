// api/task-status.js
// 轮询 Google Veo 异步操作状态
// GET /api/task-status?taskId=operations%2Fxxx
// 返回 { status: 'processing' | 'succeeded' | 'failed', videoUrl?, error? }

const VEO_BASE = 'https://generativelanguage.googleapis.com/v1beta';

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 未设置' });
  }

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: '缺少 taskId' });

  try {
    const resp = await fetch(
      `${VEO_BASE}/${taskId}?key=${GEMINI_API_KEY}`
    );

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ error: JSON.stringify(data) });
    }

    if (!data.done) {
      return res.json({ status: 'processing' });
    }

    if (data.error) {
      return res.json({ status: 'failed', error: data.error.message || '生成失败' });
    }

    const sample = data.response?.generateVideoResponse?.generatedSamples?.[0];
    const fileUri = sample?.video?.uri;

    if (!fileUri) {
      return res.json({ status: 'failed', error: '未返回视频文件，请重试' });
    }

    // Since this is called from GitHub Pages, we need to return the absolute video-proxy URL
    const videoUrl = `https://yanglei-pied.vercel.app/api/video-proxy?uri=${encodeURIComponent(fileUri)}`;
    res.json({ status: 'succeeded', videoUrl });
  } catch (err) {
    res.status(500).json({ error: '查询失败: ' + err.message });
  }
};
