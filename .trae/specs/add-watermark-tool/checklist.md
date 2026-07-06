# Checklist

- [ ] Task 1: adm-zip 和 jimp 依赖安装成功

- [ ] Task 2: 共享类型定义完整
  - [ ] WatermarkPreset 接口包含 name / type / content / opacity / position / rotation / fontSize / color / scale
  - [ ] ImageInfo 接口包含 filename / path / size / preview
  - [ ] IPC 通道常量定义（OPEN_FILE, EXTRACT, LIST_IMAGES, APPLY, GET_PRESETS, SAVE_PRESET, DELETE_PRESET, PREVIEW）

- [ ] Task 3: IPC handler 功能完整
  - [ ] `watermark:open-file` 返回文件路径和类型
  - [ ] `watermark:extract` 正确解压并返回图片列表
  - [ ] `watermark:apply` 正确叠加水印并保存
  - [ ] 临时目录使用 `{appDir}/data/watermark-temp/`，不在 C 盘
  - [ ] 操作完成后清理临时目录

- [ ] Task 4: IPC client 添加完整
  - [ ] client.watermark 包含所有 IPC 调用方法

- [ ] Task 5: 工具条目已注册
  - [ ] tools.ts 包含 watermark 条目

- [ ] Task 6: 工具页面布局完整
  - [ ] 文件选择区域（选择 .docx / .pptx）
  - [ ] 图片列表展示（缩略图 + 文件名 + 勾选）
  - [ ] 水印预设选择下拉 / 管理器入口
  - [ ] 预览功能
  - [ ] 应用按钮 + 进度提示

- [ ] Task 7: 水印预设管理完整
  - [ ] 预设列表展示
  - [ ] 新增预设（文字水印 / 图片水印）
  - [ ] 编辑预设
  - [ ] 删除预设
  - [ ] 数据持久化到 `tools/watermark.json`

- [ ] Task 8: 水印叠加逻辑正确
  - [ ] 文字水印叠加
  - [ ] 图片水印叠加
  - [ ] 透明度参数生效
  - [ ] 位置参数生效
  - [ ] 旋转角度参数生效

- [ ] Task 9: TypeScript 检查零错误
  - [ ] 主进程 tsc 零错误
  - [ ] 渲染进程 vue-tsc 零错误
