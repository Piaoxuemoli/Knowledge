const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// 尝试加载环境变量
// 优先加载根目录 .env，如果没有则尝试加载 server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.DEEPSEEK_API_KEY) {
  dotenv.config({ path: path.join(__dirname, '../server/.env') });
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

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
  if (!DEEPSEEK_API_KEY) {
    throw new Error("API Key 未配置，请检查 .env 文件");
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
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