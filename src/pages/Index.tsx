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
import { generateChartConfig } from '@/services/gemini';

const Index = () => {
  const [fileData, setFileData] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [chartOptions, setChartOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const { toast } = useToast();

  const handleFileUpload = useCallback((data) => {
    setFileData(data);
    setChartOptions(null);
    setShowSettings(false);
    console.log('File data loaded:', data);
  }, []);

  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
  }, []);

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
      const dataSample = JSON.stringify(fileData.data.slice(0, 100), null, 2);
      
      const fullPrompt = `
        你是一位精通 Highcharts 的數據可視化專家。
        任務: 根據使用者提供的數據和自然語言需求，產生一個完整且有效的 Highcharts JSON 設定物件。
        限制:
        1. 你的回覆 **必須** 只包含一個格式完全正確的 JSON 物件。
        2. **絕對不要** 在 JSON 物件前後包含任何文字、註解、或 markdown 語法。
        3. **不要** 使用 \`data.csv\` 或外部 URL 來載入數據。所有需要的數據都應該直接寫在 \`series\` 設定中。
        4. 根據下方提供的數據範例來決定 x 軸 (categories) 和 y 軸 (data) 的對應關係。
        以下是使用者提供的資訊：
        ---
        數據的欄位 (Headers): ${headers}
        ---
        數據的前 100 筆範例: ${dataSample}
        ---
        使用者的需求: "${prompt}"
        ---
        現在，請產生 Highcharts JSON 設定物件。
      `;

      const chartConfigString = await generateChartConfig(fullPrompt);
      let configStr = chartConfigString.replace(/^```json\s*/, '').replace(/```$/, '');
      const firstBracket = configStr.indexOf('{');
      const lastBracket = configStr.lastIndexOf('}');
      
      if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("AI 回傳的內容中找不到有效的 JSON 物件。");
      }
      
      configStr = configStr.substring(firstBracket, lastBracket + 1);
      const aiChartOptions = JSON.parse(configStr);

      // 合併 AI 設定與固定樣式
      const finalChartOptions = {
        ...aiChartOptions,
        chart: { 
          ...aiChartOptions.chart, 
          backgroundColor: '#ffffff', 
          height: 650, 
          width: 975, 
          style: {'fontFamily': 'Noto Sans TC, sans-serif'}
        },
        title: { 
          ...aiChartOptions.title, 
          style: {'color': '#333333', 'fontSize': '26px', 'fontWeight': '450'}
        },
        subtitle: { 
          ...aiChartOptions.subtitle, 
          style: {'color': '#666666', 'fontSize': '20px'}, 
          text: 'MacroMicro.me | MacroMicro'
        },
        xAxis: { 
          ...(Array.isArray(aiChartOptions.xAxis) ? aiChartOptions.xAxis[0] : aiChartOptions.xAxis), 
          lineColor: '#d8d8d8', 
          lineWidth: 1, 
          labels: { style: {'color': '#666666', 'fontSize': '16px'} }, 
          tickColor: '#d8d8d8', 
          tickPixelInterval: 150, 
          tickWidth: 1 
        },
        legend: { 
          ...aiChartOptions.legend, 
          itemStyle: {'color': '#000000', 'fontSize': '24px', 'fontWeight': '500'}
        },
        credits: { enabled: false },
        exporting: { enabled: false }
      };

      const yAxisTemplate = { 
        gridLineColor: '#e6e6e6', 
        gridLineWidth: 1, 
        labels: { style: {'color': '#666666', 'fontSize': '16px', 'fontWeight': '450'} }, 
        title: { style: {'color': '#666666', 'fontSize': '17px'} } 
      };

      if (Array.isArray(aiChartOptions.yAxis)) {
        finalChartOptions.yAxis = aiChartOptions.yAxis.map(axis => ({
          ...axis, 
          ...yAxisTemplate, 
          labels: { ...axis.labels, style: yAxisTemplate.labels.style }, 
          title: { ...axis.title, style: yAxisTemplate.title.style }
        }));
      } else {
        finalChartOptions.yAxis = { 
          ...(aiChartOptions.yAxis || {}), 
          ...yAxisTemplate, 
          labels: { ...(aiChartOptions.yAxis?.labels), style: yAxisTemplate.labels.style }, 
          title: { ...(aiChartOptions.yAxis?.title), style: yAxisTemplate.title.style }
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
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">AI 智慧數據可視化生成器</h1>
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prompt}
                onChange={handlePromptChange}
                placeholder="例如：我想看各個地區的銷售額比較，用長條圖，然後把台北的標成紅色"
                className="min-h-[150px]"
              />
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
