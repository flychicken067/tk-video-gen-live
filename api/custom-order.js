// api/custom-order.js
// 定制委托：接收需求描述，通过飞书通知运营者

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, industry, contact } = req.body;

  if (!description?.trim() || !contact?.trim()) {
    return res.status(400).json({ error: '需求描述和联系方式为必填项' });
  }

  // Sanitize user input to prevent newline injection in Feishu notifications
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
              '📋 新定制委托！',
              `需求：${s(description)}`,
              `行业：${s(industry) || '未填'}`,
              `联系方式：${s(contact)}`,
            ].join('\n'),
          },
        }),
      });
    } catch (e) {
      console.error('飞书通知失败:', e.message);
    }
  }

  res.json({ message: '需求已收到，我们将在 24 小时内报价！' });
};
