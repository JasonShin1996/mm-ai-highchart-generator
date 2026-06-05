import { generateChartConfig } from '../services/gemini';
import { getChartTypeTemplates } from '../utils/chartTypeTemplates';
import { extractJsonObjectString, parseStringFunctions } from '@/domain/jsonParser';
import { applyMMTheme } from '@/domain/themeMerge';

// 優化數據精度，減少 API 負載
const optimizeDataPrecision = (data: any[]) => {
  return data.map(row => {
    const optimizedRow: any = {};
    Object.keys(row).forEach(key => {
      const value = row[key];
      if (typeof value === 'number') {
        // 保留最多 4 位小數
        optimizedRow[key] = Math.round(value * 10000) / 10000;
      } else {
        optimizedRow[key] = value;
      }
    });
    return optimizedRow;
  });
};

// 處理 LLM 響應，判斷是否使用時間序列數據組裝
const processLLMResponse = (config: any, fullData: any[]) => {
  // 首先解析字符串格式的函數
  let processedConfig = parseStringFunctions(config);
  
  if (processedConfig._time_series_data) {
    try {
      console.log('🔄 使用時間序列數據組裝邏輯');
      processedConfig.series = assembleTimeSeriesData(fullData, processedConfig._assembly_instructions);
      
      // 添加標記，表示數據已經組裝完成
      processedConfig._data_assembled = true;
      delete processedConfig._time_series_data;
      delete processedConfig._assembly_instructions;
    } catch (error) {
      console.error('時間序列數據組裝失敗，使用原始配置:', error);
      delete processedConfig._time_series_data;
      delete processedConfig._assembly_instructions;
    }
  }
  return processedConfig;
};

// 組裝時間序列數據 - 根據用戶反饋修正
const assembleTimeSeriesData = (fullData: any[], instructions: any) => {
  const { timeColumn, series } = instructions;
  
  return series.map((seriesConfig: any) => ({
    name: seriesConfig.name,        // 使用 LLM 提供的友善名稱
    type: seriesConfig.type,        // 使用 LLM 決定的圖表類型
    data: fullData.map((row: any) => {
      const timeValue = row[timeColumn];
      let timestamp;
      
      // 智能時間戳轉換
      if (typeof timeValue === 'number') {
        // 如果已經是數字，檢查是否為有效的時間戳
        if (timeValue > 1000000000 && timeValue < 9999999999) {
          // 秒級時間戳，轉為毫秒
          timestamp = timeValue * 1000;
        } else if (timeValue > 1000000000000 && timeValue < 9999999999999) {
          // 毫秒級時間戳，直接使用
          timestamp = timeValue;
        } else {
          // 無效的數字，返回 null 表示跳過
          return null;
        }
      } else if (timeValue) {
        // 字符串或其他類型，嘗試轉換
        const date = new Date(timeValue);
        if (!isNaN(date.getTime())) {
          timestamp = date.getTime();
        } else {
          // 無效日期，返回 null 表示跳過
          console.warn(`無效的時間值: ${timeValue}，跳過此數據點`);
          return null;
        }
      } else {
        // 空值，返回 null 表示跳過
        return null;
      }
      
      // 檢查數值是否為空或無效
      const rawValue = row[seriesConfig.column];
      if (rawValue === null || rawValue === undefined || rawValue === '' || String(rawValue).trim() === '') {
        // 數值為空，跳過此數據點
        return null;
      }
      
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue)) {
        // 無效數值，跳過此數據點
        return null;
      }
      
      return [timestamp, numValue];
    }).filter((point: any) => point !== null)  // 過濾掉 null 值
  }));
};

