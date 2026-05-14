# IELTS V1.0 数据规范（SCHEMA）

> 所有 skill 写入 `~/.ielts/` 时必须遵守本规范。Dashboard 扫描已接入的 V1.0 数据源，并按 schema 校验 submissions、writing corpus 和可选 coach_notes。
> 版本：V1.0

---

## 核心原则

1. **原子文件 = 唯一真相**。批改/分析/背词每次产生一个独立 md/yaml，带强制 frontmatter。
2. **聚合视图 = 实时计算**。`index.md` / `errors.md` / `synonyms.md` 已废弃，由 dashboard 扫原子聚合生成。
3. **md 主体保留人类可读**。frontmatter 只提取结构化字段，正文继续给人看。
4. **YAML 子文件存纯数据**。同义替换、难词池等高频读写的数据用 yaml，避免 frontmatter 膨胀。
5. **示例日期只是占位符**。文档中的 `YYYY-MM-DD` / `YYYYMMDD` 必须在实际写文件时替换为真实日期；不要把占位符原样写入用户数据。
6. **语料不等于成绩**。`writing/corpus/*.md` 只用于学习参考和推荐，不进入 `writing/submissions/*.md` 的统计。
7. **长期记忆必须确认**。`coach_notes.md` 只能由 `/ielts` 或 `/ielts-diagnose` 在用户确认后写入，单项 skill 不能直接写。
8. **分数必须带可信度语义**。新写入的成绩、训练分或换算分必须标注 `score_source`、`confidence`、`evaluator_version`，避免官方成绩、老师估分、AI 训练估分和单篇换算分混在一起。

---

## 分数可信度字段

以下字段用于所有会进入趋势或训练表现判断的分数记录：

```yaml
score_source: ai_training_estimate
confidence: medium
evaluator_version: ielts-writing-v1.0
```

**字段说明**：
- `score_source`: `official_test | official_practice | teacher_estimate | ai_training_estimate | self_reported | reading_passage_conversion | listening_conversion | legacy_unknown`
- `confidence`: `low | medium | high`
- `evaluator_version`: 字符串或 `null`，用于区分评分器、提示词、换算表或迁移脚本版本

**使用规则**：
- 官方真实考试：`score_source: official_test`，`confidence: high`
- 官方练习材料按标准换算且分数本身来自明确标准答案或官方/权威评分：`official_practice`，通常 `confidence: high`
- 老师估分：`teacher_estimate`，`confidence` 按老师是否完整按四维/四科评估填写
- AI 写作批改：`ai_training_estimate`，通常 `confidence: medium`；证据不足时用 `low`
- 阅读单篇 passage 换算：`reading_passage_conversion`，通常 `confidence: medium`，不能当作完整 Reading 正式成绩
- 听力 40 题按算分表换算：`listening_conversion`，通常 `confidence: high`
- 旧数据或来源不清：`legacy_unknown`，`confidence: low`

Dashboard 读取旧数据时可以把缺失字段视为 `legacy_unknown / low / null`，但新写入数据必须显式填写。

---

## 目录结构

```
~/.ielts/
├── profile.md                          用户档案（单文件）
├── scores.md                           分数历史（单文件，frontmatter 数组）
├── coach_notes.md                      长期教练笔记（可选，确认后才创建）
├── writing/
│   ├── submissions/
│   │   └── YYYYMMDD_taskN_topic.md     每篇批改一个文件，进入统计
│   └── corpus/
│       └── YYYYMMDD_source_topic.md    写作语料，只做学习参考
├── reading/
│   ├── submissions/
│   │   └── YYYYMMDD_source.md          每次阅读一个文件
│   └── synonyms/
│       └── YYYYMMDD_source.yaml        每次新增的同义替换
├── listening/
│   └── submissions/
│       └── YYYYMMDD_source.md          每套听力一个文件
├── vocab/
│   ├── days/
│   │   └── dayNN.md                    每天背词记录
│   └── difficult.yaml                  难词池（单文件，状态需要单点维护）
└── speaking/
    └── stories/
        └── story_NN_topic.md           每个可迁移故事骨架一个文件
```

---

## 各文件 Schema

### `profile.md`

```yaml
---
goal_band: 7.5
exam_date: YYYY-MM-DD
created_at: YYYY-MM-DD
current: {l: 6.5, r: 7, w: 6, s: 6}
weekly_hours: 15
focus: [writing, listening]            # 用户自选重点
---
（人类备注，可选）
```

