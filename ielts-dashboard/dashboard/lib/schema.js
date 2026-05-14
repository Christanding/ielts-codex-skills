import { z } from 'zod';

function isHalfStepBand(value) {
  return typeof value === 'number' && value >= 0 && value <= 9 && Number.isInteger(value * 2);
}

function hasAiPracticeLabel(value) {
  return /AI 练习样文/i.test(value) || /AI practice/i.test(value);
}

function hasNotBandSampleLabel(value) {
  return /不是\s*band sample/i.test(value) || /not\s+(an?\s+)?band sample/i.test(value);
}

function normalizeDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function isValidIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function isRelativeDataPath(value) {
  const text = value.trim();
  if (!text || text !== value) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return false;
  if (/^[a-z]:/i.test(text)) return false;
  if (text.startsWith('/') || text.startsWith('\\')) return false;
  const parts = text.split(/[\\/]+/);
  return parts.every((part) => part && part !== '..');
}

const isoDate = z.string().refine(isValidIsoDate, 'date must use a real YYYY-MM-DD date');
const dateString = z.preprocess(normalizeDate, isoDate);
const optionalDateString = z.preprocess(normalizeDate, isoDate.optional());
const nullableDateString = z.preprocess(normalizeDate, isoDate.nullable().optional());
const relativePathString = z.string().refine(
  isRelativeDataPath,
  'source file must be a relative path without URL, drive, absolute path, or parent traversal'
);
const bandScore = z.number().refine(isHalfStepBand, 'score must be 0-9 in 0.5 steps');
const nullableBandScore = bandScore.nullable().optional();
const scoreSourceSchema = z.enum([
  'official_test',
  'official_practice',
  'teacher_estimate',
  'ai_training_estimate',
  'self_reported',
  'reading_passage_conversion',
  'listening_conversion',
  'legacy_unknown',
]).default('legacy_unknown');
const confidenceSchema = z.enum(['low', 'medium', 'high']).default('low');
const evaluatorVersionSchema = z.string().min(1).nullable().default(null);
const scoreMetaShape = {
  score_source: scoreSourceSchema,
  confidence: confidenceSchema,
  evaluator_version: evaluatorVersionSchema,
};
const requiredSpeakingScoreSourceSchema = z.enum([
  'teacher_estimate',
  'ai_training_estimate',
  'self_reported',
  'legacy_unknown',
]);
const requiredConfidenceSchema = z.enum(['low', 'medium', 'high']);
const requiredEvaluatorVersionSchema = z.string().min(1);
const stableTagSchema = z.string().min(1).regex(
  /^[a-z][a-z0-9_]*$/,
  'tag must be lowercase snake_case, e.g. long_pause'
);

const score4 = z.object({
  l: nullableBandScore,
  r: nullableBandScore,
  w: nullableBandScore,
  s: nullableBandScore,
});

export const profileSchema = z.object({
  goal_band: bandScore,
  exam_date: nullableDateString,
  created_at: optionalDateString,
  current: score4,
  weekly_hours: z.number().optional(),
  focus: z.array(z.string()).optional(),
});

export const scoreRecordSchema = z.object({
  date: dateString,
  type: z.enum(['mock', 'real', 'partial', 'diagnose']),
  l: nullableBandScore,
  r: nullableBandScore,
  w: nullableBandScore,
  s: nullableBandScore,
  overall: nullableBandScore,
  source: z.string().optional(),
  ...scoreMetaShape,
});

export const scoresSchema = z.object({
  records: z.array(scoreRecordSchema),
});

export const writingSubmissionSchema = z.object({
  date: dateString,
  task: z.union([z.literal(1), z.literal(2)]),
  topic: z.string(),
  ...scoreMetaShape,
  score: z.object({
    tr: bandScore,
    cc: bandScore,
    lr: bandScore,
    ga: bandScore,
    overall: bandScore,
  }),
  errors: z.array(z.object({
    type: z.string(),
    tag: z.string(),
    count: z.number(),
  })).default([]),
  duration_min: z.number().optional(),
  word_count: z.number().optional(),
});

const nullableString = z.string().nullable().optional();
const nullableBand = nullableBandScore;
const bandSourceSchema = z
  .enum(['official_reported', 'examiner_reported', 'teacher_reported', 'user_reported'])
  .nullable()
  .optional();

