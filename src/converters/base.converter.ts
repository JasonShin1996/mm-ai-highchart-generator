// 轉換器基礎接口
export interface DataConverter {
  /**
   * 將資料庫數據轉換為 Highcharts 格式
   * @param databaseData 原始資料庫數據
   * @param options 可選的轉換選項
   * @returns 轉換後的 Highcharts 系列數據
   */
  convert(databaseData: any[], options?: any): any[];

  /**
   * 檢查此轉換器是否可以處理指定的圖表類型
   * @param chartType 圖表類型
   * @returns 是否可以處理
   */
  canHandle(chartType: string): boolean;

  /**
   * 獲取轉換器名稱（用於調試和日誌）
   */
  getName(): string;
}

// 轉換器基礎類，提供通用功能
export abstract class BaseConverter implements DataConverter {
  abstract convert(databaseData: any[]): any[];
  abstract canHandle(chartType: string): boolean;
  abstract getName(): string;

  /**
   * 驗證數據完整性
   */
  protected validateData(databaseData: any[]): void {
    if (!databaseData || databaseData.length === 0) {
      throw new Error('數據為空，無法進行轉換');
    }
  }

  /**
   * 驗證數據點的有效性
   */
  protected isValidDataPoint(point: any): boolean {
    return point && 
           point.date && 
           point.value !== undefined && 
           point.value !== null &&
           !isNaN(parseFloat(point.value));
  }

  /**
   * 解析數值，如果無效則返回 null
   */
  protected parseValue(value: any): number | null {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * 解析時間戳
   */
  protected parseTimestamp(date: string): number | null {
    const timestamp = new Date(date).getTime();
    return isNaN(timestamp) ? null : timestamp;
  }

  /**
   * 計算Y軸分配（多軸支持）
   */
  protected calculateYAxisAssignment(databaseData: any[]): number[] {
    if (databaseData.length <= 1) {
      return [0]; // 單一數據使用第一個Y軸
    }

    // 生成單位標題的輔助函數
    const generateUnitTitle = (item: any) => {
      if (!item) return '';
      
      const { units, currency } = item;
      
      // 單位映射表
      const unitMapping: { [key: string]: string } = {
        '': 'Number', 'k': 'Thousands', '10k': '10 Thousands', 'm': 'Millions',
        '10m': '10 Millions', '100m': '100 Millions', 'b': 'Billions', 't': 'Trillions',
        'pct': 'Percent', 'pctp': 'Percentage Point', 'idx': 'Index', 'bp': 'Basis Point'
      };

      const currencyMapping: { [key: string]: string } = {
        'usd': 'USD', 'cny': 'CNY', 'eur': 'EUR', 'jpy': 'JPY', 'gbp': 'GBP',
        'aud': 'AUD', 'cad': 'CAD', 'hkd': 'HKD', 'twd': 'TWD', 'krw': 'KRW',
        'inr': 'INR', 'sgd': 'SGD', 'myr': 'MYR', 'thb': 'THB', 'rub': 'RUB',
        'brl': 'BRL', 'zar': 'ZAR', 'sar': 'SAR', 'vnd': 'VND'
      };
      
      const fullUnit = unitMapping[units] || units;
      
      if (currency && currency !== 'N/A' && currency.trim() !== '') {
        const fullCurrency = currencyMapping[currency.toLowerCase()] || currency.toUpperCase();
        return `${fullUnit}, ${fullCurrency}`;
      } else {
        return fullUnit || '';
      }
    };

    // 根據單位分組
    const unitGroups = new Map();
    const assignment: number[] = [];
    
    databaseData.forEach((item, index) => {
      const unitKey = generateUnitTitle(item);
      
      if (!unitGroups.has(unitKey)) {
        unitGroups.set(unitKey, unitGroups.size);
      }
      
      assignment[index] = unitGroups.get(unitKey);
    });

    return assignment;
  }
} 