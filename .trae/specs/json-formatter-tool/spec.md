# JSON 格式化工具 Spec

## Why

开发者经常需要格式化、压缩、校验 JSON 数据（调试 API 响应、整理配置文件、验证日志等）。原型 `docs/json-formatter.html` 展示了完整的交互设计：多会话管理、双栏编辑器、语法高亮、工具栏操作。本工具将其实现为工具箱内的一个独立页面，保持项目统一的卡片式风格。

## What Changes

### 1. 工具注册
- 在 `data/tools.ts` 中新增 `json-formatter` 工具条目（分类：开发工具）
- 新建 `pages/tools/json-formatter.vue` 作为工具主页面

### 2. 页面功能

```
┌────────────┬──────────────────────────────────────┐
│ JSON 会话   │  工具栏：格式化 | 压缩 | 验证 | 转义 | 去转义 | 清空   │
│  ┌──────┐  │         缩进选择 | 复制结果 | 导出        │
│  │新建会话│  ├──────────────────────────────────────┤
│  ├──────┤  │  输入面板（textarea）  │  输出面板（高亮）   │
│  │会话1 ▾│  │                      │                  │
│  │会话2  │  │                      │                  │
│  └──────┘  └──────────────────────────────────────┘
└────────────┴──────────────────────────────────────┘
```

- **会话管理**：新建 / 重命名（内联输入）/ 删除（至少保留一个）/ 切换自动保存，会话数据持久化
- **编辑器**：左侧输入 textarea（等宽字体），右侧输出区带 JSON 语法高亮（key / string / number / boolean / null / 标点）
- **工具栏**：
  - 格式化：`JSON.parse` + 按缩进重新 `stringify`
  - 压缩：`JSON.stringify` 去除空白
  - 验证：检查语法并显示有效 / 无效徽章（无效时展示错误信息）
  - 转义：把输入转成 JSON 字符串字面量
  - 去转义：`JSON.parse` 还原
  - 清空：清空输入与输出
  - 缩进选择：2 空格 / 4 空格 / Tab
  - 复制结果：复制输出区纯文本到剪贴板
  - 导出：主进程 `dialog.showSaveDialog` 保存为 `.json` 文件
- **实时格式化**：输入防抖 500ms 自动格式化
- **粘贴**：从剪贴板读取文本填入输入区
- **Toast 提示**：操作成功 / 失败反馈

### 3. 数据持久化

通过已有 `data:get` / `data:set` IPC，以 `json-formatter` 为 key 存取：

```typescript
interface JsonFormatterData {
  sessions: JsonSession[]   // 会话列表
  activeId: string          // 当前激活会话
  indent: number | string   // 缩进设置（2 | 4 | '\t'）
}

interface JsonSession {
  id: string
  name: string              // 会话名称
  content: string           // JSON 内容
  createdAt: number         // 创建时间
  updatedAt: number         // 更新时间
}
```

首次使用时创建默认"示例数据"会话。

### 4. 导出文件（主进程）

新增 IPC `json-formatter:save-file`：
- `dialog.showSaveDialog` 让用户选择保存位置（默认文件名 `{会话名}.json`）
- `fs.writeFile` 写入内容
- 返回 `{ ok, canceled?, path? }`

## Impact
- **New files**: `pages/tools/json-formatter.vue`、`shared/types/json-formatter.ts`、`main/tools/json-formatter.ts`
- **Modified files**: `data/tools.ts`、`ipc/client.ts`、`main/tools/index.ts`、`shared/index.ts`
- **Dependencies**: 无新增

## ADDED Requirements

### Requirement: 会话管理
系统 SHALL 支持 JSON 会话的创建、重命名、删除、切换与持久化。

#### Scenario: 新建会话
- **WHEN** 用户点击"新建会话"
- **THEN** 创建新会话并切换为激活状态
- **AND** 会话列表实时更新

#### Scenario: 删除会话
- **WHEN** 用户点击某会话的删除按钮
- **THEN** 删除该会话并切换激活会话
- **AND** 至少保留一个会话（删除最后一个时提示禁止）

#### Scenario: 持久化
- **WHEN** 会话内容 / 名称 / 激活状态变化
- **THEN** 通过 `data:set('json-formatter', ...)` 保存到本地

### Requirement: JSON 处理
系统 SHALL 提供格式化、压缩、验证、转义、去转义功能。

#### Scenario: 格式化 / 压缩
- **WHEN** 用户点击格式化或压缩
- **THEN** 解析输入 JSON 并按当前缩进输出
- **AND** 输入非法时显示错误徽章与错误信息

#### Scenario: 验证
- **WHEN** 用户点击验证
- **THEN** 有效时显示"有效 JSON"徽章，无效时显示错误信息

#### Scenario: 转义 / 去转义
- **WHEN** 用户点击转义
- **THEN** 输入内容转为 JSON 字符串字面量
- **AND** 去转义时通过 `JSON.parse` 还原，解析出字符串则显示原文，对象则格式化

### Requirement: 输出与导出
系统 SHALL 提供语法高亮、复制和导出功能。

#### Scenario: 复制结果
- **WHEN** 用户点击"复制结果"或输出面板复制按钮
- **THEN** 复制输出区纯文本到剪贴板
- **AND** 无内容时提示"没有可复制的内容"

#### Scenario: 导出文件
- **WHEN** 用户点击"导出"
- **THEN** 主进程弹出保存对话框
- **AND** 以 `{会话名}.json` 写入文件
