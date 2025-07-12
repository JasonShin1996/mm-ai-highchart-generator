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