// 中英对照标签系统。所有页面共用。

// ---------- 写作 ----------

export const WRITING_DIMENSIONS = {
  tr: { short: 'TR', cn: '审题' },
  cc: { short: 'CC', cn: '连贯' },
  lr: { short: 'LR', cn: '词汇' },
  ga: { short: 'GA', cn: '语法' },
};

export const WRITING_DIMENSION_FULL = {
  tr: 'Task Response',
  cc: 'Coherence & Cohesion',
  lr: 'Lexical Resource',
  ga: 'Grammar & Accuracy',
};

export const WRITING_ERROR_LABELS = {
  prep_collocation: '介词搭配错误',
  tense_shift: '时态不一致',
  weak_argument: '论证不足',
  article_misuse: '冠词错',
  word_form: '词形/词性错误',
  incomplete_answer: '答题不完整',
  subj_verb_agree: '主谓不一致',
  linker_overuse: '连接词使用过度',
  basic_vocabulary: '基础词汇薄弱',
  conditional: '条件句错',
  copy_question: '抄题目',
  informal_register: '口语化',
  passive_overuse: '被动语态过度',
  run_on: '流水句',
  paragraph_structure: '段落结构',
};

export const BODY_STATUS_LABELS = {
  full_text: '全文',
  excerpt_only: '节选',
  metadata_only: '仅元数据',
};

export const WRITING_ERROR_TYPES = {
  grammar: '语法',
  lexical: '词汇',
  coherence_cohesion: '连贯衔接',
  task_response: '切题',
  cohesion: '连贯衔接',
  coherence: '连贯衔接',
};

// ---------- 阅读 ----------

export const READING_QUESTION_TYPES = {
  tfng: 'TFNG 判断',
  ynng: 'YNNG 观点',
  matching_headings: '标题匹配',
  matching_info: '信息匹配',
  matching_features: '特征匹配',
  mcq: '多选题',
  summary: '摘要填空',
  sentence_completion: '句子填空',
  short_answer: '简答题',
  heading: '标题题',
  table: '表格题',
  flow_chart: '流程图',
};

export const READING_ERROR_LABELS = {
  tfng_inference: 'TFNG 推理过度',
  tfng_partial_match: 'TFNG 局部匹配误判',
  tfng_overgeneralization: 'TFNG 绝对词误判',
  tfng_degree_shift: 'TFNG 程度词变化',
  tfng_wrong_cause: 'TFNG 因果关系误判',
  tfng_missing_specifier: 'TFNG 限定词漏看',
  matching_paraphrase: '同义替换未识别',
  matching_distractor: '匹配题干扰项',
  mcq_distractor: '多选题干扰项',
  summary_word_limit: '超出字数限制',
  time_pressure: '时间不足',
  definition_too_narrow: '定义范围过窄',
};

// ---------- 听力 ----------

export const LISTENING_ERROR_LABELS = {
  spelling: '拼写',
  number: '数字',
  map: '地图方位',
  distractor_trap: '干扰项误选',
  paraphrase: '同义替换未识别',
  over_word_limit: '超出字数限制',
  singular_plural: '单复数',
  missed_negation: '漏听否定',
  accent: '口音适应',
};

export const LISTENING_SECTION_TYPES = {
  form_completion: '表格填空',
  note_completion: '笔记填空',
  summary_completion: '摘要填空',
  sentence_completion: '句子填空',
  mcq: '多选题',
  matching: '匹配题',
  map: '地图',
  plan: '平面图',
  diagram: '示意图',
  short_answer: '简答',
  table: '表格',
};

// ---------- 分数 ----------

export const SCORE_TYPES = {
  mock: '模考',
  real: '真考',
  partial: '部分',
  diagnose: '诊断',
};

export const SCORE_SOURCES = {
  official_test: '官方成绩',
  official_practice: '官方练习',
  teacher_estimate: '老师估分',
  ai_training_estimate: 'AI 训练估分',
  self_reported: '用户自报',
  reading_passage_conversion: '单篇阅读换算',
  listening_conversion: '听力换算',
  legacy_unknown: '旧数据未标注',
};

export const SCORE_CONFIDENCE = {
  high: '高',
  medium: '中',
  low: '低',
};

export const SUBJECT_NAMES = {
  l: '听力',
  r: '阅读',
  w: '写作',
  s: '口语',
  overall: '总分',
};

// ---------- 口语 ----------

export const STORY_STATUS = {
  drafted: '初稿',
  rehearsed: '已练习',
  recorded: '已录音',
};

export const SPEAKING_DIMENSIONS = {
  fluency: '流利度与连贯',
  lexical: '词汇资源',
  grammar: '语法范围与准确性',
  pronunciation: '发音',
  coherence: '内容连贯',
  content: '内容密度',
};

export const SPEAKING_ISSUE_LABELS = {
  long_pause: '停顿过长',
  self_correction: '自我修正过多',
  short_answer: '回答过短',
  memorized_delivery: '背诵感明显',
  unclear_stress: '重音不清',
  flat_intonation: '语调单一',
  grammar_error: '语法错误',
  limited_vocabulary: '词汇范围有限',
  off_topic: '偏题',
  weak_example: '例子不具体',
};

export const SPEAKING_GROUP_NAMES = {
  people: '人物',
  places: '地点',
  things: '物品',
  events: '事件',
  experiences: '经历',
  media: '媒体',
};

// ---------- 辅助函数 ----------

/**
 * 返回正式中文标签。如果找不到翻译，回退为去下划线后的可读英文。
 * 例: labelCN(WRITING_ERROR_LABELS, 'prep_collocation') → '介词搭配错误'
 */
export function labelCN(map, key) {
  const cn = map?.[key];
  return cn || displaySlug(key);
}

/** 只返回中文，找不到就返回英文 */
export function cnOnly(map, key) {
  return map?.[key] || key;
}

/** 「中文 (英文)」格式，把中文放前面 */
export function cnFirst(map, key) {
  const cn = map?.[key];
  return cn ? `${cn} (${key})` : key;
}

export function chartLabel(map, key) {
  return map?.[key] || displaySlug(key);
}

export function displaySlug(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      if (/^[A-Z0-9]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function displaySource(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  const cam = raw.match(/^cam(\d+)-test(\d+)(?:-passage(\d+))?$/i);
  if (cam) {
    return `Cambridge ${cam[1]} Test ${cam[2]}${cam[3] ? ` Passage ${cam[3]}` : ''}`;
  }
  return displaySlug(raw);
}
