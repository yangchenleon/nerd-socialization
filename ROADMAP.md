# Roadmap: 直男社交训练营 (MVP -> V1.0)

本项目目前是一个跑通了核心逻辑（聊天+教练分析）的 MVP（最小可行性产品）。为了向商业级、体验优秀的虚拟对话产品演进，我们需要对其技术架构进行一次全方位的重构和升级。

本 Roadmap 结合了成熟虚拟人产品（如 Character.ai、星野）的架构设计，分为五个主要演进阶段。

---

### Phase 1: 角色设定引擎与多角色支持 (Character Engine)

目前我们的角色是硬编码（Hardcode）在 `main.py` 里的。我们需要将其抽象化。

- [ ] **抽象角色数据模型**：在数据库中新增 `CharacterModel`，包含角色的 `name`, `greeting`, `personality`, `scenario`, `system_prompt_template`。
- [ ] **动态 Prompt 构建器**：后端引入 Prompt Builder，在每次对话前，根据选择的角色动态拼装 System Prompt。
- [ ] **引入设定集 (Lorebook/RAG)**：针对每个角色建立专属背景故事库（如通过文本+向量化检索）。当用户聊到特定词汇时，动态将背景设定注入到 prompt 中（例如林晚的家庭背景、职业信息），保证人设丰满且不崩塌。

---

### Phase 2: 复合记忆架构 (Advanced Context Management)

解决目前的 `limit(10)` 导致的“聊过就忘”和“死板截断”问题。

- [ ] **基于 Token 的滑动窗口（短期记忆）**：引入 `tiktoken` 库计算消耗，精确控制发送给大模型的上下文 token 数量，而不是简单粗暴地按条数截断。
- [ ] **动态摘要记忆 (Summary Memory)**：当对话达到一定轮数时，触发后台任务，使用一个小模型生成前文摘要（如“用户和林晚正在聊电影，林晚觉得用户有些直男”），并将其常驻于 System Prompt 顶部，以极小的 token 维持长线剧情记忆。
- [ ] **长程向量记忆 (Long-term Memory)**：引入轻量级向量库（如 `chromadb` 或 `qdrant`），将历史对话转存为向量。当用户提及很久以前的话题时，通过语义检索找回记忆。

---

### Phase 3: 流式输出与双线架构 (Streaming & Pipeline)

目前强制要求输出 JSON 导致必须等待整句生成完毕，首字延迟极高。

- [ ] **重构为 SSE 流式响应**：将 `/chat` 接口改为 Server-Sent Events，让角色的回复可以像“打字机”一样逐字输出在前端，极大提升用户体验。
- [ ] **解耦“对话”与“教练分析”**：
  - **主线**：优先调用大模型生成纯文本流式回复，只负责和用户聊天。
  - **支线 (旁路分析)**：当一条回复生成完毕后，触发异步任务（如 Celery 或 FastAPI BackgroundTask），单独向大模型发起一次结构化请求，获取“直男分析与建议”，再通过 WebSocket 推送给前端显示在侧边栏。

---

### Phase 4: 工程架构与数据库升级

随着功能复杂化，当前的 SQLite 和单文件结构会遇到瓶颈。

- [ ] **项目结构模块化**：将单文件 `main.py` 拆分为 `routers/`, `models/`, `services/`, `core/` 等标准的 FastAPI 目录结构。
- [ ] **数据库迁移**：从 `SQLite` 迁移至 `PostgreSQL`（配合 SQLAlchemy），以支持并发和 JSONB 等高级字段。
- [ ] **引入 Redis**：使用 Redis 维护用户的在线状态、限流 (Rate Limiting) 以及缓存。

---

### Phase 5: 前端美学重构与体验升级 (WOW Experience)

目前前端可能还是一个基础的对话框，需要全面升级视觉与交互。

- [ ] **重新设计 UI/UX**：引入高级感设计语言。使用暗黑模式 (Dark Mode)、玻璃拟态 (Glassmorphism)、流畅的渐变和精选色板，使其具有商业产品的 Premium 质感。
- [ ] **微交互动画 (Micro-animations)**：增加消息发送时的气泡弹出、教练分析加载时的骨架屏/发光特效、打字机光标动画等。
- [ ] **状态管理优化**：引入 `Zustand` 处理复杂的对话流、流式拼接、多会话切换等前端状态。
