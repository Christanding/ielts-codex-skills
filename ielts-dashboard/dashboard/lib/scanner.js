import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { PATHS, exists } from './paths.js';
import { buildClosedLoopOutputs } from './closedLoop.js';
import { loadWritingCorpus } from './corpus.js';
import {
  profileSchema,
  scoresSchema,
  writingSubmissionSchema,
  readingSubmissionSchema,
  listeningSubmissionSchema,
  vocabDaySchema,
  storySchema,
  speakingPracticeSchema,
  topicGroupsSchema,
  coachNotesSchema,
  safeParse,
} from './schema.js';

export function createScanContext() {
  return { issues: [], warnings: [] };
}

export function pushIssue(ctx, file, error) {
  ctx.issues.push({ file: path.relative(PATHS.root, file), error });
}

export function pushWarning(ctx, file, warning) {
  ctx.warnings.push({ file: path.relative(PATHS.root, file), warning });
}

function warnMissingScoreMeta(ctx, file, data, label = 'frontmatter') {
  const missing = ['score_source', 'confidence', 'evaluator_version']
    .filter((key) => !Object.prototype.hasOwnProperty.call(data || {}, key));
  if (missing.length === 0) return;
  pushWarning(
    ctx,
    file,
    `${label} missing score metadata: ${missing.join(', ')}; treated as legacy_unknown/low/null`
  );
}

function readFm(ctx, file) {
  if (!exists(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    return parsed.data;
  } catch (e) {
    pushIssue(ctx, file, `parse error: ${e.message}`);
    return null;
  }
}

function readYaml(ctx, file) {
  if (!exists(file)) return null;
  try {
    return yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    pushIssue(ctx, file, `yaml parse error: ${e.message}`);
    return null;
  }
}

function listFiles(dir, ext) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f))
    .sort();
}

function validate(ctx, schema, data, file) {
  const r = safeParse(schema, data, file);
  if (!r.ok) {
    pushIssue(ctx, file, r.issues.map((i) => `${i.path}: ${i.message}`).join('; '));
    return null;
  }
  return r.data;
}

// ---------- profile ----------

export function loadProfile(ctx = createScanContext()) {
  const fm = readFm(ctx, PATHS.profile);
  if (!fm) return null;
  return validate(ctx, profileSchema, fm, PATHS.profile);
}

// ---------- scores ----------

export function loadScores(ctx = createScanContext()) {
  const fm = readFm(ctx, PATHS.scores);
  if (!fm) return { records: [] };
  if (Array.isArray(fm.records)) {
    fm.records.forEach((record, index) => warnMissingScoreMeta(ctx, PATHS.scores, record, `records[${index}]`));
  }
  const r = validate(ctx, scoresSchema, fm, PATHS.scores);
  return r || { records: [] };
}

// ---------- coach notes ----------

export function loadCoachNotes(ctx = createScanContext()) {
  const fm = readFm(ctx, PATHS.coachNotes);
  if (!fm) return null;
  return validate(ctx, coachNotesSchema, fm, PATHS.coachNotes);
}

// ---------- writing ----------

function averageWritingScore(submissions) {
  if (submissions.length === 0) return null;
  const keys = ['tr', 'cc', 'lr', 'ga', 'overall'];
  return Object.fromEntries(keys.map((key) => [
    key,
    +(submissions.reduce((sum, item) => sum + (item.score?.[key] || 0), 0) / submissions.length).toFixed(2),
  ]));
}

function normalizeWritingErrorType(type) {
  if (type === 'cohesion' || type === 'coherence') return 'coherence_cohesion';
  return type;
}

