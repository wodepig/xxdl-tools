# Tasks

- [ ] Task 1: 创建共享类型定义
  - 新建 `shared/types/json-formatter.ts`
  - 定义 `JsonSession`、`JsonFormatterData` 接口
  - 在 `shared/index.ts` 中导出

- [ ] Task 2: 创建主进程导出 IPC handler
  - 新建 `main/tools/json-formatter.ts`
  - 实现 `json-formatter:save-file` → `dialog.showSaveDialog` + `fs.writeFile`，返回 `{ ok, canceled?, path? }`
  - 更新 `main/tools/index.ts` 注册 handler

- [ ] Task 3: 更新 IPC client
  - 在 `ipc/client.ts` 中添加 `jsonFormatter.saveFile` 方法

- [ ] Task 4: 注册工具条目
  - 在 `data/tools.ts` 中添加 `json-formatter` 工具（id / name / description / icon / category / accentColor / tags）

- [ ] Task 5: 创建工具页面
  - 新建 `pages/tools/json-formatter.vue`
  - 布局：会话列表面板 + 工具栏 + 双栏编辑器

- [ ] Task 6: 实现会话管理
  - 新建 / 重命名 / 删除（至少保留一个）/ 切换会话
  - 首次使用创建"示例数据"会话
  - 通过 `data:get/set('json-formatter')` 持久化

- [ ] Task 7: 实现 JSON 处理与语法高亮
  - 格式化 / 压缩 / 验证 / 转义 / 去转义
  - 语法高亮渲染（转义 HTML 防止 XSS）
  - 输入防抖 500ms 自动格式化
  - 状态徽章（有效 / 无效 + 错误信息）

- [ ] Task 8: 实现复制与导出
  - 复制结果到剪贴板
  - 导出调用 `jsonFormatter.saveFile`

- [ ] Task 9: TypeScript 检查验证
  - 主进程 `tsc --noEmit -p tsconfig.node.json` 零错误
  - 渲染进程 `vue-tsc --noEmit -p tsconfig.web.json` 零错误

# Task Dependencies
- Task 1 是前置依赖（类型被 Task 3、Task 6 使用）
- Task 2 → Task 3 顺序依赖
- Task 4、Task 5 可并行
- Task 5 依赖 Task 3、Task 4 完成后实现页面（Task 6、7、8 属于页面内部）
- Task 9 是最终验证