**字段说明**：
- `goal_band`: 数字，0.5 步进
- `exam_date`: ISO 日期 `YYYY-MM-DD`
- `created_at`: ISO 日期 `YYYY-MM-DD`
- `current`: 四科当前水平（首次诊断给出）
- `weekly_hours`: 每周可用备考时间；如果用户只给每天时间，先换算为每周总小时数再写入
- `focus`: 数组，可选值 `writing | reading | listening | speaking | vocab`

---

### `scores.md`

```yaml
---
records:
  - {date: YYYY-MM-DD, type: mock, l: 6.0, r: 6.5, w: 5.5, s: 6.0, overall: 6.0, source: cam17-test1, score_source: teacher_estimate, confidence: medium, evaluator_version: teacher-estimate}
  - {date: YYYY-MM-DD, type: diagnose, l: 6.5, r: 7.0, w: 6.0, s: 6.0, overall: 6.5, source: ielts-diagnose, score_source: ai_training_estimate, confidence: medium, evaluator_version: ielts-diagnose-v1.0}
  - {date: YYYY-MM-DD, type: real, l: 7.0, r: 7.5, w: 6.5, s: 6.5, overall: 7.0, source: official, score_source: official_test, confidence: high, evaluator_version: official-result}
---
（人类备注，可选）
```

**字段说明**：
- `date`: 成绩日期，ISO `YYYY-MM-DD`；未知时用本次诊断日期
- `type`: 成绩类型，`mock` | `real` | `partial` | `diagnose`（partial 表示只考了部分科目；diagnose 表示通过 `/ielts-diagnose` 估算的水平，不是真实模考）
- `source`: 成绩来源，例如 `cam18-test2` / `official` / `user_estimate`
- `score_source` / `confidence` / `evaluator_version`: 见“分数可信度字段”
- 缺考科目用 `null`

---

### `writing/submissions/YYYYMMDD_taskN_topic.md`

**文件名规范**：`YYYYMMDD_task2_technology.md`

```yaml
---
date: YYYY-MM-DD
task: 2                                # 1 | 2
topic: technology                      # 单词或短语，下划线分隔
score_source: ai_training_estimate
confidence: medium
evaluator_version: ielts-writing-v1.0
score:
  tr: 6.5                              # Task Response
  cc: 7.0                              # Coherence & Cohesion
  lr: 6.0                              # Lexical Resource
  ga: 6.5                              # Grammar & Accuracy
  overall: 6.5                         # 单篇四维均分
errors:
  - {type: grammar,  tag: conditional,        count: 3}
  - {type: lexical,  tag: prep_collocation,   count: 2}
  - {type: coherence_cohesion, tag: linker_overuse,     count: 1}
duration_min: 38
word_count: 287
---
# 题目
（题目原文）

# 学生作文
（学生作文）

# 批改
（四维评分详细解释 + 句子级标注 + 改写对比）
```

**字段说明**：
- `score.overall`: 单篇 Task 1 或 Task 2 的四维均分：`roundHalf((tr + cc + lr + ga) / 4)`
- 完整 Writing test 同时包含 Task 1 + Task 2 时，才使用 `roundHalf((task1_overall + task2_overall * 2) / 3)`；该合并分不写入单篇 submission
- AI 写作评分只作个人趋势参考，不等同 IELTS 官方成绩
- `score_source` / `confidence` / `evaluator_version`: 新写入必填。AI 批改通常使用 `ai_training_estimate / medium / ielts-writing-v1.0`；证据不足时 `confidence: low`
- `errors[].type`: `grammar | lexical | coherence_cohesion | task_response`
- 兼容说明：旧数据里的 `cohesion` / `coherence` 读取时应归并为 `coherence_cohesion`，新数据不要再拆成两个类型。
- `errors[].tag`: 自由标签，建议小写下划线
- `errors[].count`: 这篇里出现的次数

---

### `writing/corpus/YYYYMMDD_source_topic.md`

**用途**：保存写作样文、个人样本或 AI 练习样文，用于学习参考和推荐。它不进入写作批改统计。

**文件名规范**：`YYYYMMDD_official_sample_technology.md`

