# IELTS Study Desk V1.0

这是一套给 Codex 使用的雅思备考 skill。它把写作批改、阅读听力复盘、口语素材整理、词汇复习和本地 dashboard 放在同一个学习档案里。

你不用先搭系统，也不用先造一堆数据。装好以后，直接在 Codex 里说“我要备考雅思”，它会先判断你有没有四科成绩；没有就给一个最小入口，有就进入诊断和后续训练。

训练记录默认保存在你电脑的 `~/.ielts/` 目录。Dashboard 只读取这些本地文件，用来查看当前水平、近期趋势和训练档案。

## 你会用到什么

这套工具包含 8 个 Codex skills：

| Skill | 主要用途 |
| --- | --- |
| `/ielts` | 总入口。判断你现在该先做诊断，还是先做一个最小训练入口。 |
| `/ielts-diagnose` | 根据四科成绩、目标分和考试日期，生成备考诊断。 |
| `/ielts-writing` | 批改 Task 1 / Task 2，给四维评分、问题证据和下一步 drill。 |
| `/ielts-reading` | 复盘阅读题，整理错因、题型表现和同义替换。 |
| `/ielts-listening` | 复盘听力套题，定位错因、关键词反应和精听方向。 |
| `/ielts-speaking` | 整理口语话题、故事骨架和练习复盘记录。 |
| `/ielts-vocab` | 推词、测试、维护难词池和已掌握词。 |
| `/ielts-dashboard` | 启动本地 dashboard，查看 `~/.ielts/` 里的学习档案。 |

这些 skill 各管一段流程。比如写作只处理写作，阅读只处理阅读；需要跨模块判断时，由 `/ielts` 和 dashboard 做汇总。

## 安装前确认

你需要：

- 已安装并登录 Codex。
- Windows 10/11、macOS 或 Linux。
- Node.js 18 或更新版本，用来运行本地 dashboard。
- 第一次安装 dashboard 依赖时，需要能访问 npm。

检查 Node.js：

```powershell
node --version
```

看到 `v18.x.x`、`v20.x.x`、`v22.x.x` 这类版本号就可以继续。

## 安装

```text
Windows: C:\Users\你的用户名\.codex\skills\
macOS/Linux: ~/.codex/skills/
```

安装后应该能看到：

- `ielts`
- `ielts-diagnose`
- `ielts-writing`
- `ielts-reading`
- `ielts-listening`
- `ielts-speaking`
- `ielts-vocab`
- `ielts-dashboard`
- `SCHEMA.md`

## 第一次使用

打开 Codex，直接输入：

```text
我要备考雅思
```

`/ielts` 会先问清一件事：你有没有完整四科成绩。

如果你有听力、阅读、写作、口语四科成绩，它会建议你进入 `/ielts-diagnose` 做正式诊断。

如果你还没有完整四科成绩，它不会要求你先做完整模考，也不会让你编数据。

如果你已经有单项材料，也可以直接进入对应 skill：

```text
/ielts-writing 批改这篇作文
/ielts-reading 复盘这篇阅读
/ielts-listening 分析这套听力
/ielts-speaking 整理这些口语题
/ielts-vocab 今天背词
```

## 启动 Dashboard

Dashboard 是本地网页，只读取 `~/.ielts/` 里的数据。

Windows PowerShell：

```powershell
cd "$env:USERPROFILE\.codex\skills\ielts-dashboard\dashboard"
npm install
npm start
```

macOS / Linux：

```bash
cd ~/.codex/skills/ielts-dashboard/dashboard
npm install
npm start
```

正常启动时，终端会看到类似输出：

```text
[server] listening on http://127.0.0.1:4000
Local: http://127.0.0.1:5173/
```

浏览器会打开：

```text
http://127.0.0.1:5173
```

如果页面显示加载失败，先确认终端里有没有 `[server] listening`。通常是后端没有启动，或者 `npm start` 已经被关掉。

## Dashboard 看什么

Dashboard 是你的本地学习工作台。

目前重点看：

- 首页：今日训练决策、当前四科水平、目标差距、分数趋势、训练档案。
- 写作：作文批改记录、四维短板、错误标签、下一步 drill。
- 阅读：题型正确率、定位问题、同义替换障碍。
- 听力：套题表现、错因标签、Section 起伏、精听方向。
- 词汇：复习进度、难词池、推送热力图。
- 口语：话题覆盖、故事骨架、练习复盘记录。

Dashboard 只负责展示和汇总。

## 隐私和边界

- 训练档案默认保存在本机 `~/.ielts/`。
- Dashboard 只在本机运行，不自建云端服务。
- Codex 对话和授权文件访问遵循你当前 Codex / OpenAI 账号与客户端设置。
- 本项目不替代官方考试信息。考试日期、费用、政策和考点安排，以 IELTS 官方和考点最新信息为准。
- 外部教材、真题、词库和课程资源请通过合法渠道获取。

## 技术信息

- 版本：V1.0
- 运行环境：Codex + Node.js 18+
- 数据目录：`~/.ielts/`
- Skill 目录：`~/.codex/skills/`
- Dashboard 前端端口：`5173`
- Dashboard 后端端口：`4000`