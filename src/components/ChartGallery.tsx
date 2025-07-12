import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  BarChart3, 
  PieChart, 
  ScatterChart, 
  AreaChart, 
  TrendingUp,
  Layers,
  Circle
} from 'lucide-react';

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  recommended?: boolean;
}

const chartTypes: ChartType[] = [
  {
    id: 'line',
    name: '折線圖',
    description: '展示數據隨時間的趨勢變化',
    icon: <LineChart className="h-8 w-8" />,
    category: '時間序列'
  },
  {
    id: 'column',
    name: '柱狀圖',
    description: '比較不同類別的數據大小',
    icon: <BarChart3 className="h-8 w-8" />,
    category: '比較'
  },
  {
    id: 'area',
    name: '面積圖',
    description: '強調數據的累積效果和趨勢',
    icon: <AreaChart className="h-8 w-8" />,
    category: '時間序列'
  },
  {
    id: 'pie',
    name: '圓餅圖',
    description: '展示各部分占整體的比例關係',
    icon: <PieChart className="h-8 w-8" />,
    category: '比例'
  },
  {
    id: 'scatter',
    name: '散佈圖',
    description: '探索兩個變量之間的關係',
    icon: <ScatterChart className="h-8 w-8" />,
    category: '關係'
  },
  {
    id: 'stacked_column',
    name: '堆疊柱狀圖',
    description: '顯示分類數據的組成結構',
    icon: <Layers className="h-8 w-8" />,
    category: '比較'
  },
  {
    id: 'spline',
    name: '平滑線圖',
    description: '平滑的曲線展示數據趨勢',
    icon: <TrendingUp className="h-8 w-8" />,
    category: '時間序列'
  },
  {
    id: 'donut',
    name: '環形圖',
    description: '餅圖的變體，中間留有空白',
    icon: <Circle className="h-8 w-8" />,
    category: '比例'
  }
];

interface ChartGalleryProps {
  selectedChartType: string | null;
  onChartTypeSelect: (chartType: string) => void;
  recommendedTypes?: string[];
}

const ChartGallery: React.FC<ChartGalleryProps> = ({
  selectedChartType,
  onChartTypeSelect,
  recommendedTypes = []
}) => {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        選擇最適合您數據的圖表類型，AI 會根據您的選擇提供專門的設定建議
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {chartTypes.map((chart) => {
          const isSelected = selectedChartType === chart.id;
          const isRecommended = recommendedTypes.includes(chart.id);
          
          return (
            <Card 
              key={chart.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onChartTypeSelect(chart.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center space-y-2">
                  {isRecommended && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-green-100 text-green-800 mb-1"
                    >
                      AI 推薦
                    </Badge>
                  )}
                  
                  <div className={`${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                    {chart.icon}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className={`font-medium text-sm ${
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {chart.name}
                    </h3>
                    <p className="text-xs text-gray-500 leading-tight">
                      {chart.description}
                    </p>
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                    >
                      {chart.category}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {selectedChartType && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-sm text-blue-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            已選擇：{chartTypes.find(c => c.id === selectedChartType)?.name}
            <span className="ml-2 text-blue-600">
              - AI 將為此圖表類型提供專門的配置建議
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartGallery; 