```yaml
---
date: YYYY-MM-DD
task: 2
topic: education
topic_tags: [education, technology]
source_type: official_sample           # official_sample | published_sample | user_sample | ai_generated
content_origin: user_provided_text     # user_provided_text | source_excerpt | ai_generated_text
body_status: full_text                 # full_text | excerpt_only | metadata_only
source_ref: cam18-test1-task2
page_or_url: null
test_id: cam18-test1-task2
band: 7.0
band_source: official_reported         # official_reported | examiner_reported | teacher_reported | user_reported
target_band: null
word_count: 285
criteria_focus: [tr, cc, lr]
related_error_tags: [weak_argument, prep_collocation]
display_label: "Official sample / 官方样文"
lexical_chunks:
  - {phrase: "a significant proportion of", function: "describe quantity", do_not_copy: true, caution: "观察表达功能，不要整句套用"}
---
# 样文 / 摘录 / 分析
```

**字段说明**：
- `source_ref`: 必填，不能为空。剑桥真题建议用 `cam18-test1-task2` 这类稳定 ID。
- `source_type = official_sample | published_sample` 时，`content_origin` 不能是 `ai_generated_text`，且 `page_or_url` 或 `test_id` 至少有一个。
- `content_origin = ai_generated_text` 时，`source_type` 必须是 `ai_generated`。
- `body_status = metadata_only` 时，正文不能写样文全文，只能写来源摘要、学习要点和分析。
- `source_type = ai_generated` 时，`target_band` 必填，`band` 必须为空，`display_label` 必须说明“AI 练习样文，不是 band sample”。
- `band` 存在时必须有合法 `band_source`；禁止 `ai_estimated`。
- `lexical_chunks[].do_not_copy` 默认应为 `true`，避免模板化背诵。

---

### `reading/submissions/YYYYMMDD_source.md`

**文件名规范**：`YYYYMMDD_cam18-test3-passage2.md`

```yaml
---
date: YYYY-MM-DD
source: cam18-test3-passage2           # 唯一标识
total: 13
correct: 9
accuracy: 0.69
band: 6.5                              # 按算分表换算
score_source: reading_passage_conversion
confidence: medium
evaluator_version: ielts-reading-v1.0-passage-table
question_types:
  - {type: tfng,     total: 5, correct: 3}
  - {type: matching, total: 4, correct: 3}
  - {type: summary,  total: 4, correct: 3}
errors:
  - {tag: tfng_inference,        question: 3,  type: tfng}
  - {tag: matching_paraphrase,   question: 8,  type: matching}
synonyms_added: 12
duration_min: 18
---
# 文章原文 / 题目 / 解析
```

**字段说明**：
- `question_types[].type`: 阅读题型枚举（与 `/ielts-reading` skill 保持一致）：
  `tfng` | `ynng` | `matching_info` | `matching_features` | `matching_headings` |
  `mcq` | `summary` | `sentence_completion` | `short_answer` | `table` | `flow_chart`
  （兼容 V1.0：`matching` 仍可读，但建议新数据细化为 `matching_info` / `matching_features` / `matching_headings`）
- `errors[].tag`: 错题类型标签
- `synonyms_added`: 数量。明细在 `synonyms/YYYYMMDD_source.yaml`
- `score_source` / `confidence` / `evaluator_version`: 新写入必填。单篇 passage 的 `band` 必须标注 `reading_passage_conversion`，避免被误解为完整 Reading 正式成绩

---

### `reading/synonyms/YYYYMMDD_source.yaml`

```yaml
- {original: significant,   paraphrase: substantial,    source: cam18-t3-p2, context: "scientific findings"}
- {original: decline,       paraphrase: deteriorate,    source: cam18-t3-p2, context: "ecosystem"}
- {original: gather,        paraphrase: accumulate,     source: cam18-t3-p2}
```

---

### `listening/submissions/YYYYMMDD_source.md`

**文件名规范**：`YYYYMMDD_cam18-test3.md`

```yaml
---
date: YYYY-MM-DD
source: cam18-test3
total: 40
correct: 31
band: 7.0
score_source: listening_conversion
confidence: high
evaluator_version: ielts-listening-v1.0-score-table
section_scores: [9, 8, 7, 7]
section_types:                         # 每个 section 的题型分布
  - {section: 1, type: form_completion, total: 10, correct: 9}
  - {section: 2, type: map,             total: 10, correct: 7}
  - {section: 3, type: matching,        total: 10, correct: 8}
  - {section: 4, type: note_completion, total: 10, correct: 7}
error_types:
  - {tag: spelling, count: 4, examples: [accommodation, conscientious, restaurant, exhibition]}
  - {tag: number,   count: 2, examples: ["13.50", "fifteen"]}
  - {tag: map,      count: 3}
  - {tag: distractor_trap, count: 2}
---
# 错题详细分析
```

