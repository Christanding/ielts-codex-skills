#!/usr/bin/env node
/**
 * Statusline output for clients that support a statusLine command.
 * Reads ~/.ielts/ and prints a single line summarizing IELTS prep state.
 *
 * Example configuration:
 *   {
 *     "statusLine": {
 *       "type": "command",
 *       "command": "node <project-path>/scripts/statusline.js"
 *     }
 *   }
 *
 * Output examples:
 *   IELTS · Day 12 · 35d → 7.5 · L:6.5 R:7.0 W:6.0↑ S:6.0
 *   IELTS · setup needed (run /ielts-diagnose)
 *   (silent if ~/.ielts/ doesn't exist)
 *
 * Uses real js-yaml (already a dashboard dep) to handle every YAML style
 * the skills emit (block, flow, nested objects, anchors, multi-line strings).
 * Cold-start cost is ~15 ms.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const IELTS_HOME = process.env.IELTS_HOME || path.join(os.homedir(), '.ielts');

function silent() {
  process.exit(0);
}

if (!fs.existsSync(IELTS_HOME)) {
  silent();
}

// Load js-yaml from the dashboard's own node_modules. The script can be invoked
// from anywhere, so resolve relative to this script.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromDashboard = createRequire(path.join(__dirname, '..', 'package.json'));

let yaml;
try {
  yaml = requireFromDashboard('js-yaml');
} catch {
  // Dashboard deps not installed yet; fail silently for statusline clients.
  silent();
}

function parseFm(file) {
  if (!fs.existsSync(file)) return null;
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    return yaml.load(m[1]) || {};
  } catch {
    return null;
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target)) return null;
  return Math.ceil((target - new Date()) / 86400000);
}

function trendArrow(curr, prev) {
  if (curr == null || prev == null) return '';
  if (curr > prev) return '↑';
  if (curr < prev) return '↓';
  return '→';
}

// ---------- profile ----------

const profile = parseFm(path.join(IELTS_HOME, 'profile.md'));
if (!profile) {
  process.stdout.write('IELTS · setup needed (run /ielts-diagnose)');
  process.exit(0);
}

// ---------- scores ----------

const scoresFm = parseFm(path.join(IELTS_HOME, 'scores.md'));
const records = (scoresFm && Array.isArray(scoresFm.records)) ? scoresFm.records : [];
const last = records[records.length - 1];
const prev = records[records.length - 2];

// ---------- vocab day ----------

let currentDay = 0;
const vocabDir = path.join(IELTS_HOME, 'vocab', 'days');
if (fs.existsSync(vocabDir)) {
  try {
    for (const f of fs.readdirSync(vocabDir)) {
      const m = f.match(/^day(\d+)\.md$/);
      if (m) currentDay = Math.max(currentDay, Number(m[1]));
    }
  } catch {
    // ignore
  }
}

// ---------- compose ----------

const parts = ['IELTS'];

if (currentDay > 0) parts.push(`Day ${currentDay}`);

const days = daysUntil(profile.exam_date);
if (days != null) {
  if (days < 0) parts.push('exam past');
  else parts.push(`${days}d → ${profile.goal_band}`);
}

const cur = last ? { l: last.l, r: last.r, w: last.w, s: last.s } : (profile.current || {});
const prv = prev ? { l: prev.l, r: prev.r, w: prev.w, s: prev.s } : {};
const subjects = ['l', 'r', 'w', 's'];
const labels = { l: 'L', r: 'R', w: 'W', s: 'S' };
const scoreParts = [];
for (const k of subjects) {
  if (cur[k] == null) continue;
  scoreParts.push(`${labels[k]}:${cur[k]}${trendArrow(cur[k], prv[k])}`);
}
if (scoreParts.length) parts.push(scoreParts.join(' '));

process.stdout.write(parts.join(' · '));
