// api/custom-order.js
// 内容定制委托：接收新版表单字段（公司/申请人/需求），通过飞书 Webhook 通知运营者

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyName, industry, name, position, phone, email, description } = req.body;

  if (!name?.trim() || !phone?.trim() || !description?.trim()) {
    return res.status(400).json({ error: '姓名、联系电话、需求描述为必填项' });
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
              '📋 新内容定制委托！',
              `公司：${s(companyName) || '未填'} / 行业：${s(industry) || '未填'}`,
              `姓名：${s(name)} / 职位：${s(position) || '未填'}`,
              `电话：${s(phone)} / 邮箱：${s(email) || '未填'}`,
              `需求：${s(description)}`,
            ].join('\n'),
          },
        }),
      });
    } catch (e) {
      console.error('飞书通知失败:', e.message);
    }
  }

  res.json({ message: '申请已收到，我们将在 24 小时内与您联系！' });
};
