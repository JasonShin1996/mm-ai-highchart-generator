
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
      // 模擬 AI 圖表生成 (實際應用中會調用 Gemini API)
      const mockChartOptions = generateMockChart(fileData, prompt);
      setChartOptions(mockChartOptions);
      setGeneratedCode(JSON.stringify(mockChartOptions, null, 2));
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

  const generateMockChart = (fileData, prompt) => {
    const headers = fileData.meta.fields;
    const data = fileData.data;
    
    // 簡單的邏輯來生成基本圖表配置
    const firstTextColumn = headers.find(h => 
      data.some(row => isNaN(parseFloat(row[h])))
    );
    const firstNumericColumn = headers.find(h => 
      data.some(row => !isNaN(parseFloat(row[h])))
    );

    const categories = data.map(row => row[firstTextColumn] || '');
    const seriesData = data.map(row => parseFloat(row[firstNumericColumn]) || 0);

    return {
      chart: {
        type: prompt.includes('圓餅') || prompt.includes('pie') ? 'pie' : 
              prompt.includes('線圖') || prompt.includes('line') ? 'line' : 'column',
        backgroundColor: '#ffffff',
        height: 650,
        width: 975,
        style: { fontFamily: 'Noto Sans TC, sans-serif' }
      },
      title: {
        text: `${firstNumericColumn} 分析圖表`,
        style: { color: '#333333', fontSize: '26px', fontWeight: '450' }
      },
      subtitle: {
        text: 'MacroMicro.me | MacroMicro',
        style: { color: '#666666', fontSize: '20px' }
      },
      xAxis: {
        categories: categories,
        lineColor: '#d8d8d8',
        lineWidth: 1,
        labels: { style: { color: '#666666', fontSize: '16px' } },
        tickColor: '#d8d8d8',
        tickWidth: 1
      },
      yAxis: {
        title: { 
          text: firstNumericColumn,
          style: { color: '#666666', fontSize: '17px' }
        },
        gridLineColor: '#e6e6e6',
        gridLineWidth: 1,
        labels: { style: { color: '#666666', fontSize: '16px', fontWeight: '450' } }
      },
      legend: {
        enabled: true,
        itemStyle: { color: '#000000', fontSize: '24px', fontWeight: '500' }
      },
      series: [{
        name: firstNumericColumn,
        data: seriesData,
        color: '#3b82f6'
      }],
      credits: { enabled: false },
      exporting: { enabled: false }
    };
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast({
        title: "已複製",
        description: "程式碼已複製到剪貼簿。",
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* 頁首 */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AI 智慧數據可視化生成器
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            上傳您的 CSV 或 Excel 數據，用自然語言描述，讓 AI 為您生成互動式圖表。
          </p>
        </header>

        <div className="space-y-8">
          {/* 步驟 1 & 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 檔案上傳 */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
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

            {/* 需求描述 */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                    2
                  </span>
                  描述您想看的圖表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="例如：我想看各個地區的銷售額比較，用長條圖，然後把台北的標成紅色"
                  rows={6}
                  value={prompt}
                  onChange={handlePromptChange}
                  className="resize-none"
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
    </div>
  );
};

export default Index;
