import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export const IELTS_HOME = process.env.IELTS_HOME || path.join(os.homedir(), '.ielts');

export const PATHS = {
  root: IELTS_HOME,
  profile: path.join(IELTS_HOME, 'profile.md'),
  scores: path.join(IELTS_HOME, 'scores.md'),
  coachNotes: path.join(IELTS_HOME, 'coach_notes.md'),
  writing: {
    submissions: path.join(IELTS_HOME, 'writing', 'submissions'),
    corpus: path.join(IELTS_HOME, 'writing', 'corpus'),
  },
  reading: {
    submissions: path.join(IELTS_HOME, 'reading', 'submissions'),
    synonyms: path.join(IELTS_HOME, 'reading', 'synonyms'),
  },
  listening: {
    submissions: path.join(IELTS_HOME, 'listening', 'submissions'),
  },
  vocab: {
    days: path.join(IELTS_HOME, 'vocab', 'days'),
    difficult: path.join(IELTS_HOME, 'vocab', 'difficult.yaml'),
    mastered: path.join(IELTS_HOME, 'vocab', 'mastered.yaml'),
  },
  speaking: {
    stories: path.join(IELTS_HOME, 'speaking', 'stories'),
    practice: path.join(IELTS_HOME, 'speaking', 'practice'),
    topicGroups: path.join(IELTS_HOME, 'speaking', 'topic_groups.yaml'),
  },
};

export function ensureDirs() {
  const dirs = [
    PATHS.writing.submissions,
    PATHS.writing.corpus,
    PATHS.reading.submissions,
    PATHS.reading.synonyms,
    PATHS.listening.submissions,
    PATHS.vocab.days,
    PATHS.speaking.stories,
    PATHS.speaking.practice,
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}
