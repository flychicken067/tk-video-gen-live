// api/task/[taskId].js
// 轮询即梦视频任务状态
// Vercel 动态路由：/api/task/abc123 → req.query.taskId = 'abc123'

const TASK_BASE = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

module.exports = async function handler(req, res) {
  const { taskId } = req.query;
  const ARK_API_KEY = process.env.ARK_API_KEY;

  if (!ARK_API_KEY) return res.status(500).json({ error: 'ARK_API_KEY 未设置' });
  if (!taskId) return res.status(400).json({ error: '缺少 taskId' });

  try {
    const response = await fetch(`${TASK_BASE}/${taskId}`, {
      headers: { 'Authorization': `Bearer ${ARK_API_KEY}` },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: JSON.stringify(data) });
    }

    const statusMap = {
      queued:    'processing',
      running:   'processing',
      succeeded: 'completed',
      failed:    'failed',
    };

    const videoItem = (data.content || []).find(c => c.type === 'video_url');

    res.json({
      status:    statusMap[data.status] || 'processing',
      videoUrl:  videoItem?.video_url?.url || null,
      rawStatus: data.status,
    });
  } catch (err) {
    res.status(500).json({ error: '查询失败: ' + err.message });
  }
};
