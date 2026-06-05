/**
 * 後端 API 存取的單一入口 —— 統一 base URL 解析與 JSON 請求。
 *
 * 過去 gemini.ts 與 database.ts 各自重複一份 getBackendUrl。
 */

let cachedBaseUrl: string | null = null;

/**
 * 解析後端 base URL（不以斜線結尾）。
 * 優先序：VITE_BACKEND_URL 環境變數 → Zeabur 緊急回退 → 本地開發 localhost。
 */
export function getBackendUrl(): string {
  if (cachedBaseUrl) return cachedBaseUrl;

  let baseUrl: string;

  if (import.meta.env.VITE_BACKEND_URL) {
    baseUrl = import.meta.env.VITE_BACKEND_URL;
  } else if (
    typeof window !== 'undefined' &&
    window.location.hostname.includes('.zeabur.app')
  ) {
    console.error(
      '❌ 在 Zeabur 環境中但沒有設定 VITE_BACKEND_URL，使用緊急回退 URL。'
    );
    baseUrl = 'https://mm-ai-highchart-backend.zeabur.app';
  } else {
    baseUrl = 'http://localhost:8000';
  }

  cachedBaseUrl = baseUrl.replace(/\/$/, '');
  return cachedBaseUrl;
}

/** 從錯誤回應中盡力取出後端的 detail 訊息。 */
async function extractErrorDetail(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData?.detail || fallback;
  } catch {
    return fallback;
  }
}

/**
 * 對後端發送 JSON POST 請求並解析回應。
 * 失敗時拋出帶有後端 detail 與 HTTP 狀態碼的錯誤。
 */
export async function postJson<T>(
  path: string,
  body: unknown,
  errorMessage = '後端 API 請求失敗'
): Promise<T> {
  const response = await fetch(`${getBackendUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await extractErrorDetail(response, errorMessage);
    throw new Error(`${detail} (${response.status})`);
  }

  return (await response.json()) as T;
}
