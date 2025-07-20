import { generateChartConfig } from '../services/gemini';
import { generateMMTheme } from '../utils/chartTheme';

// 散佈圖數據驗證和轉換
const validateAndConvertScatterData = (databaseData: any[]) => {
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

  // 6. 轉換為散佈圖格式
  const scatterData = [];
  const processedDates = new Set();

  for (const point1 of data1.data) {
    if (!point1.date || point1.value === undefined || point1.value === null) continue;
    
    // 找到對應的數據點2
    const point2 = data2.data.find((p: any) => p.date === point1.date);
    if (!point2 || point2.value === undefined || point2.value === null) continue;

    const value1 = parseFloat(point1.value);
    const value2 = parseFloat(point2.value);
    
    if (isNaN(value1) || isNaN(value2)) continue;

    scatterData.push([value1, value2]);
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
};

// 將資料庫數據轉換為 Highcharts 格式
const convertDatabaseToHighcharts = (databaseData: any[], chartType: string) => {
  if (!databaseData || databaseData.length === 0) {
    return [];
  }

  console.log('🔍 轉換資料庫數據:', databaseData); // 調試

  // 根據圖表類型決定數據格式
  if (chartType === 'scatter') {
    // 散佈圖特殊處理
    return validateAndConvertScatterData(databaseData);
  } else if (chartType === 'bubble') {
    // 泡泡圖需要 [x, y] 格式
    return databaseData.map(item => ({
      name: item.name_tc || item.id,
      type: chartType,
      data: (item.data || []).map((point: any, index: number) => {
        if (!point || point.value === undefined || point.value === null) {
          return null;
        }
        const value = parseFloat(point.value);
        if (isNaN(value)) {
          return null;
        }
        // 散佈圖使用索引作為 X軸，數值作為 Y軸
        return [index, value];
      }).filter(point => point !== null)
    }));
  } else if (chartType === 'combo') {
    // 組合圖：第一個系列為柱狀圖，第二個系列為線圖
    // 需要雙Y軸支援，第一個系列使用左軸(yAxis: 0)，第二個系列使用右軸(yAxis: 1)
    return databaseData.map((item, index) => ({
      name: item.name_tc || item.id,
      type: index === 0 ? 'column' : 'line', // 第一個系列用柱狀圖，第二個系列用線圖
      yAxis: index === 0 ? 0 : 1, // 第一個系列用左軸，第二個系列用右軸
      data: (item.data || []).map((point: any) => {
        if (!point || !point.date || point.value === undefined || point.value === null) {
          return null;
        }
        const timestamp = new Date(point.date).getTime();
        const value = parseFloat(point.value);
        if (isNaN(timestamp) || isNaN(value)) {
          return null;
        }
        return [timestamp, value];
      }).filter(point => point !== null)
    }));
  } else {
    // 其他圖表類型使用標準格式
    return databaseData.map(item => ({
      name: item.name_tc || item.id,
      type: chartType === 'stacked_column' ? 'column' : chartType, // 堆疊柱狀圖實際上是 column 類型
      data: (item.data || []).map((point: any) => {
        if (!point || !point.date || point.value === undefined || point.value === null) {
          return null;
        }
        const timestamp = new Date(point.date).getTime();
        const value = parseFloat(point.value);
        if (isNaN(timestamp) || isNaN(value)) {
          return null;
        }
        return [timestamp, value];
      }).filter(point => point !== null)
    }));
  }
};

// 生成基礎圖表配置
const generateBaseChartConfig = (seriesData: any[], chartType: string, prompt: string, databaseData?: any[]) => {
  // 從 prompt 中提取標題
  const extractTitle = (prompt: string) => {
    // 簡單的標題提取邏輯
    const lines = prompt.split('\n');
    for (const line of lines) {
      if (line.includes('標題') || line.includes('title') || line.includes('圖表')) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match) return match[1].trim();
      }
    }
    return 'M平方數據圖表';
  };

  // 從 prompt 中提取軸標題
  const extractAxisTitles = (prompt: string) => {
    let xAxisTitle = '';
    let yAxisTitle = '';
    
    const lines = prompt.split('\n');
    for (const line of lines) {
      if (line.includes('x軸') || line.includes('X軸') || line.includes('橫軸')) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match) xAxisTitle = match[1].trim();
      }
      if (line.includes('y軸') || line.includes('Y軸') || line.includes('縱軸')) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match) yAxisTitle = match[1].trim();
      }
    }
    
    return { xAxisTitle, yAxisTitle };
  };

  const title = extractTitle(prompt);
  const { xAxisTitle, yAxisTitle } = extractAxisTitles(prompt);

  return {
    chart: {
      type: chartType === 'stacked_column' ? 'column' : (chartType === 'combo' ? 'column' : chartType) // 堆疊柱狀圖和組合圖都使用 column 類型
    },
    title: {
      text: title
    },
    // 圓餅圖和環形圖不需要 X軸
    ...(chartType !== 'pie' && chartType !== 'donut' && {
      xAxis: {
        type: ['line', 'column', 'stacked_column', 'area', 'spline', 'combo'].includes(chartType) ? 'datetime' : 'category',
        title: {
          text: chartType === 'scatter' ? (xAxisTitle || (databaseData && databaseData[0] ? databaseData[0].name_tc || databaseData[0].id : '變量 1')) : (xAxisTitle || '')
        }
      }
    }),
    // 圓餅圖和環形圖不需要 Y軸
    ...(chartType !== 'pie' && chartType !== 'donut' && {
      yAxis: chartType === 'combo' ? [
        // 組合圖：雙Y軸陣列格式
        {
          title: {
            text: databaseData && databaseData[0] ? databaseData[0].name_tc || databaseData[0].id : '左軸'
          }
        },
        {
          title: {
            text: databaseData && databaseData[1] ? databaseData[1].name_tc || databaseData[1].id : '右軸'
          },
          opposite: true // 右軸設定
        }
      ] : {
        // 其他圖表：單一Y軸物件格式
        title: {
          text: chartType === 'scatter' ? (yAxisTitle || (databaseData && databaseData[1] ? databaseData[1].name_tc || databaseData[1].id : '變量 2')) : (yAxisTitle || '')
        }
      }
    }),
    series: seriesData,
    legend: {
      enabled: chartType !== 'scatter', // 散佈圖不顯示圖例
      align: 'center',
      verticalAlign: 'bottom'
    },
    // 為堆疊柱狀圖添加 plotOptions
    ...(chartType === 'stacked_column' && {
      plotOptions: {
        column: {
          stacking: 'normal'
        }
      }
    })
  };
};

