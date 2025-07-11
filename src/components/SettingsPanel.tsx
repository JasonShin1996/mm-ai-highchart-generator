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

            {/* 圖表尺寸 */}
            <div className="space-y-2">
              <Label htmlFor="chart-size">圖表尺寸</Label>
              <Select
                value={`${chartOptions.chart?.width || 960}x${chartOptions.chart?.height || 540}`}
                onValueChange={(value) => {
                  const [width, height] = value.split('x').map(Number);
                  
                  // 創建一個完整的更新對象，一次性更新所有相關設定
                  const newOptions = JSON.parse(JSON.stringify(chartOptions));
                  
                  // 更新尺寸
                  if (!newOptions.chart) newOptions.chart = {};
                  newOptions.chart.width = width;
                  newOptions.chart.height = height;
                  
                  // 根據尺寸調整字體大小
                  if (width === 975 && height === 650) {
                    // 大尺寸配置
                    if (!newOptions.title) newOptions.title = {};
                    if (!newOptions.title.style) newOptions.title.style = {};
                    newOptions.title.style.fontSize = '26px';
                    
                    if (!newOptions.subtitle) newOptions.subtitle = {};
                    if (!newOptions.subtitle.style) newOptions.subtitle.style = {};
                    newOptions.subtitle.style.fontSize = '20px';
                    
                    // 處理可能的數組情況 - xAxis
                    if (Array.isArray(newOptions.xAxis)) {
                      if (!newOptions.xAxis[0]) newOptions.xAxis[0] = {};
                      if (!newOptions.xAxis[0].labels) newOptions.xAxis[0].labels = {};
                      if (!newOptions.xAxis[0].labels.style) newOptions.xAxis[0].labels.style = {};
                      newOptions.xAxis[0].labels.style.fontSize = '16px';
                    } else {
                      if (!newOptions.xAxis) newOptions.xAxis = {};
                      if (!newOptions.xAxis.labels) newOptions.xAxis.labels = {};
                      if (!newOptions.xAxis.labels.style) newOptions.xAxis.labels.style = {};
                      newOptions.xAxis.labels.style.fontSize = '16px';
                    }
                    
                    // 處理可能的數組情況 - yAxis
                    if (Array.isArray(newOptions.yAxis)) {
                      if (!newOptions.yAxis[0]) newOptions.yAxis[0] = {};
                      if (!newOptions.yAxis[0].labels) newOptions.yAxis[0].labels = {};
                      if (!newOptions.yAxis[0].labels.style) newOptions.yAxis[0].labels.style = {};
                      newOptions.yAxis[0].labels.style.fontSize = '16px';
                      if (!newOptions.yAxis[0].title) newOptions.yAxis[0].title = {};
                      if (!newOptions.yAxis[0].title.style) newOptions.yAxis[0].title.style = {};
                      newOptions.yAxis[0].title.style.fontSize = '17px';
                    } else {
                      if (!newOptions.yAxis) newOptions.yAxis = {};
                      if (!newOptions.yAxis.labels) newOptions.yAxis.labels = {};
                      if (!newOptions.yAxis.labels.style) newOptions.yAxis.labels.style = {};
                      newOptions.yAxis.labels.style.fontSize = '16px';
                      if (!newOptions.yAxis.title) newOptions.yAxis.title = {};
                      if (!newOptions.yAxis.title.style) newOptions.yAxis.title.style = {};
                      newOptions.yAxis.title.style.fontSize = '17px';
                    }
                    
                    if (!newOptions.legend) newOptions.legend = {};
                    if (!newOptions.legend.itemStyle) newOptions.legend.itemStyle = {};
                    newOptions.legend.itemStyle.fontSize = '24px';
                  } else {
                    // 小尺寸配置
                    if (!newOptions.title) newOptions.title = {};
                    if (!newOptions.title.style) newOptions.title.style = {};
                    newOptions.title.style.fontSize = '16px';
                    
                    if (!newOptions.subtitle) newOptions.subtitle = {};
                    if (!newOptions.subtitle.style) newOptions.subtitle.style = {};
                    newOptions.subtitle.style.fontSize = '12px';
                    
                    // 處理可能的數組情況 - xAxis
                    if (Array.isArray(newOptions.xAxis)) {
                      if (!newOptions.xAxis[0]) newOptions.xAxis[0] = {};
                      if (!newOptions.xAxis[0].labels) newOptions.xAxis[0].labels = {};
                      if (!newOptions.xAxis[0].labels.style) newOptions.xAxis[0].labels.style = {};
                      newOptions.xAxis[0].labels.style.fontSize = '11px';
                    } else {
                      if (!newOptions.xAxis) newOptions.xAxis = {};
                      if (!newOptions.xAxis.labels) newOptions.xAxis.labels = {};
                      if (!newOptions.xAxis.labels.style) newOptions.xAxis.labels.style = {};
                      newOptions.xAxis.labels.style.fontSize = '11px';
                    }
                    
                    // 處理可能的數組情況 - yAxis
                    if (Array.isArray(newOptions.yAxis)) {
                      if (!newOptions.yAxis[0]) newOptions.yAxis[0] = {};
                      if (!newOptions.yAxis[0].labels) newOptions.yAxis[0].labels = {};
                      if (!newOptions.yAxis[0].labels.style) newOptions.yAxis[0].labels.style = {};
                      newOptions.yAxis[0].labels.style.fontSize = '11px';
                      if (!newOptions.yAxis[0].title) newOptions.yAxis[0].title = {};
                      if (!newOptions.yAxis[0].title.style) newOptions.yAxis[0].title.style = {};
                      newOptions.yAxis[0].title.style.fontSize = '11px';
                    } else {
                      if (!newOptions.yAxis) newOptions.yAxis = {};
                      if (!newOptions.yAxis.labels) newOptions.yAxis.labels = {};
                      if (!newOptions.yAxis.labels.style) newOptions.yAxis.labels.style = {};
                      newOptions.yAxis.labels.style.fontSize = '11px';
                      if (!newOptions.yAxis.title) newOptions.yAxis.title = {};
                      if (!newOptions.yAxis.title.style) newOptions.yAxis.title.style = {};
                      newOptions.yAxis.title.style.fontSize = '11px';
                    }
                    
                    if (!newOptions.legend) newOptions.legend = {};
                    if (!newOptions.legend.itemStyle) newOptions.legend.itemStyle = {};
                    newOptions.legend.itemStyle.fontSize = '20px';
                  }
                  
                  // 一次性更新所有設定
                  onOptionsChange(newOptions);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="960x540">標準尺寸 (960x540)</SelectItem>
                  <SelectItem value="975x650">大尺寸 (975x650)</SelectItem>
                </SelectContent>
              </Select>
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
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chartOptions.series?.map((series, index) => (
                <Card key={index} className="p-3 bg-gray-50 border border-gray-200">
                  <div className="space-y-2">
                    <div className="font-semibold text-base mb-1">系列 {index + 1}：{series.name || '未命名'}</div>
                    {/* 系列名稱 */}
                    <div>
                      <Label htmlFor={`series-name-${index}`}>名稱</Label>
                      <Input
                        id={`series-name-${index}`}
                        value={series.name || ''}
                        onChange={(e) => updateSeriesOptions(index, 'name', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {/* 系列顏色 */}
                      <div>
                        <Label htmlFor={`series-color-${index}`}>顏色</Label>
                        <input
                          id={`series-color-${index}`}
                          type="color"
                          value={series.color || '#3b82f6'}
                          onChange={(e) => updateSeriesOptions(index, 'color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                        />
                      </div>
                      {/* 圖表類型 */}
                      <div className="flex-1">
                        <Label htmlFor={`series-type-${index}`}>類型</Label>
                        <Select
                          value={series.type || 'column'}
                          onValueChange={(value) => updateSeriesOptions(index, 'type', value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPanel;