export const writingCorpusSchema = z.object({
  date: dateString,
  task: z.union([z.literal(1), z.literal(2)]),
  topic: z.string(),
  topic_tags: z.array(z.string()).default([]),
  source_type: z.enum(['official_sample', 'published_sample', 'user_sample', 'ai_generated']),
  content_origin: z.enum(['user_provided_text', 'source_excerpt', 'ai_generated_text']),
  body_status: z.enum(['full_text', 'excerpt_only', 'metadata_only']),
  source_ref: z.string(),
  page_or_url: nullableString,
  test_id: nullableString,
  band: nullableBand,
  band_source: bandSourceSchema,
  target_band: nullableBand,
  word_count: z.number().nullable().optional(),
  criteria_focus: z.array(z.string()).default([]),
  related_error_tags: z.array(z.string()).default([]),
  display_label: z.string(),
  lexical_chunks: z.array(z.object({
    phrase: z.string(),
    function: z.string().optional(),
    do_not_copy: z.boolean().default(true),
    caution: z.string().optional(),
  })).default([]),
}).superRefine((data, ctx) => {
  const sourceRef = data.source_ref?.trim();
  const pageOrUrl = data.page_or_url?.trim();
  const testId = data.test_id?.trim();
  const hasBand = data.band !== null && data.band !== undefined;
  const hasBandSource = data.band_source !== null && data.band_source !== undefined;
  const hasTargetBand = data.target_band !== null && data.target_band !== undefined;

  if (!sourceRef) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source_ref'], message: 'source_ref is required' });
  }

  if (['official_sample', 'published_sample'].includes(data.source_type)) {
    if (data.content_origin === 'ai_generated_text') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content_origin'],
        message: 'official/published corpus cannot use ai_generated_text',
      });
    }
    if (!pageOrUrl && !testId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['page_or_url'],
        message: 'official/published corpus requires page_or_url or test_id',
      });
    }
  }

  if (data.source_type === 'official_sample' && /^cam\d+/i.test(sourceRef || '') && !testId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['test_id'],
      message: 'official Cambridge corpus requires stable test_id',
    });
  }

  if (testId && /^cam/i.test(testId) && !/^cam\d+-test\d+-task[12]$/i.test(testId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['test_id'],
      message: 'Cambridge test_id should look like cam18-test1-task2',
    });
  }

  if (data.content_origin === 'ai_generated_text' && data.source_type !== 'ai_generated') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['source_type'],
      message: 'ai_generated_text requires source_type ai_generated',
    });
  }

  if (data.source_type === 'ai_generated') {
    if (data.content_origin !== 'ai_generated_text') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content_origin'],
        message: 'ai_generated corpus requires content_origin ai_generated_text',
      });
    }
    if (!hasTargetBand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target_band'],
        message: 'ai_generated corpus requires target_band',
      });
    }
    if (hasBand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['band'],
        message: 'ai_generated corpus cannot have band',
      });
    }
    const label = data.display_label || '';
    if (!hasAiPracticeLabel(label) || !hasNotBandSampleLabel(label)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['display_label'],
        message: 'ai_generated corpus label must say it is an AI practice sample and not a band sample',
      });
    }
  }

  if (!hasBand && hasBandSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['band_source'],
      message: 'band_source must be empty when band is empty',
    });
  }

  if (hasBand && !hasBandSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['band_source'],
      message: 'band_source is required when band exists',
    });
  }

  if (hasBand && !isHalfStepBand(data.band)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['band'],
      message: 'band must be 0-9 in 0.5 steps',
    });
  }

  if (hasTargetBand && !isHalfStepBand(data.target_band)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['target_band'],
      message: 'target_band must be 0-9 in 0.5 steps',
    });
  }

  data.lexical_chunks.forEach((chunk, index) => {
    if (chunk.do_not_copy !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lexical_chunks', index, 'do_not_copy'],
        message: 'lexical_chunks must set do_not_copy true',
      });
    }
  });
});

export const readingSubmissionSchema = z.object({
  date: dateString,
  source: z.string(),
  total: z.number(),
  correct: z.number(),
  accuracy: z.number(),
  band: bandScore.optional(),
  ...scoreMetaShape,
  question_types: z.array(z.object({
    type: z.string(),
    total: z.number(),
    correct: z.number(),
  })).default([]),
  errors: z.array(z.object({
    tag: z.string(),
    question: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
  })).default([]),
  synonyms_added: z.number().optional(),
  duration_min: z.number().optional(),
});

