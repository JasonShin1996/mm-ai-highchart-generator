// 獲取後端 URL
function getBackendUrl(): string {
  let baseUrl: string;
  
  // 檢查環境變數
  if (import.meta.env.VITE_BACKEND_URL) {
    baseUrl = import.meta.env.VITE_BACKEND_URL;
    console.log('🌍 使用環境變數後端 URL:', baseUrl);
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

interface DatabaseItem {
  id: string;
  name_tc: string;
  name_en: string;
  country: string;
  min_date: string;
  max_date: string;
  frequency: string;
  units: string;
  score: number;
}

interface DatabaseSearchResponse {
  items: DatabaseItem[];
}

interface TimeSeriesData {
  id: string;
  name_tc: string;
  name_en: string;
  data: any[];
}

interface DatabaseLoadResponse {
  time_series: TimeSeriesData[];
}

export async function searchDatabase(query: string): Promise<DatabaseSearchResponse> {
  const backendUrl = getBackendUrl();
  
  const response = await fetch(`${backendUrl}/api/search-database`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error('搜尋失敗');
  }

  return await response.json();
}

export async function loadDatabaseData(statIds: string[]): Promise<DatabaseLoadResponse> {
  const backendUrl = getBackendUrl();
  
  const response = await fetch(`${backendUrl}/api/load-database-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stat_ids: statIds })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`數據載入失敗 (${response.status}): ${errorData.detail || response.statusText}`);
  }

  return await response.json();
} 