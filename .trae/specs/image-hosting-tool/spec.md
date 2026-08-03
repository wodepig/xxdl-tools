# 图床工具 Spec

## Why

用户在写文档、博客、Issue 时经常需要把本地截图/图片快速发布到公网可访问的位置。现有方案要么依赖第三方图床（不稳定/限流），要么需要手动登录 OSS 控制台上传。此工具提供一个本地集成入口：配置一次图床凭证后，支持 **Ctrl+V 粘贴截图** 即时上传，并自动以列表形式展示最近 50 条上传记录（通过图床接口拉取），便于复制链接、管理历史文件。

**可扩展性**：当前首个实现为阿里云 OSS，但架构上按「图床 Provider」抽象设计（共享类型、IPC handler、UI 均不绑死 OSS）。后续可扩展七牛云、腾讯云 COS、GitHub 等图床，新增 Provider 时只需实现统一接口并新增配置表单，主流程（粘贴上传 / 列表 / 复制）保持不变。页面标题统一为「图床工具」，不暴露具体 Provider 名称。

## What Changes

### 1. 工具注册
- 在 `data/tools.ts` 中新增 `image-hosting` 工具条目
- 工具名称：图床工具
- 分类：`ToolCategory.Image`
- 主色（accentColor）：`#06b6d4`（青色，与现有图片处理工具区分）
- 图标：`i-heroicons-cloud-arrow-up`
- 新建 `pages/tools/image-hosting.vue` 作为工具主页面

### 2. 处理流程

```
用户首次进入工具
    │
    ▼
IPC: image-hosting:get-config → 读取 tools/image-hosting.json
    │
    ├─ 无配置 → 显示「OSS 配置」入口，引导用户填写
    └─ 有配置 → 显示配置状态条 + 上传区 + 最近列表
    │
    ▼
用户粘贴 / 拖拽 / 点击选择图片
    │
    ▼
渲染进程：根据命名规则生成 objectKey
    │  ├─ 保留原名：{pathPrefix}{originalName}
    │  ├─ 时间戳+随机串：{pathPrefix}{YYYYMMDDHHmmss}_{rand6}.{ext}
    │  └─ 按日期归档：{pathPrefix}{YYYY/MM/DD}/{originalName}
    │
    ▼
IPC: image-hosting:upload → ali-oss SDK put 上传
    │  └─ 返回访问 URL（自定义域名优先，否则 Bucket 默认域名）
    │
    ▼
用户查看「最近上传」
    │
    ▼
IPC: image-hosting:list → ali-oss SDK list({ 'max-keys': 50, prefix, delimiter })
    │  └─ 按 lastModified 倒序返回前 50 条
    │
    ▼
用户操作单张图片
    ├─ 复制链接（渲染进程 clipboard）
    ├─ 在浏览器打开（IPC: image-hosting:open-url）
    ├─ 下载（IPC: image-hosting:download）
    └─ 删除（IPC: image-hosting:delete → ali-oss SDK delete）
```

### 3. OSS 配置数据结构

