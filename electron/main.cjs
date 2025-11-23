const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// 尝试加载环境变量
// 优先加载根目录 .env，如果没有则尝试加载 server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.DEEPSEEK_API_KEY) {
  dotenv.config({ path: path.join(__dirname, '../server/.env') });
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// API 配置（支持动态更新）
let apiConfig = {
  apiKey: DEEPSEEK_API_KEY,
  baseUrl: 'https://api.deepseek.com'
};

// 配置文件路径
const getConfigPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'api-config.json');
};

// 加载保存的配置
const loadSavedConfig = () => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (savedConfig.apiKey) apiConfig.apiKey = savedConfig.apiKey;
      if (savedConfig.baseUrl) apiConfig.baseUrl = savedConfig.baseUrl;
      console.log('✅ 已加载保存的 API 配置');
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
};

// 保存配置到文件
const saveConfig = () => {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(apiConfig, null, 2));
    console.log('✅ API 配置已保存');
  } catch (error) {
    console.error('保存配置失败:', error);
  }
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // 隐藏菜单栏
    title: "知识助手",
    icon: path.join(__dirname, '../public/favicon.ico') // 尝试使用 favicon 作为图标
  });

  // 开发环境加载 Vite 服务，生产环境加载打包文件
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // 开发模式开启控制台
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  loadSavedConfig(); // 启动时加载配置
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理 DeepSeek API 请求 (替代 server.js)
ipcMain.handle('deepseek-chat', async (event, messages) => {  // 监听渲染进程消息
  if (!apiConfig.apiKey) {
    throw new Error("API Key 未配置，请检查 .env 文件或在设置中配置");
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("DeepSeek API 调用失败:", error);
    throw error;
  }
});

// 验证 API Key
ipcMain.handle('validate-api-key', async (event, { apiKey, baseUrl }) => {
  try {
    const testResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'test' }],
        stream: false
      })
    });

    if (testResponse.ok) {
      return { valid: true };
    } else {
      const errorData = await testResponse.json();
      return { 
        valid: false, 
        error: errorData.error?.message || 'API Key 验证失败' 
      };
    }
  } catch (error) {
    console.error('验证 API Key 错误:', error);
    return { 
      valid: false, 
      error: '无法连接到 API 服务器' 
    };
  }
});

// 更新 API 配置
ipcMain.handle('update-api-config', async (event, { apiKey, baseUrl }) => {
  try {
    apiConfig.apiKey = apiKey;
    apiConfig.baseUrl = baseUrl;
    saveConfig();
    return { success: true };
  } catch (error) {
    console.error('更新配置错误:', error);
    return { success: false, error: '更新配置失败' };
  }
});

// 获取当前配置
ipcMain.handle('get-api-config', async () => {
  const maskedKey = apiConfig.apiKey 
    ? `${apiConfig.apiKey.slice(0, 8)}...${apiConfig.apiKey.slice(-4)}`
    : '';
  
  return {
    apiKey: maskedKey,
    baseUrl: apiConfig.baseUrl,
    hasKey: !!apiConfig.apiKey
  };
});