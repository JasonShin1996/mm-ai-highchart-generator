import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Upload, Send, Square, Trash2, Clock, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import ChartDisplay from "@/components/ChartDisplay";
import ChartGallery from "@/components/ChartGallery";
import { useToast } from "@/hooks/use-toast";
import { getBackendUrl } from "@/services/apiClient";
import { useV2Generation, Turn } from "@/hooks/useV2Generation";
import { loadHistory, saveSession, deleteSession, HistorySession } from "@/lib/history";

// ── Upload section ────────────────────────────────────────────────────────────
interface UploadedFile {
  sessionId: string;
  filename: string;
  rowCount: number;
  columns: { name: string; dtype: string }[];
}

function UploadZone({ onUploaded }: { onUploaded: (f: UploadedFile) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${getBackendUrl()}/api/v2/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Upload failed");
      }
      const data = await res.json();
      onUploaded({ sessionId: data.session_id, filename: data.filename, rowCount: data.row_count, columns: data.columns });
    } catch (e: unknown) {
      toast({ title: "上傳失敗", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [onUploaded, toast]);

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
        ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
    >
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
      {uploading
        ? <p className="text-sm text-blue-600 font-medium">上傳解析中...</p>
        : <><p className="text-sm font-medium text-gray-700">拖放或點擊上傳 CSV / Excel</p><p className="text-xs text-gray-400 mt-1">支援 .csv / .xlsx / .xls</p></>
      }
    </div>
  );
}

