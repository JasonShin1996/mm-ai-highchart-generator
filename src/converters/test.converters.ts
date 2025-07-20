// 轉換器測試文件
import { ConverterFactory } from './converter.factory';

// 測試數據
const testScatterData = [
  {
    id: 'test1',
    name_tc: '測試數據1',
    data: [
      { date: '2024-01-01', value: '10' },
      { date: '2024-01-02', value: '20' },
      { date: '2024-01-03', value: '30' }
    ]
  },
  {
    id: 'test2',
    name_tc: '測試數據2',
    data: [
      { date: '2024-01-01', value: '15' },
      { date: '2024-01-02', value: '25' },
      { date: '2024-01-03', value: '35' }
    ]
  }
];

const testLineData = [
  {
    id: 'test3',
    name_tc: '測試線圖數據',
    data: [
      { date: '2024-01-01', value: '100' },
      { date: '2024-01-02', value: '200' },
      { date: '2024-01-03', value: '150' }
    ]
  }
];

// 測試函數
export const testConverters = () => {
  console.log('🧪 開始測試轉換器...');
  
  const factory = ConverterFactory.getInstance();
  
  // 測試支持的圖表類型
  console.log('📋 支持的圖表類型:', factory.getSupportedChartTypes());
  
  // 測試散佈圖轉換器
  try {
    const scatterConverter = factory.getConverter('scatter');
    const scatterResult = scatterConverter.convert(testScatterData);
    console.log('✅ 散佈圖轉換成功:', scatterResult);
  } catch (error) {
    console.error('❌ 散佈圖轉換失敗:', error);
  }
  
  // 測試線圖轉換器
  try {
    const lineConverter = factory.getConverter('line');
    const lineResult = lineConverter.convert(testLineData);
    console.log('✅ 線圖轉換成功:', lineResult);
  } catch (error) {
    console.error('❌ 線圖轉換失敗:', error);
  }
  
  // 測試默認轉換器
  try {
    const defaultConverter = factory.getConverter('unknown_type');
    const defaultResult = defaultConverter.convert(testLineData);
    console.log('✅ 默認轉換器成功:', defaultResult);
  } catch (error) {
    console.error('❌ 默認轉換器失敗:', error);
  }
  
  console.log('🏁 轉換器測試完成');
};

// 性能測試
export const testPerformance = () => {
  console.log('⚡ 開始性能測試...');
  
  // 創建大量測試數據
  const largeData = [
    {
      id: 'large1',
      name_tc: '大量數據1',
      data: Array.from({ length: 10000 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: String(i * 10)
      }))
    },
    {
      id: 'large2',
      name_tc: '大量數據2',
      data: Array.from({ length: 10000 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: String(i * 15)
      }))
    }
  ];
  
  const factory = ConverterFactory.getInstance();
  const converter = factory.getConverter('scatter');
  
  console.time('散佈圖轉換性能');
  const result = converter.convert(largeData);
  console.timeEnd('散佈圖轉換性能');
  
  console.log(`📊 轉換結果: ${result[0].data.length} 個數據點`);
  console.log('🏁 性能測試完成');
}; 