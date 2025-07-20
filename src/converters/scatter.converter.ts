import { BaseConverter } from './base.converter';

export class ScatterConverter extends BaseConverter {
  getName(): string {
    return 'ScatterConverter';
  }

  canHandle(chartType: string): boolean {
    return chartType === 'scatter';
  }

  convert(databaseData: any[], options?: any): any[] {
    this.validateData(databaseData);
    
    // 1. 檢查數據數量
    if (databaseData.length !== 2) {
      throw new Error('散佈圖需要選擇恰好 2 筆 M平方資料庫數據');
    }

    const [data1, data2] = databaseData;

    // 2. 檢查數據完整性
    if (!data1.data || !data2.data || data1.data.length === 0 || data2.data.length === 0) {
      throw new Error('數據不完整，請確保兩筆數據都包含有效的時間序列');
    }

    // 3. 檢查頻率一致性（如果數據包含頻率信息）
    if (data1.frequency && data2.frequency && data1.frequency !== data2.frequency) {
      throw new Error(`頻率不一致：${data1.frequency} vs ${data2.frequency}，請選擇相同頻率的數據`);
    }

    // 4. 檢查時間範圍重疊
    const dates1 = new Set(data1.data.map((point: any) => point.date));
    const dates2 = new Set(data2.data.map((point: any) => point.date));
    const commonDates = [...dates1].filter(date => dates2.has(date));

    if (commonDates.length === 0) {
      throw new Error('兩筆數據沒有共同的時間點，無法生成散佈圖');
    }

    // 5. 檢查數據點數量
    if (Math.abs(data1.data.length - data2.data.length) > Math.max(data1.data.length, data2.data.length) * 0.1) {
      console.warn('警告：兩筆數據的數據點數量差異較大，可能影響散佈圖效果');
    }

    // 6. 轉換為散佈圖格式 - 性能優化版本
    const scatterData = [];
    const processedDates = new Set();

    // 性能優化：使用 Map 進行 O(N+M) 查找，而不是 O(N*M) 的嵌套循環
    const data2Map = new Map<string, any>(data2.data.map((p: any) => [p.date, p.value]));

    for (const point1 of data1.data) {
      if (!point1.date || point1.value === undefined || point1.value === null) continue;
      
      // 使用 Map 進行 O(1) 查找，替代 O(M) 的 find 操作
      const value2 = data2Map.get(point1.date);
      if (value2 === undefined || value2 === null) continue;

      const value1 = this.parseValue(point1.value);
      const value2Parsed = this.parseValue(value2);
      
      if (value1 === null || value2Parsed === null) continue;

      scatterData.push([value1, value2Parsed]);
      processedDates.add(point1.date);
    }

    if (scatterData.length === 0) {
      throw new Error('沒有有效的數據點可以生成散佈圖');
    }

    if (scatterData.length < 5) {
      console.warn('警告：有效數據點較少，散佈圖可能不夠清晰');
    }

    return [{
      name: `${data1.name_tc || data1.id} vs ${data2.name_tc || data2.id}`,
      type: 'scatter',
      data: scatterData
    }];
  }
} 