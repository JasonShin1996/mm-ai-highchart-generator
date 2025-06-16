
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SettingsPanel = ({ chartOptions, onOptionsChange }) => {
  const updateChartOptions = (path, value) => {
    const newOptions = JSON.parse(JSON.stringify(chartOptions));
    
    // 使用路徑更新嵌套對象
    const keys = path.split('.');
    let current = newOptions;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    onOptionsChange(newOptions);
  };

  const updateSeriesOptions = (seriesIndex, property, value) => {
    const newOptions = JSON.parse(JSON.stringify(chartOptions));
    if (newOptions.series && newOptions.series[seriesIndex]) {
      newOptions.series[seriesIndex][property] = value;
      onOptionsChange(newOptions);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800">圖表可視化編輯器</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 通用設定 */}
        <Card>
          <CardHeader>
            <CardTitle>通用設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 圖表標題 */}
            <div className="space-y-2">
              <Label htmlFor="chart-title">圖表標題</Label>
              <Input
                id="chart-title"
                value={chartOptions.title?.text || ''}
                onChange={(e) => updateChartOptions('title.text', e.target.value)}
              />
            </div>

            {/* Y軸標題 */}
            <div className="space-y-2">
              <Label htmlFor="y-axis-title">Y軸標題</Label>
              <Input
                id="y-axis-title"
                value={
                  Array.isArray(chartOptions.yAxis) 
                    ? chartOptions.yAxis[0]?.title?.text || ''
                    : chartOptions.yAxis?.title?.text || ''
                }
                onChange={(e) => {
                  if (Array.isArray(chartOptions.yAxis)) {
                    updateChartOptions('yAxis.0.title.text', e.target.value);
                  } else {
                    updateChartOptions('yAxis.title.text', e.target.value);
                  }
                }}
              />
            </div>

            {/* 圖例開關 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="legend-enabled"
                checked={chartOptions.legend?.enabled !== false}
                onCheckedChange={(checked) => updateChartOptions('legend.enabled', checked)}
              />
              <Label htmlFor="legend-enabled">顯示圖例</Label>
            </div>
          </CardContent>
        </Card>

        {/* 數據系列設定 */}
        <Card>
          <CardHeader>
            <CardTitle>數據系列設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {chartOptions.series?.map((series, index) => (
              <Card key={index} className="p-4 bg-gray-50">
                <div className="space-y-3">
                  <h4 className="font-semibold">系列 {index + 1}</h4>
                  
                  {/* 系列名稱 */}
                  <div className="space-y-2">
                    <Label htmlFor={`series-name-${index}`}>名稱</Label>
                    <Input
                      id={`series-name-${index}`}
                      value={series.name || ''}
                      onChange={(e) => updateSeriesOptions(index, 'name', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    {/* 系列顏色 */}
                    <div className="space-y-2">
                      <Label htmlFor={`series-color-${index}`}>顏色</Label>
                      <input
                        id={`series-color-${index}`}
                        type="color"
                        value={series.color || '#3b82f6'}
                        onChange={(e) => updateSeriesOptions(index, 'color', e.target.value)}
                        className="w-12 h-8 rounded cursor-pointer border border-gray-300"
                      />
                    </div>

                    {/* 圖表類型 */}
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`series-type-${index}`}>類型</Label>
                      <Select
                        value={series.type || 'column'}
                        onValueChange={(value) => updateSeriesOptions(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">折線圖</SelectItem>
                          <SelectItem value="spline">平滑折線圖</SelectItem>
                          <SelectItem value="column">長條圖</SelectItem>
                          <SelectItem value="bar">橫條圖</SelectItem>
                          <SelectItem value="area">面積圖</SelectItem>
                          <SelectItem value="pie">圓餅圖</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPanel;
