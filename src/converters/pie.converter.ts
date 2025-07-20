import { BaseConverter } from './base.converter';

export class PieConverter extends BaseConverter {
  private chartType: string = 'pie';

  getName(): string {
    return 'PieConverter';
  }

  canHandle(chartType: string): boolean {
    return ['pie', 'donut'].includes(chartType);
  }

  convert(databaseData: any[], options?: { selectedDate?: string; chartType?: string }): any[] {
    this.validateData(databaseData);
    
    // 設置圖表類型
    if (options?.chartType) {
      this.chartType = options.chartType;
    }

    // 找到目標日期（用戶指定或最後一個共同日期）
    const targetDate = options?.selectedDate || this.findLastCommonDate(databaseData);
    
    if (!targetDate) {
      throw new Error('無法找到有效的日期數據');
    }

    console.log(`🍰 使用日期 ${targetDate} 生成${this.chartType === 'donut' ? '環形圖' : '餅圖'}`);

    // 轉換為餅圖數據格式
    const pieData = this.convertToPieData(databaseData, targetDate);

    if (pieData.length === 0) {
      throw new Error(`在日期 ${targetDate} 沒有找到有效的數據`);
    }

    const series: any = {
      name: this.generateChartTitle(databaseData, targetDate),
      type: 'pie', // Highcharts 中 pie 和 donut 都使用 'pie' 類型
      data: pieData
    };

    // 如果是環形圖，添加 innerSize 配置
    if (this.chartType === 'donut') {
      series.innerSize = '60%'; // 環形圖的內徑大小
    }

    return [series];
  }

  /**
   * 找到所有數據系列的最後一個共同日期
   */
  private findLastCommonDate(databaseData: any[]): string {
    if (databaseData.length === 0) return '';

    // 獲取所有數據系列的日期集合
    const allDateSets = databaseData.map(item => 
      new Set(item.data?.map((p: any) => p.date) || [])
    );

    // 找到共同的日期
    const commonDates = allDateSets.reduce((common, dateSet) => {
      return new Set([...common].filter((date: string) => dateSet.has(date)));
    });

    if (commonDates.size === 0) {
      throw new Error('沒有找到共同的日期數據');
    }

    // 返回最後一個日期
    const sortedDates = Array.from(commonDates).sort() as string[];
    return sortedDates[sortedDates.length - 1];
  }

  /**
   * 將時間序列數據轉換為餅圖數據
   */
  private convertToPieData(databaseData: any[], targetDate: string): any[] {
    return databaseData
      .map(item => {
        // 找到指定日期的數據點
        const point = item.data?.find((p: any) => p.date === targetDate);
        
        if (!point || point.value === undefined || point.value === null) {
          return null;
        }

        const value = this.parseValue(point.value);
        if (value === null || value <= 0) {
          return null;
        }

        // 餅圖數據格式：[名稱, 數值]
        return [
          item.name_tc || item.id,  // 扇區名稱
          value                     // 扇區數值
        ];
      })
      .filter(point => point !== null);
  }

  /**
   * 生成圖表標題
   */
  private generateChartTitle(databaseData: any[], targetDate: string): string {
    const formattedDate = this.formatDate(targetDate);
    
    // 統一使用「比例 (日期)」格式，無論單一還是多個數據系列
    return `比例 (${formattedDate})`;
  }

  /**
   * 格式化日期顯示
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString; // 如果不是有效日期，直接返回原字符串
    }

    const currentYear = new Date().getFullYear();
    
    // 如果是同一年，只顯示月日
    if (date.getFullYear() === currentYear) {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
    
    // 否則顯示年月日
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  /**
   * 獲取可用的日期列表（供用戶選擇）
   */
  public getAvailableDates(databaseData: any[]): string[] {
    if (databaseData.length === 0) return [];

    // 獲取所有數據系列的日期集合
    const allDateSets = databaseData.map(item => 
      new Set(item.data?.map((p: any) => p.date) || [])
    );

    // 找到共同的日期
    const commonDates = allDateSets.reduce((common, dateSet) => {
      return new Set([...common].filter((date: string) => dateSet.has(date)));
    });

    // 返回排序後的日期列表
    return Array.from(commonDates).sort() as string[];
  }

  /**
   * 設置圖表類型
   */
  public setChartType(chartType: string): void {
    if (['pie', 'donut'].includes(chartType)) {
      this.chartType = chartType;
    }
  }
} 