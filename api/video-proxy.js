// api/video-proxy.js
// 代理 Google Files API 的视频下载，避免前端直接暴露 GEMINI_API_KEY
// GET /api/video-proxy?uri=https%3A%2F%2Fgenerativelanguage...

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

  const { uri } = req.query;
  if (!uri) return res.status(400).json({ error: '缺少 uri 参数' });

  try {
    const downloadUrl = `${uri}?alt=media&key=${GEMINI_API_KEY}`;
    const resp = await fetch(downloadUrl);

    if (!resp.ok) {
      return res.status(resp.status).json({ error: `视频下载失败 (${resp.status})` });
    }

    const contentType = resp.headers.get('content-type') || 'video/mp4';
    const buffer = await resp.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: '下载失败: ' + err.message });
  }
};
