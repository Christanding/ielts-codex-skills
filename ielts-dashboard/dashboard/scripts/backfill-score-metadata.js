#!/usr/bin/env node
/**
 * Backfill score_source / confidence / evaluator_version for legacy V1.0 data.
 *
 * Only fills missing fields. It never changes scores, answers, errors, or body text.
 *
 * Usage:
 *   npm run backfill          # write changes
 *   DRY=1 npm run backfill    # preview only
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { IELTS_HOME, PATHS, ensureDirs, exists } from '../lib/paths.js';

const DRY = !!process.env.DRY;
const VERSION = 'legacy-backfill-v1.0';
const actions = [];

function plan(file, detail) {
  actions.push({ file: path.relative(IELTS_HOME, file), detail });
}

function listFiles(dir, ext) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(ext))
    .map((file) => path.join(dir, file))
    .sort();
}

function writeFrontmatter(file, data, body) {
  const content = body ? `\n${body.replace(/^\n+/, '')}` : '\n';
  const next = `---\n${yaml.dump(data, { lineWidth: 120 })}---${content}`;
  if (!DRY) fs.writeFileSync(file, next, 'utf8');
}

function applyMissing(target, meta) {
  let changed = false;
  for (const [key, value] of Object.entries(meta)) {
    if (Object.prototype.hasOwnProperty.call(target, key)) continue;
    target[key] = value;
    changed = true;
  }
  return changed;
}

function recordMeta(record = {}) {
  const type = String(record.type || '').toLowerCase();
  const source = String(record.source || '').toLowerCase();

  if (type === 'real' || source === 'official') {
    return { score_source: 'official_test', confidence: 'high', evaluator_version: 'official-result' };
  }
  if (type === 'diagnose' || source === 'ielts-diagnose') {
    return { score_source: 'ai_training_estimate', confidence: 'medium', evaluator_version: 'ielts-diagnose-v1.0' };
  }
  if (source.includes('user') || source.includes('self')) {
    return { score_source: 'self_reported', confidence: 'low', evaluator_version: null };
  }
  if (type === 'mock') {
    return { score_source: 'teacher_estimate', confidence: 'medium', evaluator_version: null };
  }
  return { score_source: 'legacy_unknown', confidence: 'low', evaluator_version: null };
}

function submissionMeta(kind, data = {}) {
  if (kind === 'writing') {
    return { score_source: 'ai_training_estimate', confidence: 'low', evaluator_version: null };
  }
  if (kind === 'reading') {
    return { score_source: 'reading_passage_conversion', confidence: 'medium', evaluator_version: null };
  }
  if (kind === 'listening') {
    const complete = Number(data.total) === 40 && Number.isFinite(Number(data.correct)) && Number.isFinite(Number(data.band));
    return {
      score_source: 'listening_conversion',
      confidence: complete ? 'high' : 'low',
      evaluator_version: complete ? VERSION : null,
    };
  }
  return { score_source: 'legacy_unknown', confidence: 'low', evaluator_version: null };
}

function updateFrontmatterFile(file, kind) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const meta = submissionMeta(kind, parsed.data);
  if (!applyMissing(parsed.data, meta)) return;
  plan(file, `fill ${kind} score metadata`);
  writeFrontmatter(file, parsed.data, parsed.content);
}

function updateScores() {
  if (!exists(PATHS.scores)) return;
  const raw = fs.readFileSync(PATHS.scores, 'utf8');
  const parsed = matter(raw);
  const records = Array.isArray(parsed.data.records) ? parsed.data.records : [];
  let changed = false;

  records.forEach((record, index) => {
    const didChange = applyMissing(record, recordMeta(record));
    if (didChange) plan(PATHS.scores, `fill records[${index}] score metadata`);
    changed = changed || didChange;
  });

  if (changed) writeFrontmatter(PATHS.scores, parsed.data, parsed.content);
}

ensureDirs();
console.log(`[backfill] target: ${IELTS_HOME}${DRY ? ' (DRY RUN)' : ''}`);

updateScores();

for (const file of listFiles(PATHS.writing.submissions, '.md')) {
  updateFrontmatterFile(file, 'writing');
}
for (const file of listFiles(PATHS.reading.submissions, '.md')) {
  updateFrontmatterFile(file, 'reading');
}
for (const file of listFiles(PATHS.listening.submissions, '.md')) {
  updateFrontmatterFile(file, 'listening');
}

if (actions.length === 0) {
  console.log('[backfill] Nothing to change.');
} else {
  for (const item of actions) {
    console.log(`[backfill] ${item.file}: ${item.detail}`);
  }
  console.log(`[backfill] ${actions.length} change(s) ${DRY ? 'planned.' : 'written.'}`);
}

console.log('[backfill] Next: npm run validate');
