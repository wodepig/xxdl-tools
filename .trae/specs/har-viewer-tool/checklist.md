# Checklist

- [ ] Task 1: 共享类型定义完整
  - [ ] `HarSession` 接口包含 id / name / path / entryCount / createdAt / updatedAt
  - [ ] `HarViewerData` 接口包含 sessions / activeId
  - [ ] `HarEntry` 接口覆盖 request / response / timings / time / startedDateTime
  - [ ] 已从 `shared/index.ts` 导出

- [ ] Task 2: 主进程打开文件 IPC 功能完整
  - [ ] `har-viewer:open-files` 通过 dialog.showOpenDialog 支持多选 `.har` / `.json`
  - [ ] 读取文件内容返回 `{ canceled, files: { name, path, content }[] }`
  - [ ] 已在 `main/tools/index.ts` 注册

- [ ] Task 3: IPC client 添加完整
  - [ ] client.harViewer.openFiles 方法存在且类型正确

- [ ] Task 4: 工具条目已注册
  - [ ] tools.ts 包含 har-viewer 条目（分类 development）

- [ ] Task 5: 工具页面布局完整
  - [ ] 左侧 HAR 文件会话面板（打开 / 切换 / 移除）
  - [ ] 工具栏（搜索 / 状态过滤 / 深度搜索 / 导出）
  - [ ] 汇总概览统计卡片
  - [ ] 请求表格 + 底部详情面板（含 Tab）
  - [ ] Toast 提示 / 空态

- [ ] Task 6: 多文件会话管理逻辑正确
  - [ ] 打开多文件后每个文件成为独立会话并激活最新
  - [ ] 移除文件（至少保留一个）
  - [ ] 首次使用创建「示例」会话
  - [ ] 元信息通过 `data:get/set('har-viewer')` 持久化（不含原始内容）

- [ ] Task 7: HAR 解析与汇总概览逻辑正确
  - [ ] 正确解析 `log.entries`
  - [ ] 汇总卡片：总数 / 2xx / 3xx / 4xx / 5xx / 平均耗时 / 传输大小
  - [ ] 非法文件提示错误，不崩溃

- [ ] Task 8: 请求表格与搜索过滤正确
  - [ ] 表格列完整（# / 状态 / 方法 / 域名 / URL / 类型 / 耗时 / 大小）
  - [ ] 域名与 URL 正确拆分显示（host 与 path+query）
  - [ ] 状态码与方法按颜色区分
  - [ ] 耗时段以进度条按最大耗时比例渲染
  - [ ] 搜索 / 状态过滤实时生效，空态展示
  - [ ] 「深度搜索」勾选后可检索请求体 / 响应体 / 请求头/响应头值 / Query
  - [ ] 点击行选中进入详情

- [ ] Task 9: 详情面板逻辑正确
  - [ ] 概述 / 请求头 / 响应头 / 请求体 / 响应体 / 耗时 六个 Tab 正常切换，默认概述
  - [ ] 详情面板顶部拖拽条可上下调整面板高度
  - [ ] 概述展示 URL、方法/协议、状态、总耗时、MIME、响应大小、开始时间
  - [ ] 耗时 Tab 展示各阶段彩色进度条瀑布、明细表与总耗时
  - [ ] 请求头：URL、方法、Query、请求头表展示正确
  - [ ] 响应头：状态、重定向、响应头表展示正确
  - [ ] 请求体 / 响应体以纯文本展示，JSON 自动美化缩进
  - [ ] 请求体 / 响应体内容可鼠标选中复制
  - [ ] 请求体 / 响应体为 JSON 类型的用折叠树格式化展示（复用 JSON 格式化树组件）
  - [ ] 请求体 / 响应体「复制」按钮可用

- [ ] Task 10: TypeScript 检查零错误
  - [ ] 主进程 tsc 零错误
  - [ ] 渲染进程 vue-tsc 零错误