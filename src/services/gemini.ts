interface BackendResponse {
  result: string;
}

export async function generateChartConfig(prompt: string): Promise<string> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  const response = await fetch(`${backendUrl}/api/generate-chart`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    let errorMessage = '後端 API 請求失敗';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // 如果無法解析錯誤 JSON，使用預設錯誤訊息
    }
    throw new Error(`${errorMessage} (${response.status})`);
  }

  const result = await response.json() as BackendResponse;
  return result.result;
}

export async function generateChartSuggestion(headers: string[], dataSample: any[]): Promise<string> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  const response = await fetch(`${backendUrl}/api/analyze-data`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ 
      headers, 
      data_sample: dataSample 
    })
  });

  if (!response.ok) {
    let errorMessage = '數據分析 API 請求失敗';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // 如果無法解析錯誤 JSON，使用預設錯誤訊息
    }
    throw new Error(`${errorMessage} (${response.status})`);
  }

  const result = await response.json() as BackendResponse;
  return result.result;
}

// 新增：同時生成圖表類型推薦和描述建議
interface ChartAnalysisResponse {
  recommended_chart_types: string[];
  chart_descriptions: { [key: string]: string };
  general_suggestion: string;
}

export async function generateChartAnalysis(headers: string[], dataSample: any[]): Promise<ChartAnalysisResponse> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  const response = await fetch(`${backendUrl}/api/analyze-chart-types`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ 
      headers, 
      data_sample: dataSample 
    })
  });

  if (!response.ok) {
    let errorMessage = '圖表類型分析 API 請求失敗';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // 如果無法解析錯誤 JSON，使用預設錯誤訊息
    }
    throw new Error(`${errorMessage} (${response.status})`);
  }

  const result = await response.json() as ChartAnalysisResponse;
  return result;
}

// 新增：根據圖表類型生成特定描述建議
export async function generateChartTypeDescription(chartType: string, headers: string[], dataSample: any[]): Promise<string> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  const response = await fetch(`${backendUrl}/api/generate-chart-description`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ 
      chart_type: chartType,
      headers, 
      data_sample: dataSample 
    })
  });

  if (!response.ok) {
    let errorMessage = '圖表描述生成 API 請求失敗';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // 如果無法解析錯誤 JSON，使用預設錯誤訊息
    }
    throw new Error(`${errorMessage} (${response.status})`);
  }

  const result = await response.json() as BackendResponse;
  return result.result;
}

// 新增：根據用戶描述推薦適合的圖表類型
export async function analyzeDescriptionForChartTypes(description: string, headers: string[], dataSample: any[]): Promise<string[]> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  const response = await fetch(`${backendUrl}/api/analyze-description`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ 
      description,
      headers, 
      data_sample: dataSample 
    })
  });

  if (!response.ok) {
    let errorMessage = '描述分析 API 請求失敗';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // 如果無法解析錯誤 JSON，使用預設錯誤訊息
    }
    throw new Error(`${errorMessage} (${response.status})`);
  }

  const result = await response.json() as { recommended_types: string[] };
  return result.recommended_types;
} 