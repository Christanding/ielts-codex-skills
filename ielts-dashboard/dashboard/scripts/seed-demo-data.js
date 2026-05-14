#!/usr/bin/env node
/**
 * Seed 4 weeks of demo data into ~/.ielts/.
 * Models a virtual user 4 weeks into IELTS prep, target 7.5.
 *
 * Usage:
 *   npm run seed             # writes to ~/.ielts/
 *   IELTS_HOME=/tmp/x npm run seed   # custom dir
 *
 * To clear first: npm run reset
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { PATHS, ensureDirs, IELTS_HOME, exists } from '../lib/paths.js';

ensureDirs();

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const a = [...arr];
  const out = [];
  for (let i = 0; i < n && a.length; i++) {
    out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  }
  return out;
}
function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function writeFm(file, fmObj, body = '') {
  const fm = yaml.dump(fmObj, { lineWidth: 120, flowLevel: 3 });
  const content = `---\n${fm}---\n\n${body}`;
  fs.writeFileSync(file, content, 'utf8');
}

function writeYaml(file, obj) {
  fs.writeFileSync(file, yaml.dump(obj, { lineWidth: 120 }), 'utf8');
}

console.log(`[seed] target: ${IELTS_HOME}`);

// ---------- profile ----------

const profile = {
  goal_band: 7.5,
  exam_date: dateNDaysAgo(-56),    // 8 weeks from now
  created_at: dateNDaysAgo(28),
  current: { l: 6.5, r: 7.0, w: 6.0, s: 6.0 },
  weekly_hours: 15,
  focus: ['writing', 'listening'],
};
writeFm(PATHS.profile, profile, '# 用户档案\n\n虚拟用户：4 周备考，目标 7.5。');
console.log('[seed] profile.md written');

// ---------- scores ----------

const scores = {
  records: [
    { date: dateNDaysAgo(28), type: 'mock', l: 5.5, r: 6.0, w: 5.5, s: 5.5, overall: 6.0, source: 'cam17-test1', score_source: 'teacher_estimate', confidence: 'medium', evaluator_version: 'seed-v1.0-teacher-estimate' },
    { date: dateNDaysAgo(21), type: 'mock', l: 6.0, r: 6.5, w: 5.5, s: 6.0, overall: 6.0, source: 'cam17-test4', score_source: 'teacher_estimate', confidence: 'medium', evaluator_version: 'seed-v1.0-teacher-estimate' },
    { date: dateNDaysAgo(14), type: 'mock', l: 6.5, r: 6.5, w: 6.0, s: 6.0, overall: 6.5, source: 'cam18-test1', score_source: 'teacher_estimate', confidence: 'medium', evaluator_version: 'seed-v1.0-teacher-estimate' },
    { date: dateNDaysAgo(7),  type: 'mock', l: 6.5, r: 7.0, w: 6.0, s: 6.0, overall: 6.5, source: 'cam18-test2', score_source: 'teacher_estimate', confidence: 'medium', evaluator_version: 'seed-v1.0-teacher-estimate' },
  ],
};
writeFm(PATHS.scores, scores, '# 分数历史\n\n4 次模考，每周 1 次。');
console.log('[seed] scores.md written (4 records)');

// ---------- writing ----------

const writingTopics = [
  { task: 1, topic: 'bar_chart_population' },
  { task: 1, topic: 'line_graph_oil_consumption' },
  { task: 1, topic: 'map_village_change' },
  { task: 1, topic: 'pie_chart_energy_sources' },
  { task: 2, topic: 'technology_isolation' },
  { task: 2, topic: 'university_free_tuition' },
  { task: 2, topic: 'environment_individual_action' },
  { task: 2, topic: 'remote_work_advantages' },
];

const writingErrorTags = [
  { type: 'grammar', tag: 'conditional' },
  { type: 'grammar', tag: 'subj_verb_agree' },
  { type: 'grammar', tag: 'tense_shift' },
  { type: 'grammar', tag: 'article_misuse' },
  { type: 'lexical', tag: 'prep_collocation' },
  { type: 'lexical', tag: 'basic_vocabulary' },
  { type: 'lexical', tag: 'word_form' },
  { type: 'lexical', tag: 'informal_register' },
  { type: 'coherence_cohesion', tag: 'linker_overuse' },
  { type: 'coherence_cohesion', tag: 'weak_argument' },
  { type: 'task_response', tag: 'incomplete_answer' },
];

writingTopics.forEach((t, i) => {
  const daysAgo = 28 - i * 3;
  const date = dateNDaysAgo(daysAgo);
  const progress = i / writingTopics.length;
  const baseScore = 5.5 + progress * 1.0 + rand(-0.25, 0.25);
  const round = (v) => Math.max(4, Math.min(8, Math.round(v * 2) / 2));
  const score = {
    tr: round(baseScore + rand(-0.5, 0.5)),
    cc: round(baseScore + rand(-0.5, 0.5)),
    lr: round(baseScore + rand(-0.5, 0.3)),
    ga: round(baseScore + rand(-0.5, 0.5)),
    overall: 0,
  };
  score.overall = round((score.tr + score.cc + score.lr + score.ga) / 4);

  const errs = pickN(writingErrorTags, 3 + Math.floor(Math.random() * 3))
    .map((e) => ({ ...e, count: 1 + Math.floor(Math.random() * 4) }));

  const fname = `${date.replace(/-/g, '')}_task${t.task}_${t.topic}.md`;
  const fmObj = {
    date,
    task: t.task,
    topic: t.topic,
    score_source: 'ai_training_estimate',
    confidence: 'medium',
    evaluator_version: 'seed-v1.0-writing',
    score,
    errors: errs,
    duration_min: 35 + Math.floor(Math.random() * 15),
    word_count: t.task === 2 ? 270 + Math.floor(Math.random() * 50) : 165 + Math.floor(Math.random() * 30),
  };
  const body = `# 题目\n（demo）\n\n# 学生作文\n（demo）\n\n# 批改报告\n（demo seed data，请用 /ielts-writing 跑真实批改）`;
  writeFm(path.join(PATHS.writing.submissions, fname), fmObj, body);
});
console.log(`[seed] writing/submissions/ written (${writingTopics.length} files)`);

const writingCorpus = [
  {
    daysAgo: 6,
    task: 2,
    topic: 'remote_work_advantages',
    topic_tags: ['work', 'technology'],
    target_band: 7,
    criteria_focus: ['tr', 'cc'],
    related_error_tags: ['weak_argument', 'linker_overuse'],
    lexical_chunks: [
      { phrase: 'a flexible working pattern', function: 'topic phrase', do_not_copy: true },
      { phrase: 'a measurable improvement in productivity', function: 'cause and effect', do_not_copy: true },
    ],
    excerpt: 'A flexible working pattern can reduce commuting fatigue and give employees more control over their most productive hours. However, this benefit only becomes measurable when teams set clear deadlines and keep communication routines simple.',
  },
  {
    daysAgo: 5,
    task: 2,
    topic: 'environment_individual_action',
    topic_tags: ['environment', 'society'],
    target_band: 7,
    criteria_focus: ['tr', 'lr'],
    related_error_tags: ['incomplete_answer', 'basic_vocabulary'],
    lexical_chunks: [
      { phrase: 'individual choices can still compound over time', function: 'argument development', do_not_copy: true },
      { phrase: 'policy and personal responsibility are not mutually exclusive', function: 'balanced position', do_not_copy: true },
    ],
    excerpt: 'Although environmental problems require regulation, individual choices can still compound over time. A household that cuts waste, buys less disposable packaging and uses public transport may not solve climate change alone, but it helps make wider policy more practical.',
  },
  {
    daysAgo: 4,
    task: 1,
    topic: 'line_graph_oil_consumption',
    topic_tags: ['chart', 'trend'],
    target_band: 7,
    criteria_focus: ['tr', 'lr'],
    related_error_tags: ['word_form', 'prep_collocation'],
    lexical_chunks: [
      { phrase: 'rose steadily before levelling off', function: 'trend description', do_not_copy: true },
      { phrase: 'the figure remained broadly stable', function: 'data summary', do_not_copy: true },
    ],
    excerpt: 'Oil consumption rose steadily before levelling off in the final period. By contrast, the figure for renewable energy remained broadly stable at first, then showed a modest but consistent increase.',
  },
];

for (const item of writingCorpus) {
  const date = dateNDaysAgo(item.daysAgo);
  const fname = `${date.replace(/-/g, '')}_ai_practice_${item.topic}.md`;
  writeFm(
    path.join(PATHS.writing.corpus, fname),
    {
      date,
      task: item.task,
      topic: item.topic,
      topic_tags: item.topic_tags,
      source_type: 'ai_generated',
      content_origin: 'ai_generated_text',
      body_status: 'excerpt_only',
      source_ref: 'seed-demo-data',
      page_or_url: null,
      test_id: null,
      band: null,
      band_source: null,
      target_band: item.target_band,
      word_count: item.task === 2 ? 280 : 170,
      criteria_focus: item.criteria_focus,
      related_error_tags: item.related_error_tags,
      display_label: 'AI practice model / AI 练习样文，不是 band sample',
      lexical_chunks: item.lexical_chunks,
    },
    `# AI practice excerpt\n\n${item.excerpt}\n\n# Learning note\n\nDemo corpus excerpt only. Use it to observe structure and lexical function; do not memorize it as a template.`
  );
}
console.log(`[seed] writing/corpus/ written (${writingCorpus.length} AI practice files, no coach_notes.md)`);

// ---------- reading ----------

const readingSources = [
  'cam17-test1-passage1', 'cam17-test1-passage2', 'cam17-test2-passage1',
  'cam17-test4-passage2', 'cam18-test1-passage1', 'cam18-test2-passage3',
];
const qTypes = ['tfng', 'matching_headings', 'matching_info', 'mcq', 'summary', 'sentence_completion'];
const readingErrorTags = [
  'tfng_inference', 'tfng_partial_match', 'tfng_overgeneralization',
  'matching_paraphrase', 'matching_distractor', 'mcq_distractor',
  'summary_word_limit', 'time_pressure',
];

readingSources.forEach((source, i) => {
  const daysAgo = 28 - i * 4;
  const date = dateNDaysAgo(daysAgo);
  const progress = i / readingSources.length;
  const total = 13 + Math.floor(Math.random() * 2);
  const correct = Math.round(total * (0.65 + progress * 0.20 + rand(-0.05, 0.10)));
  const accuracy = +(correct / total).toFixed(2);
  const band = accuracy >= 0.85 ? 7.5 : accuracy >= 0.75 ? 7.0 : accuracy >= 0.65 ? 6.5 : 6.0;

  const types = pickN(qTypes, 3);
  const question_types = types.map((t) => {
    const tot = Math.floor(total / types.length) + (Math.random() < 0.5 ? 1 : 0);
    const cor = Math.round(tot * (0.6 + Math.random() * 0.3));
    return { type: t, total: tot, correct: cor };
  });

  const wrong = total - correct;
  const errors = [];
  for (let q = 0; q < wrong; q++) {
    errors.push({
      tag: pick(readingErrorTags),
      question: q + 1,
      type: pick(types),
    });
  }

  const synonymsAdded = 8 + Math.floor(Math.random() * 8);

  const fname = `${date.replace(/-/g, '')}_${source}.md`;
  writeFm(
    path.join(PATHS.reading.submissions, fname),
    {
      date,
      source,
      total,
      correct,
      accuracy,
      band,
      score_source: 'reading_passage_conversion',
      confidence: 'medium',
      evaluator_version: 'seed-v1.0-reading-conversion',
      question_types,
      errors,
      synonyms_added: synonymsAdded,
      duration_min: 18 + Math.floor(Math.random() * 8),
    },
    '# 文章 / 题目 / 分析报告\n（demo）'
  );

  // synonyms yaml
  const synBank = [
    { o: 'significant', p: 'substantial' }, { o: 'decline', p: 'deteriorate' },
    { o: 'gather', p: 'accumulate' }, { o: 'increase', p: 'surge' },
    { o: 'show', p: 'demonstrate' }, { o: 'cause', p: 'trigger' },
    { o: 'difficult', p: 'arduous' }, { o: 'change', p: 'alter' },
    { o: 'many', p: 'numerous' }, { o: 'think', p: 'maintain' },
    { o: 'good', p: 'beneficial' }, { o: 'large', p: 'substantial' },
    { o: 'use', p: 'utilize' }, { o: 'help', p: 'facilitate' },
    { o: 'improve', p: 'enhance' }, { o: 'reduce', p: 'mitigate' },
  ];
  const items = pickN(synBank, synonymsAdded).map((p) => ({
    original: p.o,
    paraphrase: p.p,
    source,
    context: 'demo',
  }));
  writeYaml(path.join(PATHS.reading.synonyms, `${date.replace(/-/g, '')}_${source}.yaml`), items);
});
console.log(`[seed] reading/submissions/ + synonyms/ written (${readingSources.length} files each)`);

// ---------- listening ----------

const listeningSources = ['cam17-test1', 'cam17-test4', 'cam18-test1', 'cam18-test2'];
const sectionTypes = [
  ['form_completion', 'note_completion'],
  ['map', 'matching', 'mcq'],
  ['matching', 'mcq'],
  ['note_completion', 'summary_completion'],
];
const listeningErrorTags = ['spelling', 'number', 'map', 'distractor_trap', 'paraphrase', 'singular_plural', 'missed_negation'];

listeningSources.forEach((source, i) => {
  const daysAgo = 28 - i * 7;
  const date = dateNDaysAgo(daysAgo);
  const progress = i / listeningSources.length;
  const baseSec = [8 + progress, 7 + progress, 6 + progress, 6 + progress];
  const section_scores = baseSec.map((v) => Math.max(0, Math.min(10, Math.round(v + rand(-1, 1)))));
  const correct = section_scores.reduce((a, b) => a + b, 0);
  const band = correct >= 35 ? 8.0 : correct >= 32 ? 7.5 : correct >= 30 ? 7.0 : correct >= 26 ? 6.5 : 6.0;

  const section_types = section_scores.map((cor, idx) => ({
    section: idx + 1,
    type: pick(sectionTypes[idx]),
    total: 10,
    correct: cor,
  }));

  const wrong = 40 - correct;
  const errorBuckets = {};
  for (let q = 0; q < wrong; q++) {
    const tag = pick(listeningErrorTags);
    errorBuckets[tag] = (errorBuckets[tag] || 0) + 1;
  }
  const error_types = Object.entries(errorBuckets).map(([tag, count]) => ({
    tag,
    count,
    examples: tag === 'spelling' ? pickN(['accommodation', 'conscientious', 'restaurant', 'questionnaire'], Math.min(count, 3)) : undefined,
  }));

  const fname = `${date.replace(/-/g, '')}_${source}.md`;
  writeFm(
    path.join(PATHS.listening.submissions, fname),
    {
      date,
      source,
      total: 40,
      correct,
      band,
      score_source: 'listening_conversion',
      confidence: 'high',
      evaluator_version: 'seed-v1.0-listening-conversion',
      section_scores,
      section_types,
      error_types,
      duration_min: 35,
    },
    '# 错题分析\n（demo）'
  );
});
console.log(`[seed] listening/submissions/ written (${listeningSources.length} files)`);

// ---------- vocab ----------

const wordBank = [
  'ubiquitous', 'exacerbate', 'paradigm', 'phenomenon', 'substantial',
  'mitigate', 'profound', 'superficial', 'inevitable', 'plausible',
  'arbitrary', 'comprehensive', 'discrepancy', 'inherent', 'meticulous',
  'pragmatic', 'redundant', 'scrutinize', 'tangible', 'unprecedented',
  'vindicate', 'wary', 'zealous', 'ambiguous', 'benevolent',
  'cogent', 'dilapidated', 'enigmatic', 'fastidious', 'gregarious',
  'hackneyed', 'iconoclast', 'jovial', 'kindle', 'laudable',
  'magnanimous', 'nebulous', 'oblivious', 'pernicious', 'quintessential',
  'recalcitrant', 'sycophant', 'taciturn', 'ubiquity', 'vacillate',
  'wistful', 'xenophobic', 'yield', 'zenith', 'aberration',
  'bombastic', 'capitulate', 'desultory', 'effervescent', 'fortuitous',
  'garrulous', 'heterogeneous', 'ineffable', 'juxtapose', 'kowtow',
  'lugubrious', 'mellifluous', 'nascent', 'obfuscate', 'palpable',
  'querulous', 'reticent', 'serendipity', 'truculent', 'umbrage',
  'venerate', 'wanton', 'xenial', 'yarn', 'zealot',
  'acrimony', 'beleaguer', 'circumlocution', 'demur', 'ebullient',
  'fecund', 'gambit', 'hegemony', 'immutable', 'jingoism',
  'kismet', 'lackadaisical', 'mendacious', 'nepotism', 'obstreperous',
  'penchant', 'quagmire', 'ribald', 'sanguine', 'turpitude',
  'umbrage', 'vacuous', 'whimsical', 'xenagogue', 'yore',
];

const usedWords = [];
const masteredArr = [];
const difficultArr = [];

for (let day = 1; day <= 28; day++) {
  const date = dateNDaysAgo(28 - day);
  const offset = (day - 1) * 15;
  const pushed = wordBank.slice(offset, offset + 15);
  if (pushed.length === 0) continue;
  usedWords.push(...pushed);

  const test = day >= 2 ? {
    total: Math.min(10, pushed.length),
    correct: 6 + Math.floor(Math.random() * 4),
    wrong: pickN(pushed, 1 + Math.floor(Math.random() * 3)),
  } : null;

  let mastered_today = [];
  let difficult_added = [];
  if (test) {
    difficult_added = test.wrong;
    mastered_today = pickN(pushed.filter((w) => !test.wrong.includes(w)), Math.min(3, Math.floor(test.correct / 3)));

    for (const w of difficult_added) {
      if (!difficultArr.find((d) => d.word === w)) {
        difficultArr.push({
          word: w, added_day: day, review_count: 1, last_correct: false, last_review: date,
        });
      }
    }
    for (const w of mastered_today) {
      masteredArr.push({ word: w, mastered_day: day, mastered_at: date, source: `day${day}` });
    }
  }

  const review_due = [];
  if (day >= 2) review_due.push({ from_day: day - 1, count: 15 });
  if (day >= 4) review_due.push({ from_day: day - 3, count: 15 });
  if (day >= 7) review_due.push({ from_day: day - 6, count: 15 });

  const fname = `day${String(day).padStart(2, '0')}.md`;
  writeFm(
    path.join(PATHS.vocab.days, fname),
    { day, date, words_pushed: pushed, test, mastered_today, difficult_added, review_due, duration_min: 20 + Math.floor(Math.random() * 15) },
    '# 当天笔记\n（demo）'
  );
}
writeYaml(PATHS.vocab.difficult, difficultArr);
writeYaml(PATHS.vocab.mastered, masteredArr);
console.log(`[seed] vocab/days/ written (28 days), difficult ${difficultArr.length}, mastered ${masteredArr.length}`);

// ---------- speaking ----------

const stories = [
  { id: 1, topic_primary: 'travel',  topics_covered: ['travel', 'holiday_place', 'happy_experience', 'city_visited'],     parts: [2, 3], length_sec: 95,  status: 'recorded' },
  { id: 2, topic_primary: 'person',  topics_covered: ['friend', 'person_helped_you', 'admire'],                            parts: [2, 3], length_sec: 88,  status: 'recorded' },
  { id: 3, topic_primary: 'object',  topics_covered: ['gift', 'app', 'item_lost'],                                          parts: [2, 3], length_sec: 80,  status: 'rehearsed' },
  { id: 4, topic_primary: 'event',   topics_covered: ['success', 'decision', 'change'],                                     parts: [2, 3], length_sec: 92,  status: 'rehearsed' },
  { id: 5, topic_primary: 'media',   topics_covered: ['book', 'movie', 'tv_show'],                                          parts: [2],    length_sec: 75,  status: 'drafted' },
  { id: 6, topic_primary: 'skill',   topics_covered: ['skill_learned', 'hobby', 'sport'],                                   parts: [2, 3], length_sec: 85,  status: 'drafted' },
  { id: 7, topic_primary: 'work',    topics_covered: ['work', 'study', 'future_plan'],                                      parts: [2, 3], length_sec: 90,  status: 'rehearsed' },
];

stories.forEach((s) => {
  const fname = `story_${String(s.id).padStart(2, '0')}_${s.topic_primary}.md`;
  writeFm(
    path.join(PATHS.speaking.stories, fname),
    { ...s, created_at: dateNDaysAgo(20) },
    `# Part 2: ${s.topic_primary}\n（demo cue card）\n\n# 故事骨架\n（demo outline + keywords + sample fragments）\n\n# Part 3 追问预测\n（demo follow-ups）`
  );
});

const speakingPractice = [
  {
    date: dateNDaysAgo(18),
    part: 2,
    topic: 'travel_experience',
    response_mode: 'recording_review',
    transcript_status: 'summary',
    duration_sec: 105,
    score_source: 'ai_training_estimate',
    confidence: 'medium',
    evaluator_version: 'seed-v1.0-speaking',
    score: { fluency: 5.5, lexical: 6.0, grammar: 5.5, pronunciation: 6.0, overall: 6.0 },
    issues: [
      { dimension: 'fluency', tag: 'long_pause', severity: 'major', evidence: 'pause before key details' },
      { dimension: 'content', tag: 'weak_example', severity: 'minor' },
    ],
    next_drill: { time_budget_min: 15, action: '复述同一个故事，先用 4 个关键词控制结构。' },
  },
  {
    date: dateNDaysAgo(11),
    part: 3,
    topic: 'work_and_technology',
    response_mode: 'live_practice',
    transcript_status: 'none',
    duration_sec: 80,
    score_source: 'ai_training_estimate',
    confidence: 'medium',
    evaluator_version: 'seed-v1.0-speaking',
    score: { fluency: 6.0, lexical: 6.0, grammar: 6.0, pronunciation: 6.0, overall: 6.0 },
    issues: [
      { dimension: 'lexical', tag: 'limited_vocabulary', severity: 'minor' },
      { dimension: 'coherence', tag: 'short_answer', severity: 'major' },
    ],
    next_drill: { time_budget_min: 15, action: 'Part 3 每题补 1 个原因和 1 个具体例子。' },
  },
  {
    date: dateNDaysAgo(4),
    part: 2,
    topic: 'helpful_person',
    response_mode: 'recording_review',
    transcript_status: 'summary',
    duration_sec: 112,
    score_source: 'ai_training_estimate',
    confidence: 'medium',
    evaluator_version: 'seed-v1.0-speaking',
    score: { fluency: 6.5, lexical: 6.0, grammar: 6.0, pronunciation: 6.5, overall: 6.5 },
    issues: [
      { dimension: 'fluency', tag: 'self_correction', severity: 'minor' },
      { dimension: 'grammar', tag: 'grammar_error', severity: 'minor' },
    ],
    next_drill: { time_budget_min: 5, action: '只练开头 20 秒，减少自我修正。' },
  },
];

speakingPractice.forEach((record, index) => {
  const fname = `${record.date.replace(/-/g, '')}_part${record.part}_${record.topic}.md`;
  writeFm(
    path.join(PATHS.speaking.practice, fname),
    record,
    `# Speaking Practice ${index + 1}\n\n- 只保存复盘摘要，不保存完整逐字稿。\n- 下一步：${record.next_drill.action}\n`
  );
});

const groups = {
  groups: [
    { name: 'people',      topics: ['friend', 'family', 'teacher', 'person_helped_you', 'admire'], stories: [2] },
    { name: 'places',      topics: ['hometown', 'holiday_place', 'restaurant', 'city_visited'],   stories: [1] },
    { name: 'things',      topics: ['book', 'photo', 'gift', 'app', 'item_lost'],                  stories: [3, 5] },
    { name: 'events',      topics: ['success', 'decision', 'change', 'achievement'],               stories: [4, 7] },
    { name: 'experiences', topics: ['travel', 'learning', 'work', 'party', 'happy_experience', 'sport', 'hobby', 'skill_learned'], stories: [1, 6, 7] },
  ],
  total_topics: 37,
  covered_topics: 22,
  coverage_rate: 0.59,
};
writeYaml(PATHS.speaking.topicGroups, groups);
console.log(`[seed] speaking/stories/ written (${stories.length} files), practice ${speakingPractice.length}, topic_groups.yaml`);

console.log('\n[seed] DONE. Run `npm start` and open http://localhost:5173');
