import { BaseConverter } from './base.converter';

export class BubbleConverter extends BaseConverter {
  getName(): string {
    return 'BubbleConverter';
  }

  canHandle(chartType: string): boolean {
    return chartType === 'bubble';
  }

  convert(databaseData: any[], options?: any): any[] {
    this.validateData(databaseData);

    return databaseData.map(item => ({
      name: item.name_tc || item.id,
      type: 'bubble',
      data: this.convertDataPoints(item.data || [])
    }));
  }

  private convertDataPoints(data: any[]): any[] {
    return data
      .map((point: any, index: number) => {
        if (!point || point.value === undefined || point.value === null) {
          return null;
        }

        const value = this.parseValue(point.value);
        if (value === null) {
          return null;
        }

        // 泡泡圖使用索引作為 X軸，數值作為 Y軸
        return [index, value];
      })
      .filter(point => point !== null);
  }
} 