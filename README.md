# xxdl-tools

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

## 数据存储规则

所有数据保存在软件自身目录下的 `data/` 文件夹中，**不写入 C 盘用户目录**。

### 存储路径

| 环境 | 根目录 |
|------|--------|
| 开发环境 | `{项目根目录}/data/` |
| 生产环境（安装后） | `{exe所在目录}/data/` |

### 目录结构

```
{根目录}/data/
├── settings.json               # 应用全局配置
│   ├── theme                   # 主题（dark / light / system）
│   ├── pinnedTools             # 置顶工具 ID 列表
│   └── recentTools             # 最近使用记录（最多 20 条）
│
├── tools/                      # 各工具的独立配置
│   ├── seentao-record.json     # 新道云刷课记录的存储路径配置
│   └── ...                     # 其他工具配置（按需生成）
│
└── records/                    # 新道云刷课记录数据（由用户在界面中指定的路径）
    └── {YYYYMM}/
        ├── {DD}.json            # 每天的刷课记录
        └── images/
            ├── {timestamp}_{random}.png   # 粘贴的截图
            └── ...
```

### 文件说明

| 文件 | 内容 | 生成方式 |
|------|------|---------|
| `settings.json` | 主题、置顶工具、最近使用记录 | 自动，应用启动时读写 |
| `tools/{toolId}.json` | 各工具的私有配置 | 自动，由 `data:get/set` IPC 读写 |
| `records/{YYYYMM}/{DD}.json` | 新道云刷课记录数据 | 用户新增记录时生成 |
| `records/{YYYYMM}/images/{timestamp}_{random}.png` | 刷课截图 | 用户粘贴截图并保存时生成 |


### 新增工具
提示词: 我要新建一个json格式化工具, 学习项目风格, 先做原型图放到 docs目录中,写任务计划到.trae\specs
src\main\tools\index.ts 中注册新的工具 handler
src\renderer\src\pages\settings.vue 设置版本号
src\renderer\src\data\tools.ts 中注册新的工具条目