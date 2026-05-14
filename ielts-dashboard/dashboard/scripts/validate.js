#!/usr/bin/env node
/**
 * Validate connected V1.0 data sources in ~/.ielts/.
 * Exits 0 if clean, 1 if any issues. Prints a colored report.
 */

import { loadSnapshot } from '../lib/scanner.js';
import { IELTS_HOME } from '../lib/paths.js';

console.log(`[validate] target: ${IELTS_HOME}`);
console.log('[validate] checks: submissions, speaking practice, writing corpus, optional coach_notes.md');
const snap = loadSnapshot();
const issues = snap.issues || [];
const warnings = snap.warnings || [];

if (issues.length === 0) {
  console.log('[validate] ✓ Connected data sources pass schema/frontmatter checks.');
  if (warnings.length > 0) {
    console.log(`[validate] ${warnings.length} warning(s): legacy score metadata missing; treated as legacy_unknown/low/null.\n`);
    for (const it of warnings) {
      console.log(`  ${it.file}`);
      console.log(`    ! ${it.warning}`);
    }
  }
  process.exit(0);
}

console.log(`[validate] ✗ ${issues.length} issue(s) found:\n`);
for (const it of issues) {
  console.log(`  ${it.file}`);
  console.log(`    → ${it.error}`);
}
console.log(`\n[validate] Fix the frontmatter or rerun the responsible skill to regenerate.`);
process.exit(1);
