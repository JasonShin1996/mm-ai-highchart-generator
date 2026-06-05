/**
 * 單位 / 幣別映射 —— 單一來源 (Single Source of Truth)。
 *
 * 過去這套邏輯散落在 useDatabaseChart.ts、DataFusion.tsx、base.converter.ts 三處，
 * 容易 drift。此模組為唯一定義，三處消費端一律 import 此處。
 */

/** 數值單位縮寫 → 完整英文名稱 */
export const UNIT_MAPPING: Record<string, string> = {
  '': 'Number',
  k: 'Thousands',
  '10k': '10 Thousands',
  m: 'Millions',
  '10m': '10 Millions',
  '100m': '100 Millions',
  b: 'Billions',
  t: 'Trillions',
  pct: 'Percent',
  pctp: 'Percentage Point',
  idx: 'Index',
  bp: 'Basis Point',
};

/** 幣別縮寫 → 標準大寫代碼 */
export const CURRENCY_MAPPING: Record<string, string> = {
  usd: 'USD',
  cny: 'CNY',
  eur: 'EUR',
  jpy: 'JPY',
  gbp: 'GBP',
  aud: 'AUD',
  cad: 'CAD',
  hkd: 'HKD',
  twd: 'TWD',
  krw: 'KRW',
  inr: 'INR',
  sgd: 'SGD',
  myr: 'MYR',
  thb: 'THB',
  rub: 'RUB',
  brl: 'BRL',
  zar: 'ZAR',
  sar: 'SAR',
  vnd: 'VND',
};

/** 帶有單位 / 幣別資訊的資料項（資料庫數據項的子集） */
export interface UnitBearing {
  units?: string;
  currency?: string;
}

/** 將單位縮寫展開為完整名稱；未知值原樣返回。 */
export function expandUnit(units?: string): string {
  if (units == null) return '';
  return UNIT_MAPPING[units] ?? units;
}

/**
 * 將幣別縮寫展開為標準代碼；無有效幣別時返回 null。
 * 'N/A'、空字串、純空白皆視為無幣別。
 */
export function expandCurrency(currency?: string): string | null {
  if (!currency || currency === 'N/A' || currency.trim() === '') return null;
  return CURRENCY_MAPPING[currency.toLowerCase()] ?? currency.toUpperCase();
}

/**
 * 由資料項產生 Y 軸標題字串，例如 "Billions, USD" 或 "Percent"。
 * 對應原本三處 generateYAxisTitle / generateUnitTitle 的一致行為。
 */
export function generateYAxisTitle(item?: UnitBearing | null): string {
  if (!item) return '';
  const fullUnit = expandUnit(item.units);
  const fullCurrency = expandCurrency(item.currency);
  return fullCurrency ? `${fullUnit}, ${fullCurrency}` : fullUnit || '';
}
