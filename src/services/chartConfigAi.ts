import { parseAiChartConfig } from '@/domain/jsonParser';
import { generateChartConfig } from '@/services/gemini';

export interface ConfigDiff {
  before: any;
  after: any;
}

function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target;
  if (typeof source !== 'object') return source;

  // Arrays: merge by index so partial series patches don't wipe sibling fields
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) return source;
    const result = [...target];
    source.forEach((item, i) => {
      result[i] = deepMerge(target[i], item);
    });
    return result;
  }

  if (typeof target !== 'object' || target === null || Array.isArray(target)) return source;

  const result = { ...target };
  for (const key of Object.keys(source)) {
    result[key] = deepMerge(target[key], source[key]);
  }
  return result;
}

function buildModifyPrompt(userPrompt: string, configForAi: any): string {
  return `
你是一位 Highcharts 配置專家。請根據用戶需求，修改以下現有圖表 JSON 配置。

用戶需求：${userPrompt}

現有配置：
${JSON.stringify(configForAi, null, 2)}

規則：
1. 只返回「需要修改的部分」，不要回傳整個完整配置，只需要回傳有變動的欄位（Partial JSON）
2. 不要包含 markdown 或額外說明，直接輸出 JSON 物件
3. 基本上不要包含 series.data（資料主要由系統維護），除非用戶有明確要求修改資料。
4. 例如：只改標題時，只回傳 { "title": { "text": "新標題" } }
5. 若用戶未要求修改某欄位，請不要包含該欄位
6. 不要移除 lang、credits、exporting 等系統設定
`.trim();
}

/** 依用戶 prompt 修改現有 Highcharts JSON，回傳修改前後的 ConfigDiff。 */
export async function modifyChartConfigWithAi(
  currentConfig: any,
  userPrompt: string
): Promise<ConfigDiff> {
  const configForAi = { ...currentConfig, series: currentConfig.series?.map((s: any) => ({ ...s, data: [] })) };
  const prompt = buildModifyPrompt(userPrompt, configForAi);
  const raw = await generateChartConfig(prompt);
  const patch = parseAiChartConfig(raw);

  // Deep merge patch onto current config, then restore original series.data
  let merged = deepMerge(currentConfig, patch);
  if (Array.isArray(currentConfig.series)) {
    merged = {
      ...merged,
      series: currentConfig.series.map((origSeries: any, i: number) => {
        const mergedSeries = merged.series?.[i] ?? origSeries;
        return { ...mergedSeries, data: origSeries.data };
      }),
    };
  }

  return { before: currentConfig, after: merged };
}
