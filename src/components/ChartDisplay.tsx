import { useEffect, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import Highcharts from '@/lib/highcharts';

interface ChartDisplayProps {
  chartOptions: Highcharts.Options | null;
  isLoading?: boolean;
  setChartOptions?: (options: Highcharts.Options) => void;
}

const ChartDisplay = ({ chartOptions, isLoading, setChartOptions }: ChartDisplayProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!chartOptions || !chartRef.current) return;

    // 清理舊的圖表實例
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    try {
      chartInstanceRef.current = Highcharts.chart(chartRef.current, chartOptions);

      // 同步 Highcharts 自動分配的顏色回 chartOptions，讓設定面板可顯示實際色票
      if (setChartOptions && chartInstanceRef.current && chartOptions.series) {
        const highchartsSeries = chartInstanceRef.current.series;
        let updated = false;
        const newSeries = (chartOptions.series as any[]).map((s, i) => {
          if (!s.color && highchartsSeries[i] && (highchartsSeries[i] as any).color) {
            updated = true;
            return { ...s, color: (highchartsSeries[i] as any).color };
          }
          return s;
        });
        if (updated) {
          setChartOptions({ ...chartOptions, series: newSeries });
        }
      }
    } catch (error) {
      console.error('Highcharts rendering error:', error);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartOptions, setChartOptions]);

  // 動態獲取圖表尺寸
  const chartWidth = (chartOptions?.chart?.width as number) || 960;
  const chartHeight = (chartOptions?.chart?.height as number) || 540;

  if (isLoading) {
    return (
      <div className="w-full bg-gray-50 rounded-lg flex items-center justify-center" style={{ height: `${chartHeight}px` }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">AI 正在為您生成圖表，請稍候...</p>
        </div>
      </div>
    );
  }

  if (!chartOptions) {
    return (
      <div className="w-full bg-gray-50 rounded-lg flex items-center justify-center" style={{ height: `${chartHeight}px` }}>
        <div className="text-center text-gray-500">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg">生成的圖表將會顯示在這裡</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div
        ref={chartRef}
        className="mx-auto bg-white rounded-lg shadow-sm"
        style={{
          width: `${chartWidth}px`,
          height: `${chartHeight}px`,
          minWidth: `${chartWidth}px`,
        }}
      />
    </div>
  );
};

export default ChartDisplay;
