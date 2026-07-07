# Tasks

- [x] Task 1: 创建共享类型定义
  - 新建 `shared/types/cloud-drive.ts`
  - 定义 `CloudDriveProvider`、`LoginMethod`、`CloudDriveLoginState`
  - 定义 `CloudDriveFile`、`ShareConfig`、`ShareResult`

- [x] Task 2: 注册工具条目
  - 在 `data/tools.ts` 中添加 `cloud-drive-share` 工具
  - 选择合适分类（归类到 `Data`）

- [x] Task 3: 创建网盘登录组件 `CloudDriveLogin.vue`
  - 支持 Tab 切换（百度网盘 / 夸克网盘）
  - 扫码登录区域（占位图 + 指引文字）
  - Cookie 输入框 + 登录/登出按钮
  - 登录状态展示（头像、昵称）

- [x] Task 4: 创建文件浏览组件 `CloudDriveFileList.vue`
  - 模拟文件列表数据（每个网盘独立模拟数据）
  - 文件夹展开/进入子目录
  - 文件多选（复选框）
  - 底部选中计数显示

- [x] Task 5: 创建分享配置组件 `CloudDriveShareForm.vue`
  - 查看次数限制输入（数字，最小 1）
  - 有效期下拉选择（1天/3天/7天/30天）
  - 提取码输入（自动生成 + 手动修改）
  - 生成分享链接按钮
  - 分享结果展示（链接、提取码、过期时间）+ 复制链接

- [x] Task 6: 创建主页面 `pages/tools/cloud-drive-share.vue`
  - 顶部 Tab 切换（百度网盘 / 夸克网盘）
  - 集成登录、文件浏览、分享配置三个组件
  - 组件间状态联动（登录 → 显示文件 → 选中文件 → 配置分享）

- [x] Task 7: TypeScript 检查验证
  - 渲染进程 `vue-tsc --noEmit -p tsconfig.web.json` 零错误（新代码无错误，仅存在预存的 yingdao-study.ts 路径问题）

# Task Dependencies
- Task 1 是前置依赖，Task 2~6 依赖它
- Task 3、Task 4、Task 5 可并行开发
- Task 6 依赖 Task 3、Task 4、Task 5
- Task 7 是最终验证
