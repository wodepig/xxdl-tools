# 工具箱首页架构设计 Spec

## Why
当前项目是一个 Electron 工具箱应用的脚手架，已有 IPC 通信和 Nuxt UI 基础配置，但缺少首页 UI 架构和功能模块的规范化设计。需要根据原型 `docs/index.html` 设计一个组件化、解耦、可通过 IPC 通信的工具箱首页架构。

## What Changes

### 1. 整体架构概览

```
┌────────────────────────────────────────────────────────────┐
│                    App.vue (根布局)                         │
│  ┌──────────┐  ┌─────────────────────────────────────────┐ │
│  │ AppBar   │  │  Title Bar (logo/标题/窗口控制)          │ │
│  ├──────────┤  ├─────────────────────────────────────────┤ │
│  │ Sidebar  │  │  Content Area (Router View)              │ │
│  │ 分类导航  │  │  ┌─────────────────────────────────┐   │ │
│  │ 收藏      │  │  │ HomePage                         │   │ │
│  │ 使用记录  │  │  │  ├─ ToolSearch                   │   │ │
│  │          │  │  │  ├─ QuickAccessBar                │   │ │
│  │          │  │  │  ├─ ToolCategorySection x N       │   │ │
│  │          │  │  │  │   └─ ToolCard x N              │   │ │
│  │          │  │  │  └─ RecentList                    │   │ │
│  │          │  │  └─────────────────────────────────┘   │ │
│  │          │  │  SettingsPage (配置界面)                │ │
│  └──────────┘  └─────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 2. 组件拆分设计

| 层级 | 组件名 | 职责 | 输入(Props) | 输出(Events/IPC) |
|---|---|---|---|---|
| **布局** | `AppTopBar` | 顶部标题栏：logo、标题、窗口控制按钮、设置入口 | — | `@open-settings` |
| **布局** | `AppSidebar` | 左侧导航：分类筛选、收藏、使用记录 | `categories: Category[]`, `activeCategory: string` | `@category-change` |
| **布局** | `AppLayout` | 整体布局容器，组合 TopBar + Sidebar + RouterView | — | — |
| **页面** | `HomePage` | 首页主内容区，组合搜索、快捷入口、卡片网格、最近使用 | — | — |
| **页面** | `SettingsPage` | 统一配置界面：工具管理、主题、快捷键等 | — | — |
| **工具** | `ToolSearch` | 搜索栏，支持快捷键 Ctrl+K 聚焦 | — | `@search(query)` |
| **工具** | `QuickAccessBar` | 快捷入口栏，展示置顶工具 | `tools: ToolDefinition[]` | `@tool-click(toolId)` |
| **工具** | `ToolCategorySection` | 工具分类区块（标题 + badge + 卡片网格） | `section: CategorySection` | — |
| **工具** | `ToolCard` | 单个工具卡片：图标、名称、描述、标签、评分 | `tool: ToolDefinition` | `@click` |
| **工具** | `RecentList` | 最近使用工具列表 | `items: RecentItem[]` | `@item-click(itemId)` |

### 3. 解耦设计：工具注册机制

**核心原则**：每个工具是一个完全独立的模块，通过声明式注册接入系统。

```typescript
// shared/types/tool.ts — 工具通用类型定义
interface ToolDefinition {
  id: string                    // 唯一标识，如 'json-formatter'
  name: string                  // 显示名称
  description: string           // 简短描述
  icon: string                  // 图标名 (Remix Icon)
  category: ToolCategory        // 所属分类
  accentColor: string           // 卡片主题色
  route?: string                // 工具详情页路由 (可选)
  rating?: number               // 评分 1-5
  tags?: string[]               // 标签
  configurable?: boolean        // 是否有可配置项
}

enum ToolCategory {
  Development = 'development',   // 开发工具
  Image = 'image',               // 图片处理
  Text = 'text',                 // 文本工具
  Security = 'security',         // 安全加密
  Data = 'data',                 // 数据转换
  Design = 'design',             // 设计工具
}
```

```typescript
// shared/types/settings.ts — 配置类型定义
interface ToolSettings {
  toolId: string
  settings: Record<string, unknown>  // 各工具自定义配置
}

interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  pinnedTools: string[]             // 置顶工具 ID 列表
  recentTools: RecentItem[]         // 最近使用记录
  toolSettings: ToolSettings[]      // 各工具个性化配置
  sidebarCollapsed: boolean
}
```

### 4. IPC 通信架构

```
┌─────────────────────────────────────────────────────────────┐
│  IPC Channel 命名规范: namespace:action                     │
├─────────────────────────────────────────────────────────────┤
│  系统层面:                                                  │
│    system:get-app-info         → 获取应用信息                │
│    system:window-minimize      → 窗口最小化                  │
│    system:window-maximize      → 窗口最大化                  │
│    system:window-close         → 关闭窗口                    │
│                                                             │
│  配置层面:                                                  │
│    settings:get                → 获取所有配置                │
│    settings:set                → 保存配置项                  │
│    settings:reset              → 重置配置                    │
│                                                             │
│  工具层面 (各工具独立命名空间):                               │
│    tool:<toolId>:<action>      → 各工具自有 IPC 通道         │
│    示例: tool:json-formatter:format                          │
│          tool:base64:encode                                   │
│          tool:timestamp:convert                               │
│                                                             │
│  数据存储层面 (工具数据持久化):                               │
│    data:get:<toolId>           → 读取工具存储数据            │
│    data:set:<toolId>           → 保存工具存储数据            │
│    data:delete:<toolId>        → 删除工具存储数据            │
│    示例: data:get:json-formatter                              │
│          data:set:base64                                      │
└─────────────────────────────────────────────────────────────┘
```

**IPC 调用流程**：
1. 渲染进程通过 `window.electron.ipcRenderer.invoke(channel, args)` 调用
2. 主进程通过 `ipcMain.handle(channel, handler)` 注册处理器
3. 各工具的 IPC 处理器放在独立的 `src/main/tools/` 目录下，按工具 ID 命名文件
4. 主进程入口统一加载所有工具处理器

### 5. 工具数据持久化机制

**问题**：每个工具需要持久化其私有数据（如历史记录、用户内容、配置偏好），但各工具数据结构不同，不应集中管理。

**方案**：每个工具有独立的 JSON 文件，存储于 Electron 的 `userData` 目录下的 `data/` 文件夹中。

```
{userData}/
├── data/
│   ├── json-formatter.json         # JSON 格式化工具的数据
│   ├── base64.json                 # Base64 编解码工具的数据
│   ├── timestamp.json              # 时间戳转换工具的数据
│   ├── qrcode.json                 # 二维码生成工具的数据
│   └── ...                         # 各工具各自独立的数据文件
├── settings.json                   # 应用全局配置 (已有)
```

**存储引擎架构**：

```
┌──────────────────────────────────────────────────────────────┐
│                  渲染进程 (Renderer)                           │
│    toolsStore / settingsStore                                  │
│         │                                                     │
│         │ IPC: data:get:<toolId> / data:set:<toolId>          │
│         ▼                                                     │
├──────────────────────────────────────────────────────────────┤
│                  主进程 (Main)                                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  storage/driver.ts                                       │ │
│  │   - getUserDataPath()  → {userData}/data/               │ │
│  │   - readJSON(filename) → 读取 JSON 文件                  │ │
│  │   - writeJSON(filename, data) → 写入 JSON 文件           │ │
│  │   - deleteJSON(filename) → 删除 JSON 文件                │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  storage/index.ts                                        │ │
│  │   - getToolData(toolId)    → 读取工具数据文件            │ │
│  │   - setToolData(toolId, data) → 写入工具数据文件         │ │
│  │   - deleteToolData(toolId) → 删除工具数据文件            │ │
│  │   - 自动路径拼接: data/<toolId>.json                     │ │
│  │   - 自动创建目录 (若不存在)                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ipc/data.ts                                             │ │
│  │   - data:get:<toolId>  → getToolData(toolId)            │ │
│  │   - data:set:<toolId>  → setToolData(toolId, data)      │ │
│  │   - data:delete:<toolId> → deleteToolData(toolId)       │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**关键设计原则**：
- **每个工具一个文件**：`data/<toolId>.json`，文件名即工具 ID，完全解耦
- **数据结构自由**：存储引擎不关心 JSON 内容结构，每个工具自行定义其数据 schema
- **按需访问**：仅当工具激活时才读取数据，不预加载所有工具数据
- **写时同步**：数据修改后通过 IPC 一次性写入文件，无事务复杂度的保证原子性
- **不混用配置**：工具的行为偏好存于 `settings.json`，工具的用户数据存于独立文件

