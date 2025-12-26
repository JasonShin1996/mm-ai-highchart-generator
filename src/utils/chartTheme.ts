export const generateMMTheme = (size = 'standard', chartOptions = null) => {
  // 根據尺寸類型設定對應的配置
  const getSizeConfig = () => {
    switch (size) {
      case 'large':
        return {
          width: 975,
          height: 650,
          titleFontSize: '26px',
          subtitleFontSize: '20px',
          axisFontSize: '16px',
          yAxisTitleFontSize: '17px',
          legendFontSize: '24px'
        };
      case 'square':
        return {
          width: 800,
          height: 800,
          titleFontSize: '26px',
          subtitleFontSize: '20px',
          axisFontSize: '16px',
          yAxisTitleFontSize: '17px',
          legendFontSize: '24px'
        };
      default: // 'standard'
        return {
          width: 960,
          height: 540,
          titleFontSize: '24px',
          subtitleFontSize: '18px',
          axisFontSize: '14px',
          yAxisTitleFontSize: '14px',
          legendFontSize: '20px'
        };
    }
  };

  const sizeConfig = getSizeConfig();
  
  // 檢查圖表類型，決定是否需要 lineWidth
  const needsLineWidth = () => {
    if (!chartOptions || !chartOptions.series || !Array.isArray(chartOptions.series)) return false;
    
    // 檢查是否有任何 series 使用線條類型（包括組合圖中的線條系列）
    const lineBasedTypes = ['line', 'spline', 'area', 'areaspline'];
    return chartOptions.series.some(series => 
      series && series.type && lineBasedTypes.includes(series.type)
    );
  };
  
  // 根據圖表類型決定 plotOptions
  const getPlotOptions = () => {
    // 檢查是否為散佈圖或泡泡圖（需要啟用marker）
    const needsMarkers = () => {
      if (!chartOptions) return false;
      
      // 檢查 chart.type（散佈圖和泡泡圖需要顯示標記點）
      if (chartOptions.chart?.type === 'scatter' || chartOptions.chart?.type === 'bubble') return true;
      
          // 檢查 series 中是否有 scatter 或 bubble 類型（包括組合圖中的散佈/泡泡系列）
    if (chartOptions.series && Array.isArray(chartOptions.series)) {
      return chartOptions.series.some(series => 
        series && series.type && (series.type === 'scatter' || series.type === 'bubble')
      );
    }
      
      return false;
    };
    
    const seriesOptions: any = {
      'marker': {'enabled': needsMarkers() ? true : false},
    };
    
    // 只對需要線條的圖表類型添加 lineWidth
    if (needsLineWidth()) {
      seriesOptions.lineWidth = 3;
    }
    
    return {
      'series': seriesOptions
    };
  };
  
  return {
    'lang': {'numericSymbols': ["K", "M", "B", "T", "P", "E"]},
    'colors': [
      '#3BAFDA','#E9573F','#F6BB42','#70CA63','#7D5B4F','#3B3F4F',
      '#926DDE','#57C7D4','#F44C87','#BC94AC','#184E74','#026352',
      '#C1C286','#AA2906','#A5FFD6','#84DCC6','#FF99AC','#17C3B2',
      '#D68C45','#6F2DBD','#F7AEF8','#B388EB','#8093F1','#72DDF7',
      '#94D2BD','#E9D8A6','#EE9B00','#FFEE32','#37BC9B',
    ],
    'chart': {
      'backgroundColor': '#ffffff',
      'width': sizeConfig.width,
      'height': sizeConfig.height,
      'style': {
        'fontFamily': '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
      }
    },
    'title': {
      'style': {
        'color': '#333333', 
        'fontSize': sizeConfig.titleFontSize, 
        'fontWeight': '450'
      }
    },
    'subtitle': {
      'text': 'MacroMicro.me | MacroMicro',
      'style': {
        'color': '#666666', 
        'fontSize': sizeConfig.subtitleFontSize
      }
    },
    'xAxis': {
      'lineColor': '#d8d8d8', 'lineWidth': 1,
      'tickColor': '#d8d8d8', 'tickWidth': 1,
      'labels': {
        'style': {
          'color': '#666666', 
          'fontSize': sizeConfig.axisFontSize
        }
      },
      'tickPixelInterval': 150,
      'title': {'text': ''}
    },
    'yAxis': {
      'gridLineColor': '#e6e6e6', 'gridLineWidth': 1,
      'labels': {
        'style': {
          'color': '#666666', 
          'fontSize': sizeConfig.axisFontSize, 
          'fontWeight': '450'
        }
      },
      'title': {
        'text': chartOptions?.yAxis?.title?.text || '',
        'style': {
          'color': '#666666', 
          'fontSize': sizeConfig.yAxisTitleFontSize
        }
      }
    },
    'legend': {
      'itemStyle': {
        'color': '#000000', 
        'fontSize': sizeConfig.legendFontSize, 
        'fontWeight': '600'
      }
    },
    'plotOptions': getPlotOptions(),
    'credits': {'enabled': false},
    'exporting': {'enabled': true}
  };
}; 