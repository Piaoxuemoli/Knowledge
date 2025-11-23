import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// API 配置（支持动态更新）
let apiConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
};

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
    if (!apiConfig.apiKey) {
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
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
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

// 验证 API Key 接口
app.post('/api/validate-key', async (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;

    if (!apiKey || !baseUrl) {
      return res.status(400).json({
        valid: false,
        error: 'API Key 和 Base URL 不能为空'
      });
    }

    // 发送测试请求验证 API Key
    const testResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10
      })
    });

    if (testResponse.ok) {
      res.json({ valid: true });
    } else {
      const errorData = await testResponse.json();
      res.json({ 
        valid: false, 
        error: errorData.error?.message || 'API Key 验证失败' 
      });
    }
  } catch (error) {
    console.error('验证 API Key 错误:', error);
    res.json({ 
      valid: false, 
      error: '无法连接到 API 服务器' 
    });
  }
});

// 更新 API 配置接口
app.post('/api/update-config', async (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;

    if (!apiKey || !baseUrl) {
      return res.status(400).json({
        success: false,
        error: 'API Key 和 Base URL 不能为空'
      });
    }

    // 更新配置
    apiConfig.apiKey = apiKey;
    apiConfig.baseUrl = baseUrl;

    console.log('✅ API 配置已更新');
    res.json({ success: true });
  } catch (error) {
    console.error('更新配置错误:', error);
    res.status(500).json({
      success: false,
      error: '更新配置失败'
    });
  }
});

// 获取当前配置接口（隐藏完整 API Key）
app.get('/api/config', (req, res) => {
  const maskedKey = apiConfig.apiKey 
    ? `${apiConfig.apiKey.slice(0, 8)}...${apiConfig.apiKey.slice(-4)}`
    : '';
  
  res.json({
    apiKey: maskedKey,
    baseUrl: apiConfig.baseUrl,
    hasKey: !!apiConfig.apiKey
  });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`✅ API Key 已配置: ${apiConfig.apiKey ? '是' : '否'}`);
  console.log(`🔗 Base URL: ${apiConfig.baseUrl}`);
});
