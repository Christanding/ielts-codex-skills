#!/usr/bin/env node
/**
 * Migrate ~/.ielts/ from 旧版 layout to V1.0.
 *
 * 旧版 → V1.0 changes:
 *   - writing/index.md, writing/errors.md, reading/index.md, reading/errors.md  → DELETED (now derived from frontmatter)
 *   - reading/synonyms.md (single file)  → split into reading/synonyms/YYYYMMDD_source.yaml
 *   - vocab/progress.md (single file)    → split into vocab/days/dayNN.md
 *   - vocab/difficult.md (markdown)      → vocab/difficult.yaml (structured)
 *   - vocab/mastered.md (markdown)       → vocab/mastered.yaml (structured)
 *   - speaking/topic_groups.md           → speaking/topic_groups.yaml
 *   - submissions: try to inject frontmatter from filename + body
 *
 * This is a best-effort migration. Files that can't be auto-converted are
 * listed in migration_todo.md for manual cleanup.
 *
 * Usage:
 *   npm run migrate              # do it
 *   DRY=1 npm run migrate        # just report what would happen
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { PATHS, IELTS_HOME, ensureDirs, exists } from '../lib/paths.js';

const DRY = !!process.env.DRY;
const todo = [];
const actions = [];

function plan(action) {
  actions.push(action);
  console.log(`[plan] ${action}`);
}

function exec(fn) {
  if (!DRY) fn();
}

function backupOld(file) {
  const dst = file + '.legacy.bak';
  if (exists(file) && !exists(dst)) {
    plan(`backup ${path.relative(IELTS_HOME, file)} → .legacy.bak`);
    exec(() => fs.copyFileSync(file, dst));
  }
}

function deleteFile(file) {
  if (exists(file)) {
    plan(`delete ${path.relative(IELTS_HOME, file)}`);
    exec(() => fs.unlinkSync(file));
  }
}

ensureDirs();

console.log(`[migrate] target: ${IELTS_HOME}${DRY ? ' (DRY RUN)' : ''}\n`);

// 1. Delete deprecated aggregate files
const deprecated = [
  path.join(PATHS.writing.submissions, '..', 'index.md'),
  path.join(PATHS.writing.submissions, '..', 'errors.md'),
  path.join(PATHS.reading.submissions, '..', 'index.md'),
  path.join(PATHS.reading.submissions, '..', 'errors.md'),
];
for (const f of deprecated) {
  if (exists(f)) {
    backupOld(f);
    deleteFile(f);
  }
}

// 2. Convert reading/synonyms.md → reading/synonyms/*.yaml
const oldSyn = path.join(IELTS_HOME, 'reading', 'synonyms.md');
if (exists(oldSyn)) {
  backupOld(oldSyn);
  try {
    const raw = fs.readFileSync(oldSyn, 'utf8');
    const lines = raw.split('\n');
    const items = [];
    for (const line of lines) {
      const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)?\s*\|/);
      if (!m || /^---|^[A-Z]/.test(m[1])) continue;
      items.push({
        original: m[1].trim(),
        paraphrase: m[2].trim(),
        source: (m[3] || 'legacy').trim(),
      });
    }
    if (items.length) {
      const dst = path.join(PATHS.reading.synonyms, 'legacy.yaml');
      plan(`split synonyms.md → ${path.relative(IELTS_HOME, dst)} (${items.length} items)`);
      exec(() => fs.writeFileSync(dst, yaml.dump(items), 'utf8'));
    }
    deleteFile(oldSyn);
  } catch (e) {
    todo.push(`synonyms.md: ${e.message}`);
  }
}

// 3. Convert vocab/progress.md → days/dayNN.md (best-effort)
const oldProgress = path.join(IELTS_HOME, 'vocab', 'progress.md');
if (exists(oldProgress)) {
  backupOld(oldProgress);
  try {
    const raw = fs.readFileSync(oldProgress, 'utf8');
    // 旧版 progress.md 的列含义不固定（不同用户写的格式不一样），
    // 这里只迁移确定的字段：day / date / words_pushed_count。
    // 测试结果不能从这里推断（推词数 ≠ 测试总数），test 字段一律置 null，
    // 让用户在新的 days/dayNN.md 里手动补，或重新跑 /ielts-vocab 测试。
    const dayMatches = [...raw.matchAll(/\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)?%?\s*\|/g)];
    if (dayMatches.length) {
      for (const m of dayMatches) {
        const [, date, day, pushedCount] = m;
        const fname = `day${String(day).padStart(2, '0')}.md`;
        const dst = path.join(PATHS.vocab.days, fname);
        if (exists(dst)) continue;
        const fmObj = {
          day: Number(day),
          date,
          words_pushed: [],          // 词清单 旧版 没存，只存了数量（pushedCount）
          test: null,                // 测试结果不能从 旧版 表推断，留空让用户重跑
          mastered_today: [],
          difficult_added: [],
          review_due: [],
        };
        plan(`migrate progress.md → ${path.relative(IELTS_HOME, dst)} (推词 ${pushedCount} 个，词表与测试需手动补)`);
        exec(() => {
          const fm = yaml.dump(fmObj, { lineWidth: 120 });
          fs.writeFileSync(dst, `---\n${fm}---\n\n# 从 旧版 progress.md 迁移\n\n当天推词数（旧版 记录）：${pushedCount}\n词清单与测试结果未保留——重跑 /ielts-vocab 可以补回。\n`, 'utf8');
        });
      }
      todo.push('vocab/progress.md → days/* 已迁移，但 words_pushed 和 test 字段为空。重跑 /ielts-vocab 让 skill 重新填充。');
    }
    deleteFile(oldProgress);
  } catch (e) {
    todo.push(`progress.md: ${e.message}`);
  }
}

// 4. Convert vocab/difficult.md → difficult.yaml
const oldDifficult = path.join(IELTS_HOME, 'vocab', 'difficult.md');
if (exists(oldDifficult)) {
  backupOld(oldDifficult);
  try {
    const raw = fs.readFileSync(oldDifficult, 'utf8');
    const items = [];
    const lines = raw.split('\n');
    for (const line of lines) {
      const m = line.match(/^\|\s*([a-zA-Z][\w-]*)\s*\|\s*(\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})?\s*\|\s*(\d+)?\s*\|/);
      if (!m) continue;
      items.push({
        word: m[1],
        added_day: 1,
        review_count: Number(m[4] || 0),
        last_correct: false,
        last_review: m[3] || null,
      });
    }
    plan(`migrate difficult.md → difficult.yaml (${items.length} items)`);
    exec(() => fs.writeFileSync(PATHS.vocab.difficult, yaml.dump(items), 'utf8'));
    deleteFile(oldDifficult);
  } catch (e) {
    todo.push(`difficult.md: ${e.message}`);
  }
}

// 5. Convert vocab/mastered.md → mastered.yaml
const oldMastered = path.join(IELTS_HOME, 'vocab', 'mastered.md');
if (exists(oldMastered)) {
  backupOld(oldMastered);
  try {
    const raw = fs.readFileSync(oldMastered, 'utf8');
    const items = [];
    const lines = raw.split('\n');
    for (const line of lines) {
      const m = line.match(/^\|\s*([a-zA-Z][\w-]*)\s*\|\s*(\d{4}-\d{2}-\d{2})?\s*\|\s*([^|]+)?\s*\|/);
      if (!m) continue;
      items.push({
        word: m[1],
        mastered_day: 0,
        mastered_at: m[2] || null,
        source: (m[3] || 'legacy').trim(),
      });
    }
    plan(`migrate mastered.md → mastered.yaml (${items.length} items)`);
    exec(() => fs.writeFileSync(PATHS.vocab.mastered, yaml.dump(items), 'utf8'));
    deleteFile(oldMastered);
  } catch (e) {
    todo.push(`mastered.md: ${e.message}`);
  }
}

// 6. Convert speaking/topic_groups.md → topic_groups.yaml
const oldGroups = path.join(IELTS_HOME, 'speaking', 'topic_groups.md');
if (exists(oldGroups)) {
  backupOld(oldGroups);
  todo.push('speaking/topic_groups.md → topic_groups.yaml: needs manual conversion (free-form table). Rerun /ielts-speaking 话题分组.');
  deleteFile(oldGroups);
}

// 7. Inject frontmatter into submissions (best-effort)
function tryInjectFrontmatter(file, parser) {
  if (!exists(file)) return;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    if (parsed.data && Object.keys(parsed.data).length > 0) {
      return; // already has frontmatter
    }
    const fm = parser(file, raw);
    if (!fm) {
      todo.push(`Cannot auto-inject frontmatter: ${path.relative(IELTS_HOME, file)}`);
      return;
    }
    const out = `---\n${yaml.dump(fm, { lineWidth: 120 })}---\n\n${raw}`;
    plan(`inject frontmatter → ${path.relative(IELTS_HOME, file)}`);
    exec(() => fs.writeFileSync(file, out, 'utf8'));
  } catch (e) {
    todo.push(`${file}: ${e.message}`);
  }
}

function dirFiles(dir, ext) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
}

for (const f of dirFiles(PATHS.writing.submissions, '.md')) {
  tryInjectFrontmatter(f, (file, raw) => {
    const m = path.basename(file).match(/(\d{8})_task(\d)_(.+)\.md/);
    if (!m) return null;
    const [, ymd, task, topic] = m;
    const date = `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}`;
    const scoreM = raw.match(/(?:总分|overall)[:：\s]+([\d.]+)/i);
    const overall = scoreM ? Number(scoreM[1]) : 6.0;
    return {
      date,
      task: Number(task),
      topic,
      score_source: 'legacy_unknown',
      confidence: 'low',
      evaluator_version: null,
      score: { tr: overall, cc: overall, lr: overall, ga: overall, overall },
      errors: [],
    };
  });
}

for (const f of dirFiles(PATHS.reading.submissions, '.md')) {
  tryInjectFrontmatter(f, (file, raw) => {
    const m = path.basename(file).match(/(\d{8})_(.+)\.md/);
    if (!m) return null;
    const [, ymd, source] = m;
    const date = `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}`;
    const accM = raw.match(/(?:正确率|accuracy)[:：\s]+([\d.]+)%?/i);
    const totM = raw.match(/(?:总题数|total)[:：\s]+(\d+)/i);
    const total = totM ? Number(totM[1]) : 13;
    const accuracy = accM ? (Number(accM[1]) > 1 ? Number(accM[1]) / 100 : Number(accM[1])) : 0.7;
    const correct = Math.round(total * accuracy);
    return {
      date,
      source,
      total,
      correct,
      accuracy: +accuracy.toFixed(2),
      score_source: 'legacy_unknown',
      confidence: 'low',
      evaluator_version: null,
      question_types: [],
      errors: [],
    };
  });
}

// 8. Check existing writing corpus without inferring source/origin.
for (const f of dirFiles(PATHS.writing.corpus, '.md')) {
  try {
    const parsed = matter(fs.readFileSync(f, 'utf8'));
    const missing = ['source_type', 'content_origin', 'body_status', 'display_label']
      .filter((key) => parsed.data?.[key] === undefined || parsed.data?.[key] === null || parsed.data?.[key] === '');
    if (missing.length) {
      todo.push(`${path.relative(IELTS_HOME, f)}: missing ${missing.join(', ')}. Do not infer; review source and fill manually.`);
    }
  } catch (e) {
    todo.push(`${path.relative(IELTS_HOME, f)}: ${e.message}`);
  }
}

// Write todo
if (todo.length) {
  const todoFile = path.join(IELTS_HOME, 'migration_todo.md');
  plan(`write ${path.relative(IELTS_HOME, todoFile)} (${todo.length} items)`);
  exec(() => {
    const content = `# 旧版 → V1.0 Migration TODO\n\nGenerated: ${new Date().toISOString()}\n\n${todo.map((t) => `- [ ] ${t}`).join('\n')}\n`;
    fs.writeFileSync(todoFile, content, 'utf8');
  });
}

console.log(`\n[migrate] ${actions.length} actions ${DRY ? 'planned (dry run)' : 'executed'}.`);
console.log(`[migrate] ${todo.length} item(s) need manual attention. See migration_todo.md.`);
console.log('[migrate] Next: npm run validate');
