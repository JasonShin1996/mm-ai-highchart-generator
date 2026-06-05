import { postJson } from './apiClient';

interface BackendResponse {
  result: string;
}

export interface ChartSuggestionResponse {
  description: string;
  recommended_chart_type: string;
  confidence: number;
}

/** 將自然語言 prompt 送後端生成 Highcharts 設定（回傳原始文字，待呼叫端解析）。 */
export async function generateChartConfig(prompt: string): Promise<string> {
  const result = await postJson<BackendResponse>(
    '/api/generate-chart',
    { prompt },
    '後端 API 請求失敗'
  );
  return result.result;
}

/** 依據欄位與資料樣本，請後端產生圖表描述建議與推薦圖表類型。 */
export async function generateChartSuggestion(
  headers: string[],
  dataSample: any[]
): Promise<ChartSuggestionResponse> {
  const result = await postJson<Partial<ChartSuggestionResponse>>(
    '/api/analyze-data',
    { headers, data_sample: dataSample },
    '數據分析 API 請求失敗'
  );

  return {
    description:
      result.description || '請根據您的數據特性描述想要的圖表類型和樣式',
    recommended_chart_type: result.recommended_chart_type || 'column',
    confidence: result.confidence ?? 0.5,
  };
}
