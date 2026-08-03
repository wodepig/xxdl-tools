# Checklist

- [ ] Task 1: ali-oss 依赖安装成功
  - [ ] `ali-oss` 已安装
  - [ ] `@types/ali-oss` 已安装
  - [ ] 主进程 `import OSS from 'ali-oss'` 无报错

- [ ] Task 2: 共享类型定义完整
  - [ ] `OssConfig` 接口包含 region / accessKeyId / accessKeySecret / bucket / endpoint / customDomain / pathPrefix / namingRule
  - [ ] `ConnectionTestResult` 接口包含 ok / message / bucketInfo
  - [ ] `UploadedImage` 接口包含 key / name / size / lastModified / url / format
  - [ ] `UploadResult` 接口包含 key / url / size / name
  - [ ] `ImageProvider` 类型定义（'oss'，预留扩展）
  - [ ] `CopyFormat` 类型定义（'url' | 'md' | 'html'）
  - [ ] `ImageHostingPrefs` 接口包含 autoCopyEnabled / copyFormat
  - [ ] `ImageHostingConfig` 接口包含 provider / oss / prefs
  - [ ] `ConnectionStatus` 类型定义（'connected' | 'disconnected' | 'unconfigured'）
  - [ ] `formatCopyText(url, name, format)` 辅助函数（URL/MD/HTML 三种输出）
  - [ ] `IMAGE_HOSTING_IPC` 常量定义（GET_CONFIG / SAVE_CONFIG / TEST_CONNECTION / UPLOAD / LIST / DELETE / DOWNLOAD / OPEN_URL）

- [ ] Task 3: IPC handler 功能完整
  - [ ] `image-hosting:get-config` 读取 `tools/image-hosting.json`（含 oss + prefs），无文件返回 null
  - [ ] `image-hosting:save-config` 写入 `tools/image-hosting.json`（含 prefs）
  - [ ] `image-hosting:test-connection` 调用 OSS list 验证凭证，返回 ConnectionTestResult
  - [ ] `image-hosting:upload` 按 namingRule 生成 key，put 上传，返回 UploadResult
  - [ ] `image-hosting:list` 调用 list({ 'max-keys': 50, prefix })，按 lastModified 倒序
  - [ ] `image-hosting:delete` 调用 OSS delete 删除对象
  - [ ] `image-hosting:download` 流式下载 + 保存对话框
  - [ ] `image-hosting:open-url` 调用 shell.openExternal
  - [ ] URL 生成逻辑：customDomain 优先，否则 `https://{bucket}.{endpoint}/{key}`
  - [ ] `main/tools/index.ts` 已注册 registerImageHostingHandlers

- [ ] Task 4: IPC client 添加完整
  - [ ] `ipcClient.imageHosting` 对象存在
  - [ ] 包含 getConfig / saveConfig / testConnection / upload / list / delete / download / openUrl 方法
  - [ ] 方法签名与共享类型一致

- [ ] Task 5: 工具条目已注册
  - [ ] `tools.ts` 包含 image-hosting 条目
  - [ ] id 为 'image-hosting'
  - [ ] name 为 '图床工具'（不暴露具体 Provider）
  - [ ] category 为 ToolCategory.Image
  - [ ] accentColor 为 '#06b6d4'
  - [ ] 图标为 i-heroicons-cloud-arrow-up
  - [ ] tags 包含 ['图片', '图床']

- [ ] Task 6: OSS 配置弹层组件完整
  - [ ] 表单包含全部 8 个字段（region/accessKeyId/accessKeySecret/bucket/endpoint/customDomain/pathPrefix/namingRule）
  - [ ] region/bucket/accessKeyId/accessKeySecret 为必填
  - [ ] AccessKey Secret 使用 password 输入框
  - [ ] namingRule 下拉包含 keep/timestamp/date-archive 三项
  - [ ] 「测试连接」按钮调用 testConnection 显示结果
  - [ ] 「保存配置」校验必填后调用 saveConfig
  - [ ] 保存成功后关闭弹层并 emit 事件通知父组件重新探测连接状态

- [ ] Task 7: 上传区组件完整
  - [ ] 紧凑布局，不占用过多纵向空间
  - [ ] 监听全局 paste 事件（页面激活时）
  - [ ] 支持拖拽上传（dragover 高亮 / drop 触发）
  - [ ] 支持点击选择文件（accept 图片格式）
  - [ ] 格式校验：仅 PNG/JPG/GIF/WebP/SVG
  - [ ] 大小校验：≤ 10MB
  - [ ] 上传中显示进度浮层（文件名 + 进度条 + spinner）
  - [ ] 上传完成 emit 'uploaded' 事件（携带 url + name）
  - [ ] 上传成功且 autoCopyEnabled=true 时按 copyFormat 自动复制并 toast 提示
  - [ ] 未配置 OSS 时禁用并提示「请先配置 OSS」

- [ ] Task 8: 最近上传列表组件完整
  - [ ] 调用 imageHosting.list() 加载前 50 条
  - [ ] 网格布局卡片展示
  - [ ] 卡片含缩略图、格式标签、文件名、大小、时间（不含 URL 行）
  - [ ] hover 显示操作按钮（复制链接/打开/下载/删除）
  - [ ] 复制链接按 prefs.copyFormat 生成文本（URL/MD/HTML）并使用 clipboard API 反馈
  - [ ] 删除前确认弹窗
  - [ ] 空状态提示
  - [ ] loading / error 状态处理
  - [ ] 支持外部触发刷新
  - [ ] 列表头部「复制类型」下拉框（URL/MD/HTML），切换时持久化到 prefs.copyFormat
  - [ ] 列表头部「自动复制」开关（位于复制类型下拉右侧），切换时持久化到 prefs.autoCopyEnabled

- [ ] Task 9: 主页面集成完整
  - [ ] 标题栏：图标 + 「图床工具」标题 + 「刷新列表」「OSS 配置」按钮
  - [ ] 不展示独立配置状态条
  - [ ] OSS 配置按钮状态点：连接成功→绿色，连接失败→红色，未配置→红色
  - [ ] 集成 OssConfigDialog / PasteUploadArea / RecentImageList（无 OssConfigBar）
  - [ ] 进入页面加载配置 → 探测连接状态（决定状态点颜色）→ 已连接则加载列表
  - [ ] 上传完成自动刷新列表
  - [ ] 保存配置后重新探测连接状态并刷新列表

- [ ] Task 10: 版本号已递增
  - [ ] `pages/settings.vue` 版本号已递增

- [ ] Task 11: TypeScript 检查零错误
  - [ ] 主进程 tsc --noEmit -p tsconfig.node.json 零错误
  - [ ] 渲染进程 vue-tsc --noEmit -p tsconfig.web.json 零错误
