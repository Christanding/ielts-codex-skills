import { useApi } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import Empty from '../components/Empty.jsx';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { AXIS_TICK, CHART_COLORS, GRID_PROPS, LEGEND_PROPS, METRIC_COLORS, TOOLTIP_PROPS, colorWithAlpha } from '../chartTheme.js';

const VOCAB_HEATMAP_COLORS = {
  low: colorWithAlpha(METRIC_COLORS.positive, 0.18),
  mid: colorWithAlpha(METRIC_COLORS.positive, 0.34),
  high: colorWithAlpha(METRIC_COLORS.positive, 0.52),
};

function calendarHeatmap(days) {
  const map = {};
  for (const d of days) {
    map[d.date] = (map[d.date] || 0) + (d.words_pushed?.length || 0);
  }
  const today = new Date();
  const cells = [];
  for (let i = 90; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    cells.push({ date: key, count: map[key] || 0 });
  }
  return cells;
}

function HeatmapGrid({ cells }) {
  const max = Math.max(...cells.map((c) => c.count), 1);
  const colorFor = (n) => {
    if (n === 0) return CHART_COLORS.line;
    const intensity = n / max;
    if (intensity < 0.25) return VOCAB_HEATMAP_COLORS.low;
    if (intensity < 0.5) return VOCAB_HEATMAP_COLORS.mid;
    if (intensity < 0.75) return VOCAB_HEATMAP_COLORS.high;
    return METRIC_COLORS.positive;
  };
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div className="flex gap-1">
      {weeks.map((week, i) => (
        <div key={i} className="flex flex-col gap-1">
          {week.map((c) => (
            <div
              key={c.date}
              title={`${c.date}: ${c.count} 词`}
              aria-label={`${c.date}: ${c.count} 个推送词`}
              className="w-3 h-3 rounded-sm"
              style={{ background: colorFor(c.count) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Vocab() {
  const { data, loading } = useApi('/vocab');
  if (loading) return <div className="text-slate-400">加载中…</div>;
  if (!data || data.days.length === 0) {
    return (
      <>
        <PageHeader title="词汇" subtitle="间隔重复 + 难词池" />
        <Empty>跑 /ielts-vocab 推送一天词汇，数据就出来了。</Empty>
      </>
    );
  }

  const days = data.days;
  const summary = data.summary;
  const stackData = days.map((d) => ({
    day: `D${d.day}`,
    pushed: d.words_pushed?.length || 0,
    mastered: d.mastered_today?.length || 0,
    difficult: d.difficult_added?.length || 0,
  }));
  const accuracyTrend = days
    .filter((d) => d.test && d.test.total > 0)
    .map((d) => ({ day: `D${d.day}`, acc: +((d.test.correct / d.test.total) * 100).toFixed(1) }));

  return (
    <>
      <PageHeader title="词汇" subtitle={`Day ${summary.current_day} · 推送 ${summary.total_pushed} · 掌握 ${summary.total_mastered}`} />

      <div className="grid gap-4">
        <div className="card">
          <div className="text-sm font-medium mb-3">最近 90 天推送热力图</div>
          <div className="overflow-x-auto pb-1">
            <HeatmapGrid cells={calendarHeatmap(days)} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>推送量：</span>
            {[
              ['0 词', CHART_COLORS.line],
              ['低', VOCAB_HEATMAP_COLORS.low],
              ['中', VOCAB_HEATMAP_COLORS.mid],
              ['高', VOCAB_HEATMAP_COLORS.high],
              ['最高', METRIC_COLORS.positive],
            ].map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <div className="card">
          <div className="text-sm font-medium mb-3">每日推送 / 掌握 / 难词</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stackData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="day" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Legend {...LEGEND_PROPS} />
              <Area type="monotone" dataKey="pushed" stackId="1" stroke={METRIC_COLORS.primary} fill={METRIC_COLORS.primary} fillOpacity={0.28} name="推送" />
              <Area type="monotone" dataKey="mastered" stackId="2" stroke={METRIC_COLORS.positive} fill={METRIC_COLORS.positive} fillOpacity={0.45} name="掌握" />
              <Area type="monotone" dataKey="difficult" stackId="3" stroke={METRIC_COLORS.risk} fill={METRIC_COLORS.risk} fillOpacity={0.32} name="难词" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="text-sm font-medium mb-3">测试正确率</div>
          {accuracyTrend.length === 0 ? (
            <div className="text-slate-400 text-sm py-12 text-center">还没测试记录</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={accuracyTrend}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="day" tick={AXIS_TICK} />
                <YAxis domain={[0, 100]} unit="%" tick={AXIS_TICK} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Line type="monotone" dataKey="acc" stroke={METRIC_COLORS.positive} strokeWidth={2} dot={{ r: 3 }} name="正确率%" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <div className="card">
          <div className="text-sm font-medium mb-3">难词池（{data.difficult.length}）</div>
          <div className="table-scroll max-h-72">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-xs uppercase sticky top-0 bg-white">
                <tr>
                  <th className="text-left p-2">词</th>
                  <th className="text-right p-2">复习次数</th>
                  <th className="text-right p-2">最后正确</th>
                  <th className="text-left p-2">最后复习</th>
                </tr>
              </thead>
              <tbody>
                {data.difficult.slice(0, 100).map((d, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2">{d.word}</td>
                    <td className="p-2 text-right">{d.review_count}</td>
                    <td className="p-2 text-right">{d.last_correct ? '✓' : '✗'}</td>
                    <td className="p-2 text-slate-500">{d.last_review || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="text-sm font-medium mb-3">已掌握（{data.mastered.length}）</div>
          <div className="max-h-72 overflow-auto">
            <div className="flex flex-wrap gap-1.5">
              {data.mastered.slice(0, 200).map((m, i) => (
                <span key={i} title={`Day ${m.mastered_day}`} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-sm">
                  {m.word}
                </span>
              ))}
            </div>
            {data.mastered.length > 200 && <div className="text-sm text-slate-500 mt-3">显示前 200 词。</div>}
          </div>
        </div>
      </div>
    </>
  );
}
