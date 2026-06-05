import { generateMMTheme } from '@/utils/chartTheme';

// Apply MM theme to yAxis, preserving each axis's title text.
// Handles both single-object and array yAxis formats.
export function mergeYAxisWithTheme(yAxis: any, themeYAxis: any): any {
  if (Array.isArray(yAxis)) {
    return yAxis.map(axis => ({
      ...axis,
      ...themeYAxis,
      title: { ...themeYAxis.title, text: axis.title?.text ?? '' },
    }));
  }
  return {
    ...(yAxis ?? {}),
    ...themeYAxis,
    title: { ...themeYAxis.title, text: yAxis?.title?.text ?? '' },
  };
}

// Merge AI-returned yAxis config onto base yAxis, preferring AI title text when present.
export function mergeYAxisWithAI(baseYAxis: any, aiYAxis: any): any {
  if (Array.isArray(baseYAxis)) {
    return baseYAxis.map((axis, index) => {
      const aiConfig = Array.isArray(aiYAxis) ? (aiYAxis[index] ?? {}) : {};
      const text = aiConfig?.title?.text || axis.title?.text || '';
      return { ...axis, ...aiConfig, title: { ...axis.title, ...aiConfig?.title, text } };
    });
  }
  const text = aiYAxis?.title?.text || baseYAxis?.title?.text || '';
  return {
    ...(baseYAxis ?? {}),
    ...(aiYAxis ?? {}),
    title: { ...baseYAxis?.title, ...aiYAxis?.title, text },
  };
}

// Apply the full MM theme to a Highcharts options object.
export function applyMMTheme(
  options: any,
  size: 'standard' | 'large' | 'square' = 'standard'
): { theme: ReturnType<typeof generateMMTheme>; base: any } {
  const theme = generateMMTheme(size, options);
  const base = {
    ...options,
    lang: theme.lang,
    colors: theme.colors,
    chart: { ...options.chart, ...theme.chart },
    title: { ...options.title, style: theme.title.style },
    subtitle: { ...theme.subtitle },
    xAxis: {
      ...(Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis),
      ...theme.xAxis,
    },
    yAxis: mergeYAxisWithTheme(options.yAxis, theme.yAxis),
    // caller legend（位置、enabled 等）先鋪，主題 itemStyle 後蓋確保品牌樣式
    legend: { ...options.legend, ...theme.legend },
    credits: theme.credits,
    exporting: theme.exporting,
  };
  return { theme, base };
}
