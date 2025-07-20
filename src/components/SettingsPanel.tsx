import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const SettingsPanel = ({ chartOptions, onOptionsChange }) => {
  const updateChartOptions = (path, value) => {
    if (!onOptionsChange) return; // 如果沒有 onOptionsChange 函數，直接返回
    
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
    if (!onOptionsChange) return; // 如果沒有 onOptionsChange 函數，直接返回
    
    const newOptions = JSON.parse(JSON.stringify(chartOptions));
    if (newOptions.series && newOptions.series[seriesIndex]) {
      newOptions.series[seriesIndex][property] = value;
      onOptionsChange(newOptions);
    }
  };

  const updateScatterPlotOptions = (path, value) => {
    if (!onOptionsChange) return; // 如果沒有 onOptionsChange 函數，直接返回
    
    const newOptions = JSON.parse(JSON.stringify(chartOptions));
    
    // 確保 plotOptions.scatter 存在
    if (!newOptions.plotOptions) newOptions.plotOptions = {};
    if (!newOptions.plotOptions.scatter) newOptions.plotOptions.scatter = {};
    
    // 使用路徑更新嵌套對象
    const keys = path.split('.');
    let current = newOptions.plotOptions.scatter;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    onOptionsChange(newOptions);
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
                disabled={!onOptionsChange}
                className={!onOptionsChange ? 'opacity-50 cursor-not-allowed' : ''}
              />
            </div>

            {/* 左側Y軸標題 */}
            <div className="space-y-2">
              <Label htmlFor="y-axis-title">左側Y軸標題</Label>
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

            {/* 右側Y軸標題（僅在雙Y軸時顯示） */}
            {Array.isArray(chartOptions.yAxis) && chartOptions.yAxis.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="y-axis-title-2">右側Y軸標題</Label>
                <Input
                  id="y-axis-title-2"
                  value={chartOptions.yAxis[1]?.title?.text || ''}
                  onChange={(e) => updateChartOptions('yAxis.1.title.text', e.target.value)}
                />
              </div>
            )}

            {/* 雙Y軸格式設定（僅在雙Y軸時顯示） */}
            {Array.isArray(chartOptions.yAxis) && chartOptions.yAxis.length > 1 && (
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="text-sm font-medium text-blue-600 mb-2">雙Y軸設定</div>
                
                {/* 左側Y軸格式 */}
                <div className="space-y-2">
                  <Label htmlFor="y-axis-format-0">左側Y軸格式</Label>
                  <Select
                    value={chartOptions.yAxis[0]?.labels?.format || '{value}'}
                    onValueChange={(value) => updateChartOptions('yAxis.0.labels.format', value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="{value}">一般格式</SelectItem>
                      <SelectItem value="{value:,.0f}">整數格式</SelectItem>
                      <SelectItem value="{value:,.1f}">小數格式</SelectItem>
                      <SelectItem value="{value:,.2f}">兩位小數</SelectItem>
                      <SelectItem value="{value:,.1f}%">百分比</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 右側Y軸格式 */}
                <div className="space-y-2">
                  <Label htmlFor="y-axis-format-1">右側Y軸格式</Label>
                  <Select
                    value={chartOptions.yAxis[1]?.labels?.format || '{value}'}
                    onValueChange={(value) => updateChartOptions('yAxis.1.labels.format', value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="{value}">一般格式</SelectItem>
                      <SelectItem value="{value:,.0f}">整數格式</SelectItem>
                      <SelectItem value="{value:,.1f}">小數格式</SelectItem>
                      <SelectItem value="{value:,.2f}">兩位小數</SelectItem>
                      <SelectItem value="{value:,.1f}%">百分比</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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
                    <div className="flex items-end gap-2 mt-1">
                      {/* 系列顏色 */}
                      <div className="flex flex-col">
                        <Label htmlFor={`series-color-${index}`} className="text-sm mb-1">顏色</Label>
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
                        <Label htmlFor={`series-type-${index}`} className="text-sm mb-1 block">類型</Label>
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
                            <SelectItem value="scatter">散佈圖</SelectItem>
                            <SelectItem value="bubble">氣泡圖</SelectItem>
                            <SelectItem value="gauge">儀表圖</SelectItem>
                            <SelectItem value="boxplot">箱線圖</SelectItem>
                            <SelectItem value="arearange">範圍面積圖</SelectItem>
                            <SelectItem value="columnrange">範圍柱狀圖</SelectItem>
                            <SelectItem value="funnel">漏斗圖</SelectItem>
                            <SelectItem value="pyramid">金字塔圖</SelectItem>
                            <SelectItem value="polar">極地圖</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Y軸選擇（僅在雙Y軸時顯示） */}
                    {Array.isArray(chartOptions.yAxis) && chartOptions.yAxis.length > 1 && (
                      <div className="mt-2">
                        <Label htmlFor={`series-yaxis-${index}`} className="text-sm mb-1 block">使用Y軸</Label>
                        <Select
                          value={series.yAxis?.toString() || '0'}
                          onValueChange={(value) => updateSeriesOptions(index, 'yAxis', parseInt(value))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">左側Y軸 ({chartOptions.yAxis[0]?.title?.text || '左側Y軸'})</SelectItem>
                            <SelectItem value="1">右側Y軸 ({chartOptions.yAxis[1]?.title?.text || '右側Y軸'})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 散佈圖專用設置 */}
                    {(series.type === 'scatter' || chartOptions.chart?.type === 'scatter') && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="text-sm font-medium text-blue-600 mb-2">散佈圖設置</div>
                        
                        {/* Marker 設置 */}
                        <div className="space-y-3">
                          {/* Marker 顯示 */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`marker-enabled-${index}`}
                              checked={chartOptions.plotOptions?.scatter?.marker?.enabled !== false}
                              onCheckedChange={(checked) => updateScatterPlotOptions('marker.enabled', checked)}
                            />
                            <Label htmlFor={`marker-enabled-${index}`} className="text-sm">顯示標記點</Label>
                          </div>

                          {/* Marker 大小 */}
                          <div className="space-y-1">
                            <Label className="text-sm">標記點大小: {chartOptions.plotOptions?.scatter?.marker?.radius || 5}</Label>
                            <Slider
                              value={[chartOptions.plotOptions?.scatter?.marker?.radius || 5]}
                              onValueChange={(value) => updateScatterPlotOptions('marker.radius', value[0])}
                              max={20}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                          </div>

                          {/* Marker 形狀 */}
                          <div>
                            <Label className="text-sm mb-1 block">標記點形狀</Label>
                            <Select
                              value={chartOptions.plotOptions?.scatter?.marker?.symbol || 'circle'}
                              onValueChange={(value) => updateScatterPlotOptions('marker.symbol', value)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="circle">圓形</SelectItem>
                                <SelectItem value="square">方形</SelectItem>
                                <SelectItem value="diamond">菱形</SelectItem>
                                <SelectItem value="triangle">三角形</SelectItem>
                                <SelectItem value="triangle-down">倒三角形</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Data Labels 設置 */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`dataLabels-enabled-${index}`}
                                checked={chartOptions.plotOptions?.scatter?.dataLabels?.enabled === true}
                                onCheckedChange={(checked) => updateScatterPlotOptions('dataLabels.enabled', checked)}
                              />
                              <Label htmlFor={`dataLabels-enabled-${index}`} className="text-sm">顯示數據標籤</Label>
                            </div>

                            {/* Data Labels 格式 */}
                            {chartOptions.plotOptions?.scatter?.dataLabels?.enabled && (
                              <div>
                                <Label className="text-sm mb-1 block">標籤格式</Label>
                                <Select
                                  value={chartOptions.plotOptions?.scatter?.dataLabels?.format || '{point.name}'}
                                  onValueChange={(value) => updateScatterPlotOptions('dataLabels.format', value)}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="{point.name}">點名稱</SelectItem>
                                    <SelectItem value="{point.x}, {point.y}">坐標 (X, Y)</SelectItem>
                                    <SelectItem value="{point.y}">Y 值</SelectItem>
                                    <SelectItem value="{point.x}">X 值</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Data Labels 字體大小 */}
                            {chartOptions.plotOptions?.scatter?.dataLabels?.enabled && (
                              <div className="space-y-1">
                                <Label className="text-sm">標籤字體大小: {chartOptions.plotOptions?.scatter?.dataLabels?.style?.fontSize?.replace('px', '') || '9'}px</Label>
                                <Slider
                                  value={[parseInt(chartOptions.plotOptions?.scatter?.dataLabels?.style?.fontSize?.replace('px', '') || '9')]}
                                  onValueChange={(value) => updateScatterPlotOptions('dataLabels.style.fontSize', `${value[0]}px`)}
                                  max={16}
                                  min={6}
                                  step={1}
                                  className="w-full"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
