import { BaseConverter } from './base.converter';

export class BarConverter extends BaseConverter {
  getName(): string {
    return 'BarConverter';
  }

  canHandle(chartType: string): boolean {
    return ['column', 'stacked_column'].includes(chartType);
  }

  convert(databaseData: any[], options?: any): any[] {
    this.validateData(databaseData);

    return databaseData.map(item => ({
      name: item.name_tc || item.id,
      type: 'column', // 堆疊柱狀圖實際上是 column 類型
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