# HAR 查看工具 Spec

## Why

开发者在排查接口问题时，经常需要用浏览器开发者工具或抓包工具导出 HAR（HTTP Archive）文件。原生 DevTools 关闭后无法再回看，导出后没有好用的本地查看器。原型 `docs/har-viewer.html` 展示了完整的交互设计：多 HAR 文件标签页管理、请求表格、汇总概览、请求/响应详情、响应体查看、搜索过滤。本工具将其实现为工具箱内的一个独立页面，保持项目统一的卡片式风格，允许同时打开多个 HAR 文件在一个界面中切换查看。

## What Changes

### 1. 工具注册
- 在 `data/tools.ts` 中新增 `har-viewer` 工具条目（分类：开发工具）
- 新建 `pages/tools/har-viewer.vue` 作为工具主页面

### 2. 页面功能

```
┌────────────┬─────────────────────────────────────────────────────┐
│ HAR 文件    │  页面头: 文件名 / 路径 / 请求数徽章                      │
│ ┌────────┐ │  工具栏: 搜索框 | 状态过滤 | 类型过滤 | 深度搜索 | 导出        │
│ │打开文件…│ │ │───── 汇总概览卡片: 总数 | 2xx | 总流量 | 总耗时 | 平均耗时    │
│ ├────────┤ │ │─────────────────────────────────────────────────────│
│ │文件1 ▾  │ │  请求表格: # | 状态 | 方法 | 域名 | URL | 类型 | 耗时 | 大小   │
│ │文件2    │ │ │─────────────────────────────────────────────────────│
│ │文件3    │ │ │  详情面板 Tab: 概述 | 请求头 | 响应头 | 请求体 | 响应体 | 耗时 │
│ └────────┘ │ └─────────────────────────────────────────────────────┘
└────────────┴─────────────────────────────────────────────────────┘
```

- **多文件管理**：左侧类会话面板，列出所有已打开的 HAR 文件，可切换 / 移除；「打开文件」通过主进程文件选择对话框一次性选择多个 `.har` 文件导入；每个文件是一个独立会话，切换时自动保存当前视图状态（选中项、筛选）。首次使用提供一个「示例」会话便于预览。
- **汇总概览**：顶部统计卡片显示当前筛选结果的请求总数、成功 2xx 数、总流量（响应体+响应头字节合计）、总耗时、平均耗时；统计口径跟随状态 / 类型 / 关键字筛选，与表格展示一致。
- **请求表格**：展示每个请求的序号、状态码（2xx 绿 / 3xx 蓝 / 4xx 橙 / 5xx 红圆角徽标）、方法（GET/POST/PUT/DELETE 等带颜色标签）、域名（host，与 URL 拆分显示）、URL（协议后 path + query，等宽字体，默认展示相对路径；域名/URL 拆分项 hover 显示完整 URL）、资源类型（文档 / XHR/Fetch / 脚本 / 样式 / 图片 / 媒体 / 字体 / 其他，优先取 HAR 的 `_resourceType`，否则按 MIME 与 URL 后缀推断）、耗时（进度条，相对当前列表最大耗时按比例显示）、响应大小。点击行选中并在下方详情面板展示。
- **搜索过滤**：工具栏搜索框按 URL / 方法 / 状态码模糊过滤；状态下拉框按 2xx / 3xx / 4xx / 5xx 过滤；类型下拉框按资源类型（document / xhr / script / stylesheet / image / media / font / other）过滤；「深度搜索」复选框勾选后，搜索范围扩展到请求体、响应体、请求头/响应头值、Query 参数等全文内容。工具栏另有「导出」按钮、文件导入/移除均在左侧文件面板完成。
- **编辑与删除**：工具栏「导出」左侧有「编辑」按钮；进入编辑模式后请求列表新增复选框列（表头支持全选当前筛选结果），行点击变为勾选/取消；勾选任意条目后出现「删除 (N)」按钮，删除仅作用于内存工作副本；编辑按钮变为「保存」（另有「取消」放弃本次编辑并还原列表）。点击「保存」弹出二次确认弹窗，确认后通过 `har-viewer:write-file` 覆盖写回源 HAR 文件（按原始条目下标过滤 `log.entries`，保留其他所有原始字段）；示例文件不可写回源文件。切换/移除/打开文件时自动退出编辑模式。
- **详情面板**（底部，顶部拖拽条可上下调整高度）：
  - 所有 Tab 内的文字（概述字段、请求/响应头表格、耗时明细、请求/响应体）均支持鼠标选中复制，不做额外解析；Tab 切换按钮本身不参与选中。
  - 下方为 6 个 Tab：**概述**（URL、方法/协议、状态、总耗时、MIME、响应大小、开始时间）、**请求头**（通用、Query 参数表、请求头表）、**响应头**（状态、重定向、响应头表）、**请求体**（JSON 类型用折叠树格式化展示并复用 JSON 格式化树组件，非 JSON 显示可选中复制的纯文本，右上角提供复制按钮）、**响应体**（同请求体：JSON 类型折叠树展示，非 JSON 可选中纯文本，右上角提供复制按钮）、**耗时**（各阶段阻塞 / DNS / 连接 / SSL / 发送 / 等待 / 接收 以彩色进度条分段展示的动态瀑布 + 各阶段耗时明细表 + 总耗时）。默认选中「概述」。