**字段说明**：
- `section_types[].type`: 听力题型枚举（与 `/ielts-listening` skill 保持一致）：
  `form_completion` | `note_completion` | `summary_completion` | `sentence_completion` |
  `mcq` | `matching` | `map` | `plan` | `diagram` | `short_answer` | `table`
- `error_types[].tag`: 自由稳定标签。常用：`spelling` | `number` | `map` | `distractor_trap` |
  `paraphrase` | `over_word_limit` | `singular_plural` | `missed_negation` | `accent`
- `score_source` / `confidence` / `evaluator_version`: 新写入必填。40 题完整听力换算用 `listening_conversion / high`

---

### `vocab/days/dayNN.md`

**文件名规范**：`day12.md`（NN 从 01 起，宽度自适应）

```yaml
---
day: 12
date: YYYY-MM-DD
words_pushed:                          # 当天推送的新词
  - ubiquitous
  - exacerbate
  - paradigm
  - ...
test:
  total: 15
  correct: 12
  wrong: [conundrum, ephemeral, recalcitrant]
mastered_today: [ubiquitous, exacerbate]   # 达到出池规则，本次毕业
difficult_added: [conundrum, ephemeral]    # 进难词池
review_due:                            # 间隔重复触发的复习
  - {from_day: 7, count: 15}
  - {from_day: 4, count: 15}
duration_min: 25
---
（可选：当天发现的搭配/语境笔记）
```

---

### `vocab/difficult.yaml`

```yaml
- {word: conundrum,   added_day: 12, review_count: 1, last_correct: false, last_review: YYYY-MM-DD}
- {word: ephemeral,   added_day: 12, review_count: 2, last_correct: true,  last_review: YYYY-MM-DD}
- {word: recalcitrant, added_day: 8, review_count: 4, last_correct: true,  last_review: YYYY-MM-DD}
```

**出池规则**：累计复习达到 3 次且最近一次答对（`review_count >= 3 && last_correct == true`）→ 移到 `vocab/mastered.yaml`。

---

### `vocab/mastered.yaml`

```yaml
- {word: ubiquitous,  mastered_day: 12, mastered_at: YYYY-MM-DD, source: day12}
- {word: exacerbate,  mastered_day: 12, mastered_at: YYYY-MM-DD, source: day12}
```

---

### `speaking/stories/story_NN_topic.md`

**文件名规范**：`story_07_work.md`

```yaml
---
id: 7
topic_primary: work
topics_covered: [work, study, future_plan, success]   # 一个故事覆盖多话题
parts: [2, 3]
length_sec: 90
status: drafted                        # drafted | rehearsed | recorded
created_at: YYYY-MM-DD
---
# Part 2 卡片题
（话题卡片）

# 故事骨架
（90 秒口述结构 + 关键词 + 示例片段）

# Part 3 追问预测
（3-5 个追问 + 答题骨架）
```

---

### `speaking/topic_groups.yaml`

```yaml
groups:
  - {name: people,        topics: [friend, family, teacher, person_helped_you], stories: [3, 5]}
  - {name: places,        topics: [hometown, holiday_place, restaurant],         stories: [2, 8]}
  - {name: things,        topics: [book, photo, gift, app],                      stories: [1, 4, 6]}
  - {name: events,        topics: [success, decision, change, achievement],      stories: [7]}
  - {name: experiences,   topics: [travel, learning, work, party],               stories: [7, 8]}
total_topics: 37                       # 官方 Part 2 话题总数
covered_topics: 22
coverage_rate: 0.59
```

---

### `speaking/practice/YYYYMMDD_partN_topic.md`

**用途**：记录一次口语练习后的复盘结果。它是口语表现记录，不是素材库，也不是官方口语成绩。

**文件名规范**：`20260513_part2_travel_experience.md`。文件名里的 `date`、`part`、`topic` 必须和 frontmatter 一致；`part: mixed` 使用 `partmixed`。

```yaml
---
date: YYYY-MM-DD
part: 2                              # 1 | 2 | 3 | mixed
topic: travel_experience
prompt_ref: cam18-speaking-part2-travel
duration_sec: 115
response_mode: recording_review      # recording_review | live_practice | transcript_review | self_review
transcript_status: summary           # none | excerpt | summary | full_transcript
recording_ref: null                  # 可选；只存相对路径，不存外部私密链接
score_source: ai_training_estimate   # teacher_estimate | ai_training_estimate | self_reported | legacy_unknown
confidence: medium                   # low | medium | high
evaluator_version: "ielts-speaking-v1.0"
score:
  fluency: 6.0
  lexical: 6.0
  grammar: 6.0
  pronunciation: null
  overall: 6.0
issues:
  - dimension: fluency               # fluency | lexical | grammar | pronunciation | coherence | content
    tag: long_pause
    severity: major                  # minor | major
    evidence: "Part 2 中间停顿超过 5 秒"
next_drill:
  time_budget_min: 15                # 5 | 15 | 30
  action: "用 4 句骨架重说 Part 2：背景、事件、细节、感受。"
notes: "只记录复盘摘要，不保存完整个人经历细节。"
---
# Speaking Practice Review

（只写摘要、短证据和下一步训练，不写完整敏感转写。）
```

