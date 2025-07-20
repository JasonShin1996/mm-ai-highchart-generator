export const getChartTypeTemplates = (basePrompt: string) => {
  return {
    'line': `
      ${basePrompt}
      
      **線圖專門指令：**
      - 專注於時間序列數據的展示
      - 確保 X 軸正確處理時間數據（使用 datetime 類型，並把日期或年份轉換為timestamp）
      - 多條線使用不同顏色區分
      - 設置適當的 lineWidth (建議 3)
      - 預設不添加數據點標記 ("marker": {"enabled": false})，除非用戶特別指名要添加
      - 如有多個數據系列，確保圖例清晰
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      
      **正確範例：**
      \`\`\`json
      // 時間序列
      {
        "chart": {"type": "line"},
        "title": {"text": "標題"},
        "xAxis": {"type": "datetime"},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "legend": {"verticalAlign": "bottom"},
        "series": [{
          "name": "系列名",
          "type": "line",
          "lineWidth": 3,
          "marker": {"enabled": false},
          "data": [[1609459200000, 120], [1612137600000, 135]]
        }]
      }
      
      // 類別數據
      {
        "chart": {"type": "line"},
        "title": {"text": "標題"},
        "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "legend": {"verticalAlign": "bottom"},
        "series": [{
          "name": "系列名",
          "type": "line",
          "lineWidth": 3,
          "marker": {"enabled": false},
          "data": [85, 90, 88, 92]
        }]
      }
      \`\`\`
      
      **避免錯誤：**
      - chart: "line" ❌ → chart: {"type": "line"} ✅
      - series: {...} ❌ → series: [{...}] ✅
      - data: ["2023-01-01", 100] ❌ → data: [1672531200000, 100] ✅
      
      **數據格式：**
      - 時間序列：data: [[時間戳毫秒, 數值], ...]
      - 類別數據：xAxis.categories + data: [數值1, 數值2, ...]
      
      現在，請產生專門用於線圖的 Highcharts JSON 設定物件。
    `,
    
    'column': `
      ${basePrompt}
      
      **柱狀圖專門指令：**
      - 如果是類別數據的比較，則確保 X 軸使用 categories 類型
      - 如果是時間序列數據的趨勢比較，則保 X 軸正確處理時間數據（使用 datetime 類型，並把日期或年份轉換為timestamp）
      - 設置適當的柱狀圖寬度和間距
      - 如有多個數據系列，考慮使用分組或堆疊
      - 如果數據數量不多的時候，添加數據標籤以提高可讀性，數據數量多的時候，則不添加數據標籤
      - 設置適當的 Y 軸範圍和標籤
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      
      **正確範例：**
      \`\`\`json
      // 時間序列
      {
        "chart": {"type": "column"},
        "title": {"text": "標題"},
        "xAxis": {"type": "datetime"},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "legend": {"verticalAlign": "bottom"},
        "series": [{
          "name": "系列名",
          "type": "column",
          "data": [[1609459200000, 120], [1612137600000, 135]]
        }]
      }
      
      // 類別數據
      {
        "chart": {"type": "column"},
        "title": {"text": "標題"},
        "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "legend": {"verticalAlign": "bottom"},
        "series": [{
          "name": "系列名",
          "type": "column",
          "data": [85, 90, 88, 92]
        }]
      }
      \`\`\`
      
      **避免錯誤：**
      - chart: "column" ❌ → chart: {"type": "column"} ✅
      - series: {...} ❌ → series: [{...}] ✅
      - data: ["2023-01-01", 100] ❌ → data: [1672531200000, 100] ✅
      
      **數據格式：**
      - 時間序列：data: [[時間戳毫秒, 數值], ...]
      - 類別數據：xAxis.categories + data: [數值1, 數值2, ...]
      
      現在，請產生專門用於柱狀圖的 Highcharts JSON 設定物件。
    `,
    
    'area': `
      ${basePrompt}
      
      **面積圖專門指令：**
      - 專注於時間序列數據的累積展示
      - 確保 X 軸正確處理時間數據（使用 datetime 類型，並把日期或年份轉換為timestamp）
      - 設置適當的透明度以顯示重疊區域
      - 考慮使用漸變色
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "area"},
        "title": {"text": "標題"},
        "xAxis": {"type": "datetime"},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "legend": {"verticalAlign": "bottom"},
        "plotOptions": {
          "area": {
            "fillOpacity": 0.6
          }
        },
        "series": [{
          "name": "系列名",
          "type": "area",
          "data": [[1609459200000, 120], [1612137600000, 135]]
        }]
      }
      \`\`\`
      
      現在，請產生專門用於面積圖的 Highcharts JSON 設定物件。
    `,
    
    'pie': `
      ${basePrompt}
      
      **圓餅圖專門指令：**
      - 專注於比例關係的展示，圓餅圖適合展示數據的組成比例
      - 確保數據加總為有意義的整體
      - 設置適當的餅圖大小和位置
      - 添加數據標籤顯示百分比，數據數量不多的時候，添加數據標籤，數據數量多的時候，則不添加數據標籤
      - 考慮使用 allowPointSelect 讓用戶互動
      - 設置適當的顏色對比
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      
      **正確範例：**
      \`\`\`json
      // 基本圓餅圖
      {
        "chart": {"type": "pie"},
        "title": {"text": "標題"},
        "legend": {"verticalAlign": "bottom"},
        "plotOptions": {
          "pie": {
            "allowPointSelect": true,
            "cursor": "pointer",
            "dataLabels": {"enabled": true, "format": "{point.name}: {point.percentage:.1f}%"}
          }
        },
        "series": [{
          "name": "比例",
          "data": [
            {"name": "類別A", "y": 45.0},
            {"name": "類別B", "y": 26.8},
            {"name": "類別C", "y": 12.8},
            {"name": "類別D", "y": 8.5},
            {"name": "其他", "y": 6.9}
          ]
        }]
      }
      \`\`\`
      
      **避免錯誤：**
      - chart: "pie" ❌ → chart: {"type": "pie"} ✅
      - series: {...} ❌ → series: [{...}] ✅
      - data: [45, 26.8, 12.8] ❌ → data: [{"name": "類別A", "y": 45.0}, ...] ✅
      
      **數據格式：**
      - 使用物件格式：data: [{"name": "類別名", "y": 數值}, ...]
      
      現在，請產生專門用於圓餅圖的 Highcharts JSON 設定物件。
    `,
    
    'scatter': `
      ${basePrompt}
      
      **散佈圖專門指令：**
      - 專注於兩個變量之間的關係展示
      - 確保 X 軸和 Y 軸使用適當的數據類型
      - 設置適當的點大小和顏色
      - 考慮添加趨勢線
      - 啟用數據點標記 ("marker": {"enabled": true})
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "scatter"},
        "title": {"text": "標題"},
        "xAxis": {"title": {"text": "X軸標題"}},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "series": [{
          "name": "系列名",
          "type": "scatter",
          "marker": {"enabled": true, "radius": 4},
          "data": [[1, 2], [2, 4], [3, 6], [4, 8]]
        }]
      }
      \`\`\`
      
      **避免錯誤：**
      - chart: "scatter" ❌ → chart: {"type": "scatter"} ✅
      - series: {...} ❌ → series: [{...}] ✅
      
      **數據格式：**
      - 使用數組格式：data: [[x值, y值], ...]
      
      現在，請產生專門用於散佈圖的 Highcharts JSON 設定物件。
    `,
    
    'stacked_column': `
      ${basePrompt}
      
      **堆疊柱狀圖專門指令：**
      - 展示分類數據的組成結構
      - 確保數據系列之間有邏輯關係
      - 設置適當的堆疊順序
      - 考慮添加數據標籤
      - 使用協調的顏色方案
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "column"},
        "title": {"text": "標題"},
        "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "legend": {"verticalAlign": "bottom"},
        "plotOptions": {
          "column": {"stacking": "normal"}
        },
        "series": [
          {
            "name": "系列A",
            "type": "column",
            "data": [5, 3, 4, 7]
          },
          {
            "name": "系列B",
            "type": "column",
            "data": [2, 2, 3, 2]
          }
        ]
      }
      \`\`\`
      
      **避免錯誤：**
      - chart: "stacked_column" ❌ → chart: {"type": "column"} ✅
      - 忘記設置 stacking ❌ → plotOptions.column.stacking: "normal" ✅
      
      現在，請產生專門用於堆疊柱狀圖的 Highcharts JSON 設定物件。
    `,
    
    'spline': `
      ${basePrompt}
      
      **平滑線圖專門指令：**
      - 使用平滑的曲線展示數據趨勢
      - 適合展示連續的數據變化
      - 設置適當的線條寬度
      - 考慮添加數據點標記
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "spline"},
        "title": {"text": "標題"},
        "xAxis": {"type": "datetime"},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "legend": {"verticalAlign": "bottom"},
        "series": [{
          "name": "系列名",
          "type": "spline",
          "lineWidth": 3,
          "data": [[1609459200000, 120], [1612137600000, 135]]
        }]
      }
      \`\`\`
      
      現在，請產生專門用於平滑線圖的 Highcharts JSON 設定物件。
    `,
    
    'donut': `
      ${basePrompt}
      
      **環形圖專門指令：**
      - 類似圓餅圖，但中間留有空白
      - 設置適當的內徑大小
      - 添加數據標籤
      - 考慮在中心添加標題
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "pie"},
        "title": {"text": "標題"},
        "legend": {"verticalAlign": "bottom"},
        "plotOptions": {
          "pie": {
            "innerSize": "60%",
            "dataLabels": {"enabled": true}
          }
        },
        "series": [{
          "name": "比例",
          "data": [
            {"name": "類別A", "y": 45.0},
            {"name": "類別B", "y": 26.8},
            {"name": "類別C", "y": 12.8}
          ]
        }]
      }
      \`\`\`
      
      現在，請產生專門用於環形圖的 Highcharts JSON 設定物件。
    `,
    
    'bubble': `
      ${basePrompt}
      
      **泡泡圖專門指令：**
      - 展示三個維度的數據關係
      - X軸、Y軸和泡泡大小代表不同變量
      - 設置適當的泡泡大小範圍
      - 使用顏色區分不同系列
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "bubble"},
        "title": {"text": "標題"},
        "xAxis": {"title": {"text": "X軸標題"}},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "series": [{
          "name": "系列名",
          "type": "bubble",
          "data": [[1, 2, 10], [2, 4, 20], [3, 6, 15]]
        }]
      }
      \`\`\`
      
      **數據格式：**
      - 使用數組格式：data: [[x值, y值, z值(泡泡大小)], ...]
      
      現在，請產生專門用於泡泡圖的 Highcharts JSON 設定物件。
    `,
    
    'waterfall': `
      ${basePrompt}
      
      **瀑布圖專門指令：**
      - 展示數據的累積變化
      - 設置適當的連接線
      - 區分正負值使用不同顏色
      - 添加總計行
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "waterfall"},
        "title": {"text": "標題"},
        "xAxis": {"type": "category"},
        "yAxis": {"title": {"text": "Y軸標題"}},
        "series": [{
          "name": "系列名",
          "type": "waterfall",
          "data": [
            {"name": "初始值", "y": 120},
            {"name": "項目A", "y": 20},
            {"name": "項目B", "y": -10},
            {"name": "項目C", "y": 30},
            {"name": "總計", "isSum": true}
          ]
        }]
      }
      \`\`\`
      
      現在，請產生專門用於瀑布圖的 Highcharts JSON 設定物件。
    `,
    
    'combo': `
      ${basePrompt}
      
      **組合圖專門指令：**
      - 結合不同類型的圖表
      - 通常結合柱狀圖和折線圖
      - 設置雙Y軸以支援不同數據範圍
      - 確保圖例清晰區分不同系列
      - 圖例預設位置在圖表下方（verticalAlign: "bottom"），只有用戶特別指定時才改變
      - **重要：chart.type 必須設為 "column"，不能是 "combo"**
      - **重要：yAxis 必須使用陣列格式來支援雙Y軸**
      
      **正確範例：**
      \`\`\`json
      {
        "chart": {"type": "column"},
        "title": {"text": "標題"},
        "xAxis": {"type": "category", "categories": ["Q1", "Q2", "Q3", "Q4"]},
        "yAxis": [
          {
            "title": {"text": "柱狀圖軸"},
            "labels": {"format": "{value}%"}
          },
          {
            "title": {"text": "折線圖軸"},
            "opposite": true
          }
        ],
        "legend": {"verticalAlign": "bottom"},
        "series": [
          {
            "name": "柱狀圖系列",
            "type": "column",
            "data": [5, 3, 4, 7]
          },
          {
            "name": "折線圖系列",
            "type": "line",
            "yAxis": 1,
            "data": [2, 2, 3, 2]
          }
        ]
      }
      \`\`\`
      
      **避免錯誤：**
      - chart: "combo" ❌ → chart: {"type": "column"} ✅
      - yAxis: {...} ❌ → yAxis: [{...}, {...}] ✅
      - 忘記設置 series.yAxis 索引 ❌ → series: [{"yAxis": 0}, {"yAxis": 1}] ✅
      
      現在，請產生專門用於組合圖的 Highcharts JSON 設定物件。
    `
  };
}; 