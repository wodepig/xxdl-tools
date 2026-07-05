# Tasks

- [ ] Task 1: 注册新道云刷课记录工具到工具列表
  - 在 `data/tools.ts` 中添加 `seentao-record` 工具条目
  - 名称：新道云刷课记录
  - 分类为 `ToolCategory.Business` 或新增分类
  - 指定图标、描述、标签

- [ ] Task 2: 创建新道云刷课记录类型定义
  - 在 `shared/types/` 中定义 `SeentaoRecord`、`DayRecords`、`SeentaoRecordConfig` 接口
  - 定义 IPC 通道的请求/响应类型
  - 定义图片命名工具函数

- [ ] Task 3: 实现主进程存储引擎（seentao-record-store）
  - `initStoragePath(path)`：创建 records/ 和 config.json
  - `getRecords(yearMonth, dateKey)` / `saveRecords(yearMonth, dateKey, data)`：按年月目录 + 日期文件读写 JSON
  - `saveImage(yearMonth, imageBuffer)`：保存图片到 `{yearMonth}/images/`，返回文件名
  - `getImage(yearMonth, filename)`：读取图片返回 base64
  - `deleteRecord(yearMonth, dateKey, id)`：删除记录和关联图片
  - 图片命名：`{毫秒时间戳}_{4位随机字符串}.png`

- [ ] Task 4: 实现客户端 IPC 调用层
  - 在 `src/renderer/src/ipc/client.ts` 中添加所有 `seentao-record:*` 的 invoke 方法
  - 类型化请求和响应

- [ ] Task 5: 实现主进程 IPC handlers
  - 在 `src/main/ipc/seentao-record.ts` 中注册所有 `seentao-record:*` handler
  - 调用存储引擎完成具体操作
  - 在主进程入口注册该路由

- [ ] Task 6: 实现新道云刷课记录工具 UI — 初始化引导
  - 首次使用显示 InitGuide 组件
  - 使用输入框或文件夹选择对话框选择存储路径
  - 调用 `seentao-record:init` 初始化目录
  - 保存配置到 config.json

- [ ] Task 7: 实现新道云刷课记录工具 UI — 新增记录
  - AddRecordModal 组件（原生弹窗或 UModal 风格）
  - 表单：学员名（`UInput`）、课程名称（`UInput`）、备注（`UTextarea`）
  - 截图粘贴区：监听 paste 事件，提取 `clipboardData.items` 中的图片
  - 图片预览：已粘贴的图片缩略图列表，支持删除
  - 保存：调用 `seentao-record:create`

- [ ] Task 8: 实现新道云刷课记录工具 UI — 记录列表展示
  - RecordList 组件，按日期分组显示
  - 每条记录展示：时间、学员名、课程名、备注摘要（截断50字）、图片缩略图（前3张）
  - 行级操作：单张图片时显示「复制图片」按钮
  - 点击行打开详情

- [ ] Task 9: 实现新道云刷课记录工具 UI — 记录详情
  - RecordDetailModal
  - 完整备注内容 + 学员名 + 课程名
  - 图片网格展示所有图片
  - 点击图片查看大图
  - 每张图片的「复制图片」按钮
  - 「删除记录」按钮

- [ ] Task 10: 实现记录列表筛选和搜索
  - 年月选择切换
  - 备注内容搜索
  - 按日期倒序排列

# Task Dependencies
- Task 2 (类型定义) → 前置依赖：无
- Task 3 (存储引擎) → 前置依赖：Task 2
- Task 4 (IPC 调用层) → 前置依赖：Task 2
- Task 5 (IPC handlers) → 前置依赖：Task 3, Task 4
- Task 6 (初始化引导 UI) → 前置依赖：Task 5
- Task 7 (新增记录 UI) → 前置依赖：Task 5
- Task 8 (记录列表 UI) → 前置依赖：Task 5, Task 7
- Task 9 (记录详情 UI) → 前置依赖：Task 5, Task 8
- Task 10 (筛选搜索) → 前置依赖：Task 8
