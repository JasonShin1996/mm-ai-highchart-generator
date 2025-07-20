import React, { useState, useCallback } from 'react';
import { Database, Zap, Settings, Copy, Search, X, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import ChartDisplay from '@/components/ChartDisplay';
import SettingsPanel from '@/components/SettingsPanel';
import ChartGallery from '@/components/ChartGallery';
import DatabaseSearchDialog from '@/components/DatabaseSearchDialog';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseChart } from '@/hooks/useDatabaseChart';
import { getChartTypeName } from '@/utils/chartAnalysis';

const DatabaseChart = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [chartOptions, setChartOptions] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);
  const [availableChartTypes, setAvailableChartTypes] = useState<string[]>([]);
  const [showDatabaseDialog, setShowDatabaseDialog] = useState(false);
  const [databaseData, setDatabaseData] = useState(null);
  const { toast } = useToast();
  
  // 使用資料庫圖表生成 hook
  const { generateMMDatabaseChart } = useDatabaseChart();

  // 處理資料庫數據載入
  const handleDatabaseDataLoaded = useCallback((data) => {
    setDatabaseData(data);
    setChartOptions(null);
    setShowSettings(false);
    setPrompt('');
    setGeneratedCode('');
    setSelectedChartType(null);
    
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
      }
      
      toast({
        title: "數據項目已移除",
        description: `已移除 ${itemId} 數據`,
      });
    }
  }, [databaseData, toast]);

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

  // 生成圖表
  const generateChartSmart = async () => {
    if (!databaseData) {
      toast({
        title: "錯誤",
        description: "請先載入資料庫數據。",
        variant: "destructive",
      });
      return;
    }

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
  };

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
      {/* 頁面標題和導航 */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首頁
          </Button>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">M平方資料庫圖表生成</h1>
        <p className="mt-2 text-gray-600">搜尋 M平方資料庫中的時間序列數據，快速生成專業的金融圖表。</p>
      </header>

      <div className="space-y-8">
        {/* 步驟一：資料庫搜尋 */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <span className="bg-green-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                1
              </span>
              搜尋資料庫數據
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
          </CardContent>
        </Card>

        {/* 步驟二：描述需求 */}
        {databaseData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-green-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  2
                </span>
                描述您想看的圖表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="prompt">描述您的圖表需求</Label>
                  <Textarea
                    id="prompt"
                    placeholder="請幫我畫出時間序列圖表，X軸是時間，Y軸顯示數值變化，使用專業的金融圖表樣式"
                    value={prompt}
                    onChange={handlePromptChange}
                    className="min-h-[150px]"
                    disabled={isOptimizing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步驟三：選擇圖表類型 */}
        {databaseData && prompt.trim() && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-green-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                  3
                </span>
                選擇圖表類型
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 完整的圖表類型選擇 */}
                <div className="space-y-2">
                  <Label>選擇圖表類型</Label>
                  <ChartGallery 
                    onChartTypeSelect={handleChartTypeSelect}
                    selectedChartType={selectedChartType}
                    recommendedTypes={[]}
                    disabled={isOptimizing}
                    databaseData={databaseData}
                    onAvailableTypesChange={handleAvailableTypesChange}
                  />
                </div>

                {/* 生成按鈕 */}
                <div className="flex items-center gap-4 pt-4">
                  <Button
                    onClick={generateChartSmart}
                    disabled={isOptimizing || !prompt.trim() || !selectedChartType}
                    className="flex items-center space-x-2"
                  >
                    {isOptimizing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>AI 優化中...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>生成資料庫圖表</span>
                      </>
                    )}
                  </Button>

                  {isOptimizing && (
                    <div className="flex items-center text-sm text-green-600">
                      <div className="w-4 h-4 mr-2 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
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
                  <span className="bg-green-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
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
                    isLoading={false}
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

      {/* 資料庫搜尋對話框 */}
      <DatabaseSearchDialog
        open={showDatabaseDialog}
        onOpenChange={setShowDatabaseDialog}
        onDataLoaded={handleDatabaseDataLoaded}
      />
    </div>
  );
};

export default DatabaseChart; 