// ── Single conversation turn ──────────────────────────────────────────────────
function TurnBubble({ turn, onChartChange }: { turn: Turn; onChartChange: (config: object) => void }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (turn.code) {
      navigator.clipboard.writeText(turn.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
          {turn.prompt}
        </div>
      </div>
    );
  }

  // Assistant turn
  return (
    <div className="flex flex-col gap-3">
      {/* Status / streaming text */}
      {turn.status === "streaming" && (
        <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
          {turn.streamingText || <span className="text-gray-400 animate-pulse">AI 思考中...</span>}
        </div>
      )}

      {turn.status === "executing" && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          執行代碼中...
        </div>
      )}

      {turn.status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ❌ {turn.errorMessage}
        </div>
      )}

      {/* Chart */}
      {turn.chartConfig && (
        <div className="border rounded-xl p-3 bg-white">
          <ChartDisplay
            chartOptions={turn.chartConfig}
            isLoading={false}
            setChartOptions={onChartChange}
          />
        </div>
      )}

      {/* AI explanation */}
      {turn.prompt && turn.status === "done" && (
        <div className="bg-gray-50 border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700">
          {turn.prompt}
        </div>
      )}

      {/* Code toggle */}
      {turn.code && (
        <div className="border rounded-xl overflow-hidden text-sm">
          <button
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium"
            onClick={() => setShowCode(v => !v)}
          >
            <span>查看 Python 代碼</span>
            {showCode ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showCode && (
            <div className="relative">
              <pre className="bg-gray-900 text-green-300 text-xs p-4 overflow-auto max-h-64">{turn.code}</pre>
              <button
                className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                onClick={copyCode}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── History sidebar ───────────────────────────────────────────────────────────
function HistorySidebar({
  sessions,
  activeId,
  onSelect,
  onDelete,
}: {
  sessions: HistorySession[];
  activeId?: string;
  onSelect: (s: HistorySession) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Clock className="h-4 w-4" />
          歷史紀錄
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8 px-4">尚無歷史紀錄</p>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            className={`group flex items-start gap-2 px-3 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-50
              ${activeId === s.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
            onClick={() => onSelect(s)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{s.title}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{s.filename}</p>
              <p className="text-xs text-gray-300 mt-0.5">{new Date(s.createdAt).toLocaleDateString("zh-TW")}</p>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
              onClick={e => { e.stopPropagation(); onDelete(s.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const LabChart = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { turns, setTurns, isGenerating, generate, abort, reset } = useV2Generation();

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<string | null>("line");
  const [prompt, setPrompt] = useState("");
  const [sessions, setSessions] = useState<HistorySession[]>(() => loadHistory());
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new turns
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // Save session to history when a chart is produced
  useEffect(() => {
    if (!uploadedFile || turns.length < 2) return;
    const lastAssistant = [...turns].reverse().find(t => t.role === "assistant" && t.status === "done" && t.chartConfig);
    if (!lastAssistant) return;

    const firstUserPrompt = turns.find(t => t.role === "user")?.prompt ?? "未命名";
    const session: HistorySession = {
      id: uploadedFile.sessionId,
      title: firstUserPrompt.slice(0, 40),
      filename: uploadedFile.filename,
      createdAt: Date.now(),
      turns: turns.map(t => ({
        role: t.role,
        prompt: t.prompt,
        code: t.code,
        chartConfig: t.chartConfig ? JSON.stringify(t.chartConfig) : undefined,
      })),
    };
    saveSession(session);
    setSessions(loadHistory());
    setActiveSessionId(uploadedFile.sessionId);
  }, [turns, uploadedFile]);

  const handleSend = async () => {
    if (!uploadedFile) { toast({ title: "請先上傳資料檔案", variant: "destructive" }); return; }
    if (!selectedChartType) { toast({ title: "請選擇圖表類型", variant: "destructive" }); return; }
    if (!prompt.trim()) return;
    const p = prompt.trim();
    setPrompt("");
    await generate(uploadedFile.sessionId, p, selectedChartType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
  };

  const handleRestoreSession = (s: HistorySession) => {
    reset();
    setActiveSessionId(s.id);
    setUploadedFile({ sessionId: s.id, filename: s.filename, rowCount: 0, columns: [] });
    setTurns(s.turns.map(t => ({
      role: t.role,
      prompt: t.prompt,
      code: t.code,
      chartConfig: t.chartConfig ? JSON.parse(t.chartConfig) : undefined,
      status: "done",
    })));
    toast({ title: "已還原歷史對話", description: s.title });
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setSessions(loadHistory());
    if (activeSessionId === id) { reset(); setUploadedFile(null); setActiveSessionId(undefined); }
  };

  const handleNewSession = () => {
    reset();
    setUploadedFile(null);
    setActiveSessionId(undefined);
    setPrompt("");
  };

  const handleChartChange = useCallback((config: object, turnIndex: number) => {
    setTurns(prev => {
      const next = [...prev];
      if (next[turnIndex]) next[turnIndex] = { ...next[turnIndex], chartConfig: config };
      return next;
    });
  }, [setTurns]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-60 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-3 border-b flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold text-gray-800">Lab</span>
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Beta</span>
        </div>
        <div className="p-2 border-b">
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleNewSession}>
            + 新對話
          </Button>
        </div>
        <HistorySidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={handleRestoreSession}
          onDelete={handleDeleteSession}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chart type selector */}
        <div className="bg-white border-b px-6 py-2">
          <ChartGallery
            onChartTypeSelect={setSelectedChartType}
            selectedChartType={selectedChartType}
            recommendedTypes={[]}
            disabled={isGenerating}
            onAvailableTypesChange={() => {}}
          />
        </div>

        {/* Conversation area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!uploadedFile ? (
            <div className="max-w-xl mx-auto mt-16">
              <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">AI 圖表生成 Lab</h1>
              <p className="text-sm text-gray-500 text-center mb-6">上傳資料檔案，用自然語言描述，AI 直接寫 Python 代碼生成圖表</p>
              <UploadZone onUploaded={f => { setUploadedFile(f); setActiveSessionId(f.sessionId); }} />
            </div>
          ) : (
            <>
              {/* File info bar */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-2 px-4 flex items-center justify-between">
                  <div className="text-sm text-green-800">
                    <span className="font-medium">{uploadedFile.filename}</span>
                    <span className="text-green-600 ml-2">· {uploadedFile.rowCount.toLocaleString()} 筆資料 · {uploadedFile.columns.length} 欄</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs text-gray-500" onClick={handleNewSession}>
                    換檔案
                  </Button>
                </CardContent>
              </Card>

              {/* Turns */}
              {turns.map((turn, i) => (
                <TurnBubble
                  key={i}
                  turn={turn}
                  onChartChange={config => handleChartChange(config, i)}
                />
              ))}

              {turns.length === 0 && (
                <div className="text-center text-gray-400 text-sm mt-12">
                  檔案已就緒，在下方輸入框描述你想要的圖表 👇
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        {uploadedFile && (
          <div className="bg-white border-t px-6 py-4">
            <div className="flex gap-3 items-end max-w-4xl mx-auto">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={turns.length === 0 ? "描述你想要的圖表，例如：幫我畫出 GDP 趨勢折線圖，x 軸是日期..." : "繼續修改，例如：把顏色改成藍色系，加上資料標籤..."}
                className="flex-1 min-h-[60px] max-h-[120px] resize-none text-sm"
                disabled={isGenerating}
              />
              <div className="flex flex-col gap-2">
                {isGenerating ? (
                  <Button size="sm" variant="destructive" onClick={abort} className="w-16">
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSend} disabled={!prompt.trim()} className="w-16">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                <p className="text-xs text-gray-400 text-center">⌘↵</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabChart;
