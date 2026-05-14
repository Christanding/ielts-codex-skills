#!/usr/bin/env node
/**
 * Snapshot ~/.ielts/ → ~/.ielts.bak.{timestamp}/ (no compression, just cp -r).
 */

import fs from 'node:fs';
import { IELTS_HOME, exists } from '../lib/paths.js';

if (!exists(IELTS_HOME)) {
  console.log(`[backup] ${IELTS_HOME} doesn't exist. Nothing to back up.`);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${IELTS_HOME}.bak.${stamp}`;
fs.cpSync(IELTS_HOME, backup, { recursive: true });
console.log(`[backup] ${IELTS_HOME} → ${backup}`);
