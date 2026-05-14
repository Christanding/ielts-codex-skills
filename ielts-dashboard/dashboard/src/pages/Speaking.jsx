import { useApi } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Empty from '../components/Empty.jsx';
import IssuesPanel from '../components/IssuesPanel.jsx';
import {
  SPEAKING_DIMENSIONS,
  SPEAKING_GROUP_NAMES,
  SPEAKING_ISSUE_LABELS,
  SCORE_CONFIDENCE,
  SCORE_SOURCES,
  STORY_STATUS,
  cnOnly,
  displaySlug,
} from '../labels.js';

const STATUS_COLOR = {
  drafted: 'bg-slate-100 text-slate-600',
  rehearsed: 'bg-amber-100 text-amber-700',
  recorded: 'bg-emerald-100 text-emerald-700',
};

function formatPart(part) {
  return part === 'mixed' ? 'Mixed' : `Part ${part}`;
}

function scoreValue(record, key) {
  return record?.score?.[key] ?? null;
}

function PracticeReview({ practice = [], topIssues = [] }) {
  if (!practice.length) return null;
  const latest = practice[practice.length - 1];
  const dimensionRows = ['fluency', 'lexical', 'grammar', 'pronunciation'].map((key) => ({
    key,
    label: cnOnly(SPEAKING_DIMENSIONS, key),
    value: scoreValue(latest, key),
  }));

  return (
    <div className="card mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-medium">口语表现记录</div>
          <div className="text-sm text-slate-500 mt-1">
            来自 `speaking/practice/*.md`，用于复盘练习表现；不是官方口语成绩。
          </div>
        </div>
        <div className="text-sm text-slate-500 text-right">
          <div>最近：{latest.date} · {formatPart(latest.part)} · {displaySlug(latest.topic)}</div>
          <div>
            {cnOnly(SCORE_SOURCES, latest.score_source)} · 可信度{cnOnly(SCORE_CONFIDENCE, latest.confidence)}
            {latest.evaluator_version ? ` · ${latest.evaluator_version}` : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {dimensionRows.map((item) => (
          <div key={item.key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-400">{item.label}</div>
            <div className="text-lg font-semibold text-slate-700 mt-1">{item.value ?? '—'}</div>
          </div>
        ))}
      </div>

      {topIssues.length > 0 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-2">高频表现问题</div>
          <div className="flex flex-wrap gap-2">
            {topIssues.slice(0, 8).map((issue) => (
              <span key={`${issue.dimension}:${issue.tag}`} className="text-xs px-2 py-1 rounded bg-violet-50 text-violet-700">
                {cnOnly(SPEAKING_DIMENSIONS, issue.dimension)} · {cnOnly(SPEAKING_ISSUE_LABELS, issue.tag)} × {issue.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="table-scroll mt-4">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left p-2">日期</th>
              <th className="text-left p-2">Part</th>
              <th className="text-left p-2">话题</th>
              <th className="text-right p-2">Overall</th>
              <th className="text-left p-2">来源</th>
              <th className="text-left p-2">可信度</th>
              <th className="text-left p-2">下一步</th>
            </tr>
          </thead>
          <tbody>
            {[...practice].reverse().slice(0, 20).map((record) => (
              <tr key={record.file} className="border-t border-slate-100">
                <td className="p-2">{record.date}</td>
                <td className="p-2">{formatPart(record.part)}</td>
                <td className="p-2 text-slate-600">{displaySlug(record.topic)}</td>
                <td className="p-2 text-right font-semibold">{scoreValue(record, 'overall') ?? '—'}</td>
                <td className="p-2 text-slate-500">{cnOnly(SCORE_SOURCES, record.score_source)}</td>
                <td className="p-2 text-slate-500">{cnOnly(SCORE_CONFIDENCE, record.confidence)}</td>
                <td className="p-2 text-slate-500">{record.next_drill?.action || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Speaking() {
  const { data, loading } = useApi('/speaking');
  if (loading) return <div className="text-slate-400">加载中…</div>;

  const groups = data?.groups;
  const stories = data?.stories || [];
  const practice = data?.practice || [];
  const topPracticeIssues = data?.top_practice_issues || [];
  const issues = data?.issues || [];

  if (!data || (stories.length === 0 && !groups && practice.length === 0)) {
    return (
      <>
        <PageHeader title="口语" subtitle="话题覆盖率 + 可迁移经历素材" />
        <IssuesPanel issues={issues} />
        <Empty>跑 /ielts-speaking 生成第一个核心经历素材，或做一次录音复盘后写入口语表现记录。</Empty>
      </>
    );
  }

  // 构建故事 id → 主题的映射，用来把「关联故事 #2」换成「关联故事 #2 香港之旅」之类可读文字
  const storyIndex = new Map(stories.map((s) => [s.id, displaySlug(s.topic_primary)]));

  return (
    <>
      <PageHeader
        title="口语"
      />

      <IssuesPanel issues={issues} />

      <PracticeReview practice={practice} topIssues={topPracticeIssues} />

      {groups && (
        <div className="card mt-6">
          <div className="text-sm font-medium mb-2">话题分组</div>
          <div className="text-sm text-slate-500 mb-4">
            每组展示该大类下所有雅思话题，以及你准备的哪几个故事能应对它们。
            <strong className="text-slate-600">「关联故事 #N」= 这组话题可优先用第 N 号故事改写回答。</strong>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.groups.map((g, i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-3">
                <div className="font-medium text-sm mb-1">
                  {cnOnly(SPEAKING_GROUP_NAMES, g.name)} <span className="text-slate-400 text-xs font-normal">({g.name})</span>
                </div>
                <div className="text-sm text-slate-500 mb-2">
                  关联故事（用这些故事可以答这一组）：{g.stories.length
                    ? g.stories.map((sid) => `#${sid}${storyIndex.get(sid) ? ` ${storyIndex.get(sid)}` : ''}`).join('、')
                    : '还没准备'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.topics.map((t, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 bg-slate-50 rounded" title={`雅思话题: ${t}`}>{displaySlug(t)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-6">
        <div className="text-sm font-medium mb-2">故事骨架卡片墙</div>
        <div className="text-sm text-slate-500 mb-4">
          每张卡是一个可迁移经历素材。正式回答时仍要按题目改写、扣题展开。状态：
          <span className="inline-block mx-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">初稿</span>
          <span className="inline-block mx-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">已练习</span>
          <span className="inline-block mx-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">已录音</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stories.map((s) => (
            <div key={s.id} className="border border-slate-100 rounded-lg p-3 hover:border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">#{s.id} {displaySlug(s.topic_primary)}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[s.status] || 'bg-slate-100'}`}>
                  {cnOnly(STORY_STATUS, s.status)}
                </span>
              </div>
              <div className="text-sm text-slate-500 mb-2">
                {[
                  s.length_sec ? `时长 ${s.length_sec}s` : null,
                  s.parts?.length ? `适用 Part ${s.parts.join(',')}` : null,
                ].filter(Boolean).join(' · ')}
              </div>
              <div className="text-xs text-slate-400 mb-1">可覆盖话题：</div>
              <div className="flex flex-wrap gap-1">
                {(s.topics_covered || []).map((t, i) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 bg-slate-50 rounded">{displaySlug(t)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
