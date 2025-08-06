import { BaseConverter } from './base.converter';

export class LineConverter extends BaseConverter {
  getName(): string {
    return 'LineConverter';
  }

  canHandle(chartType: string): boolean {
    return ['line', 'area', 'spline'].includes(chartType);
  }

  convert(databaseData: any[], options?: any): any[] {
    this.validateData(databaseData);

    const chartType = options?.chartType || 'line';
    const yAxisAssignment = this.calculateYAxisAssignment(databaseData);

    return databaseData.map((item, index) => ({
      name: item.name_tc || item.id,
      type: this.getChartType(chartType),
      data: this.convertDataPoints(item.data || []),
      yAxis: yAxisAssignment[index] || 0
    }));
  }

  private getChartType(chartType: string): string {
    // 根據圖表類型決定實際的 Highcharts 類型
    switch (chartType) {
      case 'area':
        return 'area';
      case 'spline':
        return 'spline';
      case 'line':
      default:
        return 'line';
    }
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