import { useApi } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Empty from '../components/Empty.jsx';
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar,
} from 'recharts';
import { AXIS_TICK, CHART_COLORS, GRID_PROPS, LEGEND_PROPS, METRIC_COLORS, SMALL_AXIS_TICK, SUBJECT_COLORS, TOOLTIP_PROPS } from '../chartTheme.js';
import { LISTENING_ERROR_LABELS, LISTENING_SECTION_TYPES, chartLabel, displaySource } from '../labels.js';

export default function Listening() {
  const { data, loading } = useApi('/listening');
  if (loading) return <div className="text-slate-400">加载中…</div>;
  const subs = data?.submissions || [];
  if (!data || data.count === 0 || subs.length === 0) {
    return (
      <>
        <PageHeader title="听力" subtitle="Section 分布 + 错误标签" />
        <Empty>跑 /ielts-listening 分析一套听力，数据就出来了。</Empty>
      </>
    );
  }

  const last = subs[subs.length - 1];
  const trend = subs.map((s) => ({ date: s.date, band: s.band, correct: s.correct }));
  const sectionAvg = data.section_avg || [];
  const sectionRadar = (sectionAvg.length ? sectionAvg : [0, 0, 0, 0]).map((v, i) => ({
    section: `S${i + 1}`,
    平均: v,
    最近: last.section_scores?.[i] ?? 0,
  }));

  const typeDist = (data.type_distribution || []).map((d) => ({
    ...d,
    label: chartLabel(LISTENING_SECTION_TYPES, d.type),
    acc_pct: +(d.accuracy * 100).toFixed(1),
  }));

  const topErrors = (data.top_errors || []).slice(0, 10).map((e) => ({
    ...e,
    label: chartLabel(LISTENING_ERROR_LABELS, e.tag),
  }));

  return (
    <>
      <PageHeader
        title="听力"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="text-sm font-medium mb-3">Section 雷达（最近 vs 平均）</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={sectionRadar}>
              <PolarGrid stroke={CHART_COLORS.line} />
              <PolarAngleAxis dataKey="section" tick={AXIS_TICK} />
              <PolarRadiusAxis domain={[0, 10]} tick={SMALL_AXIS_TICK} />
              <Radar name="平均" dataKey="平均" stroke={METRIC_COLORS.neutral} fill={METRIC_COLORS.neutral} fillOpacity={0.18} />
              <Radar name="最近" dataKey="最近" stroke={SUBJECT_COLORS.listening} fill={SUBJECT_COLORS.listening} fillOpacity={0.34} />
              <Legend {...LEGEND_PROPS} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="text-sm font-medium mb-3">Band 趋势</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" tick={AXIS_TICK} />
              <YAxis domain={[4, 9]} tick={AXIS_TICK} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Line type="monotone" dataKey="band" name="听力 Band" stroke={SUBJECT_COLORS.listening} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <div className="card">
          <div className="text-sm font-medium mb-3">题型正确率</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={typeDist} margin={{ left: 10, right: 20, bottom: 40 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" tick={SMALL_AXIS_TICK} angle={-25} textAnchor="end" interval={0} height={70} />
              <YAxis domain={[0, 100]} unit="%" tick={AXIS_TICK} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="acc_pct" fill={SUBJECT_COLORS.listening} name="正确率%" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="text-sm font-medium mb-3">高频错误标签</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topErrors} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tick={AXIS_TICK} />
              <YAxis type="category" dataKey="label" tick={SMALL_AXIS_TICK} width={200} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="count" name="错误次数" fill={METRIC_COLORS.risk} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-6">
        <div className="text-sm font-medium mb-3">所有套数</div>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left p-2">日期</th>
              <th className="text-left p-2">来源</th>
              <th className="text-right p-2">对题</th>
              <th className="text-right p-2">Band</th>
              <th className="text-right p-2" title="Section 1 社交场景">S1</th>
              <th className="text-right p-2" title="Section 2 独白介绍">S2</th>
              <th className="text-right p-2" title="Section 3 学术讨论">S3</th>
              <th className="text-right p-2" title="Section 4 学术讲座">S4</th>
            </tr>
          </thead>
          <tbody>
            {[...subs].reverse().map((s, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2">{s.date}</td>
                <td className="p-2 text-slate-600">{displaySource(s.source)}</td>
                <td className="p-2 text-right">{s.correct}/40</td>
                <td className="p-2 text-right font-semibold">{s.band}</td>
                {[0, 1, 2, 3].map((j) => (
                  <td key={j} className="p-2 text-right">{s.section_scores?.[j] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="text-sm text-slate-500 mt-2">
          S1 日常对话 · S2 独白介绍 · S3 学术讨论 · S4 学术讲座
        </div>
      </div>
    </>
  );
}
