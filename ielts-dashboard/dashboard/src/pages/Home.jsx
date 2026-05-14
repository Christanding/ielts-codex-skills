import { lazy, Suspense } from 'react';
import { useApi } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import {
  LISTENING_ERROR_LABELS,
  READING_ERROR_LABELS,
  READING_QUESTION_TYPES,
  SPEAKING_DIMENSIONS,
  SPEAKING_ISSUE_LABELS,
  WRITING_ERROR_LABELS,
  WRITING_ERROR_TYPES,
  displaySlug,
} from '../labels.js';

const ScoreTrendChart = lazy(() => import('../components/ScoreTrendChart.jsx'));

const SKILL_META = {
  writing: { label: '写作', command: '/ielts-writing' },
  reading: { label: '阅读', command: '/ielts-reading' },
  listening: { label: '听力', command: '/ielts-listening' },
  speaking: { label: '口语', command: '/ielts-speaking' },
  vocab: { label: '词汇', command: '/ielts-vocab' },
};

const TASK_ACTIONS = {
  writing: '完成 1 篇 Task 2，40 分钟限时，贴回题目、作文、用时、字数',
  reading: '完成 1 篇 passage 计时训练，贴回题型、正确率和错因',
  listening: '完成 1 套听力错题复盘，贴回 Section、题号和错误类型',
  speaking: '做 1 次 Part 2 录音复盘，贴回题目、用时和主要卡点',
  vocab: '做 15 分钟错词复习，复盘最近 wrong 列表',
};

function skillMeta(skill) {
  return SKILL_META[skill] || { label: displaySlug(skill), command: '/ielts' };
}

function labelOr(map, key, fallback) {
  return map?.[key] || fallback;
}

function issueLabel(issueKey) {
  const [skill, type, tag] = String(issueKey).split(':');
  if (skill === 'writing') {
    if (!type || !tag) return '写作复盘问题';
    return `${labelOr(WRITING_ERROR_TYPES, type, '写作维度')}：${labelOr(WRITING_ERROR_LABELS, tag, '未分类写作问题')}`;
  }
  if (skill === 'reading') {
    if (!type || !tag) return '阅读复盘问题';
    return `${labelOr(READING_QUESTION_TYPES, type, '阅读题型')}：${labelOr(READING_ERROR_LABELS, tag, '阅读错因')}`;
  }
  if (skill === 'listening') {
    const label = tag || type;
    return label ? labelOr(LISTENING_ERROR_LABELS, label, '听力错因') : '听力复盘问题';
  }
  if (skill === 'speaking') {
    if (!type || !tag) return '口语复盘问题';
    return `${labelOr(SPEAKING_DIMENSIONS, type, '口语维度')}：${labelOr(SPEAKING_ISSUE_LABELS, tag, '口语问题')}`;
  }
  if (skill === 'vocab') {
    if (type === 'test' && tag === 'low_accuracy') return '词汇测试正确率偏低';
    if (type === 'difficult_state' && tag) return `易错词：${displaySlug(tag)}`;
    if (type === 'wrong_word' && tag) return `连续错词：${displaySlug(tag)}`;
    return '词汇复习问题';
  }
  return '待复盘问题';
}

function sortedClosedLoop(candidates = []) {
  const items = Array.isArray(candidates) ? candidates : [];
  return [...items].sort((a, b) => {
    const triggerDiff = (a.trigger === 'recent_3' ? 0 : 1) - (b.trigger === 'recent_3' ? 0 : 1);
    if (triggerDiff) return triggerDiff;
    return (b.evidence_count || 0) - (a.evidence_count || 0);
  });
}

function closedLoopAction(candidate) {
  const label = issueLabel(candidate?.issue_key);
  const rawAction = String(candidate?.action || '').trim();
  if (rawAction && candidate?.skill !== 'listening' && !/[a-z]+_[a-z]+|:\w/.test(rawAction)) {
    return rawAction;
  }
  if (candidate?.skill === 'writing') {
    return `针对「${label}」重写 2 处句子或 1 段，贴回修改前后`;
  }
  if (candidate?.skill === 'reading') {
    return `针对「${label}」复盘最近错题，写出定位句和误选原因`;
  }
  if (candidate?.skill === 'listening') {
    return `针对「${label}」复盘最近错题，标出题号、原句和误听原因`;
  }
  if (candidate?.skill === 'speaking') {
    return `针对「${label}」录一段 1 分钟复述，回听后记录卡点`;
  }
  if (candidate?.skill === 'vocab') {
    if (candidate.issue_key === 'vocab:test:low_accuracy') {
      return '把每日新词量临时降到 10 个，并复盘最近三天错词';
    }
    return `针对「${label}」复习并造 1 句 IELTS 相关例句`;
  }
  return `针对「${label}」完成一次复盘`;
}

function daysUntil(date) {
  if (!date) return null;
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target - now) / 86400000);
}

function latestScore(scores) {
  if (!scores?.records?.length) return null;
  return [...scores.records]
    .filter((record) => record?.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1) || null;
}

