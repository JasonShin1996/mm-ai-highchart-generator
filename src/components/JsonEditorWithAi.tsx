import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { diffLines, Change } from 'diff';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AskAiConfigButton from '@/components/AskAiConfigButton';
import { modifyChartConfigWithAi } from '@/services/chartConfigAi';
import { useToast } from '@/hooks/use-toast';

function DiffViewer({ before, after }: { before: any; after: any }) {
  const changes: Change[] = diffLines(
    JSON.stringify(before, null, 2),
    JSON.stringify(after, null, 2)
  );
  return (
    <div className="w-full h-48 rounded border border-violet-500/60 overflow-auto bg-gray-800 text-xs font-mono">
      {changes.map((change, idx) => {
        const lines = change.value.replace(/\n$/, '').split('\n');
        const cls = change.added
          ? 'bg-green-900/60 text-green-300'
          : change.removed
          ? 'bg-red-900/60 text-red-300'
          : 'text-gray-300';
        const prefix = change.added ? '+' : change.removed ? '-' : ' ';
        return lines.map((line, li) => (
          <div key={`${idx}-${li}`} className={`flex px-2 py-px whitespace-pre ${cls}`}>
            <span className="select-none w-4 shrink-0 opacity-50">{prefix}</span>
            <span>{line}</span>
          </div>
        ));
      })}
    </div>
  );
}

interface JsonEditorWithAiProps {
  value: string;
  onChange: (v: string) => void;
  onApply: (config: any) => void;
  disabled?: boolean;
  label?: string;
}

const LOADING_STEPS = [
  '正在分析現有配置...',
  '請求 AI 生成修改建議...',
  '整合配置變更...',
];

const JsonEditorWithAi: React.FC<JsonEditorWithAiProps> = ({
  value,
  onChange,
  onApply,
  disabled = false,
  label = '圖表配置代碼（可編輯）',
}) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  // snapshots for diff + revert
  const [beforeSnapshot, setBeforeSnapshot] = useState<any>(null);
  const [afterSnapshot, setAfterSnapshot] = useState<any>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (aiLoading) {
      setStepIdx(0);
      stepTimer.current = setInterval(
        () => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)),
        1800
      );
    } else {
      if (stepTimer.current) clearInterval(stepTimer.current);
    }
    return () => { if (stepTimer.current) clearInterval(stepTimer.current); };
  }, [aiLoading]);

  const handlePromptSubmit = async (prompt: string) => {
    let currentConfig: any;
    try {
      currentConfig = JSON.parse(value);
    } catch {
      toast({ title: 'JSON 格式錯誤', description: '請先修正配置代碼的 JSON 格式', variant: 'destructive' });
      return;
    }

    setAiLoading(true);
    try {
      const result = await modifyChartConfigWithAi(currentConfig, prompt);
      // immediately apply so user sees the change right away
      onApply(result.after);
      onChange(JSON.stringify(result.after, null, 2));
      // keep snapshots for diff view + revert
      setBeforeSnapshot(result.before);
      setAfterSnapshot(result.after);
    } catch (error) {
      toast({
        title: 'AI 修改失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAccept = () => {
    setBeforeSnapshot(null);
    setAfterSnapshot(null);
    toast({ title: '已確認 AI 配置', description: '圖表配置已套用' });
  };

  const handleReject = () => {
    if (!beforeSnapshot) return;
    onApply(beforeSnapshot);
    onChange(JSON.stringify(beforeSnapshot, null, 2));
    setBeforeSnapshot(null);
    setAfterSnapshot(null);
    toast({ title: '已還原', description: '圖表已恢復為 AI 修改前的配置' });
  };

  const handleApplyManual = () => {
    try {
      onApply(JSON.parse(value));
      toast({ title: '代碼已應用', description: '圖表已更新為新的配置' });
    } catch {
      toast({ title: 'JSON 格式錯誤', description: '請檢查代碼格式是否正確', variant: 'destructive' });
    }
  };

  const isPending = !!beforeSnapshot;

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          {isPending ? (
            /* Accept / Reject shown while waiting for user confirmation */
            <>
              <span className="text-xs text-violet-400 mr-1">AI 已套用，確認？</span>
              <Button size="sm" variant="outline" className="h-8" onClick={handleReject}>
                <X className="h-4 w-4 mr-1" />還原
              </Button>
              <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white" onClick={handleAccept}>
                <Check className="h-4 w-4 mr-1" />確認
              </Button>
            </>
          ) : (
            <>
              <AskAiConfigButton
                onSubmitPrompt={handlePromptSubmit}
                disabled={disabled || aiLoading}
              />
              <Button onClick={handleApplyManual} size="sm" variant="outline" className="h-8" disabled={disabled || aiLoading}>
                <Check className="h-4 w-4 mr-1" />應用變更
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor area */}
      {isPending && beforeSnapshot && afterSnapshot ? (
        /* Diff view while pending confirmation */
        <DiffViewer before={beforeSnapshot} after={afterSnapshot} />
      ) : (
        /* Normal editor + translucent loading overlay */
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-48 p-4 text-sm font-mono bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none resize-none overflow-auto"
            spellCheck={false}
            disabled={disabled || aiLoading}
          />
          {aiLoading && (
            <div className="absolute inset-0 rounded border border-violet-500/40 bg-gray-900/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="relative flex items-center justify-center w-10 h-10">
                <Sparkles className="w-5 h-5 text-violet-400 absolute animate-pulse" />
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#3f3f46" strokeWidth="3" />
                  <circle
                    cx="20" cy="20" r="16" fill="none" stroke="#8b5cf6" strokeWidth="3"
                    strokeDasharray="100.5" strokeDashoffset="25"
                    className="origin-center animate-spin"
                    style={{ animationDuration: '1.2s' }}
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-violet-200 animate-pulse">{LOADING_STEPS[stepIdx]}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JsonEditorWithAi;
