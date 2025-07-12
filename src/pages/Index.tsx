import React, { useState, useRef, useCallback } from 'react';
import { Upload, Zap, Settings, Copy, Eye, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import ChartDisplay from '@/components/ChartDisplay';
import SettingsPanel from '@/components/SettingsPanel';
import ChartGallery from '@/components/ChartGallery';
import { useToast } from '@/hooks/use-toast';
import { generateChartConfig, generateChartSuggestion } from '@/services/gemini';

const Index = () => {
  const [fileData, setFileData] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [chartOptions, setChartOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);
  const [recommendedChartTypes, setRecommendedChartTypes] = useState<string[]>([]);
  const { toast } = useToast();

  // 優化數據精度以減少傳送量
  const optimizeDataPrecision = useCallback((data) => {
    return data.map(row => {
      const processedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number') {
          // 浮點數限制為4位小數
          processedRow[key] = Math.round(value * 10000) / 10000;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          // 檢查是否為日期格式 (YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY 等)
          const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;
          // 檢查是否為時間格式 (HH:MM, HH:MM:SS)
          const timePattern = /^\d{1,2}:\d{2}(:\d{2})?$/;
          // 檢查是否為日期時間格式
          const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
          
          if (datePattern.test(value) || timePattern.test(value) || dateTimePattern.test(value)) {
            // 保持原始日期/時間字串
            processedRow[key] = value;
          } else {
            // 只有純數字字符串才進行精度處理
            const numValue = parseFloat(value);
            processedRow[key] = Math.round(numValue * 10000) / 10000;
          }
        } else {
          processedRow[key] = value;
        }
      }
      return processedRow;
    });
  }, []);

  // AI 推薦圖表類型邏輯
  const analyzeDataAndRecommendCharts = useCallback((data) => {
    const recommendations = [];
    
    if (!data || !data.meta || !data.data) return recommendations;
    
    const fields = data.meta.fields || [];
    const sampleData = data.data.slice(0, 10);
    
    // 檢查是否有時間相關欄位
    const hasTimeColumn = fields.some(field => 
      field.toLowerCase().includes('date') || 
      field.toLowerCase().includes('datetime') ||
      field.toLowerCase().includes('period') ||
      field.toLowerCase().includes('time') ||
      field.toLowerCase().includes('年') ||
      field.toLowerCase().includes('月') ||
      field.toLowerCase().includes('日')
    );
    
    // 檢查數值欄位數量
    const numericalFields = fields.filter(field => {
      const values = sampleData.map(row => row[field]).filter(v => v !== null && v !== undefined);
      return values.length > 0 && values.every(v => !isNaN(parseFloat(v)));
    });
    
    // 檢查類別欄位
    const categoricalFields = fields.filter(field => {
      const values = sampleData.map(row => row[field]).filter(v => v !== null && v !== undefined);
      const uniqueValues = [...new Set(values)];
      return uniqueValues.length < values.length * 0.7 && uniqueValues.length > 1;
    });
    
    // 基於數據特性推薦
    if (hasTimeColumn && numericalFields.length > 0) {
      recommendations.push('line', 'area', 'spline');
    }
    
    if (categoricalFields.length > 0 && numericalFields.length > 0) {
      recommendations.push('column', 'stacked_column');
    }
    
    if (categoricalFields.length > 0 && numericalFields.length === 1) {
      recommendations.push('pie', 'donut');
    }
    
    if (numericalFields.length >= 2) {
      recommendations.push('scatter');
    }
    
    // 去重並限制推薦數量
    return [...new Set(recommendations)].slice(0, 3);
  }, []);

  // 處理圖表類型選擇
  const handleChartTypeSelect = useCallback((chartType: string) => {
    setSelectedChartType(chartType);
    
    // 根據選擇的圖表類型調整 prompt 提示
    const chartTypePrompts = {
      'line': '建議：描述您想要展示的時間序列數據，如「顯示過去12個月的銷售趨勢」',
      'column': '建議：描述您想要比較的類別數據，如「比較不同地區的銷售額」',
      'area': '建議：描述您想要強調的累積效果，如「顯示各產品線的營收貢獻」',
      'pie': '建議：描述您想要展示的比例關係，如「顯示各部門的預算分配」',
      'scatter': '建議：描述您想要探索的兩個變量關係，如「分析價格與銷量的關係」',
      'stacked_column': '建議：描述您想要展示的分組和組成，如「顯示各季度不同產品的銷售構成」',
      'spline': '建議：描述您想要展示的平滑趨勢，如「顯示股價的平滑波動趨勢」',
      'donut': '建議：描述您想要展示的比例關係，如「顯示市場份額分布」'
    };
    
    // 如果當前 prompt 是空的或是預設建議，則更新提示
    if (!prompt.trim() || prompt.includes('建議：')) {
      // 暫時不直接修改 prompt，讓用戶看到建議
      console.log('Chart type selected:', chartType);
    }
  }, [prompt]);

  const handleFileUpload = useCallback(async (data) => {
    setFileData(data);
    setChartOptions(null);
    setShowSettings(false);
    setPrompt(''); // 清空之前的 prompt
    setGeneratedCode(''); // 清空之前的生成代碼
    setSelectedChartType(null); // 重置圖表類型選擇
    setRecommendedChartTypes([]); // 重置推薦
    console.log('File data loaded:', data);
    
    // 如果有數據，分析並推薦圖表類型
    if (data && data.data && data.data.length > 0 && data.meta && data.meta.fields) {
      // 分析數據並推薦圖表類型
      const recommendations = analyzeDataAndRecommendCharts(data);
      setRecommendedChartTypes(recommendations);
      
      setIsSuggestionLoading(true);
      try {
        // 取前10筆數據作為樣本，並優化精度
        const rawSample = data.data.slice(0, 10);
        const dataSample = optimizeDataPrecision(rawSample);
        const suggestion = await generateChartSuggestion(data.meta.fields, dataSample);
        setPrompt(suggestion.trim());
        
        toast({
          title: "建議已生成",
          description: "AI 已根據您的數據生成圖表建議和推薦類型，請選擇圖表類型後進行描述。",
        });
      } catch (error) {
        console.error('生成建議失敗:', error);
        toast({
          title: "建議生成失敗",
          description: "無法生成圖表建議，請選擇圖表類型並手動描述您想要的圖表。",
          variant: "destructive",
        });
      } finally {
        setIsSuggestionLoading(false);
      }
    }
  }, [toast, optimizeDataPrecision, analyzeDataAndRecommendCharts]);

  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
  }, []);

  // 處理 LLM 響應，判斷是否使用時間序列數據組裝
  const processLLMResponse = (config, fullData) => {
    if (config._time_series_data) {
      try {
        console.log('🔄 使用時間序列數據組裝邏輯');
        config.series = assembleTimeSeriesData(fullData, config._assembly_instructions);
        
        // 添加標記，表示數據已經組裝完成
        config._data_assembled = true;
        delete config._time_series_data;
        delete config._assembly_instructions;
      } catch (error) {
        console.error('時間序列數據組裝失敗，使用原始配置:', error);
        delete config._time_series_data;
        delete config._assembly_instructions;
      }
    }
    return config;
  };

  // 組裝時間序列數據 - 根據用戶反饋修正
  const assembleTimeSeriesData = (fullData, instructions) => {
    const { timeColumn, series } = instructions;
    
    return series.map(seriesConfig => ({
      name: seriesConfig.name,        // 使用 LLM 提供的友善名稱
      type: seriesConfig.type,        // 使用 LLM 決定的圖表類型
      data: fullData.map(row => {
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
        
        return [timestamp, parseFloat(row[seriesConfig.column]) || 0];
      }).filter(point => point !== null)  // 過濾掉 null 值
    }));
  };

  // 根據圖表類型生成專門的 prompt 模板
  const getChartTypeSpecificPrompt = (chartType: string, userPrompt: string, headers: string, dataSample: string) => {
    const basePrompt = `
      你是一位精通 Highcharts 的數據可視化專家。

      第一步：判斷處理策略
      數據量：${fileData.data.length} 行
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
          "data": [[1546560000000.0, 0.0], [1547164800000.0, 0.0], [1547769600000.0, 0.0], ...],
          "name": "USDC",
          "type": "area"
        },
        {
          "data": [[1546560000000.0, 1.8984], [1547164800000.0, 1.9733], [1547769600000.0, 2.0499], ...],
          "name": "USDT", 
          "type": "area"
        }
      ]
      其中 data 是 [時間戳毫秒, 數值] 的二維陣列，每個 series 包含 data、name、type 三個屬性。

      否則請按照以下完整指令處理：

      任務: 根據使用者提供的數據和自然語言需求，產生一個完整且有效的 Highcharts JSON 設定物件。
      限制:
      1. 你的回覆 **必須** 只包含一個格式完全正確的 JSON 物件。
      2. **絕對不要** 在 JSON 物件前後包含任何文字、註解、或 markdown 語法。
      3. **不要** 使用 \`data.csv\` 或外部 URL 來載入數據。所有需要的數據都應該直接寫在 \`series\` 設定中。
      4. 根據下方提供的數據範例來決定 x 軸 (categories/datetime) 和 y 軸 (data) 的對應關係。

      數據的欄位 (Headers): ${headers}
      數據範例: ${dataSample}
      使用者的需求: "${userPrompt}"
    `;

    const chartTypeTemplates = {
      'line': `
        ${basePrompt}
        
        **線圖專門指令：**
        - 專注於時間序列數據的展示
        - 確保 X 軸正確處理時間數據（使用 datetime 類型，並把日期或年份轉換為timestamp）
        - 多條線使用不同顏色區分
        - 設置適當的 lineWidth (建議 3)
        - 預設不添加數據點標記 ("marker": {"enabled": false})，除非用戶特別指名要添加
        - 如有多個數據系列，確保圖例清晰
        
        現在，請產生專門用於線圖的 Highcharts JSON 設定物件。
      `,
      
      'column': `
        ${basePrompt}
        
        **柱狀圖專門指令：**
        - 如果是類別數據的比較，則確保 X 軸使用 categories 類型
        - 如果是時間序列數據的趨勢比較，則保 X 軸正確處理時間數據（使用 datetime 類型，並把日期或年份轉換為timestamp）
        - 設置適當的柱狀圖寬度和間距
        - 如有多個數據系列，考慮使用分組或堆疊
        - 如果數據數量不多的時候，添加數據標籤以提高可讀性，數據數量多的時候，則不添加數據標籤
        - 設置適當的 Y 軸範圍和標籤
        
        現在，請產生專門用於柱狀圖的 Highcharts JSON 設定物件。
      `,
      
      'area': `
        ${basePrompt}
        
        **面積圖專門指令：**
        - 強調數據的累積效果和趨勢
        - 使用適當的填充透明度 (fillOpacity)
        - 確保顏色搭配協調
        - 考慮使用 stacking 來展示累積效果
        - 設置平滑的曲線效果
        
        現在，請產生專門用於面積圖的 Highcharts JSON 設定物件。
      `,
      
      'pie': `
        ${basePrompt}
        
        **圓餅圖專門指令：**
        - 專注於比例關係的展示，圓餅圖適合展示數據的組成比例
        - 確保數據加總為有意義的整體
        - 設置適當的餅圖大小和位置
        - 添加數據標籤顯示百分比，數據數量不多的時候，添加數據標籤，數據數量多的時候，則不添加數據標籤
        - 考慮使用 allowPointSelect 讓用戶互動
        - 設置適當的顏色對比
        
        現在，請產生專門用於餅圖的 Highcharts JSON 設定物件。
      `,
      
      'scatter': `
        ${basePrompt}
        
        **散佈圖專門指令：**
        - 專注於兩個變量之間的關係
        - 確保 X 和 Y 軸都使用數值數據
        - 設置適當的散點大小和透明度
        - 考慮添加趨勢線或回歸線
        - 如有分類，使用不同顏色或形狀區分
        - 設置適當的軸範圍以突出相關性
        
        現在，請產生專門用於散點圖的 Highcharts JSON 設定物件。
      `,
      
      'stacked_column': `
        ${basePrompt}
        
        **堆疊柱狀圖專門指令：**
        - 專注於組成結構的展示
        - 使用 stacking: 'normal' 或 'percent'
        - 確保每個堆疊部分有清晰的標籤
        - 設置適當的顏色區分各個組成部分
        - 考慮添加總計標籤
        - 設置清晰的圖例說明
        
        現在，請產生專門用於堆疊柱狀圖的 Highcharts JSON 設定物件。
      `,
      
      'spline': `
        ${basePrompt}
        
        **平滑線圖專門指令：**
        - 專注於平滑趨勢的展示
        - 使用 spline 類型創建平滑曲線
        - 設置適當的平滑度參數
        - 考慮添加數據點標記
        - 確保線條粗細適中
        - 處理好時間序列數據
        
        現在，請產生專門用於平滑線圖的 Highcharts JSON 設定物件。
      `,
      
      'donut': `
        ${basePrompt}
        
        **環形圖專門指令：**
        - 專注於比例關係的展示，中間留空
        - 設置適當的內徑和外徑比例
        - 考慮在中心添加總計或關鍵數字
        - 設置適當的數據標籤位置
        - 使用協調的顏色方案
        - 確保圖例清晰易讀
        
        現在，請產生專門用於環形圖的 Highcharts JSON 設定物件。
      `
    };

    return chartTypeTemplates[chartType] || `
      ${basePrompt}
      
      **通用圖表指令：**
      - 根據數據特性和用戶需求選擇最合適的圖表配置
      - 確保圖表清晰易讀
      - 設置適當的顏色和樣式
      - 添加必要的標籤和說明
      
      現在，請產生 Highcharts JSON 設定物件。
    `;
  };

  const generateChart = async () => {
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
      const smartPrompt = getChartTypeSpecificPrompt(selectedChartType, prompt, headers, dataSample);

      const chartConfigString = await generateChartConfig(smartPrompt);
      let configStr = chartConfigString.replace(/^```json\s*/, '').replace(/```$/, '');
      const firstBracket = configStr.indexOf('{');
      const lastBracket = configStr.lastIndexOf('}');
      
      if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("AI 回傳的內容中找不到有效的 JSON 物件。");
      }
      
      configStr = configStr.substring(firstBracket, lastBracket + 1);
      const aiChartOptions = JSON.parse(configStr);
      
      // 處理 LLM 響應，檢查是否需要時間序列數據組裝
      const processedOptions = processLLMResponse(aiChartOptions, fileData.data);

            // 動態生成 MM_THEME 配置
      const generateMMTheme = (size = 'standard', chartOptions = null) => {
        const isLarge = size === 'large';
        
        // 檢查圖表類型，決定是否需要 lineWidth
        const needsLineWidth = () => {
          if (!chartOptions || !chartOptions.series) return false;
          
          // 檢查是否有任何 series 使用線條類型
          const lineBasedTypes = ['line', 'spline', 'area', 'areaspline'];
          return chartOptions.series.some(series => 
            lineBasedTypes.includes(series.type)
          );
        };
        
        // 根據圖表類型決定 plotOptions
        const getPlotOptions = () => {
          const seriesOptions: any = {
            'marker': {'enabled': false},
          };
          
          // 只對需要線條的圖表類型添加 lineWidth
          if (needsLineWidth()) {
            seriesOptions.lineWidth = 3;
          }
          
          return {
            'series': seriesOptions
          };
        };
        
        return {
          'lang': {'numericSymbols': ["K", "M", "B", "T", "P", "E"]},
          'colors': [
            '#3BAFDA','#E9573F','#F6BB42','#70CA63','#7D5B4F','#3B3F4F',
            '#926DDE','#57C7D4','#F44C87','#BC94AC','#184E74','#026352',
            '#C1C286','#AA2906','#A5FFD6','#84DCC6','#FF99AC','#17C3B2',
            '#D68C45','#6F2DBD','#F7AEF8','#B388EB','#8093F1','#72DDF7',
            '#94D2BD','#E9D8A6','#EE9B00','#FFEE32','#37BC9B',
          ],
          'chart': {
            'backgroundColor': '#ffffff',
            'width': isLarge ? 975 : 960,
            'height': isLarge ? 650 : 540,
            'style': {
              'fontFamily': '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
            }
          },
          'title': {
            'style': {
              'color': '#333333', 
              'fontSize': isLarge ? '26px' : '16px', 
              'fontWeight': '450'
            }
          },
          'subtitle': {
            'text': 'MacroMicro.me | MacroMicro',
            'style': {
              'color': '#666666', 
              'fontSize': isLarge ? '20px' : '12px'
            }
          },
          'xAxis': {
            'lineColor': '#d8d8d8', 'lineWidth': 1,
            'tickColor': '#d8d8d8', 'tickWidth': 1,
            'labels': {
              'style': {
                'color': '#666666', 
                'fontSize': isLarge ? '16px' : '11px'
              }
            },
            'tickPixelInterval': 150,
            'title': {'text': ''}
          },
          'yAxis': {
            'gridLineColor': '#e6e6e6', 'gridLineWidth': 1,
            'labels': {
              'style': {
                'color': '#666666', 
                'fontSize': isLarge ? '16px' : '11px', 
                'fontWeight': '450'
              }
            },
            'title': {
              'style': {
                'color': '#666666', 
                'fontSize': isLarge ? '17px' : '11px'
              }
            }
          },
          'legend': {
            'itemStyle': {
              'color': '#000000', 
              'fontSize': isLarge ? '24px' : '20px', 
              'fontWeight': '600'
            }
          },
          'plotOptions': getPlotOptions(),
          'credits': {'enabled': false},
          'exporting': {'enabled': false}
        };
      };

      // 根據 AI 回傳的圖表尺寸決定使用哪個主題
      const chartSize = processedOptions.chart?.width === 975 && processedOptions.chart?.height === 650 ? 'large' : 'standard';
      const MM_THEME = generateMMTheme(chartSize, processedOptions);

      // 合併 AI 設定與 MM_THEME 樣式
      const finalChartOptions = {
        ...processedOptions,
        lang: MM_THEME.lang,
        colors: MM_THEME.colors,
        chart: { 
          ...processedOptions.chart, 
          ...MM_THEME.chart
        },
        title: { 
          ...processedOptions.title, 
          style: MM_THEME.title.style
        },
        subtitle: { 
          ...processedOptions.subtitle, 
          ...MM_THEME.subtitle
        },
        xAxis: { 
          ...(Array.isArray(processedOptions.xAxis) ? processedOptions.xAxis[0] : processedOptions.xAxis), 
          ...MM_THEME.xAxis
        },
        legend: { 
          ...processedOptions.legend, 
          ...MM_THEME.legend
        },
        plotOptions: {
          ...processedOptions.plotOptions,
          ...MM_THEME.plotOptions,
          series: {
            ...processedOptions.plotOptions?.series,
            ...MM_THEME.plotOptions.series
          }
        },
        credits: MM_THEME.credits,
        exporting: MM_THEME.exporting
      };

      const yAxisTemplate = MM_THEME.yAxis;

      if (Array.isArray(processedOptions.yAxis)) {
        finalChartOptions.yAxis = processedOptions.yAxis.map(axis => ({
          ...axis, 
          ...yAxisTemplate, 
          labels: { ...axis.labels, style: yAxisTemplate.labels.style }, 
          title: { ...axis.title, style: yAxisTemplate.title.style }
        }));
      } else {
        finalChartOptions.yAxis = { 
          ...(processedOptions.yAxis || {}), 
          ...yAxisTemplate, 
          labels: { ...(processedOptions.yAxis?.labels), style: yAxisTemplate.labels.style }, 
          title: { ...(processedOptions.yAxis?.title), style: yAxisTemplate.title.style }
        };
      }

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

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast({
        title: "已複製",
        description: "圖表設定碼已複製到剪貼簿",
      });
    }).catch(() => {
      toast({
        title: "複製失敗",
        description: "無法複製到剪貼簿",
        variant: "destructive",
      });
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">MM AI Highcharts圖表生成器</h1>
        <p className="mt-2 text-gray-600">上傳您的 CSV 或 Excel 數據，用自然語言描述，讓 AI 為您生成互動式圖表。</p>
      </header>

      <div className="space-y-8">
        {/* 步驟一：上傳檔案與數據預覽 */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                1
              </span>
              上傳您的 CSV / Excel 檔案
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <FileUpload onFileUpload={handleFileUpload} />
              
              {/* 數據預覽 */}
              {fileData && (
                <div className="space-y-3">
                  <div className="flex items-center pt-3 border-t border-gray-200">
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">數據預覽 (標頭與儲存格可直接編輯)</span>
                  </div>
                  <DataPreview data={fileData} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 步驟二：查看AI建議並描述需求 */}
        {fileData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  2
                </span>
                描述您想看的圖表
                {isSuggestionLoading && (
                  <div className="ml-2 flex items-center text-sm text-blue-600">
                    <div className="w-4 h-4 mr-1 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    AI 分析中...
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isSuggestionLoading && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-sm text-blue-700">
                      <div className="w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      正在分析您的數據並生成圖表建議...
                    </div>
                  </div>
                )}
                <Textarea
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder={isSuggestionLoading 
                    ? "正在為您生成建議..." 
                    : "請幫我畫出堆疊柱狀圖，X軸是Date、但不要顯示title text，Y軸分別使用A、B、C，顏色依序使用#84C3E0 , #30617D, #D97871，Y軸 title 的text = 金額 (億元)，Title = 中國-歷年財政預算赤字總額，Legend放在最下面、不要有border"}
                  className="min-h-[150px]"
                  disabled={isSuggestionLoading}
                />
                {prompt && !isSuggestionLoading && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    💡 AI 已根據您的數據生成建議，您可以直接使用或進行修改
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步驟三：選擇圖表類型 */}
        {fileData && prompt && !isSuggestionLoading && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  3
                </span>
                選擇圖表類型
                {recommendedChartTypes.length > 0 && (
                  <span className="ml-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                    AI 已推薦 {recommendedChartTypes.length} 種適合的圖表類型
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartGallery
                selectedChartType={selectedChartType}
                onChartTypeSelect={handleChartTypeSelect}
                recommendedTypes={recommendedChartTypes}
              />
            </CardContent>
          </Card>
        )}

        {/* 圖表生成與顯示 - 只有在選擇了圖表類型後才顯示 */}
        {selectedChartType && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center text-xl">
                  <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                    4
                  </span>
                  生成與設定圖表
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {(() => {
                      const chartTypeNames = {
                        'line': '折線圖',
                        'column': '柱狀圖',
                        'area': '面積圖',
                        'pie': '圓餅圖',
                        'scatter': '散佈圖',
                        'stacked_column': '堆疊柱狀圖',
                        'spline': '平滑線圖',
                        'donut': '環形圖'
                      };
                      return chartTypeNames[selectedChartType] || selectedChartType;
                    })()}
                  </span>
                </span>
                {chartOptions && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {showSettings ? '隱藏設定' : '顯示設定'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyCode}>
                      <Copy className="h-4 w-4 mr-1" />
                      複製程式碼
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button 
                onClick={generateChart}
                disabled={isLoading || !fileData}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
              >
                <Zap className="w-5 h-5 mr-2" />
                {isLoading ? '生成中...' : '生成圖表'}
              </Button>

              {/* 圖表顯示區域 */}
              <div className="w-full">
                <ChartDisplay 
                  chartOptions={chartOptions} 
                  isLoading={isLoading}
                  setChartOptions={setChartOptions}
                />
              </div>

              {/* 設定面板 */}
              {showSettings && chartOptions && (
                <>
                  <Separator />
                  <SettingsPanel 
                    chartOptions={chartOptions}
                    onOptionsChange={setChartOptions}
                  />
                </>
              )}

              {/* 程式碼顯示 */}
              {generatedCode && (
                <Card className="bg-gray-900">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-semibold text-gray-300">
                        生成的 Highcharts 設定碼
                      </Label>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={copyCode}
                        className="bg-gray-700 hover:bg-gray-600"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        複製
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-white overflow-x-auto max-h-48 bg-gray-800 p-4 rounded">
                      <code>{generatedCode}</code>
                    </pre>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
