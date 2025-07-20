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
import { generateChartSuggestion } from '@/services/gemini';
import { useChartGeneration } from '@/hooks/useChartGeneration';
import { useDatabaseChart } from '@/hooks/useDatabaseChart';
import { getChartTypeName, analyzeDataAndRecommendCharts } from '@/utils/chartAnalysis';

const Index = () => {
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
  const [showDatabaseDialog, setShowDatabaseDialog] = useState(false);
  const [databaseData, setDatabaseData] = useState(null);
  const { toast } = useToast();
  
  // 使用新的 hooks
  const { generateChart } = useChartGeneration();
  const { generateMMDatabaseChart } = useDatabaseChart();

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



  // 數據源檢測函數
  const getDataSourceType = useCallback(() => {
    const hasFileData = fileData && fileData.data && fileData.data.length > 0;
    const hasDatabaseData = databaseData && databaseData.length > 0;
    
    if (hasFileData && hasDatabaseData) return 'hybrid';
    if (hasDatabaseData) return 'mm_database';
    if (hasFileData) return 'localfile';
    return 'none';
  }, [fileData, databaseData]);

  // 獲取生成按鈕文字
  const getGenerateButtonText = useCallback(() => {
    const type = getDataSourceType();
    switch (type) {
      case 'hybrid': return '生成混合圖表';
      case 'mm_database': return '生成資料庫圖表';
      case 'localfile': return '生成檔案圖表';
      default: return '生成圖表';
    }
  }, [getDataSourceType]);

  // 智能圖表生成函數
  const generateChartSmart = async () => {
    const dataSourceType = getDataSourceType();
    
    if (dataSourceType === 'mm_database') {
      // 使用資料庫圖表生成（不設置 isLoading，直接顯示基礎圖表）
      await generateMMDatabaseChart(
        databaseData,
        prompt,
        selectedChartType,
        setChartOptions,
        setGeneratedCode,
        () => {}, // 不設置 isLoading
        setIsOptimizing,
        toast
      );
    } else if (dataSourceType === 'localfile') {
      // 使用本地檔案圖表生成
      setIsLoading(true); // 只有檔案數據才設置 loading
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
    } else {
      toast({
        title: "錯誤",
        description: "請先載入數據（檔案或資料庫）。",
        variant: "destructive",
      });
    }
  };

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
      console.log('🤖 開始 AI 分析...');
      
      // 自動生成圖表建議
      // 確保 fields 是字符串數組
      const fields = Array.isArray(data.meta.fields) ? data.meta.fields : Object.keys(data.meta.fields || {});
      
      // 取前10筆數據作為樣本，並優化精度
      const rawSample = data.data.slice(0, 10);
      const dataSample = optimizeDataPrecision(rawSample);
      
      generateChartSuggestion(fields, dataSample)
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
    } else {
      console.log('⚠️ 沒有有效數據，跳過分析');
    }
  }, [toast]);

  // 處理提示詞變化
  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
  }, []);

  // 處理可用圖表類型變化
  const handleAvailableTypesChange = useCallback((types: string[]) => {
    setAvailableChartTypes(types);
  }, []);

  // 處理圖表類型選擇
  const handleChartTypeSelect = useCallback((chartType) => {
    if (chartType === 'random') {
      // 擲筊功能：從可用的圖表類型中隨機選擇
      if (availableChartTypes.length > 0) {
        const randomType = availableChartTypes[Math.floor(Math.random() * availableChartTypes.length)];
        setSelectedChartType(randomType);
        
        toast({
          title: "擲筊結果",
          description: `命運選擇了 ${getChartTypeName(randomType)}！`,
        });
      } else {
        toast({
          title: "擲筊失敗",
          description: "目前沒有可用的圖表類型",
          variant: "destructive",
        });
      }
    } else {
      setSelectedChartType(chartType);
    }
  }, [toast, availableChartTypes]);

  // 處理圖表選項變化
  const handleChartOptionsChange = useCallback((newOptions) => {
    setChartOptions(newOptions);
    setGeneratedCode(JSON.stringify(newOptions, null, 2));
  }, []);

  // 複製代碼
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

                <div className="space-y-2">
                  <Label htmlFor="prompt">描述您的圖表需求</Label>
                  <Textarea
                    id="prompt"
                    placeholder={isSuggestionLoading 
                      ? "正在為您生成建議..." 
                      : "請幫我畫出堆疊柱狀圖，X軸是Date、但不要顯示title text，Y軸分別使用A、B、C，顏色依序使用#84C3E0 , #30617D, #D97871，Y軸 title 的text = 金額 (億元)，Title = 中國-歷年財政預算赤字總額，Legend放在 最下面、不要有border"}
                    value={prompt}
                    onChange={handlePromptChange}
                    className="min-h-[150px]"
                    disabled={isLoading || isOptimizing}
                  />
                  {prompt && !isSuggestionLoading && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                      💡 AI 已根據您的數據生成建議，您可以直接使用或進行修改
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步驟三：選擇圖表類型 */}
        {(fileData || databaseData) && prompt.trim() && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  3
                </span>
                選擇圖表類型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* AI 自動選擇的圖表類型 */}
                {selectedChartType && recommendedChartTypes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">AI 自動選擇的圖表類型</Label>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                        {getChartTypeName(selectedChartType)}
                      </div>
                      <span className="text-sm text-gray-600">
                        AI 根據您的數據特性自動選擇了最適合的圖表類型
                      </span>
                    </div>
                  </div>
                )}

                {/* 完整的圖表類型選擇 */}
                <div className="space-y-2">
                  <Label>選擇圖表類型</Label>
                  <ChartGallery 
                    onChartTypeSelect={handleChartTypeSelect}
                    selectedChartType={selectedChartType}
                    recommendedTypes={recommendedChartTypes}
                    disabled={isLoading || isOptimizing}
                    databaseData={databaseData}
                    onAvailableTypesChange={handleAvailableTypesChange}
                  />
                </div>

                {/* 生成按鈕 */}
                <div className="flex items-center gap-4 pt-4">
                  <Button
                    onClick={generateChartSmart}
                    disabled={isLoading || isOptimizing || !prompt.trim() || !selectedChartType}
                    className="flex items-center space-x-2"
                  >
                    {isOptimizing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>AI 優化中...</span>
                      </>
                    ) : isLoading && getDataSourceType() === 'localfile' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>生成中...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>{getGenerateButtonText()}</span>
                      </>
                    )}
                  </Button>

                  {isOptimizing && (
                    <div className="flex items-center text-sm text-blue-600">
                      <div className="w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      正在進行 AI 樣式優化...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步驟四：圖表顯示和設定 */}
        {chartOptions && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                    4
                  </span>
                  生成的圖表
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
      </div>

      {/* 數據預覽對話框 */}
      {/* 數據預覽/編輯 Dialog */}
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

      {/* 資料庫搜尋對話框 */}
      <DatabaseSearchDialog
        open={showDatabaseDialog}
        onOpenChange={setShowDatabaseDialog}
        onDataLoaded={handleDatabaseDataLoaded}
      />
    </div>
  );
};

export default Index;