```typescript
interface OssConfig {
  region: string              // 如 oss-cn-hangzhou
  accessKeyId: string         // RAM 用户 AccessKey ID
  accessKeySecret: string     // RAM 用户 AccessKey Secret
  bucket: string              // Bucket 名称
  endpoint?: string           // 留空则使用 {region}.aliyuncs.com
  customDomain?: string       // 自定义域名，如 https://img.example.com
  pathPrefix?: string         // 存储路径前缀，如 uploads/
  namingRule: 'keep' | 'timestamp' | 'date-archive'  // 文件命名规则
}

interface ConnectionTestResult {
  ok: boolean
  message: string             // 成功提示 / 错误原因
  bucketInfo?: {
    name: string
    region: string
    creationDate: string
  }
}

interface UploadedImage {
  key: string                 // OSS 对象 key（完整路径）
  name: string                // 文件名（去掉路径前缀）
  size: number                // 字节数
  lastModified: string        // ISO 时间字符串
  url: string                 // 访问 URL
  format: string              // 文件扩展名（png/jpg/...）
}

interface UploadResult {
  key: string
  url: string
  size: number
  name: string
}

/** 图床 Provider 类型（预留扩展：oss | qiniu | cos | github ...） */
type ImageProvider = 'oss'

/** 复制链接格式 */
type CopyFormat = 'url' | 'md' | 'html'

/** 图床工具偏好设置（持久化到 tools/image-hosting.json 的 prefs 字段） */
interface ImageHostingPrefs {
  autoCopyEnabled: boolean   // 上传成功后是否自动复制链接
  copyFormat: CopyFormat     // 复制格式：URL / MD / HTML
}

/** OSS 配置（含偏好） */
interface ImageHostingConfig {
  provider: ImageProvider
  oss: OssConfig
  prefs: ImageHostingPrefs
}

/** 连接状态（用于右上角按钮状态点） */
type ConnectionStatus = 'connected' | 'disconnected' | 'unconfigured'

/** 按格式生成复制文本 */
function formatCopyText(url: string, name: string, format: CopyFormat): string {
  switch (format) {
    case 'md':   return `![${name}](${url})`
    case 'html': return `<img src="${url}" alt="${name}" />`
    case 'url':
    default:     return url
  }
}
```

### 4. 目录结构

```
{appDir}/data/
└── tools/
    └── image-hosting.json    # OSS 配置持久化（含密钥，本地保存）
```

> 注：密钥以明文形式存储在软件自身目录的 `data/tools/image-hosting.json`，与现有工具（如 watermark 预设）保持一致的本地存储策略。未来如需更高安全级别可加密存储。

### 5. 组件拆分

- `pages/tools/image-hosting.vue` — 主页面容器
  - 标题栏：图标 + 「图床工具」标题 + 「刷新列表」「OSS 配置」操作按钮
  - **OSS 配置按钮状态点**（不在页面内展示独立配置状态条，状态点集成在按钮上）：
    - 已连接（连接成功）→ 绿色标点
    - 连接失败 → 红色标点
    - 未配置 → 红色标点
  - 集成各子组件，管理页面级状态（配置、连接状态、列表数据、偏好设置）
  - 进入页面时加载配置并探测连接状态以决定状态点颜色
- `components/tools/image-hosting/OssConfigDialog.vue` — 配置弹层
  - 表单字段：region / accessKeyId / accessKeySecret / bucket / endpoint / customDomain / pathPrefix / namingRule
  - 「测试连接」「保存配置」按钮
- `components/tools/image-hosting/PasteUploadArea.vue` — 上传区（紧凑布局，不占用过多纵向空间）
  - 监听全局 `paste` 事件（在工具页面激活时）
  - 支持拖拽（dragover/drop）
  - 支持点击选择文件
  - 上传中显示进度浮层（文件名 + 进度条）
  - 上传成功后若 `prefs.autoCopyEnabled` 为 true，按 `prefs.copyFormat` 自动复制链接并 toast 提示
- `components/tools/image-hosting/RecentImageList.vue` — 最近上传列表
  - 网格布局展示前 50 条
  - 卡片：缩略图 + 格式标签 + 文件名 + 大小 + 时间（不在卡片下方展示 URL 行，复制链接通过 hover 操作按钮或「自动复制」开关实现）
  - hover 显示操作按钮（复制链接/打开/下载/删除）
  - 空状态提示
  - **列表头部工具条**：
    - 「复制类型」下拉框（URL / MD / HTML）— 控制复制链接时的格式
    - 「自动复制」开关 — 控制上传成功后是否自动复制链接（位于复制类型下拉右侧）
    - 格式筛选 / 排序按钮
  - 偏好（copyFormat / autoCopyEnabled）变更时持久化到 `tools/image-hosting.json` 的 `prefs` 字段

