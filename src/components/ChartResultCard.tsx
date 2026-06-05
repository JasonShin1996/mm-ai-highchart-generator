import React from 'react';
import { Settings, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChartDisplay from '@/components/ChartDisplay';
import SettingsPanel from '@/components/SettingsPanel';
import JsonEditorWithAi from '@/components/JsonEditorWithAi';
import { useToast } from '@/hooks/use-toast';

interface ChartResultCardProps {
  stepNumber: number;
  stepColor?: string;
  title?: string;
  chartOptions: any;
  setChartOptions: (opts: any) => void;
  isLoading?: boolean;
  isOptimizing?: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  generatedCode: string;
  setGeneratedCode: (code: string) => void;
  databaseData?: any;
  onDateChange?: (date: string) => void;
  extraHeaderActions?: React.ReactNode;
  extraContent?: React.ReactNode;
}

const ChartResultCard: React.FC<ChartResultCardProps> = ({
  stepNumber,
  stepColor = 'blue',
  title = '生成的圖表',
  chartOptions,
  setChartOptions,
  isLoading = false,
  isOptimizing = false,
  showSettings,
  setShowSettings,
  generatedCode,
  setGeneratedCode,
  databaseData,
  onDateChange,
  extraHeaderActions,
  extraContent,
}) => {
  const { toast } = useToast();

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast({ title: '已複製', description: '圖表配置代碼已複製到剪貼簿' });
    }).catch(() => {
      toast({ title: '複製失敗', description: '無法複製到剪貼簿', variant: 'destructive' });
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <span className={`bg-${stepColor}-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3`}>
              {stepNumber}
            </span>
            {title}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4 mr-1" />
              設定
            </Button>
            {extraHeaderActions}
            <Button variant="outline" size="sm" onClick={copyCode}>
              <Copy className="h-4 w-4 mr-1" />
              複製代碼
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {extraContent}

          <div className="border rounded-lg p-4 bg-white">
            <ChartDisplay
              chartOptions={chartOptions}
              isLoading={isLoading}
              setChartOptions={setChartOptions}
            />
          </div>

          {showSettings && (
            <div className="border rounded-lg p-4">
              <SettingsPanel
                chartOptions={chartOptions}
                onOptionsChange={isOptimizing ? undefined : (newOpts) => {
                  setChartOptions(newOpts);
                  setGeneratedCode(JSON.stringify(newOpts, null, 2));
                }}
                databaseData={databaseData ?? null}
                onDateChange={onDateChange ?? (() => {})}
              />
            </div>
          )}

          <JsonEditorWithAi
            value={generatedCode}
            onChange={setGeneratedCode}
            onApply={(config) => {
              setChartOptions(config);
              setGeneratedCode(JSON.stringify(config, null, 2));
            }}
            disabled={isOptimizing}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartResultCard;