export function loadWriting(ctx = createScanContext(), { includeCorpus = true } = {}) {
  const files = listFiles(PATHS.writing.submissions, '.md');
  const submissions = [];
  for (const f of files) {
    const fm = readFm(ctx, f);
    if (!fm) continue;
    warnMissingScoreMeta(ctx, f, fm);
    const v = validate(ctx, writingSubmissionSchema, fm, f);
    if (v) submissions.push({ ...v, file: path.basename(f) });
  }
  submissions.sort((a, b) => a.date.localeCompare(b.date));

  const errorAgg = {};
  for (const s of submissions) {
    for (const e of s.errors) {
      const key = `${normalizeWritingErrorType(e.type)}:${e.tag}`;
      errorAgg[key] = (errorAgg[key] || 0) + e.count;
    }
  }
  const topErrors = Object.entries(errorAgg)
    .map(([key, count]) => {
      const [type, tag] = key.split(':');
      return { type, tag, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const result = {
    submissions,
    top_errors: topErrors,
    count: submissions.length,
    average_score: averageWritingScore(submissions),
  };

  if (includeCorpus) {
    const corpus = loadWritingCorpus(ctx, { topErrors });
    result.corpus_summary = corpus.corpus_summary;
    result.corpus_recommendations = corpus.corpus_recommendations;
  }

  return result;
}

// ---------- reading ----------

export function loadReading(ctx = createScanContext()) {
  const files = listFiles(PATHS.reading.submissions, '.md');
  const submissions = [];
  for (const f of files) {
    const fm = readFm(ctx, f);
    if (!fm) continue;
    warnMissingScoreMeta(ctx, f, fm);
    const v = validate(ctx, readingSubmissionSchema, fm, f);
    if (v) submissions.push({ ...v, file: path.basename(f) });
  }
  submissions.sort((a, b) => a.date.localeCompare(b.date));

  const typeAgg = {};
  for (const s of submissions) {
    for (const qt of s.question_types) {
      if (!typeAgg[qt.type]) typeAgg[qt.type] = { total: 0, correct: 0 };
      typeAgg[qt.type].total += qt.total;
      typeAgg[qt.type].correct += qt.correct;
    }
  }
  const typeDistribution = Object.entries(typeAgg)
    .map(([type, v]) => ({
      type,
      total: v.total,
      correct: v.correct,
      accuracy: v.total ? +(v.correct / v.total).toFixed(3) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const errorAgg = {};
  for (const s of submissions) {
    for (const e of s.errors) {
      errorAgg[e.tag] = (errorAgg[e.tag] || 0) + 1;
    }
  }
  const topErrors = Object.entries(errorAgg)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    submissions,
    question_type_distribution: typeDistribution,
    top_errors: topErrors,
    count: submissions.length,
  };
}

export function loadSynonyms(ctx = createScanContext()) {
  const files = listFiles(PATHS.reading.synonyms, '.yaml');
  const all = [];
  for (const f of files) {
    const data = readYaml(ctx, f);
    if (!Array.isArray(data)) continue;
    for (const item of data) {
      if (item && item.original && item.paraphrase) {
        all.push({
          original: item.original,
          paraphrase: item.paraphrase,
          source: item.source || path.basename(f, '.yaml'),
          context: item.context || null,
        });
      }
    }
  }
  return { items: all, count: all.length };
}

// ---------- listening ----------

export function loadListening(ctx = createScanContext()) {
  const files = listFiles(PATHS.listening.submissions, '.md');
  const submissions = [];
  for (const f of files) {
    const fm = readFm(ctx, f);
    if (!fm) continue;
    warnMissingScoreMeta(ctx, f, fm);
    const v = validate(ctx, listeningSubmissionSchema, fm, f);
    if (v) submissions.push({ ...v, file: path.basename(f) });
  }
  submissions.sort((a, b) => a.date.localeCompare(b.date));

  const sectionAgg = [0, 0, 0, 0];
  const sectionCount = [0, 0, 0, 0];
  for (const s of submissions) {
    if (Array.isArray(s.section_scores)) {
      for (let i = 0; i < 4; i++) {
        sectionAgg[i] += s.section_scores[i] || 0;
        sectionCount[i] += 1;
      }
    }
  }
  const sectionAvg = sectionAgg.map((sum, i) =>
    sectionCount[i] ? +(sum / sectionCount[i]).toFixed(2) : 0
  );

  const typeAgg = {};
  for (const s of submissions) {
    for (const st of s.section_types || []) {
      if (!typeAgg[st.type]) typeAgg[st.type] = { total: 0, correct: 0 };
      typeAgg[st.type].total += st.total;
      typeAgg[st.type].correct += st.correct;
    }
  }
  const typeDistribution = Object.entries(typeAgg)
    .map(([type, v]) => ({
      type,
      total: v.total,
      correct: v.correct,
      accuracy: v.total ? +(v.correct / v.total).toFixed(3) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const errorAgg = {};
  for (const s of submissions) {
    for (const e of s.error_types || []) {
      errorAgg[e.tag] = (errorAgg[e.tag] || 0) + e.count;
    }
  }
  const topErrors = Object.entries(errorAgg)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    submissions,
    section_avg: sectionAvg,
    type_distribution: typeDistribution,
    top_errors: topErrors,
    count: submissions.length,
  };
}

// ---------- vocab ----------

export function loadVocab(ctx = createScanContext()) {
  const files = listFiles(PATHS.vocab.days, '.md');
  const days = [];
  for (const f of files) {
    const fm = readFm(ctx, f);
    if (!fm) continue;
    const v = validate(ctx, vocabDaySchema, fm, f);
    if (v) days.push({ ...v, file: path.basename(f) });
  }
  days.sort((a, b) => a.day - b.day);

  const difficult = readYaml(ctx, PATHS.vocab.difficult);
  const mastered = readYaml(ctx, PATHS.vocab.mastered);

  const totalPushed = days.reduce((s, d) => s + (d.words_pushed?.length || 0), 0);
  const totalMastered = Array.isArray(mastered) ? mastered.length : 0;
  const totalDifficult = Array.isArray(difficult) ? difficult.length : 0;

  const recentTests = days.filter((d) => d.test && d.test.total > 0).slice(-7);
  const recentAvg =
    recentTests.length > 0
      ? +(
          recentTests.reduce((s, d) => s + d.test.correct / d.test.total, 0) /
          recentTests.length
        ).toFixed(3)
      : null;

  return {
    days,
    difficult: Array.isArray(difficult) ? difficult : [],
    mastered: Array.isArray(mastered) ? mastered : [],
    summary: {
      current_day: days.length ? days[days.length - 1].day : 0,
      total_pushed: totalPushed,
      total_mastered: totalMastered,
      total_difficult: totalDifficult,
      recent_test_accuracy: recentAvg,
    },
  };
}

// ---------- speaking ----------

export function loadSpeaking(ctx = createScanContext()) {
  const files = listFiles(PATHS.speaking.stories, '.md');
  const stories = [];
  for (const f of files) {
    const fm = readFm(ctx, f);
    if (!fm) continue;
    const v = validate(ctx, storySchema, fm, f);
    if (v) stories.push({ ...v, file: path.basename(f) });
  }

  const practiceFiles = listFiles(PATHS.speaking.practice, '.md');
  const practice = [];
  for (const f of practiceFiles) {
    const basename = path.basename(f);
    const nameMatch = /^(\d{8})_part([123]|mixed)_([a-z][a-z0-9_]*)\.md$/.exec(basename);
    if (!nameMatch) {
      pushIssue(ctx, f, 'filename must match YYYYMMDD_partN_topic.md');
      continue;
    }
    const fm = readFm(ctx, f);
    if (!fm) continue;
    const v = validate(ctx, speakingPracticeSchema, fm, f);
    if (v) {
      const [, rawDate, rawPart, rawTopic] = nameMatch;
      const fileDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const filePart = rawPart === 'mixed' ? 'mixed' : Number(rawPart);
      const mismatches = [];
      if (v.date !== fileDate) mismatches.push('date');
      if (v.part !== filePart) mismatches.push('part');
      if (v.topic !== rawTopic) mismatches.push('topic');
      if (mismatches.length) {
        pushIssue(ctx, f, `filename does not match frontmatter: ${mismatches.join(', ')}`);
        continue;
      }
      practice.push({ ...v, file: basename });
    }
  }
  practice.sort((a, b) => a.date.localeCompare(b.date));

  const issueAgg = {};
  for (const record of practice.filter((item) => item.confidence !== 'low')) {
    for (const issue of record.issues || []) {
      const key = `${issue.dimension}:${issue.tag}`;
      issueAgg[key] = (issueAgg[key] || 0) + 1;
    }
  }
  const topPracticeIssues = Object.entries(issueAgg)
    .map(([key, count]) => {
      const [dimension, tag] = key.split(':');
      return { dimension, tag, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const groupsRaw = readYaml(ctx, PATHS.speaking.topicGroups);
  let groups = null;
  if (groupsRaw) {
    const r = safeParse(topicGroupsSchema, groupsRaw, PATHS.speaking.topicGroups);
    if (r.ok) groups = r.data;
    else pushIssue(ctx, PATHS.speaking.topicGroups, r.issues.map((i) => i.message).join('; '));
  }

  return {
    stories,
    practice,
    top_practice_issues: topPracticeIssues,
    groups,
    count: stories.length,
    practice_count: practice.length,
  };
}

// ---------- snapshot (everything) ----------

export function loadSnapshot() {
  const ctx = createScanContext();
  const loaded = {
    profile: loadProfile(ctx),
    scores: loadScores(ctx),
    coach_notes: loadCoachNotes(ctx),
    writing: loadWriting(ctx),
    reading: loadReading(ctx),
    listening: loadListening(ctx),
    vocab: loadVocab(ctx),
    speaking: loadSpeaking(ctx),
    synonyms: loadSynonyms(ctx),
  };
  const { closed_loop_candidates, planning_signals } = buildClosedLoopOutputs(loaded, ctx);

  return {
    ...loaded,
    closed_loop_candidates,
    planning_signals,
    issues: ctx.issues,
    warnings: ctx.warnings,
    generated_at: new Date().toISOString(),
  };
}
