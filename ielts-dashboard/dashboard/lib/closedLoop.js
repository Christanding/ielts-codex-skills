import { closedLoopCandidateSchema, planningSignalSchema, safeParse } from './schema.js';

function sourceFiles(records, filePrefix) {
  return records
    .map((record) => record.file ? `${filePrefix}/${record.file}` : null)
    .filter(Boolean);
}

function recentByDate(records, dateKey = 'date') {
  return [...records]
    .filter((record) => record?.[dateKey])
    .sort((a, b) => String(a[dateKey]).localeCompare(String(b[dateKey])))
    .slice(-3);
}

function candidate({ issueKey, skill, trigger, records, action, filePrefix }) {
  return {
    issue_key: issueKey,
    skill,
    trigger,
    evidence_count: records.length,
    source_files: sourceFiles(records, filePrefix),
    action,
  };
}

function normalizeWritingErrorType(type) {
  if (type === 'cohesion' || type === 'coherence') return 'coherence_cohesion';
  return type || 'unknown';
}

function candidatesFromRecent(records, skill, filePrefix, issueKeysForRecord, actionForIssue) {
  const recent = recentByDate(records);
  if (recent.length < 3) return [];

  const counts = new Map();
  const evidence = new Map();
  for (const record of recent) {
    const keys = new Set(issueKeysForRecord(record));
    for (const key of keys) {
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!evidence.has(key)) evidence.set(key, []);
      evidence.get(key).push(record);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count === 3)
    .map(([issueKey]) => candidate({
      issueKey,
      skill,
      trigger: 'recent_3',
      records: evidence.get(issueKey),
      action: actionForIssue(issueKey),
      filePrefix,
    }));
}

function buildWritingCandidates(writing) {
  return candidatesFromRecent(
    writing?.submissions || [],
    'writing',
    'writing/submissions',
    (record) => (record.errors || []).map((err) => `writing:${normalizeWritingErrorType(err.type)}:${err.tag}`),
    (issueKey) => `写作训练前先检查 ${issueKey.split(':').slice(1).join(':')}，再提交批改。`
  );
}

function buildReadingCandidates(reading) {
  return candidatesFromRecent(
    reading?.submissions || [],
    'reading',
    'reading/submissions',
    (record) => (record.errors || []).map((err) => `reading:${err.type || 'unknown'}:${err.tag}`),
    (issueKey) => `阅读复盘时优先处理 ${issueKey.split(':').slice(1).join(':')}。`
  );
}

function buildListeningCandidates(listening) {
  return candidatesFromRecent(
    listening?.submissions || [],
    'listening',
    'listening/submissions',
    (record) => (record.error_types || []).map((err) => `listening:error:${err.tag}`),
    (issueKey) => `听力精听时优先复盘 ${issueKey.split(':').at(-1)}。`
  );
}

function buildVocabWrongWordCandidates(vocab) {
  const recent = [...(vocab?.days || [])]
    .filter((day) => day.test)
    .sort((a, b) => a.day - b.day)
    .slice(-3);
  if (recent.length < 3) return [];

  const wrongSets = recent.map((day) => new Set(day.test?.wrong || []));
  const common = [...wrongSets[0]].filter((word) => wrongSets.every((set) => set.has(word)));
  return common.map((word) => candidate({
    issueKey: `vocab:wrong_word:${word}`,
    skill: 'vocab',
    trigger: 'recent_3',
    records: recent,
    action: `把 ${word} 加入优先复习，下一次复习必须造句并检查拼写。`,
    filePrefix: 'vocab/days',
  }));
}

function buildVocabLowAccuracyCandidate(vocab) {
  const recent = [...(vocab?.days || [])]
    .filter((day) => day.test && day.test.total > 0)
    .sort((a, b) => a.day - b.day)
    .slice(-3);
  if (recent.length < 3) return [];
  const allLow = recent.every((day) => day.test.correct / day.test.total < 0.7);
  if (!allLow) return [];
  return [candidate({
    issueKey: 'vocab:test:low_accuracy',
    skill: 'vocab',
    trigger: 'recent_3',
    records: recent,
    action: '把每日新词量临时降到 10 个，并复盘最近三天 wrong 列表。',
    filePrefix: 'vocab/days',
  })];
}

function buildVocabDifficultStateCandidates(vocab) {
  return (vocab?.difficult || [])
    .filter((item) => item.review_count >= 3 && item.last_correct === false)
    .map((item) => ({
      issue_key: `vocab:difficult_state:${item.word}`,
      skill: 'vocab',
      trigger: 'current_state',
      evidence_count: item.review_count,
      source_files: ['vocab/difficult.yaml'],
      action: `复习 ${item.word}：先看释义，再造 1 句 IELTS 相关例句。`,
    }));
}

function buildVocabCandidates(vocab) {
  return [
    ...buildVocabWrongWordCandidates(vocab),
    ...buildVocabLowAccuracyCandidate(vocab),
    ...buildVocabDifficultStateCandidates(vocab),
  ];
}

function buildSpeakingCandidates(speaking) {
  const reliablePractice = (speaking?.practice || []).filter((record) => record.confidence !== 'low');
  return candidatesFromRecent(
    reliablePractice,
    'speaking',
    'speaking/practice',
    (record) => (record.issues || []).map((issue) => `speaking:${issue.dimension || 'unknown'}:${issue.tag}`),
    (issueKey) => `口语复盘时优先处理 ${issueKey.split(':').slice(1).join(':')}，下一次录音后再对照检查。`
  );
}

function buildSpeakingPlanningSignals(speaking) {
  const signals = [];
  const groups = speaking?.groups;
  if (groups && groups.coverage_rate < 0.8) {
    signals.push({
      key: 'speaking:coverage_gap',
      skill: 'speaking',
      type: 'coverage_gap',
      severity: 'warning',
      action: `口语话题覆盖率 ${(groups.coverage_rate * 100).toFixed(0)}%，优先补 stories 为空的 topic group。`,
    });
  }

  const drafted = (speaking?.stories || []).filter((story) => story.status === 'drafted');
  if (drafted.length >= 3) {
    signals.push({
      key: 'speaking:story_status:drafted',
      skill: 'speaking',
      type: 'story_status',
      severity: 'info',
      action: `${drafted.length} 个口语故事仍是初稿，优先录音或复述，不自动写 coach_notes。`,
    });
  }

  return signals;
}

function validateGenerated(ctx, schema, file, items) {
  return items.flatMap((item) => {
    const parsed = safeParse(schema, item, file);
    if (parsed.ok) return [parsed.data];
    if (ctx) {
      ctx.issues.push({
        file,
        error: parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '),
      });
    }
    return [];
  });
}

export function buildClosedLoopOutputs(loaded, ctx = null) {
  const candidates = [
    ...buildWritingCandidates(loaded.writing),
    ...buildReadingCandidates(loaded.reading),
    ...buildListeningCandidates(loaded.listening),
    ...buildSpeakingCandidates(loaded.speaking),
    ...buildVocabCandidates(loaded.vocab),
  ];
  const signals = [
    ...buildSpeakingPlanningSignals(loaded.speaking),
  ];

  return {
    closed_loop_candidates: validateGenerated(
      ctx,
      closedLoopCandidateSchema,
      '_generated/closed_loop_candidates',
      candidates
    ),
    planning_signals: validateGenerated(
      ctx,
      planningSignalSchema,
      '_generated/planning_signals',
      signals
    ),
  };
}
