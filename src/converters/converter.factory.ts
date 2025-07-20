import { DataConverter } from './base.converter';
import { ScatterConverter } from './scatter.converter';
import { LineConverter } from './line.converter';
import { BarConverter } from './bar.converter';
import { PieConverter } from './pie.converter';
import { ComboConverter } from './combo.converter';
import { BubbleConverter } from './bubble.converter';
import { DefaultConverter } from './default.converter';

export class ConverterFactory {
  private static instance: ConverterFactory;
  private converters: DataConverter[] = [];

  private constructor() {
    // 初始化所有轉換器，按優先級排序
    this.converters = [
      new ScatterConverter(),
      new ComboConverter(),
      new BubbleConverter(),
      new LineConverter(),
      new BarConverter(),
      new PieConverter(),
      new DefaultConverter() // 默認轉換器放在最後
    ];
  }

  /**
   * 獲取工廠單例
   */
  public static getInstance(): ConverterFactory {
    if (!ConverterFactory.instance) {
      ConverterFactory.instance = new ConverterFactory();
    }
    return ConverterFactory.instance;
  }

  /**
   * 根據圖表類型獲取對應的轉換器
   * @param chartType 圖表類型
   * @returns 對應的轉換器
   */
  public getConverter(chartType: string): DataConverter {
    // 按順序查找第一個可以處理該圖表類型的轉換器
    const converter = this.converters.find(c => c.canHandle(chartType));
    
    if (!converter) {
      console.warn(`未找到處理圖表類型 "${chartType}" 的轉換器，使用默認轉換器`);
      return new DefaultConverter();
    }

    // 如果是餅圖或環形圖，設置圖表類型
    if (converter instanceof PieConverter) {
      (converter as any).setChartType(chartType);
    }

    console.log(`使用轉換器: ${converter.getName()} 處理圖表類型: ${chartType}`);
    return converter;
  }

  /**
   * 獲取所有可用的轉換器
   */
  public getAllConverters(): DataConverter[] {
    return [...this.converters];
  }

  /**
   * 獲取支持的圖表類型列表
   */
  public getSupportedChartTypes(): string[] {
    const supportedTypes = new Set<string>();
    
    this.converters.forEach(converter => {
      // 這裡需要根據實際的轉換器實現來獲取支持的類型
      // 暫時返回一些常見的類型
      if (converter instanceof ScatterConverter) {
        supportedTypes.add('scatter');
      } else if (converter instanceof LineConverter) {
        supportedTypes.add('line');
        supportedTypes.add('area');
        supportedTypes.add('spline');
      } else if (converter instanceof BarConverter) {
        supportedTypes.add('column');
        supportedTypes.add('stacked_column');
      } else if (converter instanceof PieConverter) {
        supportedTypes.add('pie');
        supportedTypes.add('donut');
      } else if (converter instanceof ComboConverter) {
        supportedTypes.add('combo');
      } else if (converter instanceof BubbleConverter) {
        supportedTypes.add('bubble');
      }
    });

    return Array.from(supportedTypes);
  }
} 