**字段约束：**
- `score.*` 必须是 `0.0-9.0` 且 0.5 步进；没有可靠依据时写 `null`。
- `score_source` 必须说明分数来源，避免把 AI 训练估分、老师估分、自评混成同一种成绩。
- `confidence` 用来标记这次记录是否适合进入趋势判断；短回答、半套题、只有摘录时通常为 `low` 或 `medium`。`low` 可信度记录不进入 closed loop 候选，也不参与 dashboard 高频表现问题聚合。
- 至少提供一个非空 `score` 字段，或至少一条 `issues[]`；否则这不是有效复盘记录。
- `issues[].tag` 使用稳定英文下划线标签：必须匹配 `^[a-z][a-z0-9_]*$`，dashboard 展示时再转成中文正式文案。
- `recording_ref` 只能存本地相对路径；不得写公开分享链接。
- 隐私去敏由写入 skill 负责：`evidence`、`notes`、`next_drill.action` 不得包含真实姓名、电话、地址、学校、公司等个人信息。

---

### `coach_notes.md`（可选）

**用途**：记录跨多次训练反复出现的问题。只由 `/ielts` 或 `/ielts-diagnose` 在用户确认后创建或更新。

```yaml
---
updated_at: YYYY-MM-DD
notes:
  - issue_key: writing:grammar:article_misuse
    skill: writing
    status: active
    first_seen: YYYY-MM-DD
    last_seen: YYYY-MM-DD
    evidence_count: 3
    source_files:
      - writing/submissions/YYYYMMDD_task2_topic.md
    action: "写作检查冠词：泛指、特指、复数名词前先判断是否需要 article。"
---
# Coach Notes

## Active
- writing:grammar:article_misuse：写作检查冠词。
```

**去敏规则**：
- 不写完整作文、阅读文章、听力原文、口语故事全文。
- 不写真实姓名、电话、地址、学校、公司。
- `source_files` 只存相对路径和文件名。
- 例句最多保留短语级片段。

**合并写入规则**：
- 如果已有同样 `issue_key`，只更新 `last_seen`、增加 `evidence_count`、合并并去重 `source_files`。
- 已有 `action` 不自动覆盖；只有用户明确同意替换时才改。
- 如果没有同样 `issue_key`，新增一条 `status: active` note。

---

## Micro Plan 输出契约（不是数据文件）

`micro_plan` 是 `/ielts` 或 `/ielts-diagnose` 在报告里输出的行动单元，不单独写文件。

```yaml
micro_plan:
  id: YYYYMMDD_skill_focus
  created_at: YYYY-MM-DD
  source: ielts
  skill: writing
  time_budget_min: 15
  trigger: "user_has_15_minutes"
  task:
    title: "Task 2 观点段补强"
    input: "最近 3 篇写作里 weak_argument 出现 3 次"
    steps:
      - "选一篇最近作文的一个弱段落"
      - "补 1 个解释句和 1 个具体例子"
      - "用 /ielts-writing 获取段落反馈；不计分，不写 submission"
  success_metric:
    observable_output: "产出 1 个 5-6 句正文段，至少包含 claim + explanation + example + link"
  why_it_raises_band:
    dimension: tr
    reason: "补足论证展开，直接对应 Task Response"
  record_policy:
    write_after_completion: false
    target_file_type: null
    condition: "段落 drill 不是完整 Task 1/Task 2，不能写入 writing/submissions"
```

**约束**：
- `time_budget_min` 默认只能是 `5 | 15 | 30`，除非用户明确给出其他时间。
- `skill`: `writing | reading | listening | speaking | vocab`
- `why_it_raises_band.dimension`: `tr | cc | lr | ga | reading_accuracy | listening_accuracy | fluency | vocab_recall`
- `success_metric.observable_output` 必须可观察，不能写“提升语感”这类空话。
- 任务必须是 IELTS 训练，不输出泛英语任务。
- `micro_plan` 本身不写文件。只有当用户完成的是完整 IELTS 原子训练，并且满足对应 schema 的必填字段时，才由对应单项 skill 写入记录。
- 短练习、段落 drill、口头热身、只给反馈的任务必须 `write_after_completion: false`，不能写 `score.overall`，不能污染 submissions 统计。

