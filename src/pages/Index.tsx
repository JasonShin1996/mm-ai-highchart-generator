import React, { useState, useRef, useCallback } from 'react';
import { Upload, Zap, Settings, Copy, Eye, FileSpreadsheet, Edit, Database, X, Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import ChartDisplay from '@/components/ChartDisplay';
import SettingsPanel from '@/components/SettingsPanel';
import ChartGallery from '@/components/ChartGallery';
import DatabaseSearchDialog from '@/components/DatabaseSearchDialog';
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
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [showDatabaseDialog, setShowDatabaseDialog] = useState(false);
  const [databaseData, setDatabaseData] = useState(null);
  const { toast } = useToast();

  // 處理數據變化
  const handleDataChange = useCallback((newData) => {
    setFileData(newData);
  }, []);

  // 處理資料庫數據載入
  const handleDatabaseDataLoaded = useCallback((data) => {
    setDatabaseData(data);
    // 不清空檔案數據，讓兩種數據源可以共存
    setChartOptions(null);
    setShowSettings(false);
    setPrompt('');
    setGeneratedCode('');
    setSelectedChartType(null);
    setRecommendedChartTypes([]);
    
    console.log('Database data loaded:', data);
    
    toast({
      title: "資料庫數據已載入",
      description: `已載入 ${data.length} 個時間序列`,
    });
  }, [toast]);

  // 清除資料庫數據
  const clearDatabaseData = useCallback(() => {
    setDatabaseData(null);
    setChartOptions(null);
    setShowSettings(false);
    setPrompt('');
    setGeneratedCode('');
    setSelectedChartType(null);
    setRecommendedChartTypes([]);
    
    toast({
      title: "資料庫數據已清除",
      description: "已清除所有載入的資料庫數據",
    });
  }, [toast]);

  // 清除特定的資料庫數據項目
  const clearDatabaseDataItem = useCallback((itemId: string) => {
    if (databaseData) {
      const newData = databaseData.filter(item => item.id !== itemId);
      setDatabaseData(newData.length > 0 ? newData : null);
      
      // 如果清除後沒有數據，也清除圖表
      if (newData.length === 0) {
        setChartOptions(null);
        setShowSettings(false);
        setPrompt('');
        setGeneratedCode('');
        setSelectedChartType(null);
        setRecommendedChartTypes([]);
      }
      
      toast({
        title: "數據項目已移除",
        description: `已移除 ${itemId} 數據`,
      });
    }
  }, [databaseData, toast]);

  // 圖表類型名稱映射
  const getChartTypeName = (chartType: string) => {
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
    
    // 檢查是否有負值（用於瀑布圖推薦）
    const hasNegativeValues = numericalFields.some(field => {
      const values = sampleData.map(row => row[field]).filter(v => v !== null && v !== undefined);
      return values.some(v => parseFloat(v) < 0);
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
  }, []);

  // 處理圖表類型選擇
  const handleChartTypeSelect = useCallback((chartType: string) => {
    if (chartType === 'random') {
      // 擲筊功能：隨機選擇一個圖表類型
      const availableTypes = ['line', 'column', 'area', 'pie', 'scatter', 'stacked_column', 'spline', 'donut', 'bubble', 'waterfall', 'combo'];
      const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      setSelectedChartType(randomType);
      
      toast({
        title: "擲筊結果",
        description: `命運選擇了 ${getChartTypeName(randomType)}！`,
      });
    } else {
      setSelectedChartType(chartType);
    }
  }, [toast, getChartTypeName]);

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
        console.log('收到的建議:', suggestion); // 調試用
        
        // 容錯處理：檢查 suggestion 格式
        if (!suggestion || typeof suggestion !== 'object') {
          throw new Error('後端返回格式錯誤');
        }
        
        const description = suggestion.description || '請根據您的數據特性描述想要的圖表類型和樣式';
        const chartType = suggestion.recommended_chart_type || 'column';
        const confidence = suggestion.confidence || 0.5;
        
        setPrompt(description.trim());
        setSelectedChartType(chartType); // 自動選擇推薦的圖表類型
        
        toast({
          title: "建議已生成",
          description: `AI 已根據您的數據生成圖表建議，並自動選擇了 ${getChartTypeName(chartType)} (置信度: ${Math.round(confidence * 100)}%)`,
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

  // 解析字符串格式的JavaScript函數
  const parseStringFunctions = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // 如果是數組，遞歸處理每個元素
    if (Array.isArray(obj)) {
      return obj.map(item => parseStringFunctions(item));
    }
    
    // 創建新對象避免直接修改原對象
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && key === 'formatter') {
        // 檢查是否為函數字符串格式
        const functionPattern = /^function\s*\([^)]*\)\s*\{[\s\S]*\}$/;
        if (functionPattern.test(value.trim())) {
          try {
            // 安全地轉換函數字符串為實際函數
            // 使用 Function 構造器比 eval 更安全
            const functionMatch = value.trim().match(/^function\s*\(([^)]*)\)\s*\{([\s\S]*)\}$/);
            if (functionMatch) {
              const params = functionMatch[1].trim();
              const body = functionMatch[2].trim();
              result[key] = new Function(params, body);
              console.log(`🔄 轉換 formatter 函數: ${key}`);
            } else {
              result[key] = value; // 如果無法解析，保持原值
            }
          } catch (error) {
            console.error(`⚠️ 無法轉換 formatter 函數 ${key}:`, error);
            result[key] = value; // 轉換失敗，保持原值
          }
        } else {
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // 遞歸處理嵌套對象
        result[key] = parseStringFunctions(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };

  // 處理 LLM 響應，判斷是否使用時間序列數據組裝
  const processLLMResponse = (config, fullData) => {
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
        
        
        **正確範例：**
        \`\`\`json
        // 時間序列
        {
          "chart": {"type": "line"},
          "title": {"text": "標題"},
          "xAxis": {"type": "datetime"},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "line",
            "lineWidth": 3,
            "marker": {"enabled": false},
            "data": [[1609459200000, 120], [1612137600000, 135]]
          }]
        }
        
        // 類別數據
        {
          "chart": {"type": "line"},
          "title": {"text": "標題"},
          "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "line",
            "lineWidth": 3,
            "marker": {"enabled": false},
            "data": [85, 90, 88, 92]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "line" ❌ → chart: {"type": "line"} ✅
        - series: {...} ❌ → series: [{...}] ✅
        - data: ["2023-01-01", 100] ❌ → data: [1672531200000, 100] ✅
        
        **數據格式：**
        - 時間序列：data: [[時間戳毫秒, 數值], ...]
        - 類別數據：xAxis.categories + data: [數值1, 數值2, ...]
        
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
        
        **正確範例：**
        \`\`\`json
        // 時間序列
        {
          "chart": {"type": "column"},
          "title": {"text": "標題"},
          "xAxis": {"type": "datetime"},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "column",
            "data": [[1609459200000, 120], [1612137600000, 135]]
          }]
        }
        
        // 類別數據
        {
          "chart": {"type": "column"},
          "title": {"text": "標題"},
          "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "column",
            "data": [85, 90, 88, 92]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "column" ❌ → chart: {"type": "column"} ✅
        - series: {...} ❌ → series: [{...}] ✅
        - data: ["2023-01-01", 100] ❌ → data: [1672531200000, 100] ✅
        
        **數據格式：**
        - 時間序列：data: [[時間戳毫秒, 數值], ...]
        - 類別數據：xAxis.categories + data: [數值1, 數值2, ...]
        
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
        
        **正確範例：**
        \`\`\`json
        // 時間序列
        {
          "chart": {"type": "area"},
          "title": {"text": "標題"},
          "xAxis": {"type": "datetime"},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "area",
            "fillOpacity": 0.5,
            "data": [[1609459200000, 120], [1612137600000, 135]]
          }]
        }
        
        // 類別數據
        {
          "chart": {"type": "area"},
          "title": {"text": "標題"},
          "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "area",
            "fillOpacity": 0.5,
            "data": [85, 90, 88, 92]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "area" ❌ → chart: {"type": "area"} ✅
        - series: {...} ❌ → series: [{...}] ✅
        - data: ["2023-01-01", 100] ❌ → data: [1672531200000, 100] ✅
        
        **數據格式：**
        - 時間序列：data: [[時間戳毫秒, 數值], ...]
        - 類別數據：xAxis.categories + data: [數值1, 數值2, ...]
        
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
        
        **正確範例：**
        \`\`\`json
        // 基本圓餅圖
        {
          "chart": {"type": "pie"},
          "title": {"text": "標題"},
          "plotOptions": {
            "pie": {
              "allowPointSelect": true,
              "cursor": "pointer",
              "dataLabels": {"enabled": true, "format": "{point.name}: {point.percentage:.1f}%"}
            }
          },
          "series": [{
            "name": "比例",
            "data": [
              {"name": "類別A", "y": 45.0},
              {"name": "類別B", "y": 26.8},
              {"name": "類別C", "y": 12.8},
              {"name": "類別D", "y": 8.5},
              {"name": "其他", "y": 6.9}
            ]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "pie" ❌ → chart: {"type": "pie"} ✅
        - series: {...} ❌ → series: [{...}] ✅
        - data: ["A", 45] ❌ → data: [{"name": "A", "y": 45}] ✅
        - series 中設置 type: "pie" ❌ → chart 層級已設置，series 中不需要 ✅
        
        **數據格式：**
        - 使用 name-value pairs: {"name": "類別名", "y": 數值}
        - 不需要 xAxis/yAxis 設置
        - 一個 series 包含所有數據點
        
        現在，請產生專門用於餅圖的 Highcharts JSON 設定物件。
      `,
      
      'scatter': `
        ${basePrompt}
        
        **散佈圖專門指令：**
        - **關鍵**：tooltip 配置必須在全局層級
        - 日期時間數據使用 xAxis.type: "datetime" 和時間戳格式
        - 預設使用 circle symbol，可設置 radius 調整大小
        
        **正確範例：**
        \`\`\`json
        // 基本散佈圖
        {
          "chart": {"type": "scatter"},
          "title": {"text": "標題"},
          "xAxis": {"title": {"text": "X軸標題"}},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "tooltip": {"pointFormat": "X: {point.x}<br>Y: {point.y}"},
          "plotOptions": {
            "scatter": {
              "marker": {"radius": 5, "symbol": "circle"},
            },
            "series": {
              "marker": {"enabled": true},
            }
          },
          "series": [{
            "name": "數據點",
            "data": [[10, 15], [20, 25], [30, 35]]
          }]
        }
        
        // 日期時間散佈圖
        {
          "chart": {"type": "scatter"},
          "xAxis": {"type": "datetime"},
          "tooltip": {"pointFormat": "<b>{point.name}</b><br>日期: {point.x:%Y-%m-%d}<br>數值: {point.y}"},
          "plotOptions": {
            "scatter": {
              "marker": {"radius": 5, "symbol": "circle"}
            },
            "series": {
              "marker": {"enabled": true},
            }
          },
          "series": [{
            "name": "數據點",
            "data": [
              {"x": 1609459200000, "y": 120, "name": "點A"},
              {"x": 1612137600000, "y": 135, "name": "點B"}
            ]
          }]
        }
        \`\`\`

        **🚨 散佈圖致命錯誤警告 🚨**
        **絕對不能使用 plotOptions.series.marker.enabled: false**
        **這會讓所有散點消失，圖表完全無法顯示！**
        
        **🚨 絕對不能這樣做 🚨**
        \`\`\`json
        {
          "plotOptions": {
            "scatter": {
              "marker": {"radius": 5, "symbol": "circle"}  // 正確設置
            },
            "series": {
              "marker": {"enabled": false}  // ❌ 致命錯誤！會隱藏所有散點
            }
          }
        }
        \`\`\`
        
        **🚨 致命錯誤防止清單 🚨**
        - **絕對禁止**：plotOptions.series.marker.enabled: false (會隱藏所有散點!)
        - **絕對禁止**：任何 plotOptions.series 設置，散佈圖只能用 plotOptions.scatter
        - **絕對禁止**：在任何地方使用 marker.enabled: false
        - 數據格式：[[x1, y1], [x2, y2], ...]
        - 可用symbols：circle, square, diamond, triangle, triangle-down
        - 日期時間數據：{"x": 時間戳, "y": 數值, "name": "點名"}
        
        **檢查清單：**
        - [ ] 確認沒有 plotOptions.series 設置
        - [ ] 確認沒有 marker.enabled: false
        - [ ] 確認有 plotOptions.scatter.marker 設置
        
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
        
        **正確範例：**
        \`\`\`json
        // 時間序列
        {
          "chart": {"type": "column"},
          "title": {"text": "標題"},
          "xAxis": {"type": "datetime"},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "plotOptions": {"column": {"stacking": "normal"}},
          "series": [
            {
              "name": "系列A",
              "type": "column",
              "data": [[1609459200000, 120], [1612137600000, 135]]
            },
            {
              "name": "系列B",
              "type": "column", 
              "data": [[1609459200000, 80], [1612137600000, 95]]
            }
          ]
        }
        
        // 類別數據
        {
          "chart": {"type": "column"},
          "title": {"text": "標題"},
          "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "plotOptions": {"column": {"stacking": "normal"}},
          "series": [
            {
              "name": "系列A",
              "type": "column",
              "data": [85, 90, 88, 92]
            },
            {
              "name": "系列B", 
              "type": "column",
              "data": [45, 55, 50, 48]
            }
          ]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "column" ❌ → chart: {"type": "column"} ✅
        - series: {...} ❌ → series: [{...}] ✅
        - 忘記設置 plotOptions.column.stacking ❌ → 設置 "stacking": "normal" ✅
        
        **數據格式：**
        - 時間序列：data: [[時間戳毫秒, 數值], ...]
        - 類別數據：xAxis.categories + data: [數值1, 數值2, ...]
        - 多個 series 用於不同堆疊層
        
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
        
        **正確範例：**
        \`\`\`json
        // 時間序列
        {
          "chart": {"type": "spline"},
          "title": {"text": "標題"},
          "xAxis": {"type": "datetime"},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "spline",
            "lineWidth": 3,
            "marker": {"enabled": false},
            "data": [[1609459200000, 120], [1612137600000, 135]]
          }]
        }
        
        // 類別數據
        {
          "chart": {"type": "spline"},
          "title": {"text": "標題"},
          "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "series": [{
            "name": "系列名",
            "type": "spline",
            "lineWidth": 3,
            "marker": {"enabled": false},
            "data": [85, 90, 88, 92]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "spline" ❌ → chart: {"type": "spline"} ✅
        - series: {...} ❌ → series: [{...}] ✅
        - data: ["2023-01-01", 100] ❌ → data: [1672531200000, 100] ✅
        
        **數據格式：**
        - 時間序列：data: [[時間戳毫秒, 數值], ...]
        - 類別數據：xAxis.categories + data: [數值1, 數值2, ...]
        
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
        
        **正確範例：**
        \`\`\`json
        // 基本環形圖
        {
          "chart": {"type": "pie"},
          "title": {"text": "標題"},
          "plotOptions": {
            "pie": {
              "innerSize": "60%",
              "allowPointSelect": true,
              "cursor": "pointer",
              "dataLabels": {"enabled": true, "format": "{point.name}: {point.percentage:.1f}%"}
            }
          },
          "series": [{
            "name": "比例",
            "data": [
              {"name": "類別A", "y": 45.0},
              {"name": "類別B", "y": 26.8},
              {"name": "類別C", "y": 12.8},
              {"name": "類別D", "y": 8.5},
              {"name": "其他", "y": 6.9}
            ]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "donut" ❌ → chart: {"type": "pie"} + innerSize ✅
        - series: {...} ❌ → series: [{...}] ✅
        - data: ["A", 45] ❌ → data: [{"name": "A", "y": 45}] ✅
        - series 中設置 type: "pie" ❌ → chart 層級已設置，series 中不需要 ✅
        
        **數據格式：**
        - 使用 name-value pairs: {"name": "類別名", "y": 數值}
        - 不需要 xAxis/yAxis 設置
        - 一個 series 包含所有數據點
        - 使用 innerSize 創建中心空洞
        
        現在，請產生專門用於環形圖的 Highcharts JSON 設定物件。
      `,
      
      'bubble': `
        ${basePrompt}
        
        **泡泡圖專門指令：**
        - 專注於三維數據關係的展示（X軸、Y軸、泡泡大小）
        - 使用 bubble 圖表類型
        - 數據格式建議使用對象格式 {x, y, z, name} 以支援豐富的標籤和tooltip
        - 設置適當的泡泡大小範圍 (minSize/maxSize)
        - 如果要讓每個泡泡有不同顏色，可以在series中設置colorByPoint: true
        - 添加 dataLabels 顯示有意義的標籤
        - 優化 tooltip 顯示完整的三維信息，但如果數據量太大，也可以不顯示
        
        **正確範例：**
        \`\`\`json
        {
          "chart": {"type": "bubble"},
          "title": {"text": "標題"},
          "xAxis": {"title": {"text": "X軸標題"}},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "plotOptions": {
            "series": {
              "minSize": 10,
              "maxSize": 60,
              "dataLabels": {
                "enabled": true,
                "format": "{point.name}"
              }
            }
          },
          "series": [{
            "name": "系列名",
            "type": "bubble",
            "colorByPoint": true,
            "data": [
              {x: 50, y: 60, z: 10, name: 項目A},
              {x: 60, y: 70, z: 15, name: 項目B},
              {x: 70, y: 80, z: 20, name: 項目C}
            ]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - chart: "bubble" ❌ → chart: {"type": "bubble"} ✅
        - 簡單數組格式 [x, y, z] ❌ → 對象格式 {x, y, z, name} ✅
        - 忘記設置泡泡大小範圍 ❌ → 設置 minSize/maxSize ✅
        - 沒有標籤顯示 ❌ → 添加 dataLabels ✅
        
        **數據格式：**
        - 推薦對象格式：{x: 數值, y: 數值, z: 數值, name: "標籤"}
        - x, y 為坐標位置，z 為泡泡大小，name 為顯示標籤
        - 可添加額外字段用於 tooltip 顯示
        
        **樣式建議：**
        - 使用 colorByPoint: true 讓每個泡泡有不同顏色
        - 設置合理的 minSize (10-20) 和 maxSize (50-80)
        - 啟用 dataLabels 提升可讀性
        
        現在，請產生專門用於泡泡圖的 Highcharts JSON 設定物件。
      `,
      
      'waterfall': `
        ${basePrompt}
        
        **瀑布圖專門指令：**
        - 專注於累積變化和組成結構的展示
        - 使用 waterfall 圖表類型
        - 設置 upColor（正值）和 color（負值）來區分增減變化
        - 總計和中間小計可以單獨設置顏色
        - 添加 dataLabels 顯示格式化的變化量
        - 優化 tooltip 顯示詳細信息
        
        **正確範例：**
        \`\`\`json
        {
          "chart": {"type": "waterfall"},
          "title": {"text": "標題"},
          "xAxis": {"type": "category"},
          "yAxis": {"title": {"text": "Y軸標題"}},
          "tooltip": {
            "pointFormat": "<b>{point.y:,.0f}</b>"
          },
          "series": [{
            "upColor": "#70CA63",
            "color": "#E9573F", 
            "dataLabels": {
              "enabled": true,
              "format": "{point.y:,.0f}"
            },
            "data": [
              {name: 開始, y: 100000},
              {name: 收入增加, y: 50000},
              {name: 成本減少, y: -30000},
              {name: 小計, y: 120000, isIntermediateSum: true, color: #3BAFDA},
              {name: 其他支出, y: -20000},
              {name: 總計, y: 100000, isSum: true, color: #3BAFDA}
            ]
          }]
        }
        \`\`\`
        
        **避免錯誤：**
        - 使用單一顏色 ❌ → 設置 upColor 和 color 區分正負值 ✅
        - 忘記設置 isSum/isIntermediateSum ❌ → 正確標記總計項目 ✅
        - 沒有數據標籤 ❌ → 添加 dataLabels 格式化顯示 ✅
        - tooltip 不清楚 ❌ → 自定義 pointFormat ✅
        - 總計項目沒有y值 ❌ → isSum 和 isIntermediateSum 都需要設置 y 值 ✅
        
        **數據格式：**
        - 普通項目：{name: 項目名, y: 變化值}
        - 中間小計：{name: 小計, y: 累積值, isIntermediateSum: true, color: #顏色}
        - 總計項目：{name: 總計, y: 最終值, isSum: true, color: #顏色}
        
        **顏色建議：**
        - upColor: 正值顏色（如綠色 #70CA63）
        - color: 負值顏色（如紅色 #E9573F）
        - 總計顏色: 中性顏色（如藍色 #3BAFDA）
        
        現在，請產生專門用於瀑布圖的 Highcharts JSON 設定物件。
      `,
      
      'combo': `
        ${basePrompt}
        
        **組合圖專門指令：**
        - 結合不同圖表類型（如柱狀圖+折線圖）
        - 支援雙軸配置（左軸、右軸）
        - 確保不同類型的數據使用適當的圖表類型
        - 設置清晰的圖例區分不同類型
        - 考慮數據量級差異，使用雙軸
        
        **正確範例：**
        \`\`\`json
        {
          "chart": {"type": "column"},
          "title": {"text": "標題"},
          "xAxis": {"categories": ["1月", "2月", "3月", "4月"]},
          "yAxis": [
            {
              "title": {"text": "銷售額"},
              "labels": {"format": "{value}萬"}
            },
            {
              "title": {"text": "成長率"},
              "labels": {"format": "{value}%"},
              "opposite": true
            }
          ],
          "series": [
            {
              "name": "銷售額",
              "type": "column",
              "yAxis": 1,
              "data": [100, 120, 110, 130]
            },
            {
              "name": "成長率",
              "type": "line",
              "yAxis": 2,
              "data": [10, 20, -8, 18]
            }
          ]
        }
        \`\`\`
        
        **避免錯誤：**
        - 單一圖表類型 ❌ → 多種圖表類型組合 ✅
        - 不使用雙軸 ❌ → 根據數據特性設置雙軸 ✅
        - yAxis 索引錯誤 ❌ → 正確設置 yAxis 索引（從1開始）✅
        
        **數據格式：**
        - 多個 series，每個指定不同的 type
        - 使用 yAxis 索引指定軸（索引從1開始）
        - 設置 opposite: true 讓第二軸顯示在右側
        
        現在，請產生專門用於組合圖的 Highcharts JSON 設定物件。
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
          
          // 檢查是否有任何 series 使用線條類型（包括組合圖中的線條系列）
          const lineBasedTypes = ['line', 'spline', 'area', 'areaspline'];
          return chartOptions.series.some(series => 
            lineBasedTypes.includes(series.type)
          );
        };
        
        // 根據圖表類型決定 plotOptions
        const getPlotOptions = () => {
          // 檢查是否為散佈圖或泡泡圖（需要啟用marker）
          const needsMarkers = () => {
            if (!chartOptions) return false;
            
            // 檢查 chart.type（散佈圖和泡泡圖需要顯示標記點）
            if (chartOptions.chart?.type === 'scatter' || chartOptions.chart?.type === 'bubble') return true;
            
            // 檢查 series 中是否有 scatter 或 bubble 類型（包括組合圖中的散佈/泡泡系列）
            if (chartOptions.series && Array.isArray(chartOptions.series)) {
              return chartOptions.series.some(series => 
                series.type === 'scatter' || series.type === 'bubble'
              );
            }
            
            return false;
          };
          
          const seriesOptions: any = {
            'marker': {'enabled': needsMarkers() ? true : false},
          };
          
          // 只對需要線條的圖表類型添加 lineWidth
          if (needsLineWidth()) {
            seriesOptions.lineWidth = 3;
          }
          
          // 注意：瀑布圖使用預設設定，不需要特殊的 marker 或 lineWidth 處理
          
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
          'exporting': {'enabled': true}
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
        {/* 步驟一：選擇數據源 */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                1
              </span>
              選擇您的數據源
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 左側：檔案上傳 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">本地數據</h3>
                </div>
                
                <div id="file-upload">
                  <FileUpload onFileUpload={handleFileUpload} />
                </div>
                
                {/* 檔案數據摘要 */}
                {fileData && (
                  <div className="flex items-center gap-4 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDataPreview(true)}
                    >
                      <Edit className="mr-1 h-4 w-4" />
                      編輯
                    </Button>
                    <div className="flex items-center">
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        用戶上傳數據已加載：{fileData.data.length} 行 × {fileData.meta.fields.length} 列
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 右側：資料庫搜尋 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Database className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">M平方資料庫</h3>
                </div>
                
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDatabaseDialog(true)}
                    className="flex items-center space-x-2"
                  >
                    <Search className="h-4 w-4" />
                    <span>搜尋數據</span>
                  </Button>
                  <div className="text-sm text-gray-600">
                    {databaseData ? '已載入資料庫數據' : '點擊搜尋載入資料庫數據'}
                  </div>
                </div>

                {/* 資料庫數據摘要 */}
                {databaseData && (
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-2">
                      {databaseData.map((item, index) => {
                        // 為每個數據項目分配顏色
                        const colors = [
                          'bg-blue-50 border-blue-200 text-blue-900',
                          'bg-green-50 border-green-200 text-green-900', 
                          'bg-purple-50 border-purple-200 text-purple-900',
                          'bg-orange-50 border-orange-200 text-orange-900',
                          'bg-red-50 border-red-200 text-red-900'
                        ];
                        const colorClass = colors[index % colors.length];
                        const displayName = item.name_tc || item.id;
                        
                        return (
                          <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                              <div 
                                className={`flex items-center gap-1 px-2 py-1 border rounded-md ${colorClass} max-w-fit cursor-pointer`}
                              >
                                <TrendingUp className="w-3 h-3 flex-shrink-0" />
                                <span className="text-xs font-medium truncate max-w-24">
                                  {displayName}
                                </span>
                                <button
                                  onClick={() => clearDatabaseDataItem(item.id)}
                                  className="p-0.5 rounded-full hover:bg-black/10 flex-shrink-0 ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{displayName}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 步驟二：查看AI建議並描述需求 */}
        {(fileData || databaseData) && (
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
                    {getChartTypeName(selectedChartType)}
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

      {/* 數據預覽 Dialog */}
      <Dialog open={showDataPreview} onOpenChange={setShowDataPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>數據預覽與編輯</DialogTitle>
            <DialogDescription>
              您可以直接編輯表格中的數據，修改會即時生效
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            {fileData && <DataPreview data={fileData} onDataChange={handleDataChange} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* 資料庫搜尋 Dialog */}
      <DatabaseSearchDialog
        open={showDatabaseDialog}
        onOpenChange={setShowDatabaseDialog}
        onDataLoaded={handleDatabaseDataLoaded}
      />
    </div>
  );
};

export default Index;