export const listeningSubmissionSchema = z.object({
  date: dateString,
  source: z.string(),
  total: z.number(),
  correct: z.number(),
  band: bandScore,
  ...scoreMetaShape,
  section_scores: z.array(z.number()).length(4).optional(),
  section_types: z.array(z.object({
    section: z.number(),
    type: z.string(),
    total: z.number(),
    correct: z.number(),
  })).default([]),
  error_types: z.array(z.object({
    tag: z.string(),
    count: z.number(),
    examples: z.array(z.string()).optional(),
  })).default([]),
  duration_min: z.number().optional(),
});

export const vocabDaySchema = z.object({
  day: z.number(),
  date: dateString,
  words_pushed: z.array(z.string()).default([]),
  test: z.object({
    total: z.number(),
    correct: z.number(),
    wrong: z.array(z.string()).default([]),
  }).nullable().optional(),
  mastered_today: z.array(z.string()).default([]),
  difficult_added: z.array(z.string()).default([]),
  review_due: z.array(z.object({
    from_day: z.number(),
    count: z.number(),
  })).default([]),
  duration_min: z.number().optional(),
});

export const storySchema = z.object({
  id: z.number(),
  topic_primary: z.string(),
  topics_covered: z.array(z.string()).default([]),
  parts: z.array(z.number()).default([2]),
  length_sec: z.number().optional(),
  status: z.enum(['drafted', 'rehearsed', 'recorded']).default('drafted'),
  created_at: optionalDateString,
});

const speakingPartSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal('mixed'),
]);
const speakingDimensionScoreSchema = z.object({
  fluency: nullableBandScore,
  lexical: nullableBandScore,
  grammar: nullableBandScore,
  pronunciation: nullableBandScore,
  overall: nullableBandScore,
});

export const speakingPracticeSchema = z.object({
  date: dateString,
  part: speakingPartSchema,
  topic: z.string(),
  prompt_ref: z.string().optional(),
  duration_sec: z.number().positive().optional(),
  response_mode: z.enum(['recording_review', 'live_practice', 'transcript_review', 'self_review']),
  transcript_status: z.enum(['none', 'excerpt', 'summary', 'full_transcript']).default('none'),
  recording_ref: relativePathString.nullable().optional(),
  score_source: requiredSpeakingScoreSourceSchema,
  confidence: requiredConfidenceSchema,
  evaluator_version: requiredEvaluatorVersionSchema,
  score: speakingDimensionScoreSchema.optional(),
  issues: z.array(z.object({
    dimension: z.enum(['fluency', 'lexical', 'grammar', 'pronunciation', 'coherence', 'content']),
    tag: stableTagSchema,
    severity: z.enum(['minor', 'major']).default('minor'),
    evidence: z.string().optional(),
  })).default([]),
  next_drill: z.object({
    time_budget_min: z.union([z.literal(5), z.literal(15), z.literal(30)]),
    action: z.string(),
  }).optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasScore = data.score && Object.values(data.score).some((value) => value !== null && value !== undefined);
  if (!hasScore && data.issues.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['issues'],
      message: 'speaking practice requires score evidence or at least one issue',
    });
  }
});

export const topicGroupsSchema = z.object({
  groups: z.array(z.object({
    name: z.string(),
    topics: z.array(z.string()),
    stories: z.array(z.number()),
  })),
  total_topics: z.number(),
  covered_topics: z.number(),
  coverage_rate: z.number(),
});

export const coachNotesSchema = z.object({
  updated_at: dateString,
  notes: z.array(z.object({
    issue_key: z.string(),
    skill: z.enum(['writing', 'reading', 'listening', 'vocab', 'speaking']),
    status: z.enum(['active', 'resolved']).default('active'),
    first_seen: optionalDateString,
    last_seen: optionalDateString,
    evidence_count: z.number().int().positive().optional(),
    source_files: z.array(relativePathString).default([]),
    action: z.string(),
  })).default([]),
});

export const closedLoopCandidateSchema = z.object({
  issue_key: z.string().min(1),
  skill: z.enum(['writing', 'reading', 'listening', 'vocab', 'speaking']),
  trigger: z.enum(['recent_3', 'current_state']),
  evidence_count: z.number().int().positive(),
  source_files: z.array(relativePathString).nonempty(),
  action: z.string().min(1),
});

export const planningSignalSchema = z.object({
  key: z.string().min(1),
  skill: z.enum(['speaking', 'vocab', 'writing', 'reading', 'listening']),
  type: z.string().min(1),
  severity: z.enum(['info', 'warning']).default('info'),
  action: z.string().min(1),
});

export function safeParse(schema, data, file) {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  return {
    ok: false,
    file,
    issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  };
}