// 獲取圖表類型特定的 prompt 模板
const getChartTypeSpecificPrompt = (
  chartType: string, 
  userPrompt: string, 
  headers: string, 
  dataSample: string, 
  dataSourceType?: string,
  totalDataLength?: number
) => {
  const getDataLength = () => {
    try {
      const data = JSON.parse(dataSample);
      return Array.isArray(data) ? data.length : 0;
    } catch {
      return 0;
    }
  };

  const dataLength = getDataLength();
  const dataSourceInfo = dataSourceType === 'database' ? 'M平方資料庫' : '用戶上傳的本地檔案';

  const basePrompt = `
你是一位專業的數據視覺化專家，專門使用 Highcharts 創建互動式圖表。

第一步：判斷處理策略

數據量：${totalDataLength || dataLength} 行
圖表類型：${chartType}

如果數據量大（>100行）且適合自動組裝（時間序列+多數值欄位），例如line chart, column chart, area chart，請在JSON最前面加上：
{
    "_time_series_data": true,
    "_assembly_instructions": {
        "timeColumn": "時間欄位名稱",
        "series": [
            {"column": "數值欄位1", "name": "友善顯示名稱1", "type": "根據用戶需求決定"},
            {"column": "數值欄位2", "name": "友善顯示名稱2", "type": "根據用戶需求決定"}
        ]
    },
    ... 其他配置
}

重要：如果使用自動組裝，最終的 series 將會是類似以下格式，但欄位名稱會是使用者提供的欄位名稱：
      "series": [
        {
          "data": [[時間戳1, 數值1], [時間戳2, 數值2], [時間戳3, 數值3], ...],
          "name": "Variable1",
          "type": "area"
        },
        ... 其他 series
      ]
      其中 data 是 [時間戳毫秒, 數值] 的二維陣列，每個 series 包含 data、name、type 三個屬性。
      
      如果數據量小於100行，請忽略此策略。


否則請按照以下完整指令處理：

數據來源：${dataSourceInfo}
數據欄位：${headers}
數據樣本（${dataLength} 筆）：${dataSample}
用戶需求：${userPrompt}

**數據處理策略：**

任務: 根據使用者提供的數據和自然語言需求，產生一個完整且有效的 Highcharts JSON 設定物件。
限制:
1. 你的回覆 **必須** 只包含一個格式完全正確的 JSON 物件。
2. **絕對不要** 在 JSON 物件前後包含任何文字、註解、或 markdown 語法。
3. **不要** 使用 \`data.csv\` 或外部 URL 來載入數據。所有需要的數據都應該直接寫在 \`series\` 設定中。
4. 根據下方提供的數據範例來決定 x 軸的正確設定：
   - 如果 x 軸資料是日期/時間且可轉換為時間戳（例如：2024-01-01、2024Q1、Jan 2024），則設定 xAxis 的 type 為 datetime
   - 如果 x 軸資料是分類資料（例如：產品名稱、地區、類別、無法轉換為時間戳的文字），則設定 xAxis 的 type 為 categories
   - 注意：只有確定可以轉換為時間戳時才使用 datetime，否則應該使用 categories

**基本要求：**
1. 使用 ${chartType} 圖表類型
2. 確保數據格式正確
3. 包含適當的標題、軸標籤和圖例
4. 使用適合的顏色配置
5. 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
6. 返回純 JSON 格式，不要包含 markdown 標記
`;

  // 使用 chartTypeTemplates 獲取專門的模板
  const chartTypeTemplates = getChartTypeTemplates(basePrompt);
  return chartTypeTemplates[chartType as keyof typeof chartTypeTemplates] || `
    ${basePrompt}
    
    **通用圖表指令：**
    - 根據數據特性和用戶需求選擇最合適的圖表配置
    - 確保圖表清晰易讀
    - 設置適當的顏色和樣式
    - 添加必要的標籤和說明
    - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
    
    現在，請產生 Highcharts JSON 設定物件。
  `;
};

export const useChartGeneration = () => {
  const generateChart = async (
    fileData: any,
    prompt: string,
    selectedChartType: string,
    setChartOptions: (options: any) => void,
    setGeneratedCode: (code: string) => void,
    setShowSettings: (show: boolean) => void,
    setIsLoading: (loading: boolean) => void,
    toast: any
  ) => {
    if (!fileData || !fileData.data || fileData.data.length === 0) {
      toast({
        title: "錯誤",
        description: "請先上傳一個有效的檔案。",
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

    setIsLoading(true);
    setShowSettings(false);

    try {
      const headers = fileData.meta.fields.join(', ');
      
      // 智能數據採樣：大數據集只發送少量樣本，並優化精度
      const rawSample = fileData.data.length > 100 
        ? fileData.data.slice(0, 50)  // 大數據集只發送 50 筆樣本
        : fileData.data;               // 小數據集發送全部
      
      const optimizedSample = optimizeDataPrecision(rawSample);
      const dataSample = JSON.stringify(optimizedSample, null, 2);
      
      // 使用圖表類型特定的 prompt 模板
      const smartPrompt = getChartTypeSpecificPrompt(selectedChartType, prompt, headers, dataSample, 'localfile', fileData.data.length);

      const chartConfigString = await generateChartConfig(smartPrompt);
      const aiChartOptions = JSON.parse(extractJsonObjectString(chartConfigString));
      
      // 處理 LLM 響應，檢查是否需要時間序列數據組裝
      const processedOptions = processLLMResponse(aiChartOptions, fileData.data);

      const width = processedOptions.chart?.width;
      const height = processedOptions.chart?.height;
      const chartSize =
        width === 975 && height === 650 ? 'large' :
        width === 800 && height === 800 ? 'square' : 'standard';

      const { theme: MM_THEME, base: themeBase } = applyMMTheme(processedOptions, chartSize);

      const finalChartOptions = {
        ...themeBase,
        legend: { ...processedOptions.legend, ...MM_THEME.legend },
        plotOptions: {
          ...processedOptions.plotOptions,
          ...MM_THEME.plotOptions,
          series: { ...processedOptions.plotOptions?.series, ...MM_THEME.plotOptions.series },
        },
      };

      setChartOptions(finalChartOptions);
      setGeneratedCode(JSON.stringify(finalChartOptions, null, 2));
      setShowSettings(true);
      
      toast({
        title: "成功",
        description: "圖表已生成！您可以在下方調整設定。",
      });
    } catch (error) {
      toast({
        title: "生成失敗",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { generateChart };
}; 