## Impact
- **New files**:
  - `shared/types/image-hosting.ts`（类型 + IPC 通道常量）
  - `main/tools/image-hosting.ts`（IPC handler + ali-oss 封装）
  - `pages/tools/image-hosting.vue`（主页面）
  - `components/tools/image-hosting/OssConfigDialog.vue`
  - `components/tools/image-hosting/PasteUploadArea.vue`
  - `components/tools/image-hosting/RecentImageList.vue`
- **Modified files**:
  - `data/tools.ts`（注册 `image-hosting` 工具条目）
  - `main/tools/index.ts`（注册 `registerImageHostingHandlers`）
  - `ipc/client.ts`（添加 `imageHosting` 客户端对象）
  - `pages/settings.vue`（版本号递增）
- **Dependencies**: `ali-oss`（阿里云 OSS Node SDK）、`@types/ali-oss`

## ADDED Requirements

### Requirement: OSS 配置管理
系统 SHALL 支持配置阿里云 OSS 凭证，配置数据持久化到本地软件目录。配置状态通过右上角「OSS 配置」按钮上的状态点体现，**不在页面内展示独立配置状态条**。

#### Scenario: 连接状态点显示规则
- **WHEN** 连接成功（配置存在且探测 OSS 可达）
- **THEN** 「OSS 配置」按钮显示**绿色**状态点
- **WHEN** 连接失败（配置存在但探测 OSS 不可达）
- **THEN** 「OSS 配置」按钮显示**红色**状态点
- **WHEN** 未配置连接（无配置）
- **THEN** 「OSS 配置」按钮显示**红色**状态点

#### Scenario: 首次配置
- **WHEN** 用户首次进入图床工具（无配置）
- **THEN** 「OSS 配置」按钮显示红色状态点
- **AND** 上传区提示「请先配置 OSS」
- **AND** 用户点击「OSS 配置」按钮打开配置弹层

#### Scenario: 保存配置
- **WHEN** 用户填写完整 OSS 配置并点击保存
- **THEN** 配置写入 `{appDir}/data/tools/image-hosting.json`
- **AND** 自动探测连接状态并更新按钮状态点颜色

#### Scenario: 修改配置
- **WHEN** 用户点击「OSS 配置」按钮
- **THEN** 打开配置弹层并回填当前配置
- **AND** 保存后覆盖原配置

#### Scenario: 测试连接
- **WHEN** 用户在配置弹层中点击「测试连接」
- **THEN** 使用当前表单凭证调用 OSS `list` 接口
- **AND** 返回连接结果（成功/失败 + 错误原因）

### Requirement: 图片上传
系统 SHALL 支持通过粘贴、拖拽、点击选择三种方式上传图片到 OSS。

#### Scenario: 粘贴上传
- **WHEN** 用户在工具页面激活时按下 Ctrl+V 且剪贴板有图片
- **THEN** 自动触发上传
- **AND** 显示上传进度浮层
- **AND** 上传完成后刷新最近列表

#### Scenario: 拖拽上传
- **WHEN** 用户将图片文件拖拽到上传区
- **THEN** 上传区高亮反馈
- **AND** 松开后触发上传

#### Scenario: 选择文件上传
- **WHEN** 用户点击上传区
- **THEN** 打开文件选择对话框（过滤图片格式）
- **AND** 选择后触发上传

#### Scenario: 文件命名规则
- **WHEN** 上传图片时
- **THEN** 根据配置的 `namingRule` 生成 objectKey
  - `keep`：保留原文件名
  - `timestamp`：`{YYYYMMDDHHmmss}_{rand6}.{ext}`
  - `date-archive`：`{YYYY/MM/DD}/{originalName}`
- **AND** objectKey 前拼接 `pathPrefix`

