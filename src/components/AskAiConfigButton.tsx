import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AskAiConfigButtonProps {
  onSubmitPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const AskAiConfigButton: React.FC<AskAiConfigButtonProps> = ({
  onSubmitPrompt,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast({ title: '請輸入需求', description: '描述你想如何調整圖表配置', variant: 'destructive' });
      return;
    }
    onSubmitPrompt(trimmed);
    setPrompt('');
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="h-8"
        disabled={disabled}
      >
        <Sparkles className="h-4 w-4 mr-1" />
        Ask AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ask AI 調整配置</DialogTitle>
            <DialogDescription>
              描述你想修改的樣式或設定（這邊不會改數據），AI 會直接調整 JSON，不會重新執行 Python 代碼。
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
            placeholder="例如：把標題改成「2024 年價格走勢」、Y 軸改成對數刻度、把第一條線改成紅色..."
            className="min-h-[100px] resize-none"
            autoFocus
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>
              <Sparkles className="h-4 w-4 mr-1" />
              送出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AskAiConfigButton;
