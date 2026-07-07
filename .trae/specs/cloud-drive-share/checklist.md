# Checklist

- [x] Task 1: 共享类型定义完整
  - [x] CloudDriveProvider 类型 ('baidu' | 'quark')
  - [x] LoginMethod 类型 ('qrcode' | 'cookie')
  - [x] CloudDriveLoginState 接口完整
  - [x] CloudDriveFile 接口完整（id / name / isFolder / size / children）
  - [x] ShareConfig 接口完整（viewLimit / expireDays / extractCode）

- [x] Task 2: 工具条目已注册
  - [x] tools.ts 包含 cloud-drive-share 条目
  - [x] 图标、名称、描述、分类配置正确

- [x] Task 3: 登录组件完整
  - [x] Tab 切换（百度网盘 / 夸克网盘）
  - [x] 扫码登录占位区域
  - [x] Cookie 输入框
  - [x] 登录/登出按钮
  - [x] 登录状态展示

- [x] Task 4: 文件浏览组件完整
  - [x] 两个网盘各有独立的模拟文件数据
  - [x] 文件夹可点击展开/进入
  - [x] 文件复选框多选
  - [x] 底部选中数量显示

- [x] Task 5: 分享配置组件完整
  - [x] 查看次数限制输入（数字，最小 1）
  - [x] 有效期选择下拉
  - [x] 提取码自动生成 + 可手动修改
  - [x] 生成分享链接按钮
  - [x] 分享结果展示 + 复制链接按钮

- [x] Task 6: 主页面集成完整
  - [x] 顶部 Tab 切换
  - [x] 三个子组件正确集成
  - [x] 登录后显示文件列表
  - [x] 选中文件后可配置分享
  - [x] 页面布局清晰合理

- [x] Task 7: TypeScript 检查零错误
  - [x] 渲染进程 vue-tsc 零错误（新代码无错误，仅存在预存的 yingdao-study.ts 路径问题）
