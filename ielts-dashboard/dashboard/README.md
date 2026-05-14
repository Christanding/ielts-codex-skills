# IELTS Dashboard（本地仪表板）

**这是「看图表的程序」**。你的备考数据不在这里，在 `C:\Users\你的名字\.ielts\`。

完整使用说明见发布包根目录 `README.md`。

> 如果你是在 `~/.codex/skills/ielts-dashboard/dashboard/` 看到本文件，这就是已安装版本，可以直接按下面命令运行。若你是在源码仓库里查看，也可以运行，但 `/ielts-dashboard` 默认使用安装位置。

---

## 快速启动

先 cd 到**安装位置**（不是源目录）：

```bash
cd ~/.codex/skills/ielts-dashboard/dashboard          # Git Bash / Mac / Linux
# 或 PowerShell：cd "$env:USERPROFILE\.codex\skills\ielts-dashboard\dashboard"
```

然后：

```bash
npm install    # 第一次用，1-2 分钟
npm start      # 启动，浏览器开 http://127.0.0.1:5173
```

按 `Ctrl+C` 停止。

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm start` | 启动前端 + 后端（日常用这个） |
| `npm run seed` | 仅用于试看 dashboard 的虚拟演示数据；真实备考请先跑 `/ielts-diagnose` |
| `npm run reset` | 清空 `~/.ielts/`（会先备份 + 问确认） |
| `npm run backup` | 备份 `~/.ielts/` → `~/.ielts.bak.{时间戳}/` |
| `npm run validate` | 检查已接入数据源的 schema/frontmatter，含 submissions、writing corpus、已存在的 `coach_notes.md` |
| `npm run backfill` | 只给旧记录补齐分数来源/可信度字段；不改分数和正文，建议先 `DRY=1 npm run backfill` |
| `npm run migrate` | 旧版数据升级到 V1.0；缺字段写入 `migration_todo.md` |

---

## 这个文件夹里有什么

```
dashboard/
├── package.json          npm 配置（告诉它装哪些依赖）
├── server.js             后端（读 ~/.ielts/ 的数据）
├── lib/                  扫描和校验工具
├── scripts/              命令行脚本（seed / validate / backfill / migrate 等）
├── src/                  前端 React 代码（8 个页面 + 组件）
├── index.html            前端入口
├── vite.config.js        前端构建配置
├── node_modules/         npm 装好的依赖（很大，别删，不要上传到网盘）
└── README.md             本文件
```

**你的数据在别处**：`C:\Users\你的名字\.ielts\`。这里只是程序。

---

## 端口

- 前端：`http://127.0.0.1:5173`（Vite 开发服务器）
- 后端：`http://127.0.0.1:4000`（Express API）

被占用？Vite 自动换下一个端口；后端加环境变量 `PORT=4001 npm start`。

---

## 故障排查

| 现象 | 解决 |
|------|------|
| `npm install` 报错 | 检查 Node 版本：`node --version`，要 ≥ 18 |
| Dashboard 空白 | 看终端是不是 `[server] listening on 4000`。没有重跑 `npm start` |
| 数据不显示 | 跑 `npm run validate` 看有没有格式问题；真实备考请先用 `/ielts-diagnose` 建档，`npm run seed` 只用于演示 |
| `~` 找不到路径 | Windows cmd 不认 `~`。用 Git Bash 或写 `%USERPROFILE%\.ielts` |
| 端口被占 | `PORT=4001 npm start` |

---

## 数据源

Dashboard 扫描 `~/.ielts/` 中已接入的 V1.0 数据源：

| 数据 | 路径 | 用途 |
|------|------|------|
| 用户档案 | `profile.md` | 首页目标、考试日期、当前水平 |
| 分数历史 | `scores.md` | 四科趋势 |
| 写作批改 | `writing/submissions/*.md` | 写作分数、错误统计、趋势 |
| 写作语料 | `writing/corpus/*.md` | 学习参考、弱项推荐；不进入写作统计 |
| 阅读分析 | `reading/submissions/*.md` | 正确率、题型、错因 |
| 阅读同义替换 | `reading/synonyms/*.yaml` | 同义替换库 |
| 听力错题 | `listening/submissions/*.md` | section、题型、错误分布 |
| 词汇进度 | `vocab/days/*.md`、`vocab/difficult.yaml`、`vocab/mastered.yaml` | 背词进度和难词池 |
| 口语素材 | `speaking/stories/*.md`、`speaking/topic_groups.yaml` | 故事卡片和话题覆盖率 |
| 长期教练笔记 | `coach_notes.md` | 可选，只读；不存在不报错 |

AI 生成的写作语料必须显示为 `AI practice model / AI 练习样文，不是 band sample`。

---

## 数据流向

```
你用 /ielts-writing 批改作文
       ↓
Skill 按 V1.0 schema 写 ~/.ielts/writing/submissions/*.md
       ↓
你跑 npm start 启动后端
       ↓
后端按已接入的 V1.0 数据源读取 md/yaml 的 frontmatter 或结构化字段
       ↓
前端通过 /api/* 取数据，画图
```

**Dashboard 只读**——不会改你的备考数据。所有修改走 skill 对话。

写作页面会同时显示批改记录和写作语料，但统计卡片、趋势、雷达图只来自 `writing/submissions/*.md`。
语料只用于学习参考和推荐。

---

## 技术栈

- 后端：Express + gray-matter + js-yaml + zod
- 前端：Vite + React 19 + Recharts + Tailwind 4
- 热更新：前端改了自动刷新；后端改了需要重启 `npm start`

数据规范见仓库根目录 `SCHEMA.md`；安装后也会复制到 `~/.codex/skills/SCHEMA.md`。
