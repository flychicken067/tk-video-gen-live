// api/seller-apply.js
// 卖家入驻申请：接收表单数据，可选通过飞书 Webhook 通知运营者

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, wechat, designStyle, priceRange } = req.body;

  if (!name?.trim() || !wechat?.trim()) {
    return res.status(400).json({ error: '姓名和微信号为必填项' });
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
              '🎨 新卖家入驻申请！',
              `姓名：${s(name)}`,
              `微信：${s(wechat)}`,
              `设计风格：${s(designStyle) || '未填'}`,
              `定价偏好：${s(priceRange) || '未填'}`,
            ].join('\n'),
          },
        }),
      });
    } catch (e) {
      console.error('飞书通知失败:', e.message);
    }
  }

  res.json({ message: '申请已提交，我们将在 24 小时内联系你！' });
};
