import { useApi } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Empty from '../components/Empty.jsx';
import IssuesPanel from '../components/IssuesPanel.jsx';
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from 'recharts';
import { AMBER_SERIES, AXIS_TICK, CHART_COLORS, GRID_PROPS, LEGEND_PROPS, METRIC_COLORS, SMALL_AXIS_TICK, SUBJECT_COLORS, TOOLTIP_PROPS } from '../chartTheme.js';
import { BODY_STATUS_LABELS, WRITING_DIMENSIONS, WRITING_ERROR_LABELS, chartLabel, cnOnly, displaySlug } from '../labels.js';

const DIM = [
  { key: 'tr', label: `TR (${WRITING_DIMENSIONS.tr.cn})` },
  { key: 'cc', label: `CC (${WRITING_DIMENSIONS.cc.cn})` },
  { key: 'lr', label: `LR (${WRITING_DIMENSIONS.lr.cn})` },
  { key: 'ga', label: `GA (${WRITING_DIMENSIONS.ga.cn})` },
];

const SOURCE_TYPE_LABEL = {
  official_sample: '官方样文',
  published_sample: '公开样文',
  user_sample: '用户样文',
  ai_generated: 'AI 练习样文',
};

const WRITING_DIMENSION_COLORS = {
  tr: AMBER_SERIES[0],
  cc: AMBER_SERIES[1],
  lr: AMBER_SERIES[2],
  ga: AMBER_SERIES[3],
};

