# 新道云刷课记录工具 (Seentao Record) Spec

## Why
在日常业务中需要记录客户的刷课备注信息和相关截图，目前缺少一个结构化的工具来统一管理这些数据。需要支持自定义存储路径、截图粘贴、按日期归档、图片查看和复制的完整工作流。

## What Changes

### 1. 工具注册
- 在 `data/tools.ts` 中新增 `seentao-record` 工具条目
- 工具名称：新道云刷课记录
- 新建 `pages/tools/seentao-record.vue` 作为工具主页面

### 2. 数据架构

```
{存储根路径}/
├── config.json                  # 工具配置（存储路径、是否已初始化等）
├── records/
│   ├── 202607/
│   │   ├── 05.json              # 当天的记录数据（YYYY-MM-DD.json）
│   │   ├── images/
│   │   │   ├── 1712345678_a1b2.png
│   │   │   └── 1712345678_d4e5f6.png
│   │   └── ...
│   └── ...
└── ...
```

> 注：使用 `YYYYMM` 作为一级目录（例如 `202607`），每天一个 JSON 文件（例如 `05.json`），图片存放在对应目录的 `images/` 下。

### 3. 数据结构定义

```typescript
interface SeentaoRecord {
  id: string                           // UUID，自动生成
  createdAt: string                    // ISO 时间戳，自动生成
  studentName: string                  // 学员姓名（可选）
  courseName: string                   // 课程名称（可选）
  note: string                         // 刷课备注内容
  images: string[]                     // 关联的图片文件名列表
  tags?: string[]                      // 可选标签
}

interface DayRecords {
  date: string                         // '05'（文件名，只存日期）
  records: SeentaoRecord[]
}
```

### 4. 图片命名规则
`{毫秒时间戳}_{4位随机字符串}.png`，例如 `1712345678123_a1b2.png`

### 5. IPC 通道

| 通道 | 方向 | 说明 |
|------|------|------|
| `seentao-record:init` | invoke | 初始化存储路径，创建目录结构 |
| `seentao-record:config` | invoke | 读取/写入配置（存储路径） |
| `seentao-record:list` | invoke | 按年月查询记录列表（返回所有日期 + 记录） |
| `seentao-record:create` | invoke | 新增记录（含图片保存） |
| `seentao-record:get` | invoke | 获取单条记录详情 |
| `seentao-record:delete` | invoke | 删除记录（含关联图片） |
| `seentao-record:get-image` | invoke | 读取图片文件（返回 base64） |

## Impact
- **新文件**：`pages/tools/seentao-record.vue`（渲染进程）
- **新文件**：`src/main/ipc/seentao-record.ts`（主进程 IPC handler）
- **新文件**：`src/main/ipc/seentao-record-store.ts`（数据存储逻辑）
- **修改**：`data/tools.ts` 添加工具条目
- **依赖**：`uuid` 包（或使用 `crypto.randomUUID`）

## Storage Architecture

### 主进程存储层
```
src/main/ipc/seentao-record-store.ts
├── initStoragePath(path)          // 初始化存储目录（config.json + records/）
├── getRecords(yearMonth, dateKey) // 读取某天记录（yearMonth = YYYYMM, dateKey = DD）
├── saveRecords(yearMonth, dateKey, data) // 写入某天记录
├── saveImage(yearMonth, imageBuffer)     // 保存图片到 images/，返回文件名
├── getImage(yearMonth, filename)         // 读取图片返回 base64
└── deleteRecord(yearMonth, dateKey, id)  // 删除记录及关联图片
```

### 文件访问
- 图片通过 IPC 以 base64 格式传递到渲染进程
- 渲染进程在 `<img>` 中直接使用 base64 显示

## ADDED Requirements

### Requirement: 初始化配置
The system SHALL require the user to set a storage path before using the tool.

#### Scenario: 首次使用
- **WHEN** 用户首次打开新道云刷课记录工具
- **THEN** 显示初始化引导界面，提示选择存储路径

#### Scenario: 已配置
- **WHEN** 用户已配置过存储路径
- **THEN** 直接进入主界面

### Requirement: 新增记录
The system SHALL allow the user to create a new record with note text and pasted screenshots.

#### Scenario: 新增记录
- **WHEN** 用户点击「新增记录」
- **THEN** 弹出新增表单，包含学员名（可选）、课程名称（可选）、备注文本框、截图粘贴区域
- **AND** 支持 Ctrl+V 粘贴剪贴板中的图片（支持多张）
- **AND** 点击「保存」后自动生成 ID 和时间戳，保存到对应年月目录下的日期 JSON 文件
- **AND** 图片自动重命名并保存到对应年月的 images/ 目录

### Requirement: 记录列表
The system SHALL display records in a list grouped by date.

#### Scenario: 查看列表
- **WHEN** 用户打开工具主界面
- **THEN** 按日期倒序展示记录列表，每条记录显示：时间、学员名、课程名、备注摘要（截断）、图片缩略图（前3张）
- **AND** 支持按年月筛选和搜索备注内容

#### Scenario: 单图快捷复制
- **WHEN** 列表中某条记录只有 1 张图片
- **THEN** 该记录行显示「复制图片」按钮
- **AND** 点击按钮将图片直接复制到剪贴板

### Requirement: 详情查看
The system SHALL provide a detail view for each record.

#### Scenario: 查看详情
- **WHEN** 用户点击列表中的某条记录
- **THEN** 进入详情页面/弹窗，显示完整的备注内容和所有图片
- **AND** 图片支持点击查看大图
- **AND** 每张图片都有独立的「复制图片」按钮

### Requirement: 删除记录
The system SHALL allow deleting records.

#### Scenario: 删除记录
- **WHEN** 用户在详情或列表中删除记录
- **THEN** 删除 JSON 中的记录条目及其关联的图片文件

## UI Component Tree

```
SeentaoRecordPage
├── InitGuide (首次引导，选择存储路径)
└── MainView (已配置后)
    ├── RecordToolbar
    │   ├── UButton (新增记录)
    │   ├── UInput (搜索/筛选)
    │   └── MonthPicker (年月选择)
    ├── RecordList
    │   └── RecordListItem (x N)
    │       ├── 时间/学员名/课程名/备注摘要
    │       ├── ImageThumbnails (缩略图)
    │       └── UButton (单图复制)
    ├── RecordDetailModal (UModal)
    │   ├── 完整备注 + 学员/课程信息
    │   ├── ImageGrid (图片网格)
    │   │   └── ClickableImage (x N)
    │   │       └── UButton (复制图片)
    │   └── UButton (删除)
    └── AddRecordModal (UModal)
        ├── UInput (学员名)
        ├── UInput (课程名称)
        ├── UTextarea (备注)
        ├── PasteZone (粘贴区域)
        │   └── ImagePreview (x N)
        └── UButton (保存)
```