### 6. 目录结构变更

```
src/
├── main/                           # Electron 主进程
│   ├── index.ts                    # 入口 (已有)
│   ├── ipc/
│   │   ├── index.ts               # IPC 注册入口，加载所有 handler
│   │   ├── system.ts              # 系统级 IPC handler
│   │   ├── settings.ts            # 配置管理 IPC handler
│   │   └── data.ts                # 工具数据存储 IPC handler
│   ├── storage/
│   │   ├── index.ts               # 存储引擎入口 (get/set/delete)
│   │   └── driver.ts              # 文件系统驱动 (JSON 文件读写)
│   └── tools/                      # 各工具的主进程处理器 (按需创建)
│       └── example.tool.ts         # 示例工具处理器模板
│
├── renderer/src/                   # 渲染进程
│   ├── App.vue                     # 根组件
│   ├── main.ts                     # 入口 (已有)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppTopBar.vue       # 顶部导航栏
│   │   │   ├── AppSidebar.vue      # 左侧边栏
│   │   │   └── AppLayout.vue       # 整体布局容器
│   │   ├── tools/
│   │   │   ├── ToolCard.vue        # 工具卡片
│   │   │   ├── ToolSearch.vue      # 工具搜索
│   │   │   ├── QuickAccessBar.vue  # 快捷入口
│   │   │   ├── ToolCategorySection.vue  # 分类区块
│   │   │   └── RecentList.vue      # 最近使用列表
│   │   └── settings/
│   │       └── SettingsPanel.vue   # 配置面板 (Drawer)
│   │
│   ├── pages/
│   │   ├── index.vue               # 首页 (HomePage)
│   │   └── settings.vue            # 设置页
│   │
│   ├── stores/
│   │   ├── toolsStore.ts           # 工具列表/分类状态
│   │   └── settingsStore.ts        # 应用配置状态
│   │
│   ├── ipc/
│   │   └── client.ts               # IPC 客户端封装 (类型安全)
│   │
│   ├── data/
│   │   └── tools.ts                # 工具注册数据 (声明式配置)
│   │
│   ├── types/
│   │   └── (共享类型从 shared/ 导入)
│   │
│   └── assets/
│       └── main.css                # 全局样式 (修改)
│
├── shared/                         # 前后端共享类型
│   ├── types/
│   │   ├── tool.ts                 # 工具类型定义
│   │   └── settings.ts             # 配置类型定义
│   └── index.ts
```

### 7. 数据流

```
┌──────────────┐     IPC: settings:get/set     ┌──────────────┐
│  SettingsPage │ ◄──────────────────────────►  │  Main Process │
│  (配置界面)    │                               │  (设置持久化)  │
└──────┬───────┘                               └──────┬───────┘
       │                                               │
       │  settingsStore (响应式)                        │
       ▼                                               ▼
┌─────────────────────────────────────────────────────────────┐
│  HomePage                                                     │
│  读取 toolsStore → 渲染 ToolCard / QuickAccessBar / Section  │
│  读取 settingsStore → 过滤/排序/展示最近使用                  │
│  用户点击 ToolCard → router.push 或 emit 事件                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐   IPC: data:get/set:<toolId>   ┌──────────────┐
│  Tool Page   │ ◄────────────────────────────►  │  storage/    │
│  (各工具)     │                                 │  *.json 文件 │
└──────────────┘                                 └──────────────┘
```