function currentScores(profile, latest) {
  const fallback = profile?.current || {};
  return {
    l: latest?.l ?? fallback.l ?? null,
    r: latest?.r ?? fallback.r ?? null,
    w: latest?.w ?? fallback.w ?? null,
    s: latest?.s ?? fallback.s ?? null,
  };
}

function scoreSourceLabel(profile, latest, key) {
  if (latest?.[key] != null) return `最近一次记录 ${latest.date}`;
  if (profile?.current?.[key] != null) return '档案基线';
  return null;
}

function commandForFocus(focus = []) {
  const first = focus.find((item) => ['writing', 'reading', 'listening', 'speaking'].includes(item));
  return {
    writing: '/ielts-writing',
    reading: '/ielts-reading',
    listening: '/ielts-listening',
    speaking: '/ielts-speaking',
  }[first] || '/ielts';
}

function goalGapLabel(goal, overall) {
  if (overall == null) return '—';
  const gap = goal - overall;
  return gap > 0 ? `差 ${gap.toFixed(1)}` : '已达标';
}

function suggestNext(snap, topCandidate = null) {
  const s = snap;
  if (topCandidate) {
    const meta = skillMeta(topCandidate.skill);
    return {
      title: `先复盘：${issueLabel(topCandidate.issue_key)}`,
      meta: `${meta.label}反复问题`,
      command: meta.command,
      action: `15 分钟 drill：${closedLoopAction(topCandidate)}`,
      note: null,
      trend: null,
    };
  }
  if (!s?.profile) {
    return {
      title: '先做 Task 2 40 分钟',
      meta: '还没有完整四科成绩',
      command: '/ielts-writing',
      action: '写一篇 Task 2，贴回题目、作文、用时、字数',
      note: '没有完整四科成绩时，不做诊断；先完成一个最小真实入口。',
      trend: null,
    };
  }
  const goal = s.profile.goal_band;
  const latest = latestScore(s.scores);
  const c = currentScores(s.profile, latest);
  const candidates = [
    { sk: '写作', skill: 'writing', key: 'w', target: goal - 0.5, to: '/ielts-writing' },
    { sk: '阅读', skill: 'reading', key: 'r', target: goal, to: '/ielts-reading' },
    { sk: '听力', skill: 'listening', key: 'l', target: goal, to: '/ielts-listening' },
    { sk: '口语', skill: 'speaking', key: 's', target: goal - 0.5, to: '/ielts-speaking' },
  ];
  const missing = candidates.filter((item) => c[item.key] == null);
  const gaps = candidates
    .filter((item) => c[item.key] != null)
    .map((item) => ({
      ...item,
      g: item.target - c[item.key],
      source: scoreSourceLabel(s.profile, latest, item.key),
    }))
    .sort((a, b) => b.g - a.g);
  if (!gaps.length) {
    return {
      title: '先做 Task 2 40 分钟',
      meta: '四科当前分数不完整',
      command: '/ielts-writing',
      action: '写一篇 Task 2，贴回题目、作文、用时、字数',
      note: '没有可比较的四科分数时，不做主攻科目判断，也不强行诊断。',
      trend: null,
    };
  }
  if (missing.length) {
    const missingNames = missing.map((item) => item.sk).join('、');
    return {
      title: `缺少${missingNames}分数，先做 Task 2`,
      meta: '当前四科数据不完整',
      command: '/ielts-writing',
      action: '完成 Task 2 40 分钟，贴回题目、作文、用时、字数',
      note: '分数不完整时，先补一个真实训练记录，再做完整诊断。',
      trend: null,
    };
  }
  const actionable = gaps.filter((item) => item.g > 0);
  if (!actionable.length) {
    if (s.issues?.length) {
      return {
        title: '当前目标已达标',
        meta: '但存在数据校验问题',
        command: null,
        action: `先修复：${s.issues[0].file}`,
        note: '数据问题会影响后续趋势判断，优先处理。',
        trend: null,
      };
    }
    return {
      title: '当前目标已达标',
      meta: '四科已达当前目标线',
      command: commandForFocus(s.profile.focus),
      action: '完成 15 分钟保持训练，贴回训练内容和主要卡点',
      note: '保持训练用于维持手感，主攻方向仍以单科页面复盘为准。',
      trend: latest ? `近期趋势：最近记录 ${latest.date} 总分 ${latest.overall ?? '—'}，累计 ${s.scores?.records?.length ?? 0} 次成绩记录。` : null,
    };
  }
  const top = actionable[0];
  const source = top.source || '当前档案';
  return {
    title: `优先处理：${top.sk}`,
    meta: `差 ${top.g.toFixed(1)} 分 · 依据：${source}`,
    command: top.to,
    action: TASK_ACTIONS[top.skill] || `完成一轮${top.sk}训练，并贴回关键记录`,
    note: '先处理最影响目标的科目，再看记录数量。首页只给今天的主攻方向，细节回到单科页面复盘。',
    trend: latest ? `近期趋势：最近一次记录 ${latest.date} 总分 ${latest.overall ?? '—'}，累计 ${s.scores?.records?.length ?? 0} 次成绩记录。` : null,
  };
}

