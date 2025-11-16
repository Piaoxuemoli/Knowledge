@echo off
echo ====================================
echo 知识助手 - 快速启动
echo ====================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查前端依赖
if not exist "node_modules" (
    echo [步骤 1/4] 安装前端依赖...
    call npm install
) else (
    echo [步骤 1/4] 前端依赖已安装，跳过
)

REM 检查后端依赖
if not exist "server\node_modules" (
    echo [步骤 2/4] 安装后端依赖...
    cd server
    call npm install
    cd ..
) else (
    echo [步骤 2/4] 后端依赖已安装，跳过
)

REM 检查后端配置
if not exist "server\.env" (
    echo.
    echo [警告] 未找到 server\.env 文件
    echo 请复制 server\.env.example 并配置 DEEPSEEK_API_KEY
    echo.
    pause
    exit /b 1
)

echo [步骤 3/4] 检查配置...
findstr /C:"DEEPSEEK_API_KEY=sk-" server\.env >nul
if %errorlevel% neq 0 (
    echo.
    echo [警告] 未配置有效的 DEEPSEEK_API_KEY
    echo 请编辑 server\.env 文件并填入你的 API Key
    echo.
    pause
    exit /b 1
)

echo [步骤 4/4] 启动服务...
echo.
echo 后端: http://localhost:3000
echo 前端: http://localhost:5173
echo.
echo 按 Ctrl+C 可停止服务
echo ====================================
echo.

call npm run dev:all
