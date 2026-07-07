# 网盘快捷分享工具 Spec

## Why

用户经常需要将百度网盘或夸克网盘中的文件快捷分享给他人，并控制分享的查看次数。目前需要手动登录网页版操作，流程繁琐。此工具将统一网盘登录、文件浏览、分享生成等操作，提升效率。

## What Changes

### 1. 工具注册
- 在 `data/tools.ts` 中新增 `cloud-drive-share` 工具条目
- 工具名称：网盘快捷分享
- 新建 `pages/tools/cloud-drive-share.vue` 作为工具主页面
- 新增 `ToolCategory.Cloud = 'cloud'` 分类（或归类到 `Data`）

### 2. Demo 页面功能（本次实现，不涉及真实网络请求）

```
┌─────────────────────────────────────┐
│         网盘快捷分享                   │
│  ┌──────────┬──────────┐             │
│  │ 百度网盘  │ 夸克网盘  │  ← Tab 切换  │
│  ├──────────┴──────────┤             │
│  │    登录区域           │             │
│  │  ┌────────────────┐ │             │
│  │  │ 扫码登录 / Cookie │ │             │
│  │  └────────────────┘ │             │
│  ├────────────────────┤             │
│  │    文件浏览区域       │             │
│  │  ├──────┬──────┬───┤             │
│  │  │ 文件1 │ 文件2 │ …  │             │
│  │  ├──────┴──────┴───┤             │
│  │  │  已选: 2 个文件   │             │
│  │  └────────────────┘ │             │
│  ├────────────────────┤             │
│  │    分享设置           │             │
│  │  查看次数限制: [3]   │             │
│  │  有效期: [7天 ▼]    │             │
│  │  提取码: [自动生成]  │             │
│  │  ┌────────────────┐ │             │
│  │  │  生成分享链接    │ │             │
│  │  └────────────────┘ │             │
│  └────────────────────┘             │
└─────────────────────────────────────┘
```

### 3. 组件拆分

- `cloud-drive-share.vue` — 主页面容器
  - 顶部 Tab 切换（百度网盘 / 夸克网盘）
  - 集成各子组件
- `CloudDriveLogin.vue` — 登录组件
  - 扫码登录展示区（占位图 + 说明文字）
  - Cookie 输入框 + 登录按钮
  - 登录状态显示（已登录 / 未登录）
- `CloudDriveFileList.vue` — 文件浏览组件
  - 模拟文件列表数据（树形 / 列表）
  - 文件选中功能（多选）
  - 选中数量显示
- `CloudDriveShareForm.vue` — 分享配置组件
  - 查看次数限制输入
  - 有效期选择
  - 提取码设置
  - 生成分享链接按钮
  - 分享结果展示（链接预览区）

### 4. 模拟数据

Demo 阶段使用组件内硬编码的模拟数据：
- 百度网盘示例文件列表（根目录下若干文件夹和文件）
- 夸克网盘示例文件列表（根目录下若干文件夹和文件）
- 分享结果模拟（生成一个假的分享链接）

### 5. 共享类型定义

```typescript
// shared/types/cloud-drive.ts

export type CloudDriveProvider = 'baidu' | 'quark'

export type LoginMethod = 'qrcode' | 'cookie'

export interface CloudDriveLoginState {
  provider: CloudDriveProvider
  isLoggedIn: boolean
  method: LoginMethod | null
  userInfo?: {
    nickname: string
    avatar?: string
  }
}

export interface CloudDriveFile {
  id: string
  name: string
  isFolder: boolean
  size?: number
  modifiedAt?: string
  children?: CloudDriveFile[]
}

export interface ShareConfig {
  viewLimit: number
  expireDays: number
  extractCode: string
}

export interface ShareResult {
  url: string
  extractCode: string
  expireAt: string
}
```

## Impact
- **New files**: 
  - `pages/tools/cloud-drive-share.vue`
  - `components/tools/cloud-drive/CloudDriveLogin.vue`
  - `components/tools/cloud-drive/CloudDriveFileList.vue`
  - `components/tools/cloud-drive/CloudDriveShareForm.vue`
  - `shared/types/cloud-drive.ts`
- **Modified files**: `data/tools.ts`

## ADDED Requirements

### Requirement: 网盘切换
系统 SHALL 通过 Tab 标签切换百度网盘和夸克网盘。

#### Scenario: Tab 切换
- **WHEN** 用户点击"百度网盘"Tab
- **THEN** 展示百度网盘的登录和文件浏览区域
- **WHEN** 用户点击"夸克网盘"Tab
- **THEN** 展示夸克网盘的登录和文件浏览区域

### Requirement: 网盘登录
系统 SHALL 支持通过扫码或 Cookie 两种方式登录网盘。

#### Scenario: 扫码登录
- **WHEN** 用户选择扫码登录
- **THEN** 展示二维码占位区域（Demo 阶段显示占位图）
- **AND** 显示"扫码登录说明"文字

#### Scenario: Cookie 登录
- **WHEN** 用户输入 Cookie 并点击登录
- **THEN** 显示登录成功状态（Demo 阶段直接模拟成功）
- **AND** 切换至文件浏览区域

### Requirement: 文件浏览
系统 SHALL 在登录后展示网盘文件列表，支持多选。

#### Scenario: 浏览文件
- **WHEN** 用户登录成功
- **THEN** 展示模拟文件列表（Demo 阶段使用静态数据）
- **AND** 列表包含文件夹和文件
- **AND** 支持点击文件夹进入子目录

#### Scenario: 选择文件
- **WHEN** 用户点击文件前的复选框
- **THEN** 文件被选中
- **AND** 底部显示已选文件数量

### Requirement: 分享设置
系统 SHALL 支持设置分享的查看次数限制。

#### Scenario: 配置分享
- **WHEN** 用户选中文件并配置分享参数
- **THEN** 可以设置查看次数限制（数字输入）
- **AND** 可以设置有效期（下拉选择 1天/3天/7天/30天）
- **AND** 可以设置提取码（输入框，默认自动生成）

#### Scenario: 生成分享
- **WHEN** 用户点击"生成分享链接"
- **THEN** 显示模拟分享链接（Demo 阶段生成示例链接）
- **AND** 显示提取码和过期时间
- **AND** 提供"复制链接"按钮