export default function Home() {
  const { data: snap, loading, error } = useApi('/snapshot');

  if (loading) return <div className="text-slate-400">加载中…</div>;
  if (error) return (
    <div className="text-rose-700">
      <div>加载失败：{error.message}</div>
      <div className="text-sm text-slate-500 mt-2">确认后端在 http://127.0.0.1:4000 运行（终端有没有 [server] listening 字样）。</div>
    </div>
  );
  if (!snap) return null;

  const profile = snap.profile;
  const latest = latestScore(snap.scores);
  const current = currentScores(profile, latest);
  const days = daysUntil(profile?.exam_date);
  const issues = snap.issues || [];
  const closedLoopCandidates = sortedClosedLoop(snap.closed_loop_candidates || []);
  const topClosedLoopCandidate = closedLoopCandidates[0] || null;
  const suggestion = suggestNext(snap, topClosedLoopCandidate);
  const summaryItems = [
    ['目标', profile?.goal_band ?? '—', profile?.exam_date && `考试 ${profile.exam_date}`],
    ['距离考试', days != null ? `${days} 天` : '—', days != null && days < 30 ? '冲刺期' : null],
    ['最近模考总分', latest?.overall ?? '—', latest?.date],
    ['距离目标', profile ? goalGapLabel(profile.goal_band, latest?.overall) : '—', null],
  ];
  const scoreItems = [
    ['听力', current.l],
    ['阅读', current.r],
    ['写作', current.w],
    ['口语', current.s],
  ];
  const coverageItems = [
    ['写作记录', snap.writing?.count ?? 0, '篇批改'],
    ['阅读记录', snap.reading?.count ?? 0, '次分析'],
    ['听力记录', snap.listening?.count ?? 0, null],
    ['口语复盘', snap.speaking?.practice_count ?? 0, '次记录'],
    ['背词进度', `Day ${snap.vocab?.summary?.current_day ?? 0}`, `掌握 ${snap.vocab?.summary?.total_mastered ?? 0}`],
  ];

  return (
    <>
      <PageHeader
        title="备考概览"
        subtitle={profile ? `目标 ${profile.goal_band} · 重点 ${profile.focus?.join('、') || '未设置'}` : undefined}
      />

      {profile && (
        <>
          <div className="mb-6 border-y border-slate-200/80 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              {summaryItems.map(([label, value, sub]) => (
                <div key={label} className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
                  <div className="stat-num mt-1.5 text-2xl leading-tight text-[#241f1a]">{value}</div>
                  {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
            <div className="rounded-md border border-amber-200/80 bg-[#fffaf0] px-5 py-5 shadow-[0_10px_28px_rgba(92,64,28,0.05)]">
              <div className="text-xs uppercase tracking-[0.16em] text-amber-700/80">今日训练决策</div>
              <div className="mt-3 text-xl font-semibold leading-snug text-[#241f1a] sm:text-2xl">{suggestion.title}</div>
              <div className="mt-2 text-sm text-slate-600">{suggestion.meta}</div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-amber-200/70 pt-4">
                <span className="text-xs uppercase tracking-[0.14em] text-amber-800/70">建议动作</span>
                {suggestion.command && (
                  <code className="rounded bg-white/80 px-2 py-1 text-sm text-[#241f1a] shadow-sm">{suggestion.command}</code>
                )}
                <span className="text-sm text-slate-800">{suggestion.action}</span>
              </div>
              <div className="mt-4 text-sm text-slate-600">
                {suggestion.note}
              </div>
              {suggestion.trend && (
                <div className="mt-3 text-sm text-slate-500">
                  {suggestion.trend}
                </div>
              )}
            </div>
            <div className="rounded-md border border-slate-200/80 px-4 py-4">
              <div className="text-sm font-medium mb-4">当前四科水平</div>
              <div className="divide-y divide-slate-100">
                {scoreItems.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <div className="text-sm text-slate-500">{label}</div>
                    <div className="stat-num text-xl text-[#241f1a]">{value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="mt-6">
            <Suspense fallback={<div className="rounded-md border border-slate-200/80 px-5 py-5 text-sm text-slate-400">加载分数趋势…</div>}>
              <ScoreTrendChart records={snap.scores?.records || []} goalBand={profile?.goal_band} />
            </Suspense>
          </section>

          <section className="mt-6 border-t border-slate-200 pt-5">
            <div className="text-sm font-medium mb-4">训练档案</div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {coverageItems.map(([label, value, sub]) => (
                <div key={label} className="min-w-0">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="stat-num text-xl text-[#241f1a]">{value}</span>
                    {sub && <span className="text-sm text-slate-500">{sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {issues.length > 0 && (
            <div className="card mt-6 border-rose-300 bg-rose-50">
              <div className="text-xs uppercase tracking-wider text-rose-700 mb-2">数据校验问题（{issues.length}）</div>
              <ul className="text-sm space-y-1 max-h-48 overflow-auto">
                {issues.slice(0, 20).map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <code className="text-rose-700 shrink-0">{it.file}</code>
                    <span className="text-rose-900">{it.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}
