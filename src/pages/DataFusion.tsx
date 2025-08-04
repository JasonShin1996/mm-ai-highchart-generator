import React, { useState, useCallback } from 'react';
import { Upload, Zap, Settings, Copy, FileSpreadsheet, Edit, ArrowLeft, Database, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import ChartDisplay from '@/components/ChartDisplay';
import SettingsPanel from '@/components/SettingsPanel';
import ChartGallery from '@/components/ChartGallery';
import DatabaseSearchDialog from '@/components/DatabaseSearchDialog';
import { useToast } from '@/hooks/use-toast';
import { generateChartSuggestion } from '@/services/gemini';
import { useChartGeneration } from '@/hooks/useChartGeneration';
import { getChartTypeName, analyzeDataAndRecommendCharts } from '@/utils/chartAnalysis';

const DataFusion = () => {
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [chartOptions, setChartOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);
  const [recommendedChartTypes, setRecommendedChartTypes] = useState<string[]>([]);
  const [availableChartTypes, setAvailableChartTypes] = useState<string[]>([]);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);
  const [fusedData, setFusedData] = useState<any[]>([]);
  const { toast } = useToast();
  
  // 使用圖表生成 hook
  const { generateChart } = useChartGeneration();

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

  // 處理數據變化
  const handleDataChange = useCallback((newData) => {
    setFileData(newData);
  }, []);

  // 處理檔案上傳
  const handleFileUpload = useCallback((data) => {
    console.log('📁 檔案上傳處理開始:', data);
    setFileData(data);
    setChartOptions(null);
    setShowSettings(false);
    setPrompt('');
    setGeneratedCode('');
    setSelectedChartType(null);
    setRecommendedChartTypes([]);
    setFusedData([]); // 重置融合數據
    
    // 如果有數據，分析並推薦圖表類型
    if (data && data.data && data.data.length > 0 && data.meta && data.meta.fields) {
      console.log('🔍 開始數據分析...');
      // 分析數據並自動選擇最佳圖表類型
      const recommendations = analyzeDataAndRecommendCharts(data);
      setRecommendedChartTypes(recommendations);
      
      // 自動選擇第一個推薦的圖表類型（最佳選擇）
      if (recommendations.length > 0) {
        setSelectedChartType(recommendations[0]);
        console.log('🤖 AI 自動選擇圖表類型:', recommendations[0]);
      }
      
      // 開始 AI 分析
      setIsSuggestionLoading(true);
      
      // 優化數據精度
      const optimizedData = optimizeDataPrecision(data.data);
      const dataSample = optimizedData.slice(0, 5);
      
      generateChartSuggestion(data.meta.fields, dataSample)
        .then(suggestion => {
          console.log('✅ AI 分析完成:', suggestion);
          setPrompt(suggestion.description);
          
          // 如果 AI 推薦了圖表類型，自動選擇它
          if (suggestion.recommended_chart_type && !selectedChartType) {
            setSelectedChartType(suggestion.recommended_chart_type);
            console.log('🤖 AI 推薦並自動選擇圖表類型:', suggestion.recommended_chart_type);
          }
          
          // 顯示成功提示
          toast({
            title: "AI 分析完成",
            description: "已根據您的數據生成圖表建議，您可以直接使用或進行修改。",
          });
        })
        .catch(error => {
          console.error('❌ 生成建議失敗:', error);
          
          // 顯示錯誤提示
          toast({
            title: "AI 分析失敗",
            description: "無法生成圖表建議，請手動描述您想要的圖表。",
            variant: "destructive",
          });
        })
        .finally(() => {
          console.log('🏁 AI 分析結束');
          setIsSuggestionLoading(false);
        });
    }
  }, [optimizeDataPrecision, toast]);

  // 處理圖表選項變化
  const handleChartOptionsChange = useCallback((newOptions) => {
    setChartOptions(newOptions);
    setGeneratedCode(JSON.stringify(newOptions, null, 2));
  }, []);

  // 生成圖表
  const generateChartSmart = async () => {
    if (!fileData || !selectedChartType) {
      toast({
        title: "請先上傳檔案並選擇圖表類型",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await generateChart(
        fileData,
        prompt,
        selectedChartType,
        setChartOptions,
        setGeneratedCode,
        setShowSettings,
        setIsLoading,
        toast
      );
    } catch (error) {
      console.error('生成圖表失敗:', error);
      toast({
        title: "生成失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 複製代碼
  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast({
        title: "代碼已複製",
        description: "圖表配置代碼已複製到剪貼簿",
      });
    });
  };

  // 處理融合數據載入
  const handleFusedDataLoaded = useCallback((databaseData) => {
    if (!chartOptions) {
      toast({
        title: "請先生成基礎圖表",
        variant: "destructive",
      });
      return;
    }

    // 檢查圖表是否支援數據融合
    const xAxisType = chartOptions.xAxis?.type;
    const chartType = chartOptions.chart?.type;
    const supportedTypes = ['line', 'column', 'area', 'stacked_column', 'spline', 'combo'];
    
    if (xAxisType !== 'datetime' || !supportedTypes.includes(chartType)) {
      toast({
        title: "當前圖表不支援數據融合",
        description: "只有時間序列圖表才能添加額外的數據系列",
        variant: "destructive",
      });
      return;
    }

    // 轉換數據庫數據為 Highcharts 格式
    const newSeries = databaseData.map((item, index) => ({
      name: item.name_tc || item.name_en || `融合數據 ${index + 1}`,
      type: 'line', // 固定為線圖
      data: item.data.map(point => [
        new Date(point.date).getTime(), // 轉換為時間戳
        parseFloat(point.value)
      ]).filter(point => !isNaN(point[1])) // 過濾無效數據
    }));

    // 更新圖表選項，添加新的數據系列
    const updatedChartOptions = {
      ...chartOptions,
      series: [...chartOptions.series, ...newSeries]
    };

    setChartOptions(updatedChartOptions);
    setGeneratedCode(JSON.stringify(updatedChartOptions, null, 2));
    setFusedData([...fusedData, ...newSeries]);

    toast({
      title: "數據融合成功",
      description: `已添加 ${newSeries.length} 個數據系列到圖表中`,
    });
  }, [chartOptions, fusedData, toast]);

  // 檢查是否可以進行數據融合
  const canFuseData = () => {
    if (!chartOptions) return false;
    
    const xAxisType = chartOptions.xAxis?.type;
    const chartType = chartOptions.chart?.type;
    const supportedTypes = ['line', 'column', 'area', 'stacked_column', 'spline', 'combo'];
    
    return xAxisType === 'datetime' && supportedTypes.includes(chartType);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">數據融合</h1>
        </div>
      </div>

      {/* 步驟一：檔案上傳 */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="bg-red-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
              1
            </span>
            上傳本地檔案
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Upload className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">本地數據</h3>
            </div>
            
            <div id="file-upload">
              <FileUpload onFileUpload={handleFileUpload} colorTheme="red" />
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
        </CardContent>
      </Card>

      {/* 步驟二：描述您想看的圖表 */}
      {fileData && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="bg-red-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                2
              </span>
              描述您想看的圖表
              {isSuggestionLoading && (
                <div className="ml-2 flex items-center text-sm text-red-600">
                  <div className="w-4 h-4 mr-1 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  AI 分析中...
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isSuggestionLoading && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center text-sm text-red-700">
                    <div className="w-4 h-4 mr-2 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    正在分析您的數據並生成圖表建議...
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>描述您的圖表需求</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="AI 將根據您的數據自動生成圖表描述..."
                  className="min-h-[100px]"
                  disabled={isSuggestionLoading}
                />
              </div>
              
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
      {fileData && prompt.trim() && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="bg-red-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                3
              </span>
              選擇圖表類型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI 自動選擇的圖表類型 */}
              {selectedChartType && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">AI 自動選擇的圖表類型</Label>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                      {getChartTypeName(selectedChartType)}
                    </div>
                    <span className="text-sm text-gray-600">
                      AI 根據您的數據特性自動選擇了最適合的圖表類型
                    </span>
                  </div>
                </div>
              )}

              {/* 圖表類型選擇 */}
              <div className="space-y-2">
                <Label>選擇圖表類型</Label>
                <ChartGallery
                  selectedChartType={selectedChartType}
                  onChartTypeSelect={setSelectedChartType}
                  recommendedTypes={recommendedChartTypes}
                  onAvailableTypesChange={setAvailableChartTypes}
                  colorTheme="red"
                />
              </div>

              {/* 生成按鈕 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={generateChartSmart}
                    disabled={!fileData || !selectedChartType || isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        生成中...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>生成基礎圖表</span>
                      </>
                    )}
                  </Button>

                  {isOptimizing && (
                    <div className="flex items-center text-sm text-red-600">
                      <div className="w-4 h-4 mr-2 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      正在進行 AI 樣式優化...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步驟四：圖表顯示和數據融合 */}
      {chartOptions && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="bg-red-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  4
                </span>
                圖表顯示與數據融合
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  設定
                </Button>
                {canFuseData() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDatabaseSearch(true)}
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    <Database className="h-4 w-4 mr-1" />
                    搜尋M平方數據
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCode}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  複製代碼
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 融合數據顯示 */}
              {fusedData.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Plus className="h-4 w-4 mr-2 text-red-600" />
                    <span className="text-red-800 font-medium">
                      已融合 {fusedData.length} 個數據系列
                    </span>
                  </div>
                </div>
              )}

              {/* 圖表顯示 */}
              <div className="border rounded-lg p-4 bg-white">
                <ChartDisplay 
                  chartOptions={chartOptions} 
                  isLoading={isLoading}
                  setChartOptions={setChartOptions}
                />
              </div>

              {/* 設定面板 */}
              {showSettings && (
                <div className="border rounded-lg p-4">
                  <SettingsPanel
                    chartOptions={chartOptions}
                    onOptionsChange={isOptimizing ? undefined : handleChartOptionsChange}
                    databaseData={null}
                    onDateChange={() => {}}
                  />
                </div>
              )}

              {/* 代碼顯示 */}
              <div className="space-y-2">
                <Label>圖表配置代碼</Label>
                <div className="relative">
                  <pre className="text-sm text-white overflow-x-auto max-h-48 bg-gray-800 p-4 rounded">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 數據預覽對話框 */}
      <Dialog open={showDataPreview} onOpenChange={setShowDataPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              數據預覽與編輯
            </DialogTitle>
            <DialogDescription>
              您可以在此預覽和編輯上傳的數據。修改會即時反映在圖表生成中。
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <DataPreview 
              data={fileData} 
              onDataChange={handleDataChange}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 數據庫搜尋對話框 */}
      <DatabaseSearchDialog
        open={showDatabaseSearch}
        onOpenChange={setShowDatabaseSearch}
        onDataLoaded={handleFusedDataLoaded}
      />
    </div>
  );
};

export default DataFusion; 