function CorpusRecommendations({ recommendations = [] }) {
  if (!recommendations.length) return null;

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">写作语料推荐</div>
        <div className="text-sm text-slate-500">只用于学习参考，不计入写作成绩</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {recommendations.map((item) => (
          <div key={item.id || item.file} className="border border-slate-100 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{displaySlug(item.topic)}</div>
                <div className="text-sm text-slate-500 mt-1">
                  Task {item.task} · {SOURCE_TYPE_LABEL[item.source_type] || item.source_type}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                {cnOnly(BODY_STATUS_LABELS, item.body_status)}
              </span>
            </div>
            <div className="text-sm text-slate-500 mt-2">{item.display_label}</div>
            {item.source_type === 'ai_generated' && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded mt-2 px-2 py-1">
                AI 练习样文，仅供学习参考，不等同官方 Band 范文。
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-3">
              {(item.matched_tags || []).map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                  匹配弱项：{cnOnly(WRITING_ERROR_LABELS, tag)}
                </span>
              ))}
              {item.target_band && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                  目标 Band {item.target_band}
                </span>
              )}
              {item.band && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                  标注 Band {item.band}
                </span>
              )}
            </div>
            {item.lexical_chunks?.length > 0 && (
              <div className="text-sm text-slate-500 mt-3">
                可观察表达：{item.lexical_chunks.slice(0, 3).map((chunk) => chunk.phrase).join(' / ')}
              </div>
            )}
            <div className="text-xs text-slate-400 mt-2" title={item.file}>
              文件：{displaySlug(String(item.file || '').replace(/\.md$/i, ''))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Writing() {
  const { data, loading } = useApi('/writing');
  if (loading) return <div className="text-slate-400">加载中…</div>;
  const subs = data?.submissions || [];
  const corpusSummary = data?.corpus_summary || { count: 0 };
  const corpusRecommendations = data?.corpus_recommendations || [];
  const issues = data?.issues || [];

  if (!data || (subs.length === 0 && !corpusSummary.count)) {
    return (
      <>
        <PageHeader title="写作" subtitle="四维评分 + 错误标签" />
        <IssuesPanel issues={issues} />
        <Empty>跑 /ielts-writing 批改一篇作文，或用“语料入库”添加写作样文，数据就出来了。</Empty>
      </>
    );
  }

  if (subs.length === 0 && corpusSummary.count > 0) {
    return (
      <>
        <PageHeader
          title="写作"
          subtitle={`${corpusSummary.count} 条写作语料`}
          hint="还没有批改记录，所以不显示分数趋势、雷达和平均分。语料只用于学习参考。"
        />
        <IssuesPanel issues={issues} />
        <div className="card">
          <div className="text-sm font-medium">还没有写作批改记录</div>
          <div className="text-sm text-slate-500 mt-1">
            下面只展示可学习语料。跑一次 /ielts-writing 批改后，四维趋势和统计才会出现。
          </div>
        </div>
        <CorpusRecommendations recommendations={corpusRecommendations} />
      </>
    );
  }

  const last = subs[subs.length - 1];
  const avg = (k) => +(subs.reduce((s, x) => s + (x.score?.[k] ?? 0), 0) / subs.length).toFixed(2);
  const radarData = DIM.map((d) => ({ dim: d.label, '最近一篇': last.score?.[d.key] ?? 0, '平均': avg(d.key) }));
  const trendData = subs.map((s) => ({ date: s.date, overall: s.score?.overall, tr: s.score?.tr, cc: s.score?.cc, lr: s.score?.lr, ga: s.score?.ga }));
  const errorData = (data.top_errors || [])
    .slice(0, 10)
    .map((e) => ({ ...e, label: chartLabel(WRITING_ERROR_LABELS, e.tag) }));

  return (
    <>
      <PageHeader
        title="写作"
      />

      <IssuesPanel issues={issues} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="text-sm font-medium mb-3">四维雷达（最近一篇 vs 平均）</div>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={CHART_COLORS.line} />
              <PolarAngleAxis dataKey="dim" tick={AXIS_TICK} />
              <PolarRadiusAxis domain={[0, 9]} tick={SMALL_AXIS_TICK} />
              <Radar name="平均" dataKey="平均" stroke={METRIC_COLORS.neutral} fill={METRIC_COLORS.neutral} fillOpacity={0.18} />
              <Radar name="最近" dataKey="最近一篇" stroke={SUBJECT_COLORS.writing} fill={SUBJECT_COLORS.writing} fillOpacity={0.34} />
              <Legend {...LEGEND_PROPS} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="text-sm font-medium mb-3">分数趋势</div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" tick={AXIS_TICK} />
              <YAxis domain={[4, 9]} tick={AXIS_TICK} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Legend {...LEGEND_PROPS} />
              <Line type="monotone" dataKey="tr" stroke={WRITING_DIMENSION_COLORS.tr} name={`TR (${WRITING_DIMENSIONS.tr.cn})`} />
              <Line type="monotone" dataKey="cc" stroke={WRITING_DIMENSION_COLORS.cc} name={`CC (${WRITING_DIMENSIONS.cc.cn})`} />
              <Line type="monotone" dataKey="lr" stroke={WRITING_DIMENSION_COLORS.lr} name={`LR (${WRITING_DIMENSIONS.lr.cn})`} />
              <Line type="monotone" dataKey="ga" stroke={WRITING_DIMENSION_COLORS.ga} name={`GA (${WRITING_DIMENSIONS.ga.cn})`} />
              <Line type="monotone" dataKey="overall" stroke={METRIC_COLORS.overall} strokeWidth={3} name="总分" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <CorpusRecommendations recommendations={corpusRecommendations} />

      <div className="card mt-6">
        <div className="text-sm font-medium mb-3">高频错误 Top 10</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={errorData} layout="vertical" margin={{ left: 40, right: 20 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis type="number" tick={AXIS_TICK} />
            <YAxis type="category" dataKey="label" tick={AXIS_TICK} width={220} />
            <Tooltip {...TOOLTIP_PROPS} />
            <Bar dataKey="count" name="出现次数" fill={METRIC_COLORS.risk} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card mt-6">
        <div className="text-sm font-medium mb-3">所有批改</div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left p-2">日期</th>
              <th className="text-left p-2">Task</th>
              <th className="text-left p-2">话题</th>
              <th className="text-right p-2" title="Task Response 审题">TR</th>
              <th className="text-right p-2" title="Coherence & Cohesion 连贯衔接">CC</th>
              <th className="text-right p-2" title="Lexical Resource 词汇">LR</th>
              <th className="text-right p-2" title="Grammar & Accuracy 语法">GA</th>
              <th className="text-right p-2">总分</th>
              <th className="text-right p-2">字数</th>
            </tr>
          </thead>
          <tbody>
            {[...subs].reverse().map((s, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2">{s.date}</td>
                <td className="p-2">T{s.task}</td>
                <td className="p-2 text-slate-600">{displaySlug(s.topic)}</td>
                <td className="p-2 text-right">{s.score.tr}</td>
                <td className="p-2 text-right">{s.score.cc}</td>
                <td className="p-2 text-right">{s.score.lr}</td>
                <td className="p-2 text-right">{s.score.ga}</td>
                <td className="p-2 text-right font-semibold">{s.score.overall}</td>
                <td className="p-2 text-right text-slate-500">{s.word_count || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="text-sm text-slate-500 mt-2">
          提示：TR = 审题 · CC = 连贯衔接 · LR = 词汇 · GA = 语法（鼠标悬停表头看完整名称）
        </div>
      </div>
    </>
  );
}
