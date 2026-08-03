# Tasks

- [ ] Task 1: 安装依赖 ali-oss
  - 安装 `ali-oss` 和 `@types/ali-oss`
  - 验证 `import OSS from 'ali-oss'` 导入正常

- [ ] Task 2: 创建共享类型定义
  - 新建 `shared/types/image-hosting.ts`
  - 定义 `OssConfig` 接口（region / accessKeyId / accessKeySecret / bucket / endpoint / customDomain / pathPrefix / namingRule）
  - 定义 `ConnectionTestResult`、`UploadedImage`、`UploadResult` 接口
  - **预留扩展**：定义 `ImageProvider`（'oss'，可扩展）、`CopyFormat`（'url' | 'md' | 'html'）、`ImageHostingPrefs`（autoCopyEnabled / copyFormat）、`ImageHostingConfig`（provider / oss / prefs）、`ConnectionStatus`（'connected' | 'disconnected' | 'unconfigured'）
  - 提供 `formatCopyText(url, name, format)` 辅助函数（URL/MD/HTML 三种格式）
  - 定义 `IMAGE_HOSTING_IPC` 通道常量（GET_CONFIG / SAVE_CONFIG / TEST_CONNECTION / UPLOAD / LIST / DELETE / DOWNLOAD / OPEN_URL）

- [ ] Task 3: 创建 IPC handler（主进程）
  - 新建 `main/tools/image-hosting.ts`
  - 封装 OSS client 工厂函数（按配置创建实例）
  - 实现 `image-hosting:get-config` → 读取 `tools/image-hosting.json`（含 oss 配置 + prefs 偏好）
  - 实现 `image-hosting:save-config` → 写入 `tools/image-hosting.json`（含 prefs）
  - 实现 `image-hosting:test-connection` → 调用 OSS `list` 验证凭证
  - 实现 `image-hosting:upload` → 按命名规则生成 key → `put` 上传 → 返回 URL
  - 实现 `image-hosting:list` → `list({ 'max-keys': 50, prefix })` → 按 lastModified 倒序
  - 实现 `image-hosting:delete` → `delete` 单个对象
  - 实现 `image-hosting:download` → `get` 流式下载 + dialog 选择保存位置
  - 实现 `image-hosting:open-url` → `shell.openExternal`
  - 在 `main/tools/index.ts` 注册 `registerImageHostingHandlers`

- [ ] Task 4: 更新 IPC client
  - 在 `ipc/client.ts` 添加 `imageHosting` 对象
  - 包含 getConfig / saveConfig / testConnection / upload / list / delete / download / openUrl 方法

- [ ] Task 5: 注册工具条目
  - 在 `data/tools.ts` 添加 `image-hosting` 工具
  - 字段：id('image-hosting') / name('图床工具') / description / icon / category(Image) / accentColor(#06b6d4) / tags(['图片','图床'])

- [ ] Task 6: 创建 OSS 配置弹层组件 `OssConfigDialog.vue`
  - 表单字段：region / accessKeyId / accessKeySecret / bucket / endpoint / customDomain / pathPrefix / namingRule
  - 「测试连接」按钮（调用 testConnection，显示结果）
  - 「保存配置」按钮（校验必填项后保存）
  - 「取消」按钮
  - AccessKey Secret 使用 password 输入框
  - 保存成功后 emit 事件，触发父组件重新探测连接状态

- [ ] Task 7: 创建上传区组件 `PasteUploadArea.vue`（紧凑布局，不占用过多纵向空间）
  - 监听全局 `paste` 事件（工具页面激活时）
  - 支持拖拽（dragover/drop），dragging 状态高亮
  - 支持点击选择文件（accept 图片格式）
  - 格式与大小校验（PNG/JPG/GIF/WebP/SVG，≤10MB）
  - 上传中显示进度浮层（文件名 + 进度条 + spinner）
  - 上传完成 emit 'uploaded' 事件（携带 url + name）通知父组件
  - **上传成功后若 `prefs.autoCopyEnabled` 为 true，按 `prefs.copyFormat` 自动复制链接并 toast 提示**
  - 未配置 OSS 时禁用并提示「请先配置 OSS」

- [ ] Task 8: 创建最近上传列表组件 `RecentImageList.vue`
  - 调用 `imageHosting.list()` 加载前 50 条
  - 网格布局展示卡片
  - 卡片：缩略图（img 或扩展名图标）+ 格式标签 + 文件名 + 大小 + 时间（不在卡片下方展示 URL 行）
  - hover 显示操作按钮（复制链接/打开/下载/删除）
  - 复制链接按 `prefs.copyFormat` 生成文本（URL/MD/HTML），使用 clipboard API
  - 删除前确认弹窗
  - 空状态提示
  - loading / error 状态处理
  - **列表头部工具条**：
    - 「复制类型」下拉框（URL/MD/HTML）— 切换时持久化到 `prefs.copyFormat`
    - 「自动复制」开关（位于复制类型下拉右侧）— 切换时持久化到 `prefs.autoCopyEnabled`
    - 格式筛选 / 排序按钮
  - 支持外部触发刷新

- [ ] Task 9: 创建主页面 `pages/tools/image-hosting.vue`
  - 标题栏：图标 + 「图床工具」标题 + 「刷新列表」「OSS 配置」操作按钮
  - **OSS 配置按钮状态点**（不在页面内展示独立配置状态条）：
    - 连接成功 → 绿色标点
    - 连接失败 → 红色标点
    - 未配置 → 红色标点
  - 集成 OssConfigDialog / PasteUploadArea / RecentImageList（无 OssConfigBar）
  - 页面级状态管理：配置、连接状态（ConnectionStatus）、列表数据、prefs 偏好
  - 进入页面时加载配置 → 探测连接状态（决定状态点颜色）→ 已连接则加载列表
  - 上传完成自动刷新列表
  - 保存配置后重新探测连接状态并刷新列表

- [ ] Task 10: 设置页面版本号
  - 在 `pages/settings.vue` 中递增版本号

- [ ] Task 11: TypeScript 检查验证
  - 主进程 `tsc --noEmit -p tsconfig.node.json` 零错误
  - 渲染进程 `vue-tsc --noEmit -p tsconfig.web.json` 零错误

# Task Dependencies
- Task 1 是前置依赖，Task 3 依赖它
- Task 2 → Task 3 → Task 4 顺序依赖（类型 → handler → client）
- Task 5 可与 Task 2~4 并行
- Task 6、Task 7、Task 8 依赖 Task 4（IPC client），可并行开发
- Task 9 依赖 Task 6、Task 7、Task 8
- Task 10 可在任意时刻执行
- Task 11 是最终验证
