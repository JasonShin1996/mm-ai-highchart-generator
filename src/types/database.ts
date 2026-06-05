/**
 * 資料庫相關型別 —— 單一來源。
 * 對應後端 backend/main.py 的 DatabaseItem / TimeSeriesData 等 Pydantic 模型。
 */

export interface DatabaseItem {
  id: string;
  name_tc: string;
  name_en: string;
  country: string;
  min_date: string;
  max_date: string;
  frequency: string;
  units: string;
  currency: string;
  score: number;
}

export interface DatabaseSearchResponse {
  items: DatabaseItem[];
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TimeSeriesData {
  id: string;
  name_tc: string;
  name_en: string;
  data: TimeSeriesPoint[];
}

export interface DatabaseLoadResponse {
  time_series: TimeSeriesData[];
}
