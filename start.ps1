# 知识助手 - 快速启动脚本

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "知识助手 - 快速启动" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未检测到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

# 检查前端依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "[步骤 1/4] 安装前端依赖..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[步骤 1/4] 前端依赖已安装，跳过" -ForegroundColor Green
}

# 检查后端依赖
if (-not (Test-Path "server\node_modules")) {
    Write-Host "[步骤 2/4] 安装后端依赖..." -ForegroundColor Yellow
    Push-Location server
    npm install
    Pop-Location
} else {
    Write-Host "[步骤 2/4] 后端依赖已安装，跳过" -ForegroundColor Green
}

# 检查后端配置
if (-not (Test-Path "server\.env")) {
    Write-Host ""
    Write-Host "[警告] 未找到 server\.env 文件" -ForegroundColor Red
    Write-Host "请复制 server\.env.example 并配置 DEEPSEEK_API_KEY" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "[步骤 3/4] 检查配置..." -ForegroundColor Yellow
$envContent = Get-Content "server\.env" -Raw
if ($envContent -notmatch "DEEPSEEK_API_KEY=sk-") {
    Write-Host ""
    Write-Host "[警告] 未配置有效的 DEEPSEEK_API_KEY" -ForegroundColor Red
    Write-Host "请编辑 server\.env 文件并填入你的 API Key" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

Write-Host "[步骤 4/4] 启动服务..." -ForegroundColor Yellow
Write-Host ""
Write-Host "正在初始化 RAG 向量数据库..." -ForegroundColor Magenta
Write-Host "后端: http://localhost:3000" -ForegroundColor Cyan
Write-Host "前端: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "首次启动需要加载模型并生成向量，请耐心等待..." -ForegroundColor Yellow
Write-Host "看到 '向量生成完成' 后即可在浏览器访问前端" -ForegroundColor Green
Write-Host "按 Ctrl+C 可停止服务" -ForegroundColor Gray
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

npm run dev:all
