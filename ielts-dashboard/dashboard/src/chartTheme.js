export const CHART_COLORS = {
  ink: '#241f1a',
  muted: '#71665d',
  faint: '#9b8f84',
  line: '#e4ddd3',
  surface: '#ffffff',
  blue: '#3b638c',
  jade: '#3f8a62',
  amber: '#b8663a',
  rose: '#c94a59',
  violet: '#7a5b9a',
};

export const SUBJECT_COLORS = {
  listening: CHART_COLORS.jade,
  reading: CHART_COLORS.blue,
  writing: CHART_COLORS.amber,
  speaking: CHART_COLORS.violet,
};

export const METRIC_COLORS = {
  primary: CHART_COLORS.amber,
  positive: CHART_COLORS.jade,
  caution: CHART_COLORS.amber,
  risk: CHART_COLORS.rose,
  support: CHART_COLORS.violet,
  overall: CHART_COLORS.ink,
  neutral: CHART_COLORS.muted,
};

export const BLUE_SERIES = [
  CHART_COLORS.blue,
  '#5d7fa3',
  '#7f9ab8',
  '#a6b8ca',
  '#cad5df',
  CHART_COLORS.muted,
  CHART_COLORS.faint,
];

export const AMBER_SERIES = [
  CHART_COLORS.amber,
  '#c77f52',
  '#d79b72',
  '#e5b894',
  CHART_COLORS.muted,
];

export function colorWithAlpha(hex, alpha) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.line,
};

export const AXIS_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.muted,
};

export const SMALL_AXIS_TICK = {
  fontSize: 10,
  fill: CHART_COLORS.muted,
};

export const TOOLTIP_PROPS = {
  contentStyle: {
    backgroundColor: CHART_COLORS.surface,
    border: `1px solid ${CHART_COLORS.line}`,
    borderRadius: 8,
    boxShadow: '0 10px 26px rgba(58, 46, 36, 0.07)',
    color: CHART_COLORS.ink,
  },
  labelStyle: {
    color: CHART_COLORS.ink,
    fontWeight: 650,
  },
  itemStyle: {
    color: CHART_COLORS.muted,
  },
};

export const LEGEND_PROPS = {
  wrapperStyle: {
    color: CHART_COLORS.muted,
    fontSize: 12,
  },
};