### 8. 路由设计

```typescript
const routes = [
  { path: '/', component: HomePage },           // 首页
  { path: '/settings', component: SettingsPage }, // 设置页
  // 各工具详情页（未来扩展）
  // { path: '/tool/:id', component: ToolPage }
]
```

### 9. 配置界面设计

`SettingsPanel` 以 Drawer 形式打开，包含以下配置项：
- **外观设置**：主题切换 (dark/light/system)
- **工具管理**：启用/禁用工具、自定义排序
- **快捷入口**：管理置顶工具
- **快捷键**：查看/配置快捷键
- **关于**：版本信息

## Impact
- **Affected code**: `src/renderer/src/` 下几乎所有文件将重构
- **New files**: 约 15+ 个新组件/模块文件
- **Shared types**: 新增 `src/shared/` 共享类型目录
- **Existing code**: 保留 `src/main/index.ts` 主进程入口，扩展 IPC 注册
- **BREAKING**: 当前 `src/renderer/src/App.vue` 将被完全重写

## ADDED Requirements

### Requirement: 首页 Layout 组件化
系统 SHALL 提供可复用的 Layout 组件体系，包括 AppTopBar、AppSidebar、AppLayout。

#### Scenario: 页面布局
- **WHEN** 用户打开应用
- **THEN** 显示顶部导航栏、左侧边栏和主内容区
- **AND** 侧边栏可收起到图标模式

### Requirement: 工具注册机制
系统 SHALL 提供声明式的工具注册方式，每个工具通过数据配置注册，与 UI 组件完全解耦。

#### Scenario: 注册新工具
- **WHEN** 在 `data/tools.ts` 中添加新工具定义
- **THEN** 首页自动渲染该工具卡片
- **AND** 无需修改任何组件代码

### Requirement: IPC 通信架构
系统 SHALL 提供命名空间化的 IPC 通信机制，每个工具有独立 IPC 通道。

#### Scenario: IPC 通信
- **WHEN** 渲染进程调用 `client.invoke('tool:json:format', data)`
- **THEN** 主进程对应 handler 处理并返回结果
- **AND** IPC 调用具有完整 TypeScript 类型

### Requirement: 工具数据持久化
系统 SHALL 提供基于文件系统的工具数据持久化机制，每个工具的数据存储于独立的 JSON 文件中。

#### Scenario: 工具保存数据
- **WHEN** 工具执行操作后需要保存结果或历史记录
- **THEN** 渲染进程通过 IPC `data:set:<toolId>` 发送数据
- **AND** 主进程将数据写入 `{userData}/data/<toolId>.json`

#### Scenario: 工具读取数据
- **WHEN** 工具激活或页面加载
- **THEN** 渲染进程通过 IPC `data:get:<toolId>` 请求数据
- **AND** 主进程读取 `{userData}/data/<toolId>.json` 并返回

#### Scenario: 新工具首次使用
- **WHEN** 首次调用 `data:get:<toolId>` 且文件不存在
- **THEN** 返回空对象 `{}`，不报错

### Requirement: 统一配置界面
系统 SHALL 提供统一的设置面板，管理应用和所有工具的配置。

#### Scenario: 配置管理
- **WHEN** 用户在设置面板中修改配置
- **THEN** 配置通过 IPC 持久化到主进程存储
- **AND** 相关组件响应式更新

## MODIFIED Requirements
### Requirement: 全局样式
- 从演示风格的居中布局改为全屏应用布局
- 使用 TailwindCSS 替代原有自定义 CSS
- 窗口支持拖动区域 (web-app-region: drag)

## REMOVED Requirements
### Requirement: 旧的演示代码
**Reason**: 当前 `App.vue` 和 `main.css` 中的演示代码需要替换为正式布局
**Migration**: 保留 `Versions.vue` 作为参考，其余代码替换为新的 Layout 系统
