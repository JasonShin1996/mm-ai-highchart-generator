import { BaseConverter } from './base.converter';

export class ComboConverter extends BaseConverter {
  getName(): string {
    return 'ComboConverter';
  }

  canHandle(chartType: string): boolean {
    return chartType === 'combo';
  }

  convert(databaseData: any[], options?: any): any[] {
    this.validateData(databaseData);

    // 組合圖：第一個系列為柱狀圖，第二個系列為線圖
    return databaseData.map((item, index) => ({
      name: item.name_tc || item.id,
      type: index === 0 ? 'column' : 'line', // 第一個系列用柱狀圖，第二個系列用線圖
      yAxis: index === 0 ? 0 : 1, // 第一個系列用左軸，第二個系列用右軸
      data: this.convertDataPoints(item.data || [])
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