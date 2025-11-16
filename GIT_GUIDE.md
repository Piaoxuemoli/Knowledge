# Git 管理指南

## 当前状态

✅ Git 仓库已初始化  
✅ `.gitignore` 已配置，敏感文件（API Key）会被自动忽略  
✅ 准备提交改造后的代码

---

## 快速操作

### 1️⃣ 添加所有改动到暂存区

```powershell
git add .
```

这会添加：
- ✅ 新文件：`server/`、`CHANGES.md`、`SETUP.md`、启动脚本等
- ✅ 修改的文件：`README.md`、`package.json`、服务层代码等
- ❌ 忽略的文件：`server/.env`（包含 API Key）、`node_modules/` 等

### 2️⃣ 查看将要提交的内容

```powershell
git status
```

确认没有包含敏感信息。

### 3️⃣ 提交改动

```powershell
git commit -m "feat: 将 API Key 移至后端，增强安全性

- 新增后端代理服务器（server/server.js）
- API Key 从前端移至 server/.env
- 前端通过本地后端调用 DeepSeek API
- 保持所有原有功能（知识库、猫娘人格等）不变
- 添加一键启动脚本和详细文档"
```

### 4️⃣ 推送到远程仓库（如果已配置）

```powershell
# 首次推送
git push -u origin main

# 后续推送
git push
```

---

## 详细步骤说明

### 检查敏感信息是否被排除

```powershell
# 查看被忽略的文件
git status --ignored

# 应该看到：
# Ignored files:
#   server/.env          ← API Key 在这里，不会被提交
#   node_modules/
#   dist/
```

### 查看具体改动

```powershell
# 查看所有文件的改动摘要
git diff --stat

# 查看某个文件的详细改动
git diff src/services/deepseekService.ts

# 查看即将提交的内容
git diff --cached
```

### 分步添加文件（推荐用于首次提交）

```powershell
# 1. 添加后端代码
git add server/

# 2. 添加文档
git add CHANGES.md SETUP.md GIT_GUIDE.md

# 3. 添加启动脚本
git add start.ps1 start.bat

# 4. 添加修改的前端代码
git add src/ package.json package-lock.json

# 5. 添加配置文件更新
git add .env .gitignore README.md

# 6. 查看状态
git status
```

---

## 提交信息建议

### 本次提交

```powershell
git commit -m "feat: 重构为前后端分离架构，提升 API 安全性

主要改动：
- 新增 Node.js 后端代理服务器（Express）
- API Key 从浏览器端移至服务器端
- 前端通过本地后端调用 DeepSeek API
- 保持所有原有功能完全不变
- 添加详细文档和一键启动脚本

安全改进：
- API Key 不再暴露到浏览器
- 添加 .gitignore 规则保护敏感信息
- 可在后端添加速率限制等安全措施

文件说明：
- server/ - 轻量级后端代理（50行代码）
- CHANGES.md - 详细改造说明
- SETUP.md - 启动指南
- start.ps1/bat - 一键启动脚本"
```

### 后续提交规范

```powershell
# 新功能
git commit -m "feat: 添加对话历史功能"

# Bug 修复
git commit -m "fix: 修复知识库匹配阈值问题"

# 文档更新
git commit -m "docs: 更新 README 使用说明"

# 代码优化
git commit -m "refactor: 优化 DeepSeek 服务错误处理"

# 样式调整
git commit -m "style: 调整聊天气泡样式"
```

---

## 配置远程仓库

### 方式 1：连接到 GitHub

```powershell
# 1. 在 GitHub 上创建新仓库（不要初始化 README）
# 2. 添加远程仓库
git remote add origin https://github.com/你的用户名/Knowledge.git

# 3. 推送代码
git branch -M main
git push -u origin main
```

### 方式 2：查看现有远程仓库

```powershell
# 查看远程仓库
git remote -v

# 如果已配置，直接推送
git push
```

---

## 常用 Git 命令

### 查看状态和历史

```powershell
# 查看当前状态
git status

# 查看提交历史
git log --oneline --graph --all

# 查看最近 5 次提交
git log -5 --pretty=format:"%h - %an, %ar : %s"

# 查看某个文件的修改历史
git log --follow -- src/App.tsx
```

