import { BaseConverter } from './base.converter';

export class DefaultConverter extends BaseConverter {
  getName(): string {
    return 'DefaultConverter';
  }

  canHandle(chartType: string): boolean {
    // 默認轉換器可以處理任何圖表類型，但優先級最低
    return true;
  }

  convert(databaseData: any[], options?: any): any[] {
    this.validateData(databaseData);

    // 計算單位分組和Y軸分配
    const yAxisAssignment = this.calculateYAxisAssignment(databaseData);

    // 使用標準格式處理所有圖表類型
    return databaseData.map((item, index) => ({
      name: item.name_tc || item.id,
      type: 'line', // 默認使用線圖
      data: this.convertDataPoints(item.data || []),
      yAxis: yAxisAssignment[index] || 0 // 分配到對應的Y軸
    }));
  }

  private convertDataPoints(data: any[]): any[] {
    return data
      .map((point: any) => {
        if (!this.isValidDataPoint(point)) {
          return null;
        }

        const timestamp = this.parseTimestamp(point.date);
        const value = this.parseValue(point.value);
        
        if (timestamp === null || value === null) {
          return null;
        }

        return [timestamp, value];
      })
      .filter(point => point !== null);
  }
} 