import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS_TICK, CHART_COLORS, GRID_PROPS, LEGEND_PROPS, METRIC_COLORS, SUBJECT_COLORS, TOOLTIP_PROPS } from '../chartTheme.js';

const COLORS = {
  l: SUBJECT_COLORS.listening,
  r: SUBJECT_COLORS.reading,
  w: SUBJECT_COLORS.writing,
  s: SUBJECT_COLORS.speaking,
  overall: METRIC_COLORS.overall,
};

const NAMES = { l: '听力', r: '阅读', w: '写作', s: '口语', overall: '总分' };

export default function ScoreTrendChart({ records = [], goalBand }) {
  if (!records.length) {
    return (
      <div className="rounded-md border border-slate-200/80 px-5 py-5">
        <div className="text-sm font-medium">分数趋势</div>
        <div className="mt-3 text-sm text-slate-500">暂无成绩记录。</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200/80 px-5 py-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-medium">分数趋势</div>
        <div className="text-xs text-slate-400">{records.length} 次记录</div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={records} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" tick={AXIS_TICK} />
          <YAxis domain={[4, 9]} ticks={[4, 5, 6, 7, 8, 9]} tick={AXIS_TICK} />
          <Tooltip {...TOOLTIP_PROPS} />
          <Legend {...LEGEND_PROPS} />
          {goalBand && (
            <ReferenceLine y={goalBand} stroke={CHART_COLORS.faint} strokeDasharray="4 4" label={{ value: `目标 ${goalBand}`, ...AXIS_TICK }} />
          )}
          {['l', 'r', 'w', 's'].map((key) => (
            <Line key={key} type="monotone" dataKey={key} name={NAMES[key]} stroke={COLORS[key]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
          <Line type="monotone" dataKey="overall" name="总分" stroke={COLORS.overall} strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
