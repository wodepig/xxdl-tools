# 工具箱首页架构设计 — 验证清单

## 架构设计检查
- [x] 共享类型 (`src/shared/`) 定义了 `ToolDefinition`、`ToolCategory`、`AppSettings` 等核心类型
- [x] 工具注册采用声明式数据驱动方式，新增工具只需添加数据配置
- [x] IPC 通道采用 `namespace:action` 命名空间规范
- [x] 各工具 IPC handler 可独立文件管理，通过统一入口注册
- [x] 布局组件（TopBar/Sidebar/Layout）职责单一，与业务逻辑解耦
- [x] 数据存储采用 `data/<toolId>.json` 文件路径规范，各工具完全独立
- [x] 存储引擎不关心 JSON 内容结构，工具自行定义其数据 schema

## 组件实现检查
- [x] `AppTopBar.vue` — 包含 Logo、标题、设置入口、窗口控制按钮（最小化/最大化/关闭）
- [x] `AppSidebar.vue` — 包含分类导航、收藏夹、使用记录
- [x] `ToolCard.vue` — 显示图标、名称、描述、标签、评分，有 hover 动画
- [x] `ToolSearch.vue` — 支持 Ctrl+K 快捷聚焦，输入框带搜索图标
- [x] `QuickAccessBar.vue` — 渲染置顶工具按钮行
- [x] `ToolCategorySection.vue` — 分类标题 + badge + 响应式卡片网格
- [x] `RecentList.vue` — 显示工具名、操作描述、时间，带图标

## 数据流检查
- [x] `toolsStore` 管理工具列表，支持按分类筛选和关键词搜索
- [x] `settingsStore` 管理主题、置顶工具、最近使用等配置
- [x] 配置修改通过 IPC `settings:set` 持久化到主进程
- [x] 应用启动时在 `AppLayout.vue` 的 `onMounted` 中通过 IPC `settings:get` 加载配置

## IPC 通信检查
- [x] `ipc/client.ts` 封装类型安全的 invoke 方法
- [x] 主进程 `src/main/ipc/system.ts` 处理窗口控制和系统信息
- [x] 主进程 `src/main/ipc/settings.ts` 处理配置 get/set/reset
- [x] 所有 IPC handler 通过 `src/main/ipc/index.ts` 统一注册

## 数据存储检查
- [x] `src/main/storage/driver.ts` 封装 `fs` 读写，支持自动创建目录
- [x] `src/main/storage/index.ts` 提供 `getToolData` / `setToolData` / `deleteToolData` 方法
- [x] IPC `data:get:<toolId>` 读取 `{userData}/data/<toolId>.json`，文件不存在时返回 `{}`
- [x] IPC `data:set:<toolId>` 写入 `{userData}/data/<toolId>.json`
- [x] IPC `data:delete:<toolId>` 删除对应的数据文件
- [x] 示例工具 handler 中演示了 data:get/set 的调用模式

## 路由检查
- [x] `/` 路由渲染 HomePage（搜索结果 + 工具网格 + 最近使用）
- [x] `/settings` 路由渲染 SettingsPage
- [x] Navigation 切换正常

## 样式与体验检查
- [x] 全局样式使用 TailwindCSS，不依赖自定义 CSS
- [x] 组件使用 Nuxt UI 组件（UButton、UIcon、UBadge、UInput 等）
- [x] 布局为全屏应用模式（非居中演示模式）
- [x] 窗口标题栏区域支持拖动 (`-webkit-app-region: drag`)