#### Scenario: 格式限制
- **WHEN** 用户尝试上传非图片文件
- **THEN** 拒绝上传并提示「仅支持 PNG/JPG/GIF/WebP/SVG」
- **WHEN** 文件大小超过 10MB
- **THEN** 拒绝上传并提示大小限制

#### Scenario: 上传成功后自动复制
- **WHEN** 图片上传成功且 `prefs.autoCopyEnabled` 为 true
- **THEN** 按 `prefs.copyFormat` 生成文本并写入剪贴板
- **AND** toast 提示「已自动复制链接」
- **WHEN** `prefs.autoCopyEnabled` 为 false
- **THEN** 不自动复制，仅刷新最近列表

### Requirement: 复制格式与自动复制
系统 SHALL 支持选择复制链接的格式（URL / MD / HTML），并支持上传成功后自动复制。控件位于最近上传列表头部工具条。

#### Scenario: 复制类型选择
- **WHEN** 用户在「复制类型」下拉框中选择格式（URL/MD/HTML）
- **THEN** 后续所有复制链接操作（卡片复制按钮、自动复制）均按该格式生成文本
  - URL：纯链接 `https://...`
  - MD：`![{name}]({url})`
  - HTML：`<img src="{url}" alt="{name}" />`
- **AND** 选择结果持久化到 `tools/image-hosting.json` 的 `prefs.copyFormat`

#### Scenario: 自动复制开关
- **WHEN** 用户切换「自动复制」开关
- **THEN** 开关状态持久化到 `prefs.autoCopyEnabled`
- **AND** 开关位于「复制类型」下拉框右侧

### Requirement: 最近上传列表
系统 SHALL 通过 OSS ListObjects 接口拉取前 50 条上传记录并展示。

#### Scenario: 加载列表
- **WHEN** 用户进入工具页面或点击「刷新列表」
- **THEN** 调用 OSS `list` 接口（`max-keys: 50`，`prefix: pathPrefix`）
- **AND** 按 `lastModified` 倒序展示

#### Scenario: 空列表
- **WHEN** OSS 中没有匹配前缀的对象
- **THEN** 显示空状态提示

#### Scenario: 复制链接
- **WHEN** 用户点击卡片「复制链接」按钮
- **THEN** 按 `prefs.copyFormat` 生成文本（URL/MD/HTML）并复制到剪贴板
- **AND** 显示复制成功反馈

#### Scenario: 在浏览器打开
- **WHEN** 用户点击卡片「打开」按钮
- **THEN** 调用系统默认浏览器打开 URL

#### Scenario: 下载
- **WHEN** 用户点击卡片「下载」按钮
- **THEN** 通过 OSS `get` 流式下载到本地（弹出保存对话框或下载到默认目录）

#### Scenario: 删除
- **WHEN** 用户点击卡片「删除」按钮并确认
- **THEN** 调用 OSS `delete` 删除对象
- **AND** 从列表中移除该项

### Requirement: 访问 URL 生成
系统 SHALL 根据配置生成正确的访问 URL。

#### Scenario: 自定义域名
- **WHEN** 配置了 `customDomain`
- **THEN** URL 为 `{customDomain}/{objectKey}`

#### Scenario: 默认域名
- **WHEN** 未配置 `customDomain`
- **THEN** URL 为 `https://{bucket}.{endpoint或region.aliyuncs.com}/{objectKey}`

### Requirement: 数据持久化位置
系统 SHALL 将所有数据存储到软件自身目录下，不写入 C 盘用户目录。

#### Scenario: 配置存储
- **WHEN** 配置保存
- **THEN** 写入 `{appDir}/data/tools/image-hosting.json`

### Requirement: 未配置时禁用功能
系统 SHALL 在 OSS 未配置时禁用上传和列表功能。

#### Scenario: 未配置状态
- **WHEN** OSS 配置为空或连接失败
- **THEN** 上传区显示「请先配置 OSS」提示
- **AND** 列表区域不发起请求
