# DOCX/PPT 水印添加工具 Spec

## Why

用户经常需要给 Word 文档和 PowerPoint 演示文稿中的图片添加水印（如公司名称、版权声明、时间戳等）。DOCX/PPTX 本质是 ZIP 压缩包，解压后图片位于 `word/media/`（DOCX）或 `ppt/media/`（PPTX）目录。通过解压 → 图片水印处理 → 重打包的方式，可以在不依赖 Office COM 组件的情况下批量添加水印。

## What Changes

### 1. 工具注册
- 在 `data/tools.ts` 中新增 `watermark` 工具条目
- 工具名称：DOCX/PPT 水印添加
- 新建 `pages/tools/watermark.vue` 作为工具主页面

### 2. 处理流程

```
用户选择文件（.docx / .pptx）
    │
    ▼
IPC: watermark:open-file → Electron 对话框选择文件
    │
    ▼
IPC: watermark:extract → 在 {appDir}/data/watermark-temp/{uuid}/ 解压
    │
    ▼
扫描 word/media/ 或 ppt/media/ → 返回图片列表（缩略图 base64）
    │
    ▼
用户选择水印预设（或新建）→ 选择需要添加水印的图片
    │
    ▼
IPC: watermark:preview → 对选中图片生成水印效果预览
    │
    ▼
用户确认 → IPC: watermark:apply
    ├─ 对选中的图片逐张叠加水印
    ├─ 重新打包为 ZIP（替换原文件或另存为）
    └─ 清理临时目录
```

### 3. 水印预设数据结构

```typescript
interface WatermarkPreset {
  id: string                   // 唯一标识
  name: string                 // 用户自定义名称（如 "公司版权"）
  type: 'text' | 'image'      // 文字水印 / 图片水印
  content: string              // 文字内容 或 图片 base64
  opacity: number              // 透明度 0-100
  position: 'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  rotation: number             // 旋转角度 -90 ~ 90
  fontSize?: number            // 文字水印字号
  color?: string               // 文字水印颜色（HEX）
  scale?: number               // 图片水印缩放比例（相对原图）
}
```

### 4. 目录结构

```
{appDir}/data/
├── tools/
│   └── watermark.json         # 水印预设持久化配置
└── watermark-temp/            # 临时解压目录（用完清理）
    └── {uuid}/
        ├── word/media/        # DOCX 的图片
        │   ├── image1.png
        │   └── image2.png
        ├── ppt/media/         # PPTX 的图片
        │   ├── image1.png
        │   └── image2.png
        ├── [Content_Types].xml
        └── ...                # ZIP 原始目录结构
```

## Impact
- **New files**: `pages/tools/watermark.vue`、`main/tools/watermark.ts`、`shared/types/watermark.ts`
- **Modified files**: `data/tools.ts`、`ipc/client.ts`、`main/tools/index.ts`
- **Dependencies**: `adm-zip`（ZIP 解压/打包）、`jimp`（图片水印处理）

## ADDED Requirements

### Requirement: 文件处理
系统 SHALL 支持 DOCX 和 PPTX 格式的水印添加。

#### Scenario: 选择文件
- **WHEN** 用户点击选择文件
- **THEN** Electron 对话框显示 `.docx` 和 `.pptx` 过滤选项
- **AND** 返回文件路径

#### Scenario: 解压并列出图片
- **WHEN** 文件选择完成后
- **THEN** 主进程解压 ZIP 到临时目录
- **AND** 扫描 `word/media/` 或 `ppt/media/` 列出所有图片
- **AND** 返回每张图片的缩略图 base64

#### Scenario: 应用水印
- **WHEN** 用户选择水印预设和图片后点击应用
- **THEN** 对选中的图片逐张叠加水印
- **AND** 重新打包 ZIP 并保存
- **AND** 清理临时目录

### Requirement: 水印预设管理
系统 SHALL 提供水印预设的增删改查功能，预设数据持久化到本地。

#### Scenario: 新增预设
- **WHEN** 用户填写水印参数并保存
- **THEN** 预设写入 `{appDir}/data/tools/watermark.json`
- **AND** 在预设列表中显示

#### Scenario: 预览水印
- **WHEN** 用户点击预览
- **THEN** 对选中的图片临时叠加水印并显示效果
- **AND** 不修改原文件

### Requirement: 临时文件清理
系统 SHALL 在每次操作完成后清理解压的临时文件。

#### Scenario: 操作完成
- **WHEN** 水印应用完成或用户取消
- **THEN** 删除 `{appDir}/data/watermark-temp/` 下对应的临时目录

### Requirement: 数据持久化位置
系统 SHALL 将所有数据存储到软件自身目录下，不写入 C 盘用户目录。

#### Scenario: 预设存储
- **WHEN** 预设保存
- **THEN** 写入 `{appDir}/data/tools/watermark.json`

#### Scenario: 临时文件
- **WHEN** 文件解压
- **THEN** 解压到 `{appDir}/data/watermark-temp/`
