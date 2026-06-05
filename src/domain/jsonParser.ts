/**
 * LLM 回傳內容 → Highcharts 設定物件的解析工具 —— 單一來源。
 *
 * 過去 useChartGeneration.ts 與 useDatabaseChart.ts 各有一份幾乎相同的清洗/解析邏輯。
 *
 * 安全性備註：parseStringFunctions 透過 `new Function()` 把 LLM 回傳的 formatter
 * 字串轉成可執行函式，存在 prompt injection 執行任意 JS 的風險。Phase 2 將以
 * 「具名 formatter 白名單」取代此機制；此處先保留行為不變。
 */

/**
 * 從 LLM 回傳的字串中萃取出 JSON 物件字串：
 * 移除 ```json 圍欄，並擷取第一個 `{` 到最後一個 `}`。
 * 找不到有效物件時拋出錯誤。
 */
export function extractJsonObjectString(raw: string): string {
  const stripped = raw.replace(/^```json\s*/, '').replace(/```$/, '');
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  if (first === -1 || last === -1) {
    throw new Error('AI 回傳的內容中找不到有效的 JSON 物件。');
  }
  return stripped.substring(first, last + 1);
}

/**
 * 遞迴地把物件中的 formatter 字串（形如 "function(...) { ... }"）轉成實際函式。
 * 非 formatter 欄位原樣保留。
 */
export function parseStringFunctions(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => parseStringFunctions(item));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && key === 'formatter') {
      const functionPattern = /^function\s*\([^)]*\)\s*\{[\s\S]*\}$/;
      if (functionPattern.test(value.trim())) {
        try {
          const functionMatch = value
            .trim()
            .match(/^function\s*\(([^)]*)\)\s*\{([\s\S]*)\}$/);
          if (functionMatch) {
            const params = functionMatch[1].trim();
            const body = functionMatch[2].trim();
            // eslint-disable-next-line no-new-func
            result[key] = new Function(params, body);
          } else {
            result[key] = value;
          }
        } catch (error) {
          console.error(`⚠️ 無法轉換 formatter 函數 ${key}:`, error);
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = parseStringFunctions(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 一站式解析：萃取 JSON 字串 → JSON.parse → 還原 formatter 函式。
 * 回傳可直接套用的 Highcharts 設定物件。
 */
export function parseAiChartConfig(raw: string): any {
  const jsonStr = extractJsonObjectString(raw);
  const parsed = JSON.parse(jsonStr);
  return parseStringFunctions(parsed);
}
