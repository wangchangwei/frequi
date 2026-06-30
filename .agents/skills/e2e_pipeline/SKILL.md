---
name: e2e_pipeline
description: 提供前端 (FreqUI) 与后端 (Freqtrade) 进行 E2E 联调、测试和排查集成问题的步骤指南。
---

# E2E Pipeline Skill

此 Skill 用于辅助 AI Agent 在处理 FreqUI 与 Freqtrade 之间的全链路 (End-to-End) 联调测试、数据打通和异常排查。

## 1. 架构环境与上下文
- **前端 (Frontend)**: 目录位于 `/Users/changwei/freq/frequi/`。技术栈为 Vue 3 + Vite + pnpm。需在 Node v22 下运行。
- **后端 (Backend)**: 目录位于 `/Users/changwei/freq/freqtrade/`。技术栈为 Python (FastAPI)。通常使用 Docker 或原生 Python 虚拟环境启动，提供标准 REST API。
- **本地服务端口**:
  - Frontend: `http://127.0.0.1:4399`
  - Backend API: `http://127.0.0.1:8080` (在 `vite.config.ts` 中已配置 `/api` 代理到此端口)

## 2. 核心联调路径指南

当用户要求进行“E2E联调”或“测试 Pipeline”时，请按照以下链路执行：

### 2.1 后端 API 存活检查
在使用前端触发任何请求前，请先验证 Freqtrade API 是否正常返回。
- 建议动作: 使用 `run_command` 执行简单的 `curl http://127.0.0.1:8080/api/v1/ping`（需带 token，视后端安全配置而定）。

### 2.2 前端 Dev Server 与 Proxy 机制检查
- 前端是否正在运行？（可通过 `manage_task` 检查是否有 Vite 服务在跑，如有必要，可杀死后重启 `pnpm run dev`）。
- **避坑警告**: Vite 拦截代理 `/api` 时，如果有新增的第三方中间件（如 `body-parser`），**必须确保其作用域仅限制在特定路径**，否则会导致 POST 数据流被拦截消费，引发类似 `/api/v1/pairlists/evaluate` 等官方 API 无响应、请求挂起 20 秒超时的问题。

### 2.3 自定义队列回测联调 (Queue Backtest)
本项目中存在一个跨端定制逻辑 `queue_backtest.py`，其 E2E 数据流向如下：
1. **Frontend**: 用户在 UI 配置黑白名单 -> 组装策略与时间参数 -> POST `/api/v1/queue_backtest`。
2. **Vite Node层**: `vite.config.ts` 中的中间件拦截此路径 -> 拼装 Shell 命令 -> 执行 `child_process.exec('python queue_backtest.py --export-mode trades ...')`。
3. **Host Python层**: `queue_backtest.py` 分发任务到 Docker，为每个交易对启动一个 freqtrade 容器进行回测。
4. **结果聚合**: 脚本执行完毕后将多个独立 `.json` 结果合并为 `user_data/backtest_results/backtest-result-{timestamp}.json`。
5. **UI 数据回显**: 提醒用户在 FreqUI 的 History Tab 刷新，拉取后端最新的 `api/v1/backtest/history` 即可渲染图表。

## 3. 常见排查动作清单
- **图表数据不显示**: 检查回测输出的 `.json` 结构是否包含完整的 `trades`、`results_per_pair` 和 `metadata` 结构；
- **接口无响应**: 审查 `vite.config.ts`，排查是否有全局拦截；
- **Python 找不到依赖**: 明确是在宿主机 (Host) 运行还是在 Docker 内运行。定制脚本 `queue_backtest.py` 在宿主机运行，而标准的 freqtrade 后端在 Docker 运行。
