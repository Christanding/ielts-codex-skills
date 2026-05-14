#!/usr/bin/env node
/**
 * Reset ~/.ielts/ — DELETES ALL DATA after confirmation.
 * Backs up to ~/.ielts.bak.{timestamp}/ first.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { IELTS_HOME, exists } from '../lib/paths.js';

if (!exists(IELTS_HOME)) {
  console.log(`[reset] ${IELTS_HOME} doesn't exist. Nothing to reset.`);
  process.exit(0);
}

const rl = readline.createInterface({ input: stdin, output: stdout });
const ans = await rl.question(`[reset] This will delete EVERYTHING in ${IELTS_HOME}. A backup will be made.\nType "yes" to confirm: `);
rl.close();

if (ans.trim().toLowerCase() !== 'yes') {
  console.log('[reset] Cancelled.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${IELTS_HOME}.bak.${stamp}`;
fs.cpSync(IELTS_HOME, backup, { recursive: true });
console.log(`[reset] backup → ${backup}`);

// 删除 IELTS_HOME 下的内容，但保留 IELTS_HOME 这个目录本身。
// 这样如果用户把 ~/.ielts/ 软链到了 OneDrive/Dropbox 之类，软链不会断。
for (const entry of fs.readdirSync(IELTS_HOME)) {
  fs.rmSync(path.join(IELTS_HOME, entry), { recursive: true, force: true });
}
console.log(`[reset] ${IELTS_HOME} cleared.`);