export const useDatabaseChart = () => {
  const generateMMDatabaseChart = async (
    databaseData: any[],
    prompt: string,
    selectedChartType: string,
    setChartOptions: (options: any) => void,
    setGeneratedCode: (code: string) => void,
    setIsLoading: (loading: boolean) => void,
    setIsOptimizing: (optimizing: boolean) => void,
    toast: any
  ) => {
    if (!databaseData || databaseData.length === 0) {
      toast({
        title: "錯誤",
        description: "請先載入資料庫數據。",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "錯誤", 
        description: "請描述您想要生成的圖表樣式。",
        variant: "destructive",
      });
      return;
    }

    if (!selectedChartType) {
      toast({
        title: "錯誤", 
        description: "請先選擇圖表類型。",
        variant: "destructive",
      });
      return;
    }

    try {
      // 階段 1：立即組裝並顯示基礎圖表
      console.log('📊 原始資料庫數據:', databaseData);
      const seriesData = convertDatabaseToHighcharts(databaseData, selectedChartType);
      console.log('🔄 轉換後的 series 數據:', seriesData);
      
      // 驗證數據
      if (!seriesData || seriesData.length === 0) {
        throw new Error('無法轉換資料庫數據為圖表格式');
      }
      
      const baseConfig = generateBaseChartConfig(seriesData, selectedChartType, prompt, databaseData);
      console.log('⚙️ 基礎配置:', baseConfig);
      
      // 為基礎配置添加 MM_THEME 樣式，確保圖表能正確顯示
      const MM_THEME = generateMMTheme('standard', baseConfig);
      const initialChartOptions = {
        ...baseConfig,
        lang: MM_THEME.lang,
        colors: MM_THEME.colors,
        chart: { 
          ...baseConfig.chart, 
          ...MM_THEME.chart
        },
        title: { 
          ...baseConfig.title, 
          style: MM_THEME.title.style
        },
        subtitle: { 
          text: 'MacroMicro.me | MacroMicro',
          style: MM_THEME.subtitle.style
        },
        xAxis: { 
          ...baseConfig.xAxis, 
          ...MM_THEME.xAxis
        },
        yAxis: Array.isArray(baseConfig.yAxis) ? 
          // 雙Y軸：陣列格式，為每個軸套用主題樣式
          baseConfig.yAxis.map(axis => ({
            ...axis,
            ...MM_THEME.yAxis
          })) : {
            // 單一Y軸：物件格式，直接套用主題樣式
            ...baseConfig.yAxis,
            ...MM_THEME.yAxis
          },
        legend: { 
          ...baseConfig.legend, 
          itemStyle: MM_THEME.legend.itemStyle
        },
        plotOptions: {
          ...MM_THEME.plotOptions,
          ...baseConfig.plotOptions
        },
        credits: MM_THEME.credits,
        exporting: MM_THEME.exporting
      };
      
      // 為散佈圖特別處理軸標題（在主題合併後）
      if (selectedChartType === 'scatter' && databaseData && databaseData.length >= 2) {
        initialChartOptions.xAxis.title.text = databaseData[0].name_tc || databaseData[0].id;
        // 散佈圖使用單一Y軸，檢查是否為物件格式
        if (!Array.isArray(initialChartOptions.yAxis)) {
          initialChartOptions.yAxis.title.text = databaseData[1].name_tc || databaseData[1].id;
        }
      }
      
      // 立即設置基礎圖表，讓用戶立即看到結果
      setChartOptions(initialChartOptions);
      setGeneratedCode(JSON.stringify(initialChartOptions, null, 2));
      
      toast({
        title: "基礎圖表已生成",
        description: "圖表已顯示，正在進行 AI 樣式優化...",
      });

      // 階段 2：在背景進行 AI 優化
      setIsOptimizing(true);
      
      // 創建不包含實際數據的配置模板
      const configTemplate = {
        ...baseConfig,
        series: baseConfig.series.map(series => ({
          ...series,
          data: [] // 清空實際數據，只保留結構
        }))
      };

      const optimizedPrompt = `
你是一位 Highcharts 樣式專家。請根據用戶需求調整以下基礎配置的樣式細節：

用戶需求：${prompt}

基礎配置：
${JSON.stringify(configTemplate, null, 2)}

請只調整以下樣式相關的配置，其他項目保持不變：

**可以調整的項目：**
- colors: 圖表系列的顏色陣列
- chart.width 和 chart.height: 圖表尺寸（如果用戶沒有指定，保持原本設定；如果指定，只能選擇 960x540 或 975x650）
- title.text: 標題的文字內容
- yAxis.title.text: Y軸標題的文字內容（請根據用戶需求設置，即使基礎配置中已有標題也要檢查是否需要更新）
- xAxis.title.text: X軸標題的文字內容（預設不顯示，只有用戶特別指定時才顯示）
- legend: 圖例的位置（預設在 bottom，只有用戶特別指定時才改變）
- plotOptions.series.dataLabels: 數據標籤的顯示和樣式

**絕對不要調整的項目：**
- lang, credits, exporting: 固定設定
- chart.backgroundColor: 保持白色背景
- subtitle: 完全不要包含這個字段，系統會自動處理
- xAxis.type: 必須保持基礎配置中的設定：
  * 散佈圖(scatter)和泡泡圖(bubble)：使用 "category"（因為是變量關係，不是時間序列）
  * 折線圖(line)、柱狀圖(column)、堆疊柱狀圖(stacked_column)、面積圖(area)、平滑線圖(spline)、組合圖(combo)：使用 "datetime"（因為是時間序列趨勢）
  * 圓餅圖(pie)和環形圖(donut)：不需要 X軸
- series: 數據結構不要改動，除非用戶有特別要求
- 基礎的軸線顏色和樣式
- title.style, xAxis.title.style, yAxis.title.style: 字體樣式保持預設
- legend.itemStyle: 圖例字體樣式保持預設

請返回完整的 Highcharts JSON 配置，確保只調整允許的樣式項目。

注意：請仔細檢查用戶需求中是否包含軸標題的要求，即使基礎配置中已經有標題，也要根據用戶的具體需求進行調整。
      `;

      const chartConfigString = await generateChartConfig(optimizedPrompt);
      let configStr = chartConfigString.replace(/^```json\s*/, '').replace(/```$/, '');
      const firstBracket = configStr.indexOf('{');
      const lastBracket = configStr.lastIndexOf('}');
      
      if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("AI 回傳的內容中找不到有效的 JSON 物件。");
      }
      
      configStr = configStr.substring(firstBracket, lastBracket + 1);
      const aiChartOptions = JSON.parse(configStr);
      
      // 合併 AI 樣式與基礎配置
      const processedOptions = {
        ...baseConfig,
        ...aiChartOptions,
        // 軸標題：優先使用 AI 設置的，如果 AI 沒有設置則使用基礎配置的
        xAxis: {
          ...baseConfig.xAxis,
          ...aiChartOptions.xAxis,
          title: {
            ...baseConfig.xAxis.title,
            text: aiChartOptions.xAxis?.title?.text || baseConfig.xAxis.title.text
          }
        },
        yAxis: Array.isArray(baseConfig.yAxis) ? 
          // 雙Y軸：陣列格式，為每個軸合併AI設定
          baseConfig.yAxis.map((axis, index) => ({
            ...axis,
            ...(aiChartOptions.yAxis && Array.isArray(aiChartOptions.yAxis) ? aiChartOptions.yAxis[index] : {}),
            title: {
              ...axis.title,
              text: (aiChartOptions.yAxis && Array.isArray(aiChartOptions.yAxis) && aiChartOptions.yAxis[index]?.title?.text) || axis.title.text
            }
          })) : {
            // 單一Y軸：物件格式，直接合併AI設定
            ...baseConfig.yAxis,
            ...aiChartOptions.yAxis,
            title: {
              ...baseConfig.yAxis.title,
              text: aiChartOptions.yAxis?.title?.text || baseConfig.yAxis.title.text
            }
          },
        series: baseConfig.series // 保持前端組裝的數據不變
      };

      // 根據 AI 回傳的圖表尺寸決定使用哪個主題
      const chartSize = processedOptions.chart?.width === 975 && processedOptions.chart?.height === 650 ? 'large' : 'standard';
      const MM_THEME_OPTIMIZED = generateMMTheme(chartSize, processedOptions);

      // 合併 AI 設定與 MM_THEME 樣式
      const finalChartOptions = {
        ...processedOptions,
        lang: MM_THEME_OPTIMIZED.lang,
        colors: MM_THEME_OPTIMIZED.colors,
        chart: { 
          ...processedOptions.chart, 
          ...MM_THEME_OPTIMIZED.chart
        },
        title: { 
          ...processedOptions.title, 
          style: MM_THEME_OPTIMIZED.title.style
        },
        subtitle: { 
          text: 'MacroMicro.me | MacroMicro',
          style: MM_THEME.subtitle.style
        },
        xAxis: { 
          ...processedOptions.xAxis, 
          ...MM_THEME_OPTIMIZED.xAxis
        },
        yAxis: Array.isArray(processedOptions.yAxis) ? 
          // 雙Y軸：陣列格式，為每個軸套用優化後的主題樣式
          processedOptions.yAxis.map(axis => ({
            ...axis,
            ...MM_THEME_OPTIMIZED.yAxis
          })) : {
            // 單一Y軸：物件格式，直接套用優化後的主題樣式
            ...processedOptions.yAxis,
            ...MM_THEME_OPTIMIZED.yAxis
          },
        legend: { 
          ...processedOptions.legend, 
          itemStyle: MM_THEME_OPTIMIZED.legend.itemStyle
        },
        plotOptions: {
          ...MM_THEME_OPTIMIZED.plotOptions,
          ...processedOptions.plotOptions
        },
        credits: MM_THEME_OPTIMIZED.credits,
        exporting: MM_THEME_OPTIMIZED.exporting
      };

      // 為散佈圖特別處理軸標題（在 AI 優化後的主題合併後）
      if (selectedChartType === 'scatter' && databaseData && databaseData.length >= 2) {
        finalChartOptions.xAxis.title.text = databaseData[0].name_tc || databaseData[0].id;
        // 散佈圖使用單一Y軸，檢查是否為物件格式
        if (!Array.isArray(finalChartOptions.yAxis)) {
          finalChartOptions.yAxis.title.text = databaseData[1].name_tc || databaseData[1].id;
        }
      }
      
      // 更新為 AI 優化後的版本
      setChartOptions(finalChartOptions);
      setGeneratedCode(JSON.stringify(finalChartOptions, null, 2));
      
      toast({
        title: "AI 優化完成",
        description: "圖表樣式已優化完成！",
      });
      
    } catch (error) {
      console.error('生成圖表失敗:', error);
      toast({
        title: "圖表生成失敗",
        description: error.message || "請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return { generateMMDatabaseChart };
}; 