---

## Closed Loop 候选规则

Closed loop 只生成候选，不默认写 `coach_notes.md`。

**最近 3 次规则只适用于原子文件**：
- `writing/submissions/*.md`
- `reading/submissions/*.md`
- `listening/submissions/*.md`
- `speaking/practice/*.md`
- `vocab/days/*.md`

**不得套用最近 3 次规则的聚合文件**：
- `speaking/topic_groups.yaml`
- `vocab/difficult.yaml`
- `speaking/stories/*.md`，它是素材管理文件，不是口语表现记录

`vocab/difficult.yaml` 只能生成当前状态候选：`review_count >= 3 && last_correct === false` 时，使用 `vocab:difficult_state:{word}`。它不是“最近 3 次”候选。

**issue_key 规则**：
- 写作：`writing:{errors[].type || unknown}:{errors[].tag}`
- 阅读：`reading:{errors[].type || unknown}:{errors[].tag}`，`question` 只能作为 evidence，不能进主键
- 听力：`listening:error:{error_types[].tag}`
- 口语：`speaking:{issues[].dimension}:{issues[].tag}`
- 词汇：`vocab:wrong_word:{word}` / `vocab:difficult_state:{word}` / `vocab:test:low_accuracy`

口语闭环只使用 `speaking/practice/*.md` 中 `confidence != low` 的 `issues[]`。`speaking:story_status:{status}` 和 `speaking:coverage_gap:{group_name}` 仍只是素材规划信号，不自动写入 coach notes。

`vocab:test:low_accuracy` 的触发阈值：最近 3 个 `vocab/days/*.md` 都有 `test.total > 0`，且 `test.correct / test.total < 0.70`。

**确认文案**：
- 最近 3 次候选：`最近 3 次 {skill} 都出现 {issue_key}。是否写入 coach_notes.md，作为后续训练提醒？建议记录：{action}`
- 当前状态候选：`当前 {source_file} 显示 {issue_key} 仍未解决。是否写入 coach_notes.md，作为后续训练提醒？建议记录：{action}`

---

## 字段约定

### 通用
- 日期一律 ISO `YYYY-MM-DD`
- 分数一律 `0.0-9.0`，0.5 步进
- `roundHalf(x)`: 四舍五入到最近 0.5；`.25` 和 `.75` 向上取整，例如 `6.25 -> 6.5`、`6.75 -> 7.0`
- 标签一律小写 + 下划线（`prep_collocation` 不是 `PrepCollocation`）
- 数组用 flow style `[a, b, c]` 或 block style，不混用

### 命名空间
- `errors[].tag`: 自由扩展，但应稳定（同一类错误用同一个标签）
- `source`: 剑桥真题用 `cam18-test3` 或 `cam18-test3-passage2` 格式

---

## Dashboard 校验

Dashboard 校验脚本按已接入的数据源执行检查，包括 submissions、speaking practice、writing corpus 和已存在的 `coach_notes.md`：
1. frontmatter 是否存在
2. 必填字段是否齐全
3. 字段类型是否正确（zod schema）
4. 文件名是否符合规范

不通过的条目独立列出来给用户修，不阻断 dashboard 启动。Dashboard 只读数据，不在校验或迁移时静默制造 corpus / coach_notes。

---

## 废弃说明（旧版 → V1.0）

| 旧版文件 | V1.0 处理 |
|---------|---------|
| `writing/index.md` | 废弃，dashboard 实时聚合 |
| `writing/errors.md` | 废弃，dashboard 实时聚合 |
| `reading/index.md` | 废弃 |
| `reading/errors.md` | 废弃 |
| `reading/synonyms.md`（单文件累计） | 拆成 `synonyms/YYYYMMDD_source.yaml` |
| `vocab/progress.md`（单文件累计） | 拆成 `vocab/days/dayNN.md` |
| `vocab/difficult.md` | 改为 `vocab/difficult.yaml`（结构化） |
| `vocab/mastered.md` | 改为 `vocab/mastered.yaml`（结构化） |
| `speaking/topic_groups.md` | 改为 `speaking/topic_groups.yaml` |

旧版数据由 `migrate-to-v1-0.js` 自动迁移。