### 撤销操作

```powershell
# 撤销工作区的修改（慎用！）
git restore 文件名

# 撤销暂存区的文件
git restore --staged 文件名

# 修改最后一次提交信息
git commit --amend -m "新的提交信息"

# 回退到上一次提交（保留修改）
git reset HEAD~1

# 回退到上一次提交（丢弃修改，慎用！）
git reset --hard HEAD~1
```

### 分支管理

```powershell
# 创建新分支
git branch feature/新功能

# 切换分支
git checkout feature/新功能

# 创建并切换（推荐）
git checkout -b feature/新功能

# 查看所有分支
git branch -a

# 合并分支到主分支
git checkout main
git merge feature/新功能

# 删除已合并的分支
git branch -d feature/新功能
```

---

## 注意事项

### ⚠️ 敏感信息保护

**永远不要提交：**
- ❌ `server/.env`（包含真实 API Key）
- ❌ `node_modules/`（依赖包，通过 package.json 管理）
- ❌ `dist/`（构建产物）
- ❌ 任何包含密码、密钥的文件

**可以提交：**
- ✅ `server/.env.example`（示例配置，不含真实密钥）
- ✅ `.env`（如果只包含开发配置，且没有敏感信息）
- ✅ 所有源代码、文档、配置文件

### 🔍 检查清单

提交前确认：

```powershell
# 1. 检查是否有敏感信息
git diff | grep -i "api_key\|password\|secret"

# 2. 查看将要提交的文件
git status

# 3. 确认 .env 文件没有真实密钥
cat .env
cat server/.env.example  # 这个可以提交
# 注意：server/.env 不应出现在 git status 中
```

### 📦 如果不小心提交了敏感信息

```powershell
# 方法 1：如果还没推送到远程
git reset HEAD~1
git add .  # 重新添加（排除敏感文件）
git commit -m "提交信息"

# 方法 2：如果已经推送（需要强制推送，慎用！）
# 1. 从历史中删除敏感文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch server/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 2. 强制推送（警告：会改写历史）
git push origin --force --all

# 方法 3：最安全的方式
# 立即更换 API Key，然后正常提交更新的 .gitignore
```

---

## 团队协作

### 克隆项目后的设置

```powershell
# 1. 克隆仓库
git clone https://github.com/Piaoxuemoli/Knowledge.git
cd Knowledge

# 2. 复制环境变量模板
copy server\.env.example server\.env

# 3. 编辑 server\.env，填入自己的 API Key
notepad server\.env

# 4. 安装依赖
npm install
cd server
npm install
cd ..

# 5. 启动项目
.\start.ps1
```

### 拉取最新代码

```powershell
# 拉取并合并
git pull

# 如果有冲突，解决后
git add .
git commit -m "merge: 解决合并冲突"
git push
```

---

## 工作流程示例

### 日常开发

```powershell
# 1. 拉取最新代码
git pull

# 2. 创建功能分支
git checkout -b feature/add-cache

# 3. 进行开发...（编辑代码）

# 4. 查看改动
git status
git diff

# 5. 添加改动
git add src/services/cacheService.ts

# 6. 提交
git commit -m "feat: 添加缓存服务"

# 7. 推送到远程
git push -u origin feature/add-cache

# 8. 在 GitHub 上创建 Pull Request

# 9. 合并后，切回主分支
git checkout main
git pull
git branch -d feature/add-cache
```

---

## 快速参考

```powershell
# 初始化仓库
git init

# 添加所有文件
git add .

# 提交
git commit -m "提交信息"

# 推送
git push

# 拉取
git pull

# 查看状态
git status

# 查看历史
git log --oneline

# 查看远程仓库
git remote -v
```

---

## 现在就开始！

执行以下命令完成首次提交：

```powershell
# 1. 确认当前状态
git status

# 2. 添加所有改动
git add .

# 3. 再次确认（检查敏感信息）
git status

# 4. 提交
git commit -m "feat: 重构为前后端分离架构，提升 API 安全性"

# 5. 推送到远程（如果已配置）
git push
```

完成！🎉
