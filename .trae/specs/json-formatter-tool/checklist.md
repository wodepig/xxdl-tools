# Checklist

- [ ] Task 1: 共享类型定义完整
  - [ ] `JsonSession` 接口包含 id / name / content / createdAt / updatedAt
  - [ ] `JsonFormatterData` 接口包含 sessions / activeId / indent
  - [ ] 已从 `shared/index.ts` 导出

- [ ] Task 2: 主进程导出 IPC 功能完整
  - [ ] `json-formatter:save-file` 通过 dialog.showSaveDialog 选择保存位置
  - [ ] 默认文件名为 `{会话名}.json`
  - [ ] 正确写入文件并返回 `{ ok, canceled?, path? }`
  - [ ] 已在 `main/tools/index.ts` 注册

- [ ] Task 3: IPC client 添加完整
  - [ ] client.jsonFormatter.saveFile 方法存在且类型正确

- [ ] Task 4: 工具条目已注册
  - [ ] tools.ts 包含 json-formatter 条目（分类 development）

- [ ] Task 5: 工具页面布局完整
  - [ ] 左侧会话列表面板（新建 / 重命名 / 删除 / 切换）
  - [ ] 工具栏（格式化 / 压缩 / 验证 / 转义 / 去转义 / 清空 / 缩进 / 复制 / 导出）
  - [ ] 双栏编辑器（输入 textarea + 输出高亮区）
  - [ ] 有效 / 无效 JSON 状态徽章
  - [ ] Toast 提示

- [ ] Task 6: 会话管理逻辑正确
  - [ ] 新建 / 删除会话（至少保留一个）
  - [ ] 重命名（内联输入，Enter / 失焦保存）
  - [ ] 切换会话自动保存当前内容
  - [ ] 首次使用创建"示例数据"会话
  - [ ] 数据通过 `data:get/set('json-formatter')` 持久化

- [ ] Task 7: JSON 处理逻辑正确
  - [ ] 格式化（按缩进设置输出）
  - [ ] 压缩
  - [ ] 验证（有效 / 无效 + 错误信息）
  - [ ] 转义 / 去转义
  - [ ] 语法高亮（key / string / number / boolean / null / 标点）
  - [ ] 输入防抖 500ms 自动格式化

- [ ] Task 8: 复制与导出正确
  - [ ] 复制结果到剪贴板（无内容时提示）
  - [ ] 导出触发主进程保存对话框并写入文件

- [ ] Task 9: TypeScript 检查零错误
  - [ ] 主进程 tsc 零错误
  - [ ] 渲染进程 vue-tsc 零错误
