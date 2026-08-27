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

数据存放在**用户自选的数据存储目录**中（首次使用时应用内弹窗引导选择），应用升级、重装不会丢失数据。所选目录的路径以指针文件形式保存在 Electron 用户配置目录 `userData` 下（仅几字节，不随应用删除/升级而清空），后续启动自动读取，无需重复选择。可在「设置 → 数据存储目录」查看当前目录或重新选择。

### 存储路径

- 首次启动：先展示软件，应用内弹出引导弹窗，由用户指定数据根目录（「暂不设置」时以 `{userData}/data/` 为临时目录）
- 目录指针：`{userData}/xxdl-tools-data-dir.json`
- 已配置后数据根目录：用户所选目录（启动时自动读取指针）

### 根目录结构

```
{用户所选数据根目录}/
├── settings.json               # 应用全局配置
│   ├── theme                   # 主题（dark / light / system）
│   ├── pinnedTools             # 置顶工具 ID 列表
│   └── recentTools             # 最近使用记录（最多 20 条）
│
├── tools/                      # 各工具的独立配置
│   ├── seentao-record.json     # 新道云刷课记录的存储路径配置
│   └── ...                     # 其他工具配置（按需生成）及新增的 har-viewer 等
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
package.json设置版本号