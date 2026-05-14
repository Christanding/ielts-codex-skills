import { useState } from 'react';
import { useApi } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Empty from '../components/Empty.jsx';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { AXIS_TICK, BLUE_SERIES, GRID_PROPS, METRIC_COLORS, SMALL_AXIS_TICK, SUBJECT_COLORS, TOOLTIP_PROPS } from '../chartTheme.js';
import { READING_QUESTION_TYPES, READING_ERROR_LABELS, chartLabel, displaySource } from '../labels.js';

const PIE_COLORS = BLUE_SERIES;

function PieLegend({ data }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs text-slate-600 md:grid-cols-2">
      {data.map((item, i) => (
        <div key={item.type} className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
          <span className="truncate">{item.label}</span>
          <span className="ml-auto text-slate-400">{item.total}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reading() {
  const { data, loading } = useApi('/reading');
  const { data: synonyms } = useApi('/synonyms');
  const [q, setQ] = useState('');

  if (loading) return <div className="text-slate-400">加载中…</div>;
  const subs = data?.submissions || [];
  if (!data || data.count === 0 || subs.length === 0) {
    return (
      <>
        <PageHeader title="阅读" subtitle="正确率 + 题型分布 + 同义替换" />
        <Empty>跑 /ielts-reading 分析一篇阅读，数据就出来了。</Empty>
      </>
    );
  }

  const trend = subs.map((s) => ({ date: s.date, accuracy: +((s.accuracy ?? 0) * 100).toFixed(1), band: s.band || null }));

  const typeDist = (data.question_type_distribution || []).map((d) => ({
    ...d,
    label: chartLabel(READING_QUESTION_TYPES, d.type),
    acc_pct: +((d.accuracy ?? 0) * 100).toFixed(1),
  }));

  const topErrors = (data.top_errors || []).slice(0, 10).map((e) => ({
    ...e,
    label: chartLabel(READING_ERROR_LABELS, e.tag),
  }));

  const filteredSyn = (synonyms?.items || []).filter((s) => {
    if (!q) return true;
    const k = q.toLowerCase();
    return s.original.toLowerCase().includes(k) || s.paraphrase.toLowerCase().includes(k);
  });

  return (
    <>
      <PageHeader
        title="阅读"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="text-sm font-medium mb-3">正确率趋势</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" tick={AXIS_TICK} />
              <YAxis domain={[0, 100]} tick={AXIS_TICK} unit="%" />
              <Tooltip {...TOOLTIP_PROPS} />
              <Line type="monotone" dataKey="accuracy" stroke={SUBJECT_COLORS.reading} strokeWidth={2} dot={{ r: 3 }} name="正确率" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="text-sm font-medium mb-3">题型分布</div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={typeDist}
                dataKey="total"
                nameKey="label"
                outerRadius={82}
              >
                {typeDist.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_PROPS} />
            </PieChart>
          </ResponsiveContainer>
          <PieLegend data={typeDist} />
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
              <Bar dataKey="acc_pct" fill={SUBJECT_COLORS.reading} name="正确率%" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="text-sm font-medium mb-3">高频错误 Top 10</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topErrors} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tick={AXIS_TICK} />
              <YAxis type="category" dataKey="label" tick={SMALL_AXIS_TICK} width={220} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Bar dataKey="count" name="错误次数" fill={METRIC_COLORS.risk} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-medium">同义替换库（{filteredSyn.length} / {synonyms?.count || 0}）</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 original / paraphrase…"
            className="w-full rounded-md border border-slate-200 px-3 py-1 text-sm md:w-64"
          />
        </div>
        <div className="table-scroll max-h-96">
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-xs uppercase sticky top-0 bg-white">
              <tr>
                <th className="text-left p-2">题目用词 (original)</th>
                <th className="text-left p-2">原文用词 (paraphrase)</th>
                <th className="text-left p-2">出处</th>
                <th className="text-left p-2">语境</th>
              </tr>
            </thead>
            <tbody>
              {filteredSyn.slice(0, 200).map((s, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{s.original}</td>
                  <td className="p-2 text-emerald-700">{s.paraphrase}</td>
                  <td className="p-2 text-slate-500">{displaySource(s.source)}</td>
                  <td className="p-2 text-slate-500">{s.context || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSyn.length > 200 && <div className="text-sm text-slate-500 mt-2">前 200 条已显示，输入关键词缩小范围。</div>}
      </div>
    </>
  );
}