### 3. 主进程 IPC 与数据解析
新增 IPC handler，主要用于**打开文件**（读取本地 `.har`）：
- `har-viewer:open-files` → `dialog.showOpenDialog` 多选 `.har` / `.json`，文件内容在渲染进程按需解析；为便于文本检索与响应体展示，主进程返回文件内容字符串（或直接返回 `{ name, path }`，由渲染进程读取）。**建议**：返回 `{ canceled, files: { name, path, content }[] }`，渲染进程解析并过滤合法 `log.entries`。
- `har-viewer:read-file` → 按路径读取文件内容（启动恢复会话）。
- `har-viewer:write-file` → 编辑保存时按路径覆盖写入完整 HAR 文本，返回 `{ ok, error? }`。
- 数据解析发生在渲染进程，提供 `parseHarFile(content): HarFileData`，提取总请求数、各状态码计数、耗时/大小统计；非法文件或缺少 `log.entries` 时给出错误提示。
- 持久化：通过已有 `data:get` / `data:set` IPC，以 `har-viewer` 为 key 存储 `{ files: HarSessionMeta[], activeId }`。HAR 原始 JSON 较大，**不持久化原始内容**，只持久化文件元信息（名称、路径、打开时间、请求数）；应用重启后按需重新打开（可读取 `path` 重新加载，若文件已存在）。首次使用时创建默认「示例」会话（内置示例数据，供无文件时预览）。

### 4. 数据类型（shared）
```typescript
interface HarSession {
  id: string
  name: string      // 文件名
  path?: string     // 源文件路径（用于重新加载）
  entryCount: number
  createdAt: number
  updatedAt: number
}

interface HarViewerData {
  sessions: HarSession[]   // 仅元信息，不含原始内容
  activeId: string
}
```

解析后的运行时数据结构（仅存在于渲染进程内存，不持久化）：
```typescript
interface HarEntry {
  _id: string
  startedDateTime: string
  time: number
  request: { method: string; url: string; httpVersion?: string; headers?: {name,value}[]; queryString?: {name,value}[]; cookies?: {name,value}[]; postData?: {mimeType?, text?} }
  response: { status: number; statusText?: string; httpVersion?: string; headers?: {name,value}[]; cookies?: {name,value}[]; redirectURL?: string; headersSize?: number; bodySize?: number; content?: { size?; mimeType?; text?; encoding? } }
  timings?: { blocked?; dns?; connect?; send?; wait?; receive?; ssl? }
}
```

