# Tasks

- [ ] Task 1: 创建共享类型定义
  - 新建 `shared/types/har-viewer.ts`
  - 定义 `HarSession`、`HarViewerData`、`HarEntry`、`HarRequest`、`HarResponse`、`HarTimings` 等接口
  - 在 `shared/index.ts` 中导出

- [ ] Task 2: 创建主进程打开文件 IPC handler
  - 新建 `main/tools/har-viewer.ts`
  - 实现 `har-viewer:open-files` → `dialog.showOpenDialog` 多选 `.har` / `.json`，读取内容，返回 `{ canceled, files: { name, path, content }[] }`
  - 更新 `main/tools/index.ts` 注册 handler

- [ ] Task 3: 更新 IPC client
  - 在 `ipc/client.ts` 中添加 `harViewer.openFiles` 方法

- [ ] Task 4: 注册工具条目
  - 在 `data/tools.ts` 中添加 `har-viewer` 工具（id / name / description / icon / category / accentColor / tags）

- [ ] Task 5: 创建工具页面
  - 新建 `pages/tools/har-viewer.vue`
  - 布局：HAR 文件会话面板（打开 / 切换 / 移除）+ 工具栏（搜索 / 状态过滤 / 深度搜索 / 导出）+ 汇总概览 + 请求表格 + 详情面板

- [ ] Task 6: 实现多文件会话管理
  - 打开（多个）/ 切换 / 移除（至少保留一个）
  - 首次使用创建「示例」会话
  - 通过 `data:get/set('har-viewer')` 持久化元信息（不含原始 HAR 内容）

- [ ] Task 7: 实现 HAR 解析与汇总概览
  - 渲染进程 `parseHarFile(content)`：提取 `log.entries`，统计总数、2xx/3xx/4xx/5xx、平均耗时、传输大小
  - 非法文件 / 缺少 `log.entries` 时显示错误 Toast
  - 汇总统计卡片渲染

- [ ] Task 8: 实现请求表格与搜索过滤
  - 表格列：# / 状态 / 方法 / 域名 / URL / 类型 / 耗时（进度条）/ 大小
  - 域名与 URL 拆分：`new URL(url)` 拆出 host 与 path+query
  - 状态码徽标按 2xx/3xx/4xx/5xx 着色，方法标签着色
  - 耗时段按当前列表最大耗时比例渲染进度条
  - 搜索框按 URL/方法/状态模糊过滤，状态下拉过滤；空态展示
  - 「深度搜索」复选框：勾选后搜索扩展到请求体 / 响应体 / 请求头/响应头值 / Query 参数
  - 点击行选中进入详情

- [ ] Task 9: 实现详情面板
  - 6 个 Tab：概述 / 请求头 / 响应头 / 请求体 / 响应体 / 耗时，默认概述
  - 概述：URL、方法/协议、状态、总耗时、MIME、响应大小、开始时间
  - 耗时 Tab：阻塞/DNS/连接/SSL/发送/等待/接收 分段彩色进度条瀑布 + 各阶段明细表 + 总耗时
  - 请求头：URL、方法、Query 参数表、请求头表
  - 响应头：状态、重定向、响应头表
  - 请求体：JSON 转义后高亮或纯文本，可复制
  - 响应体：JSON 格式化 + 语法高亮，可复制

- [ ] Task 10: TypeScript 检查验证
  - 主进程 `tsc --noEmit -p tsconfig.node.json` 零错误
  - 渲染进程 `vue-tsc --noEmit -p tsconfig.web.json` 零错误

# Task Dependencies
- Task 1 是前置依赖（类型被 Task 3、Task 6-9 使用）
- Task 2 → Task 3 顺序依赖
- Task 4、Task 5 可并行
- Task 5 依赖 Task 3、Task 4 完成后实现页面（Task 6-9 属于页面内部，Task 7/8/9 可并行）
- Task 10 是最终验证