# Tasks

- [ ] Task 1: 安装依赖 adm-zip 和 jimp
  - 安装 `adm-zip` 和 `@types/adm-zip`
  - 安装 `jimp`
  - 验证导入是否正常

- [ ] Task 2: 创建共享类型定义
  - 新建 `shared/types/watermark.ts`
  - 定义 `WatermarkPreset`、`ImageInfo`、`IPC` 通道常量
  - 定义 `WatermarkApplyParams` 接口

- [ ] Task 3: 创建 IPC handler（主进程）
  - 新建 `main/tools/watermark.ts`
  - 实现 `watermark:open-file` → dialog 选择文件，返回路径和类型
  - 实现 `watermark:extract` → adm-zip 解压，扫描 `word/media/` 或 `ppt/media/`
  - 实现 `watermark:list-images` → 读取图片并生成缩略图 base64
  - 实现 `watermark:apply` → Jimp 叠加水印 → 重打包 ZIP → 保存 → 清理临时目录
  - 更新 `main/tools/index.ts` 注册 handler

- [ ] Task 4: 更新 IPC client
  - 在 `ipc/client.ts` 中添加 `watermark` 对象，包含所有 IPC 调用方法

- [ ] Task 5: 注册工具条目
  - 在 `data/tools.ts` 中添加 `watermark` 工具

- [ ] Task 6: 创建工具页面
  - 新建 `pages/tools/watermark.vue`
  - 布局：文件选择 → 图片列表 → 水印预设管理 → 预览 → 应用

- [ ] Task 7: 实现水印预设管理
  - 预设列表展示（卡片式）
  - 新增/编辑/删除预设
  - 预设数据通过 `data:get/set` IPC 持久化到 `tools/watermark.json`

- [ ] Task 8: 实现图片水印叠加逻辑
  - 文字水印：使用 Jimp 的 `print` 或 `blit` 方法
  - 图片水印：使用 Jimp 的 `composite` 方法
  - 支持透明度、旋转、位置参数

- [ ] Task 9: TypeScript 检查验证
  - 主进程 `tsc --noEmit -p tsconfig.node.json` 零错误
  - 渲染进程 `vue-tsc --noEmit -p tsconfig.web.json` 零错误

# Task Dependencies
- Task 1 是前置依赖，所有其他 Task 依赖它
- Task 2 → Task 3 → Task 4 顺序依赖
- Task 5、Task 6、Task 7 可并行
- Task 8 依赖 Task 3
- Task 9 是最终验证