## Impact
- **New files**: `pages/tools/har-viewer.vue`、`shared/types/har-viewer.ts`、`main/tools/har-viewer.ts`
- **Modified files**: `data/tools.ts`、`ipc/client.ts`、`main/tools/index.ts`、`shared/index.ts`
- **Dependencies**: 无新增

## ADDED Requirements

### Requirement: 多文件同时查看
系统 SHALL 支持多个 HAR 文件同时加载，并在会话面板中切换查看。

#### Scenario: 打开多文件
- **WHEN** 用户点击「打开文件」并选择一个或多个 `.har` 文件
- **THEN** 每个文件以独立会话加入左侧列表并激活最新导入文件
- **AND** 请求表格、汇总概览随之切换显示

#### Scenario: 切换 / 移除文件
- **WHEN** 用户点击某个文件会话
- **THEN** 切换显示该文件的请求列表与详情
- **AND** 移除后至少保留一个会话

### Requirement: 汇总概览
系统 SHALL 展示当前文件的统计卡片。

#### Scenario: 统计展示
- **WHEN** 文件被加载/切换
- **THEN** 顶部卡片显示请求总数、2xx 数量、总流量、总耗时、平均耗时

### Requirement: 搜索与过滤
系统 SHALL 支持按关键字、状态码、资源类型过滤请求，并支持深度搜索。

#### Scenario: 过滤
- **WHEN** 用户在搜索框输入关键字、选择状态过滤或选择类型过滤（文档 / XHR/Fetch / 脚本 / 样式 / 图片 / 媒体 / 字体 / 其他）
- **THEN** 请求表格实时过滤，无匹配时显示空态提示

#### Scenario: 深度搜索
- **WHEN** 用户勾选「深度搜索」并输入关键字
- **THEN** 搜索范围扩展到请求体、响应体、请求头/响应头值、Query 参数
- **AND** 勾选状态变化时请求表格实时刷新

### Requirement: 请求表格与详情
系统 SHALL 提供请求列表及选中后的详情查看。

#### Scenario: 查看详情
- **WHEN** 用户点击某请求行
- **THEN** 底部详情面板显示该请求的详情，默认展示「概述」
- **AND** 6 个 Tab（概述 / 请求头 / 响应头 / 请求体 / 响应体 / 耗时）通过切换查看对应内容

### Requirement: 响应体查看
系统 SHALL 提供响应体查看与复制。

#### Scenario: 响应体
- **WHEN** 请求为 JSON 类型响应
- **THEN** 响应 Tab 中自动格式化并以语法高亮展示
- **AND** 点击「复制」将响应体文本复制到剪贴板

### Requirement: 编辑与删除请求
系统 SHALL 支持删除请求并写回源 HAR 文件。

#### Scenario: 进入编辑模式
- **WHEN** 用户点击工具栏「编辑」
- **THEN** 请求表格新增复选框列，表头可全选当前筛选结果，点击行变为勾选/取消
- **AND** 「编辑」按钮变为「保存」，并提供「取消」

#### Scenario: 删除选中请求
- **WHEN** 编辑模式下勾选一条或多条请求
- **THEN** 工具栏出现「删除 (N)」按钮；点击后这些请求从内存列表移除（未保存前不写文件）
- **AND** 「取消」可放弃本次编辑并还原列表

#### Scenario: 保存到源文件
- **WHEN** 用户点击「保存」
- **THEN** 弹出二次确认弹窗，提示删除条数、剩余条数与目标文件路径
- **AND** 确认后覆盖写回源 HAR 文件（保留其他原始字段），成功后退出编辑模式；示例文件不可写回

### Requirement: 打开 / 持久化
系统 SHALL 通过主进程读取本地文件，并持久化会话元信息。

#### Scenario: 打开文件
- **WHEN** 用户选择 HAR 文件
- **THEN** 主进程读取文件内容并返回，渲染进程解析；非法文件提示错误

#### Scenario: 持久化
- **WHEN** 文件列表或激活会话变化
- **THEN** 通过 `data:set('har-viewer', ...)` 保存元信息（不含原始内容）