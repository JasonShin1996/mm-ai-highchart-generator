interface BackendResponse {
  result: string;
}

// 新增：結構化的圖表建議響應接口
interface ChartSuggestionResponse {
  description: string;
  recommended_chart_type: string;
  confidence: number;
}

// 智能 API URL 檢測函數
function getBackendUrl(): string {
  let baseUrl = '';
  
  // 優先使用環境變數
  if (import.meta.env.VITE_BACKEND_URL) {
    baseUrl = import.meta.env.VITE_BACKEND_URL;
    console.log('🔗 使用環境變數 VITE_BACKEND_URL:', baseUrl);
  }
  // Zeabur 環境檢測 (如果環境變數沒設定)
  else if (typeof window !== 'undefined' && window.location.hostname.includes('.zeabur.app')) {
    // 在 Zeabur 環境但沒有環境變數 - 給出錯誤提示
    console.error('❌ 在 Zeabur 環境中但沒有設定 VITE_BACKEND_URL 環境變數！');
    console.error('請在 Zeabur 前端服務中設定 VITE_BACKEND_URL=https://mm-ai-highchart-backend.zeabur.app');
    // 嘗試使用預設的後端 URL 作為緊急回退
    baseUrl = 'https://mm-ai-highchart-backend.zeabur.app';
    console.warn('🚨 使用緊急回退 URL:', baseUrl);
  }
  // 本地開發環境
  else {
    baseUrl = 'http://localhost:8000';
    console.log('🏠 使用本地開發環境 URL:', baseUrl);
  }
  
  // 🔧 修復雙斜線問題：確保 URL 不以斜線結尾
  const finalUrl = baseUrl.replace(/\/$/, '');
  console.log('🎯 最終 API URL:', finalUrl);
  return finalUrl;
}

export async function generateChartConfig(prompt: string): Promise<string> {
  const backendUrl = getBackendUrl();
  
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

export async function generateChartSuggestion(headers: string[], dataSample: any[]): Promise<ChartSuggestionResponse> {
  const backendUrl = getBackendUrl();
  
  console.log('發送請求到:', `${backendUrl}/api/analyze-data`); // 調試
  console.log('發送的數據:', { headers, data_sample: dataSample }); // 調試
  
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

  console.log('響應狀態:', response.status, response.statusText); // 調試

  if (!response.ok) {
    let errorMessage = '數據分析 API 請求失敗';
    try {
      const errorData = await response.json();
      console.log('錯誤響應:', errorData); // 調試
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // 如果無法解析錯誤 JSON，使用預設錯誤訊息
    }
    throw new Error(`${errorMessage} (${response.status})`);
  }

  const result = await response.json();
  console.log('後端返回的原始數據:', result); // 調試
  
  // 添加格式檢查
  if (!result || typeof result !== 'object') {
    console.error('後端返回數據格式錯誤:', result);
    throw new Error('後端返回數據格式錯誤');
  }
  
  // 確保返回的數據包含必要的欄位
  const safeResult: ChartSuggestionResponse = {
    description: result.description || '請根據您的數據特性描述想要的圖表類型和樣式',
    recommended_chart_type: result.recommended_chart_type || 'column',
    confidence: result.confidence || 0.5
  };
  
  console.log('處理後的數據:', safeResult); // 調試
  return safeResult;
}

// 新增：同時生成圖表類型推薦和描述建議
interface ChartAnalysisResponse {
  recommended_chart_types: string[];
  chart_descriptions: { [key: string]: string };
  general_suggestion: string;
}

export async function generateChartAnalysis(headers: string[], dataSample: any[]): Promise<ChartAnalysisResponse> {
  const backendUrl = getBackendUrl();
  
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
  const backendUrl = getBackendUrl();
  
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
  const backendUrl = getBackendUrl();
  
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