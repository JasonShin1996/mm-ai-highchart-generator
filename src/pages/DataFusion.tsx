import React, { useState, useCallback } from 'react';
import { Upload, Zap, Settings, Copy, FileSpreadsheet, Edit, ArrowLeft, Database, Plus, Check } from 'lucide-react';
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
import { generateYAxisTitle } from '@/domain/unitMapping';

// 單位/幣別映射與 Y 軸標題生成見 @/domain/unitMapping（單一來源）

// 生成多個Y軸配置
const generateMultipleYAxes = (allData: any[], existingYAxes: any = null) => {
  console.log('🎯 開始重新分配Y軸:', allData);
  
  // 收集所有不同的單位標題
  const unitTitleGroups = new Map();
  
  // 處理現有的Y軸（本地數據）
  if (existingYAxes) {
    if (Array.isArray(existingYAxes)) {
      existingYAxes.forEach((axis, index) => {
        if (axis.title?.text && axis.title.text.trim()) {
          const key = axis.title.text;
          if (!unitTitleGroups.has(key)) {
            unitTitleGroups.set(key, { indices: [], isExisting: true });
          }
        }
      });
    } else if (existingYAxes.title?.text && existingYAxes.title?.text.trim()) {
      const key = existingYAxes.title.text;
      unitTitleGroups.set(key, { indices: [], isExisting: true });
    }
  }
  
  // 處理新的資料庫數據
  allData.forEach((dataItem, dataIndex) => {
    const unitTitle = generateYAxisTitle(dataItem);
    console.log(`📊 數據 ${dataIndex}: 單位標題="${unitTitle}"`);
    
    if (unitTitle) {
      if (!unitTitleGroups.has(unitTitle)) {
        unitTitleGroups.set(unitTitle, { indices: [], isExisting: false });
      }
      unitTitleGroups.get(unitTitle).indices.push(dataIndex);
    }
  });
  
  const groupsArray = Array.from(unitTitleGroups.entries());
  console.log('🔧 所有單位分組:', groupsArray);
  
  // 生成Y軸配置
  const yAxisArray: any[] = [];
  groupsArray.forEach(([unitTitle, groupInfo], groupIndex) => {
    const isLeftSide = groupIndex % 2 === 0; // 偶數索引在左側
    const offsetMultiplier = Math.floor(groupIndex / 2); // 每兩個軸計算一次偏移
    
    yAxisArray.push({
      title: { text: unitTitle },
      opposite: !isLeftSide, // true = 右側，false = 左側
      offset: offsetMultiplier * 60 // 每個偏移層級 60px
    });
    
    console.log(`📍 Y軸 ${groupIndex}: "${unitTitle}" - ${isLeftSide ? '左' : '右'}側, offset: ${offsetMultiplier * 60}`);
  });
  
  return yAxisArray;
};

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

  // 應用編輯後的代碼
  const applyCodeChanges = () => {
    try {
      const parsedOptions = JSON.parse(generatedCode);
      setChartOptions(parsedOptions);
      toast({
        title: "代碼已應用",
        description: "圖表已更新為新的配置",
      });
    } catch (error) {
      toast({
        title: "JSON 格式錯誤",
        description: "請檢查代碼格式是否正確",
        variant: "destructive",
      });
    }
  };

  // 處理融合數據載入 - 智能Y軸重分配
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

    console.log('🔄 開始處理數據融合，載入資料庫數據:', databaseData);
    console.log('📊 當前圖表選項:', chartOptions);

    // 1. 分析新的資料庫數據，建立單位標題映射
    const databaseUnitTitles = databaseData.map(item => generateYAxisTitle(item));
    console.log('📈 資料庫數據單位標題:', databaseUnitTitles);

    // 2. 分析現有圖表的Y軸標題（本地數據）
    let existingYAxisTitles: string[] = [];
    if (chartOptions.yAxis) {
      if (Array.isArray(chartOptions.yAxis)) {
        existingYAxisTitles = chartOptions.yAxis.map(axis => axis.title?.text || '').filter(title => title.trim());
      } else {
        const title = chartOptions.yAxis.title?.text || '';
        if (title.trim()) {
          existingYAxisTitles = [title];
        }
      }
    }
    console.log('📉 現有Y軸標題:', existingYAxisTitles);

    // 3. 檢查是否有新的單位標題（需要重新分配Y軸）
    const newUnitTitles = databaseUnitTitles.filter(title => 
      title && !existingYAxisTitles.includes(title)
    );
    console.log('🆕 新的單位標題:', newUnitTitles);

    // 4. 生成新的Y軸配置
    const newYAxisConfig = generateMultipleYAxes(databaseData, chartOptions.yAxis);
    console.log('🎯 重新生成的Y軸配置:', newYAxisConfig);

    // 5. 為資料庫數據分配Y軸索引
    const yAxisIndexMap = new Map();
    newYAxisConfig.forEach((axis, index) => {
      yAxisIndexMap.set(axis.title.text, index);
    });

    // 6. 轉換資料庫數據為 Highcharts 格式，並分配Y軸
    const newSeries = databaseData.map((item, index) => {
      const unitTitle = generateYAxisTitle(item);
      const yAxisIndex = yAxisIndexMap.get(unitTitle) || 0;
      
      console.log(`📊 數據系列 "${item.name_tc}": 單位="${unitTitle}" → Y軸索引=${yAxisIndex}`);
      
      return {
        name: item.name_tc || item.name_en || `融合數據 ${index + 1}`,
        type: 'line', // 固定為線圖
        yAxis: yAxisIndex, // 分配到對應的Y軸
        data: item.data.map(point => [
          new Date(point.date).getTime(), // 轉換為時間戳
          parseFloat(point.value)
        ]).filter(point => !isNaN(point[1])) // 過濾無效數據
      };
    });

    // 7. 重新分配現有系列的Y軸索引（如果有Y軸重新排列）
    const updatedExistingSeries = chartOptions.series.map((series, index) => {
      // 尋找現有系列應該對應的Y軸索引
      let targetYAxisIndex = 0;
      
      // 如果系列已經有指定的yAxis，嘗試找到對應的新索引
      if (series.yAxis !== undefined) {
        const oldAxisIndex = series.yAxis;
        const oldAxisTitle = Array.isArray(chartOptions.yAxis) 
          ? chartOptions.yAxis[oldAxisIndex]?.title?.text 
          : chartOptions.yAxis?.title?.text;
        
        if (oldAxisTitle) {
          targetYAxisIndex = yAxisIndexMap.get(oldAxisTitle) || 0;
        }
      } else {
        // 沒有指定yAxis的系列，查看是否能從名稱推斷
        // 這裡可能需要更複雜的邏輯，暫時使用索引0
        targetYAxisIndex = 0;
      }

      console.log(`📈 更新現有系列 "${series.name}": Y軸索引 ${series.yAxis || 0} → ${targetYAxisIndex}`);
      
      return {
        ...series,
        yAxis: targetYAxisIndex
      };
    });

    // 8. 更新圖表選項
    const updatedChartOptions = {
      ...chartOptions,
      yAxis: newYAxisConfig,
      series: [...updatedExistingSeries, ...newSeries]
    };

    console.log('✅ 更新後的圖表選項:', updatedChartOptions);

    setChartOptions(updatedChartOptions);
    setGeneratedCode(JSON.stringify(updatedChartOptions, null, 2));
    setFusedData([...fusedData, ...newSeries]);

    toast({
      title: "智能數據融合完成",
      description: `已添加 ${newSeries.length} 個數據系列，${newUnitTitles.length > 0 ? `創建 ${newUnitTitles.length} 個新Y軸` : '使用現有Y軸'}`,
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
                {canFuseData() ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDatabaseSearch(true)}
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    <Database className="h-4 w-4 mr-1" />
                    搜尋M平方數據
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                    title="只有時間序列圖表才能添加M平方數據庫數據"
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
              
              {/* 數據融合說明 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">數據融合說明</h3>
                    <div className="mt-1 text-sm text-red-700">
                      <p>只有特定圖表類別（折線圖、柱狀圖、面積圖、堆疊柱狀圖、平滑線圖、組合圖）與時間序列資料（X軸類別為datetime），才可添加M平方資料庫數據。</p>
                    </div>
                  </div>
                </div>
              </div>

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

              {/* 代碼編輯器 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>圖表配置代碼（可編輯）</Label>
                  <Button
                    onClick={applyCodeChanges}
                    size="sm"
                    variant="outline"
                    className="h-8"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    應用變更
                  </Button>
                </div>
                <textarea
                  value={generatedCode}
                  onChange={(e) => setGeneratedCode(e.target.value)}
                  className="w-full h-48 p-4 text-sm font-mono bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none resize-none overflow-auto"
                  spellCheck={false}
                />
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