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
} 