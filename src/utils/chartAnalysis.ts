// 圖表類型名稱映射
export const getChartTypeName = (chartType: string) => {
  const chartTypeNames = {
    'line': '折線圖',
    'column': '柱狀圖',
    'area': '面積圖',
    'pie': '圓餅圖',
    'scatter': '散佈圖',
    'stacked_column': '堆疊柱狀圖',
    'spline': '平滑線圖',
    'donut': '環形圖',
    'bubble': '泡泡圖',
    'waterfall': '瀑布圖',
    'combo': '組合圖',
    'random': '擲筊'
  };
  return chartTypeNames[chartType] || chartType;
};

// AI 推薦圖表類型邏輯
export const analyzeDataAndRecommendCharts = (data: any) => {
  const recommendations: string[] = [];
  
  if (!data || !data.meta || !data.data) return recommendations;
  
  const fields = data.meta.fields || [];
  const sampleData = data.data.slice(0, 10);
  
  // 檢查是否有時間相關欄位
  const hasTimeColumn = fields.some((field: string) => 
    field.toLowerCase().includes('date') || 
    field.toLowerCase().includes('datetime') ||
    field.toLowerCase().includes('period') ||
    field.toLowerCase().includes('time') ||
    field.toLowerCase().includes('年') ||
    field.toLowerCase().includes('月') ||
    field.toLowerCase().includes('日')
  );
  
  // 檢查數值欄位數量
  const numericalFields = fields.filter((field: string) => {
    const values = sampleData.map((row: any) => row[field]).filter((v: any) => v !== null && v !== undefined);
    return values.length > 0 && values.every((v: any) => !isNaN(parseFloat(v)));
  });
  
  // 檢查類別欄位
  const categoricalFields = fields.filter((field: string) => {
    const values = sampleData.map((row: any) => row[field]).filter((v: any) => v !== null && v !== undefined);
    const uniqueValues = [...new Set(values)];
    return uniqueValues.length < values.length * 0.7 && uniqueValues.length > 1;
  });
  
  // 檢查是否有負值（用於瀑布圖推薦）
  const hasNegativeValues = numericalFields.some((field: string) => {
    const values = sampleData.map((row: any) => row[field]).filter((v: any) => v !== null && v !== undefined);
    return values.some((v: any) => parseFloat(v) < 0);
  });
  
  // 基於數據特性推薦
  if (hasTimeColumn && numericalFields.length > 0) {
    recommendations.push('line', 'area', 'spline');
    // 時間序列 + 多種指標適合組合圖
    if (numericalFields.length >= 2) {
      recommendations.push('combo');
    }
  }
  
  if (categoricalFields.length > 0 && numericalFields.length > 0) {
    recommendations.push('column', 'stacked_column');
    // 有負值變化適合瀑布圖
    if (hasNegativeValues) {
      recommendations.push('waterfall');
    }
  }
  
  if (categoricalFields.length > 0 && numericalFields.length === 1) {
    recommendations.push('pie', 'donut');
  }
  
  if (numericalFields.length >= 2) {
    recommendations.push('scatter');
  }
  
  // 三個以上數值欄位適合泡泡圖
  if (numericalFields.length >= 3) {
    recommendations.push('bubble');
  }
  
  // 去重並限制推薦數量
  return [...new Set(recommendations)].slice(0, 3);
};

 