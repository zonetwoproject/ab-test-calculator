export const MDE_RELATIVE_PRESETS = [5, 10, 15, 20];
export const MDE_ABSOLUTE_PRESETS = [0.1, 0.2, 0.5, 1.0];

export const GROUP_COUNT_OPTIONS = [2, 3, 4, 5];
export const DURATION_SUGGESTIONS = [14, 21, 30];
export const FIXED_K = 1;

export const DEFAULTS = {
  duration: 14,
  dailyVisitors: '',
  groupCount: 2,
  baselinePct: '',
  mdeMode: 'relative' as const,
  mdeRelative: 5,
  mdeAbsolute: 0.1,
  confidencePct: 95,
  powerPct: 80,
};
