// api/task-status.js
// 轮询 Google Veo 异步操作状态
// GET /api/task-status?taskId=operations%2Fxxx
// 返回 { status: 'processing' | 'succeeded' | 'failed', videoUrl?, error? }

const VEO_BASE = 'https://generativelanguage.googleapis.com/v1beta';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 未设置' });
  }

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: '缺少 taskId' });

  // taskId is the full operation name, e.g. "operations/xxx"
  // Security: only allow operations/ paths
  if (!taskId.startsWith('operations/')) {
    return res.status(400).json({ error: '无效的 taskId 格式' });
  }

  try {
    const resp = await fetch(
      `${VEO_BASE}/${taskId}?key=${GEMINI_API_KEY}`
    );

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ error: JSON.stringify(data) });
    }

    // Not done yet
    if (!data.done) {
      return res.json({ status: 'processing' });
    }

    // Operation error
    if (data.error) {
      return res.json({ status: 'failed', error: data.error.message || '生成失败' });
    }

    // Extract video file URI from response
    const sample = data.response?.generateVideoResponse?.generatedSamples?.[0];
    const fileUri = sample?.video?.uri;

    if (!fileUri) {
      console.error('Veo 操作完成但无视频 URI，响应:', JSON.stringify(data));
      return res.json({ status: 'failed', error: '未返回视频文件，请重试' });
    }

    // Return proxy URL to avoid exposing API key to client
    const videoUrl = `/api/video-proxy?uri=${encodeURIComponent(fileUri)}`;
    res.json({ status: 'succeeded', videoUrl });
  } catch (err) {
    res.status(500).json({ error: '查询失败: ' + err.message });
  }
};
