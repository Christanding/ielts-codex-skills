import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { PATHS, exists } from './paths.js';
import { safeParse, writingCorpusSchema } from './schema.js';

function relativeFile(file) {
  return path.relative(PATHS.root, file);
}

function pushIssue(ctx, file, error) {
  ctx.issues.push({ file: relativeFile(file), error });
}

function listCorpusFiles() {
  if (!exists(PATHS.writing.corpus)) return [];
  return fs
    .readdirSync(PATHS.writing.corpus)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(PATHS.writing.corpus, file))
    .sort();
}

function validateCorpus(ctx, data, file) {
  const parsed = safeParse(writingCorpusSchema, data, file);
  if (parsed.ok) return parsed.data;
  pushIssue(ctx, file, parsed.issues.map((i) => `${i.path}: ${i.message}`).join('; '));
  return null;
}

function bodySize(content) {
  const text = content.trim();
  return {
    englishWords: (text.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || []).length,
    cjkChars: (text.match(/[\u4E00-\u9FFF]/g) || []).length,
  };
}

function validateBodyStatus(ctx, data, content, file) {
  if (data.body_status !== 'metadata_only') return true;
  const { englishWords, cjkChars } = bodySize(content);
  if (englishWords < 120 && cjkChars < 240) return true;

  pushIssue(
    ctx,
    file,
    'body_status metadata_only cannot include essay-length body content'
  );
  return false;
}

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = item[key] ?? null;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((a, b) => b.count - a.count || String(a[key]).localeCompare(String(b[key])));
}

function sourceRank(sourceType) {
  return {
    official_sample: 4,
    published_sample: 3,
    user_sample: 2,
    ai_generated: 1,
  }[sourceType] || 0;
}

function summarizeCorpus(items) {
  const latest = items
    .map((item) => item.date)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    count: items.length,
    by_source_type: countBy(items, 'source_type'),
    by_content_origin: countBy(items, 'content_origin'),
    by_task: countBy(items, 'task'),
    band_available_count: items.filter((item) => item.band !== null && item.band !== undefined).length,
    target_band_available_count: items.filter((item) => item.target_band !== null && item.target_band !== undefined).length,
    latest_date: latest,
  };
}

function buildRecommendations(items, topErrors = []) {
  const frequentTags = new Set(topErrors.map((err) => err.tag).filter(Boolean));
  return [...items]
    .map((item) => {
      const matchedTags = (item.related_error_tags || []).filter((tag) => frequentTags.has(tag));
      return {
        id: item.file,
        file: item.file,
        task: item.task,
        topic: item.topic,
        source_type: item.source_type,
        content_origin: item.content_origin,
        body_status: item.body_status,
        source_ref: item.source_ref,
        page_or_url: item.page_or_url ?? null,
        test_id: item.test_id ?? null,
        band: item.band ?? null,
        target_band: item.target_band ?? null,
        display_label: item.display_label,
        reason: matchedTags.length ? 'matches frequent writing errors' : 'available writing corpus reference',
        matched_tags: matchedTags,
        lexical_chunks: item.lexical_chunks || [],
        _rank: matchedTags.length * 10 + sourceRank(item.source_type),
        _date: item.date || '',
      };
    })
    .sort((a, b) => b._rank - a._rank || b._date.localeCompare(a._date) || a.file.localeCompare(b.file))
    .slice(0, 10)
    .map(({ _rank, _date, ...item }) => item);
}

export function loadWritingCorpus(ctx, { topErrors = [] } = {}) {
  const corpus = [];
  for (const file of listCorpusFiles()) {
    try {
      const parsed = matter(fs.readFileSync(file, 'utf8'));
      const data = validateCorpus(ctx, parsed.data, file);
      if (data && validateBodyStatus(ctx, data, parsed.content, file)) {
        corpus.push({ ...data, file: path.basename(file) });
      }
    } catch (error) {
      pushIssue(ctx, file, `parse error: ${error.message}`);
    }
  }

  corpus.sort((a, b) => a.date.localeCompare(b.date));
  return {
    items: corpus,
    corpus_summary: summarizeCorpus(corpus),
    corpus_recommendations: buildRecommendations(corpus, topErrors),
  };
}
