# 直男社交训练营 (Nerd Socialization Simulator)

这是一个基于 AI 的对话模拟器项目，旨在帮助用户在虚拟的社交场景中提升沟通技巧。不仅提供与虚拟角色（如高冷女孩林晚）的对话功能，还在后台附带“直男教练”分析，实时指出对话中的问题并提供建议。

## 技术栈

- **后端**: Python, FastAPI, SQLAlchemy, SQLite, OpenAI API SDK (底层接入 Qwen3.5-35B-A3B 模型)
- **前端**: React, Vite, Tailwind CSS (假设)

## 核心功能

- **多会话管理**：支持创建和保存多个不同的聊天存档。
- **上下文记忆**：基于 SQLite 本地数据库，自动管理对话历史，使 AI 具备短期记忆。
- **教练分析模式**：AI 不仅返回角色回复，同时结构化输出“直男问题分析”、“女孩潜台词”以及“高情商回复建议”。

## 如何启动本项目

### 方式一：使用 Docker (推荐)

如果你本地安装了 Docker 和 Docker Compose，可以通过以下命令一键启动整个前后端服务：

```bash
docker-compose up -d
```
启动后：
- 前端访问地址：http://localhost:5173
- 后端 API 地址：http://localhost:8000

### 方式二：本地手动启动

1. **启动后端服务**：
   ```bash
   # 安装依赖
   pip install -r requirements.txt
   
   # 启动服务
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **启动前端服务**：
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
