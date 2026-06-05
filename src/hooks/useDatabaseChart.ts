import { generateChartConfig } from '../services/gemini';
import { ConverterFactory } from '../converters';
import { generateYAxisTitle } from '@/domain/unitMapping';
import { extractJsonObjectString } from '@/domain/jsonParser';
import { applyMMTheme, mergeYAxisWithAI } from '@/domain/themeMerge';

// 注意：散佈圖數據驗證和轉換邏輯已移至 ScatterConverter 中

// 將資料庫數據轉換為 Highcharts 格式 - 使用策略模式
const convertDatabaseToHighcharts = (databaseData: any[], chartType: string, options?: { selectedDate?: string }) => {
  if (!databaseData || databaseData.length === 0) {
    return [];
  }

  console.log('🔍 轉換資料庫數據:', databaseData); // 調試

  try {
    // 使用策略模式：通過工廠獲取對應的轉換器
    const converterFactory = ConverterFactory.getInstance();
    const converter = converterFactory.getConverter(chartType);
    
    console.log(`🎯 使用轉換器: ${converter.getName()} 處理圖表類型: ${chartType}`);
    
    // 使用轉換器進行數據轉換，傳遞選項
    return converter.convert(databaseData, { 
      chartType, 
      selectedDate: options?.selectedDate 
    });
  } catch (error) {
    console.error('❌ 數據轉換失敗:', error);
    throw error;
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

  // 單位/幣別映射與 Y 軸標題生成見 @/domain/unitMapping（generateYAxisTitle）

  // 生成多個Y軸配置
  const generateMultipleYAxes = (databaseData: any[], chartType: string, yAxisTitle: string) => {
    if (!databaseData || databaseData.length === 0) {
      return { title: { text: yAxisTitle || '' } };
    }

    // 散佈圖的特殊處理
    if (chartType === 'scatter') {
      return {
        title: {
          text: yAxisTitle || (databaseData[1] ? `${databaseData[1].name_tc || databaseData[1].id}` : '變量 2')
        }
      };
    }

    // 如果只有一筆數據，使用簡單模式
    if (databaseData.length === 1) {
      return {
        title: {
          text: yAxisTitle || generateYAxisTitle(databaseData[0])
        }
      };
    }

    // 多筆數據：根據單位分組
    const unitGroups = new Map();
    
    databaseData.forEach((item, index) => {
      const unitKey = generateYAxisTitle(item);
      
      if (!unitGroups.has(unitKey)) {
        unitGroups.set(unitKey, {
          title: unitKey,
          dataIndices: [],
          items: []
        });
      }
      
      unitGroups.get(unitKey).dataIndices.push(index);
      unitGroups.get(unitKey).items.push(item);
    });

    // 如果所有數據單位相同，使用單一Y軸
    if (unitGroups.size === 1) {
      return {
        title: {
          text: yAxisTitle || Array.from(unitGroups.keys())[0]
        }
      };
    }

    // 多個不同單位：創建多個Y軸
    const yAxisArray: any[] = [];
    const groupsArray = Array.from(unitGroups.entries());
    
    groupsArray.forEach(([unitTitle, groupInfo], groupIndex) => {
      // 新的軸分配順序：第1個→左軸，第2個→右軸，第3個→左軸偏移，第4個→右軸偏移...
      const isLeftSide = groupIndex % 2 === 0; // 偶數索引(0,2,4...)放左側
      const offsetMultiplier = Math.floor(groupIndex / 2); // 每兩個軸一組，計算偏移量
      
      console.log(`🎯 Y軸 ${groupIndex}: ${unitTitle}, 位置: ${isLeftSide ? '左' : '右'}, 偏移: ${offsetMultiplier * 60}px`);
      
      yAxisArray.push({
        title: {
          text: unitTitle
        },
        opposite: !isLeftSide, // false = 左側, true = 右側  
        offset: offsetMultiplier * 60 // 每個軸間隔60px
      });
    });

    console.log('📊 生成的Y軸配置:', yAxisArray);
    return yAxisArray;
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
            text: databaseData && databaseData[0] ? generateYAxisTitle(databaseData[0]) : '左軸'
          }
        },
        {
          title: {
            text: databaseData && databaseData[1] ? generateYAxisTitle(databaseData[1]) : '右軸'
          },
          opposite: true // 右軸設定
        }
      ] : generateMultipleYAxes(databaseData, chartType, yAxisTitle)
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
    toast: any,
    selectedDate?: string
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
      const seriesData = convertDatabaseToHighcharts(databaseData, selectedChartType, { selectedDate });
      console.log('🔄 轉換後的 series 數據:', seriesData);
      
      // 驗證數據
      if (!seriesData || seriesData.length === 0) {
        throw new Error('無法轉換資料庫數據為圖表格式');
      }
      
      const baseConfig = generateBaseChartConfig(seriesData, selectedChartType, prompt, databaseData);
      console.log('⚙️ 基礎配置:', baseConfig);
      
      const { theme: MM_THEME, base: initialBase } = applyMMTheme(baseConfig, 'standard');
      const initialChartOptions = {
        ...initialBase,
        legend: { ...baseConfig.legend, itemStyle: MM_THEME.legend.itemStyle },
        plotOptions: { ...MM_THEME.plotOptions, ...baseConfig.plotOptions },
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
      
      // 創建不包含實際數據和Y軸標題的配置模板
      const configTemplate = {
        ...baseConfig,
        series: baseConfig.series.map(series => ({
          ...series,
          data: [] // 清空實際數據，只保留結構
        })),
        // 移除Y軸標題，避免AI無條件回傳
        yAxis: Array.isArray(baseConfig.yAxis) ? 
          baseConfig.yAxis.map(axis => ({
            ...axis,
            title: { text: '' } // 清空Y軸標題
          })) : {
            ...baseConfig.yAxis,
            title: { text: '' } // 清空Y軸標題
          }
      };

      const optimizedPrompt = `
你是一位 Highcharts 樣式專家。請根據用戶需求調整以下基礎配置的樣式細節：

用戶需求：${prompt}

基礎配置：
${JSON.stringify(configTemplate, null, 2)}

請只調整以下樣式相關的配置，其他項目保持不變：

**可以調整的項目：**
- colors: 圖表系列的顏色陣列
- chart.width 和 chart.height: 圖表尺寸（如果用戶沒有指定，保持原本設定；如果指定，只能選擇 960x540、975x650 或 800x800）
- title.text: 標題的文字內容
- yAxis.title.text: **僅在用戶明確要求修改Y軸標題時才設定**（如果用戶沒有特別提到Y軸標題，請不要設定此字段，系統會自動處理）
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

**重要提醒：**
- 如果用戶沒有明確要求修改Y軸標題，請不要在回傳的JSON中包含 yAxis.title.text 字段
- 只有當用戶明確說明要修改Y軸標題（例如："請把Y軸標題改成..."、"Y軸要顯示..."）時才設定
- X軸標題同樣只在用戶明確要求時才設定
      `;

      const chartConfigString = await generateChartConfig(optimizedPrompt);
      const aiChartOptions = JSON.parse(extractJsonObjectString(chartConfigString));
      
      // 合併 AI 樣式與基礎配置
      const processedOptions = {
        ...baseConfig,
        ...aiChartOptions,
        xAxis: {
          ...baseConfig.xAxis,
          ...aiChartOptions.xAxis,
          title: {
            ...baseConfig.xAxis.title,
            text: aiChartOptions.xAxis?.title?.text || baseConfig.xAxis.title.text,
          },
        },
        yAxis: mergeYAxisWithAI(baseConfig.yAxis, aiChartOptions.yAxis),
        series: baseConfig.series,
      };

      const chartSize = processedOptions.chart?.width === 975 && processedOptions.chart?.height === 650 ? 'large' : 'standard';
      const { theme: MM_THEME_OPTIMIZED, base: optimizedBase } = applyMMTheme(processedOptions, chartSize);

      const finalChartOptions = {
        ...optimizedBase,
        legend: { ...processedOptions.legend, itemStyle: MM_THEME_OPTIMIZED.legend.itemStyle },
        plotOptions: { ...MM_THEME_OPTIMIZED.plotOptions, ...processedOptions.plotOptions }
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