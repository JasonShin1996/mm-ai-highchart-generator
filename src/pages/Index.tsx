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

  const handleFileUpload = useCallback(async (data) => {
    setFileData(data);
    setChartOptions(null);
    setShowSettings(false);
    setPrompt(''); // 清空之前的 prompt
    setGeneratedCode(''); // 清空之前的生成代碼
    console.log('File data loaded:', data);
    
    // 如果有數據，自動生成建議
    if (data && data.data && data.data.length > 0 && data.meta && data.meta.fields) {
      setIsSuggestionLoading(true);
      try {
        // 取前10筆數據作為樣本，並優化精度
        const rawSample = data.data.slice(0, 10);
        const dataSample = optimizeDataPrecision(rawSample);
        const suggestion = await generateChartSuggestion(data.meta.fields, dataSample);
        setPrompt(suggestion.trim());
        
        toast({
          title: "建議已生成",
          description: "AI 已根據您的數據生成圖表建議，您可以直接使用或進行修改。",
        });
      } catch (error) {
        console.error('生成建議失敗:', error);
        toast({
          title: "建議生成失敗",
          description: "無法生成圖表建議，請手動描述您想要的圖表。",
          variant: "destructive",
        });
      } finally {
        setIsSuggestionLoading(false);
      }
    }
  }, [toast, optimizeDataPrecision]);

  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
  }, []);

  // 處理 LLM 響應，判斷是否使用時間序列數據組裝
  const processLLMResponse = (config, fullData) => {
    if (config._time_series_data) {
      try {
        console.log('🔄 使用時間序列數據組裝邏輯');
        config.series = assembleTimeSeriesData(fullData, config._assembly_instructions);
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
      data: fullData.map(row => [
        new Date(row[timeColumn]).getTime(),
        parseFloat(row[seriesConfig.column]) || 0
      ])
    }));
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
      
      const smartPrompt = `
        你是一位精通 Highcharts 的數據可視化專家。

        第一步：判斷處理策略
        數據量：${fileData.data.length} 行
        如果數據量大（>100行）且適合自動組裝（時間序列+多數值欄位），請在JSON最前面加上：
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
        
        以下是使用者提供的資訊：
        ---
        數據的欄位 (Headers): ${headers}
        ---
        數據範例: ${dataSample}
        ---
        使用者的需求: "${prompt}"
        ---
        現在，請產生 Highcharts JSON 設定物件。
      `;

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
        {/* 上方：步驟 1 & 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 步驟一：上傳檔案 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  1
                </span>
                上傳您的 CSV / Excel 檔案
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>

          {/* 步驟二：描述需求 */}
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
        </div>

        {/* 數據預覽 */}
        {fileData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                數據預覽 (標頭與儲存格可直接編輯)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataPreview data={fileData} />
            </CardContent>
          </Card>
        )}

        {/* 圖表生成與顯示 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center text-xl">
                <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  3
                </span>
                生成與設定圖表
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
      </div>
    </div>
  );
};

export default Index;
