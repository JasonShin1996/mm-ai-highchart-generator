import React, { useState, useCallback } from 'react';
import { Upload, Zap, FileSpreadsheet, Edit, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import ChartGallery from '@/components/ChartGallery';
import ChartResultCard from '@/components/ChartResultCard';
import { useToast } from '@/hooks/use-toast';
import { generateChartSuggestion } from '@/services/gemini';
import { useChartGeneration } from '@/hooks/useChartGeneration';
import { getChartTypeName, analyzeDataAndRecommendCharts } from '@/utils/chartAnalysis';

const LocalFileChart = () => {
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
  }, [toast, optimizeDataPrecision, selectedChartType]);

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

  // 生成圖表
  const generateChartSmart = async () => {
    if (!fileData) {
      toast({
        title: "錯誤",
        description: "請先上傳數據檔案。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
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
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">本地檔案圖表生成</h1>
        <p className="mt-2 text-gray-600">上傳您的 CSV 或 Excel 數據，用自然語言描述，讓 AI 為您生成互動式圖表。</p>
      </header>

      <div className="space-y-8">
        {/* 步驟一：檔案上傳 */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <span className="bg-blue-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">
                1
              </span>
              上傳您的數據檔案
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
        {fileData && prompt.trim() && (
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
                    ) : isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>生成中...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span>生成檔案圖表</span>
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
          <ChartResultCard
            stepNumber={4}
            stepColor="blue"
            chartOptions={chartOptions}
            setChartOptions={setChartOptions}
            isLoading={isLoading}
            isOptimizing={isOptimizing}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            generatedCode={generatedCode}
            setGeneratedCode={setGeneratedCode}
          />
        )}
      </div>

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
    </div>
  );
};

export default LocalFileChart; 