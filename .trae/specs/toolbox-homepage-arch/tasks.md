# Tasks

## Task 1: 创建共享类型目录和工具/配置类型定义
在 `src/shared/` 下创建工具和配置的类型定义，作为前后端共享数据契约。
- [ ] 创建 `src/shared/types/tool.ts` — 定义 `ToolDefinition`、`ToolCategory`、`RecentItem` 等类型
- [ ] 创建 `src/shared/types/settings.ts` — 定义 `AppSettings`、`ToolSettings`、`CategorySection` 等类型
- [ ] 创建 `src/shared/index.ts` — 统一导出

## Task 2: 重构全局样式和根布局
移除旧的演示样式的代码，改为工具箱应用的全屏布局。
- [ ] 重写 `src/renderer/src/assets/main.css` — 全屏布局、暗色主题基调、滚动条样式
- [ ] 简化 `src/renderer/src/index.html` — 移除不必要的 meta/样式
- [ ] 更新 `src/renderer/src/App.vue` — 改为仅挂载 RouterView 的根容器

## Task 3: 创建 Layout 组件 (AppLayout / AppTopBar / AppSidebar)
根据原型页面构建布局组件体系。
- [ ] 创建 `AppLayout.vue` — 弹性布局容器，组合 TopBar + Sidebar + RouterView
- [ ] 创建 `AppTopBar.vue` — Logo、标题、设置入口、窗口控制按钮（最小化/最大化/关闭）
- [ ] 创建 `AppSidebar.vue` — 分类导航列表（全部/开发/图片/文本/安全加密/数据转换）、收藏、使用记录

## Task 4: 创建 Vue Router 路由系统
配置路由，为首页和设置页建立路由映射。
- [ ] 配置 `src/renderer/src/router/index.ts` — 定义 `/` 和 `/settings` 路由
- [ ] 更新 `main.ts` 中的路由引用

## Task 5: 创建工具数据注册和 Store
实现声明式的工具注册和响应式状态管理。
- [ ] 创建 `src/renderer/src/data/tools.ts` — 声明式工具列表数据（映射原型中的 13 个工具）
- [ ] 创建 `src/renderer/src/stores/toolsStore.ts` — 工具列表、分类、搜索、筛选逻辑
- [ ] 创建 `src/renderer/src/stores/settingsStore.ts` — 主题、置顶、最近使用等配置状态

## Task 6: 创建 IPC 客户端封装
封装类型安全的 IPC 调用接口。
- [ ] 创建 `src/renderer/src/ipc/client.ts` — 封装 `invoke`、`on` 等 IPC 方法，提供 TypeScript 类型
- [ ] 创建 `src/main/ipc/system.ts` — 系统级 IPC handler（窗口控制、应用信息）
- [ ] 创建 `src/main/ipc/settings.ts` — 配置管理 IPC handler（get/set/reset）
- [ ] 创建 `src/main/ipc/index.ts` — IPC 注册入口，统一加载所有 handler

## Task 7: 创建工具数据持久化存储系统
实现基于 JSON 文件的工具数据存储引擎，每个工具独立文件存储。
- [ ] 创建 `src/main/storage/driver.ts` — 文件系统驱动，封装 `fs` 读写 JSON 文件，自动创建目录
- [ ] 创建 `src/main/storage/index.ts` — 存储引擎入口，暴露 `getToolData(toolId)` / `setToolData(toolId, data)` / `deleteToolData(toolId)`
- [ ] 创建 `src/main/ipc/data.ts` — 注册 `data:get:<toolId>` / `data:set:<toolId>` / `data:delete:<toolId>` IPC handler
- [ ] 将 `ipc/data.ts` 引入 `ipc/index.ts` 统一注册

## Task 8: 创建 HomePage 页面组件
组合所有工具相关子组件构建首页。
- [ ] 创建 `pages/index.vue` (HomePage) — 组合搜索、快捷入口、分类区块、最近使用
- [ ] 创建 `ToolSearch.vue` — 搜索输入框，支持 Ctrl+K 快捷聚焦
- [ ] 创建 `QuickAccessBar.vue` — 快捷入口按钮行
- [ ] 创建 `ToolCard.vue` — 单个工具卡片（图标、名称、描述、标签、评分、顶部色条）
- [ ] 创建 `ToolCategorySection.vue` — 分类标题 + 工具卡片网格
- [ ] 创建 `RecentList.vue` — 最近使用列表

## Task 9: 创建设置页面和配置面板
实现统一的配置管理界面。
- [ ] 创建 `pages/settings.vue` — 设置页面布局
- [ ] 创建 `SettingsPanel.vue` — Drawer 形式的配置面板组件

## Task 10: 创建工具 IPC 处理器模板
提供工具主进程处理器的标准模板。
- [ ] 创建 `src/main/tools/example.tool.ts` — 示例工具 handler，展示 IPC 注册和 data:get/set 调用规范
- [ ] 完善 `src/main/index.ts` — 引入并注册所有 IPC handler

---

# Task Dependencies
- Task 1 (共享类型) → 前置依赖：无
- Task 2 (全局样式) → 前置依赖：无
- Task 3 (Layout) → 前置依赖：Task 2
- Task 4 (路由) → 前置依赖：Task 3
- Task 5 (数据/Store) → 前置依赖：Task 1
- Task 6 (IPC 客户端) → 前置依赖：Task 1
- Task 7 (存储系统) → 前置依赖：Task 6
- Task 8 (HomePage) → 前置依赖：Task 4, Task 5
- Task 9 (设置页) → 前置依赖：Task 4, Task 5, Task 6
- Task 10 (主进程 IPC) → 前置依赖：Task 6, Task 7

**可并行执行**: Task 1, Task 2 (无依赖)
**Task 4 依赖 Task 3**: Task 3 完成后方可配置路由
**Task 8, Task 9 可并行**: 两者都依赖 Task 4 和 Task 5 完成
