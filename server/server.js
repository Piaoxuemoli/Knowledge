import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行中' });
});

// DeepSeek API 代理接口
app.post('/api/chat', async (req, res) => {
  try {
    // 检查 API Key
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        error: '服务器未配置 DEEPSEEK_API_KEY'
      });
    }

    const { messages, model = 'deepseek-chat', temperature = 0.6, max_tokens = 1024 } = req.body;

    // 验证请求参数
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: '缺少 messages 参数或格式错误'
      });
    }

    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API 错误:', errorText);
      return res.status(response.status).json({
        error: `DeepSeek API 调用失败: ${errorText}`
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('服务器错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`✅ API Key 已配置: ${DEEPSEEK_API_KEY ? '是' : '否'}`);
});
