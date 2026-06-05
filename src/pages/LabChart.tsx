import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Send, Square, Trash2, Clock,
  ChevronDown, ChevronUp, Copy, Check, FileSpreadsheet,
  Edit, Zap, FlaskConical, Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import FileUpload from "@/components/FileUpload";
import DataPreview from "@/components/DataPreview";
import ChartGallery from "@/components/ChartGallery";
import ChartDisplay from "@/components/ChartDisplay";
import SettingsPanel from "@/components/SettingsPanel";
import JsonEditorWithAi from "@/components/JsonEditorWithAi";
import { useToast } from "@/hooks/use-toast";
import { generateChartSuggestion } from "@/services/gemini";
import { getBackendUrl } from "@/services/apiClient";
import { analyzeDataAndRecommendCharts, getChartTypeName } from "@/utils/chartAnalysis";
import { useV2Generation, Turn } from "@/hooks/useV2Generation";
import { loadHistory, saveSession, deleteSession, HistorySession } from "@/lib/history";

// ── Types ─────────────────────────────────────────────────────────────────────
interface UploadedSession {
  sessionId: string;
  filename: string;
  rowCount: number;
}

// ── History sidebar ───────────────────────────────────────────────────────────
function HistorySidebar({
  sessions, activeId, onSelect, onDelete,
}: {
  sessions: HistorySession[];
  activeId?: string;
  onSelect: (s: HistorySession) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Clock className="h-4 w-4" />歷史紀錄
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

// ── Conversation turn bubble ──────────────────────────────────────────────────
const TurnBubble = React.memo(function TurnBubble({ turn, idx, onChartChange }: {
  turn: Turn;
  idx: number;
  onChartChange: (c: object, idx: number) => void;
}) {
  const [showCode, setShowCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(() =>
    turn.chartConfig ? JSON.stringify(turn.chartConfig, null, 2) : ""
  );
  const { toast } = useToast();

  // Keep JSON editor in sync when chart config is updated (e.g. by streaming)
  useEffect(() => {
    if (turn.chartConfig) {
      setGeneratedCode(JSON.stringify(turn.chartConfig, null, 2));
    }
  }, [turn.chartConfig]);

  const copyPythonCode = () => {
    if (!turn.code) return;
    navigator.clipboard.writeText(turn.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyJsonCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast({ title: "已複製", description: "圖表配置代碼已複製到剪貼簿" });
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    });
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

  return (
    <div className="flex flex-col gap-3">
      {/* Streaming text */}
      {turn.status === "streaming" && (
        <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-auto">
          {turn.streamingText || <span className="text-gray-400 animate-pulse">AI 分析中...</span>}
        </div>
      )}
      {/* Executing indicator */}
      {turn.status === "executing" && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          執行 Python 代碼，讀取完整資料中...
        </div>
      )}
      {/* Retrying indicator */}
      {turn.status === "retrying" && (
        <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
          <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          代碼執行失敗，AI 自動修正中（第 {turn.retryAttempt} 次）...
        </div>
      )}
      {/* Error */}
      {turn.status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ❌ {turn.errorMessage}
        </div>
      )}

      {/* Chart + manual adjustment panel (mirrors ChartResultCard) */}
      {turn.chartConfig && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-800">生成的圖表</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSettings(v => !v)}>
                  <Settings className="h-4 w-4 mr-1" />設定
                </Button>
                <Button variant="outline" size="sm" onClick={copyJsonCode}>
                  {copiedJson ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  複製代碼
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chart */}
            <div className="border rounded-lg p-4 bg-white">
              <ChartDisplay chartOptions={turn.chartConfig} isLoading={false} setChartOptions={c => onChartChange(c, idx)} />
            </div>

            {/* Settings panel */}
            {showSettings && (
              <div className="border rounded-lg p-4">
                <SettingsPanel
                  chartOptions={turn.chartConfig}
                  onOptionsChange={(newOpts) => {
                    onChartChange(newOpts, idx);
                    setGeneratedCode(JSON.stringify(newOpts, null, 2));
                  }}
                  databaseData={null}
                  onDateChange={() => {}}
                />
              </div>
            )}

            {/* JSON editor */}
            <JsonEditorWithAi
              value={generatedCode}
              onChange={setGeneratedCode}
              onApply={(config) => {
                onChartChange(config, idx);
                setGeneratedCode(JSON.stringify(config, null, 2));
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* AI message */}
      {turn.prompt && turn.status === "done" && (
        <div className="bg-gray-50 border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700">
          {turn.prompt}
        </div>
      )}

      {/* Python code (collapsible) */}
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
                onClick={copyPythonCode}
              >
                {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────
const LabChart = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { turns, setTurns, isGenerating, generate, abort, reset } = useV2Generation();

  // File / session state
  const [fileData, setFileData] = useState<any>(null);           // parsed by FileUpload (PapaParse)
  const [session, setSession] = useState<UploadedSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Setup-phase state (before first generation)
  const [prompt, setPrompt] = useState("");
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null);
  const [recommendedChartTypes, setRecommendedChartTypes] = useState<string[]>([]);
  const [showDataPreview, setShowDataPreview] = useState(false);

  // History
  const [sessions, setSessions] = useState<HistorySession[]>(() => loadHistory());
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasGeneratedOnce = turns.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]); // only scroll when a new turn is added, not on edits

  // Auto-save to history when a chart is produced
  useEffect(() => {
    if (!session || turns.length < 2) return;
    const lastDone = [...turns].reverse().find(t => t.role === "assistant" && t.status === "done" && t.chartConfig);
    if (!lastDone) return;
    const firstPrompt = turns.find(t => t.role === "user")?.prompt ?? "未命名";
    const histSession: HistorySession = {
      id: session.sessionId,
      title: firstPrompt.slice(0, 40),
      filename: session.filename,
      createdAt: Date.now(),
      turns: turns.map(t => ({
        role: t.role,
        prompt: t.prompt,
        code: t.code,
        chartConfig: t.chartConfig ? JSON.stringify(t.chartConfig) : undefined,
      })),
    };
    saveSession(histSession);
    setSessions(loadHistory());
    setActiveSessionId(session.sessionId);
  }, [turns, session]);

  // ── Upload: FileUpload component parses locally, then we also upload to backend
  const handleFileUpload = useCallback(async (data: any) => {
    if (!data?.data?.length) return;

    setFileData(data);
    setPrompt("");
    setSelectedChartType(null);
    setRecommendedChartTypes([]);

    // 1. Recommend chart types from local parse (fast, no server needed)
    const recommendations = analyzeDataAndRecommendCharts(data);
    setRecommendedChartTypes(recommendations);
    if (recommendations.length > 0) setSelectedChartType(recommendations[0]);

    // 2. Upload to backend v2 session
    setIsUploading(true);
    try {
      // Re-read the raw file from FileUpload's File object
      // FileUpload stores the file ref; we re-fetch from input
      // Instead, convert parsed data back to CSV for upload
      // Better: trigger a hidden file input OR use the original File object
      // FileUpload passes `data` which has data.file (the original File object)
      const file: File | undefined = data.file;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${getBackendUrl()}/api/v2/upload`, { method: "POST", body: fd });
        if (res.ok) {
          const resp = await res.json();
          setSession({ sessionId: resp.session_id, filename: resp.filename, rowCount: resp.row_count });
        } else {
          // Non-fatal: fall back to client-side only mode isn't supported, warn user
          toast({ title: "後端上傳失敗", description: "請確認後端服務正在執行", variant: "destructive" });
        }
      }
    } finally {
      setIsUploading(false);
    }

    // 3. AI auto-suggestion (same as existing pages)
    setIsSuggestionLoading(true);
    const optimized = data.data.slice(0, 5);
    generateChartSuggestion(data.meta.fields, optimized)
      .then(suggestion => {
        setPrompt(suggestion.description);
        if (suggestion.recommended_chart_type && recommendations.length === 0) {
          setSelectedChartType(suggestion.recommended_chart_type);
        }
        toast({ title: "AI 分析完成", description: "已根據您的數據生成圖表建議" });
      })
      .catch(() => {
        toast({ title: "AI 分析失敗", description: "請手動描述想要的圖表", variant: "destructive" });
      })
      .finally(() => setIsSuggestionLoading(false));
  }, [toast]);

  // ── First generation (setup phase → conversation phase)
  const handleFirstGenerate = async () => {
    if (!session) { toast({ title: "請等待檔案上傳完成", variant: "destructive" }); return; }
    if (!selectedChartType) { toast({ title: "請選擇圖表類型", variant: "destructive" }); return; }
    if (!prompt.trim()) return;
    const p = prompt.trim();
    setPrompt("");
    await generate(session.sessionId, p, selectedChartType);
  };

  // ── Follow-up turns (conversation phase)
  const handleFollowUp = async () => {
    if (!session || !prompt.trim()) return;
    const p = prompt.trim();
    const ct = selectedChartType ?? "line";
    setPrompt("");
    await generate(session.sessionId, p, ct);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      hasGeneratedOnce ? handleFollowUp() : handleFirstGenerate();
    }
  };

  // ── Restore history session
  const handleRestoreSession = (s: HistorySession) => {
    reset();
    setFileData(null);
    setSession({ sessionId: s.id, filename: s.filename, rowCount: 0 });
    setActiveSessionId(s.id);
    setTurns(s.turns.map(t => ({
      role: t.role,
      prompt: t.prompt,
      code: t.code,
      chartConfig: t.chartConfig ? JSON.parse(t.chartConfig) : undefined,
      status: "done" as const,
    })));
    toast({ title: "已還原歷史對話", description: s.title });
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setSessions(loadHistory());
    if (activeSessionId === id) { reset(); setFileData(null); setSession(null); setActiveSessionId(undefined); }
  };

  const handleNewSession = () => {
    reset();
    setFileData(null);
    setSession(null);
    setActiveSessionId(undefined);
    setPrompt("");
    setSelectedChartType(null);
    setRecommendedChartTypes([]);
  };

  const handleChartChange = useCallback((config: object, idx: number) => {
    setTurns(prev => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], chartConfig: config };
      return next;
    });
  }, [setTurns]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-60 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-3 border-b flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FlaskConical className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-bold text-gray-800">AI Lab</span>
          <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Beta</span>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">

          {/* ── No file yet: upload zone ── */}
          {!fileData && !session && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">AI Lab — 新架構圖表生成</h1>
                <p className="text-sm text-gray-500 mt-1">AI 直接寫 Python 代碼讀取完整資料，支援串流生成與多輪對話修改</p>
              </div>
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center">
                    <span className="bg-purple-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">1</span>
                    上傳您的數據檔案
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload onFileUpload={handleFileUpload} />
                  {isUploading && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-purple-600">
                      <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      上傳至後端 session 中...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── File uploaded, setup phase (before first generation) ── */}
          {(fileData || session) && !hasGeneratedOnce && (
            <div className="max-w-2xl mx-auto space-y-6">

              {/* File info */}
              {fileData && (
                <Card className="shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center">
                      <span className="bg-purple-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">1</span>
                      已載入資料
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" onClick={() => setShowDataPreview(true)}>
                        <Edit className="mr-1 h-4 w-4" />預覽 / 編輯
                      </Button>
                      <div className="flex items-center text-sm text-gray-700">
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-gray-500" />
                        已載入 {fileData.data.length.toLocaleString()} 行 × {fileData.meta.fields.length} 欄
                        {session && <span className="ml-2 text-xs text-purple-600">（已上傳至後端）</span>}
                      </div>
                    </div>
                    {isUploading && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-purple-600">
                        <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        上傳至後端 session 中...
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Prompt input with AI suggestion */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="bg-purple-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">2</span>
                    描述您想看的圖表
                    {isSuggestionLoading && (
                      <div className="ml-3 flex items-center text-sm text-purple-600">
                        <div className="w-4 h-4 mr-1 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        AI 分析中...
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isSuggestionLoading && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      正在分析數據並生成建議...
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>描述圖表需求</Label>
                    <Textarea
                      placeholder="請幫我畫出折線圖，X 軸是日期，Y 軸是 GDP 數值..."
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      className="min-h-[120px]"
                      disabled={isGenerating}
                    />
                    {prompt && !isSuggestionLoading && (
                      <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                        💡 AI 已根據您的數據生成建議，可直接使用或修改
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chart type selection + generate button */}
              {prompt.trim() && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="bg-purple-500 text-white rounded-full h-8 w-8 text-sm flex items-center justify-center mr-3">3</span>
                      選擇圖表類型
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedChartType && recommendedChartTypes.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-sm text-gray-600">AI 推薦</Label>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-sm font-medium">
                            {getChartTypeName(selectedChartType)}
                          </span>
                          <span className="text-sm text-gray-500">AI 根據數據特性自動選擇</span>
                        </div>
                      </div>
                    )}
                    <ChartGallery
                      onChartTypeSelect={setSelectedChartType}
                      selectedChartType={selectedChartType}
                      recommendedTypes={recommendedChartTypes}
                      disabled={isGenerating}
                      onAvailableTypesChange={() => {}}
                    />
                    <div className="flex items-center gap-4 pt-2">
                      <Button
                        onClick={handleFirstGenerate}
                        disabled={isGenerating || !prompt.trim() || !selectedChartType || isUploading}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isGenerating ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />生成中...</>
                        ) : (
                          <><Zap className="h-4 w-4 mr-2" />AI 生成圖表</>
                        )}
                      </Button>
                      {isUploading && <span className="text-sm text-gray-400">等待後端上傳完成...</span>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Conversation phase (after first generation) ── */}
          {hasGeneratedOnce && (
            <div className="max-w-6xl mx-auto w-full space-y-4">
              {/* Compact file bar */}
              {session && (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-2 text-sm">
                  <div className="flex items-center gap-2 text-purple-800">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="font-medium">{session.filename}</span>
                    {session.rowCount > 0 && <span className="text-purple-500">· {session.rowCount.toLocaleString()} 筆</span>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs text-gray-400 h-6" onClick={handleNewSession}>
                    換檔案
                  </Button>
                </div>
              )}
              {/* Chart type selector (compact) */}
              <div className="bg-white border rounded-xl px-4 py-3">
                <Label className="text-xs text-gray-500 mb-2 block">切換圖表類型（下一輪生效）</Label>
                <ChartGallery
                  onChartTypeSelect={setSelectedChartType}
                  selectedChartType={selectedChartType}
                  recommendedTypes={recommendedChartTypes}
                  disabled={isGenerating}
                  onAvailableTypesChange={() => {}}
                />
              </div>
              {/* Turns */}
              {turns.map((turn, i) => (
                <TurnBubble key={i} turn={turn} idx={i} onChartChange={handleChartChange} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar (only in conversation phase) ── */}
        {hasGeneratedOnce && (
          <div className="bg-white border-t px-4 md:px-8 py-4">
            <div className="flex gap-3 items-end max-w-6xl mx-auto w-full">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="繼續修改，例如：把顏色改成藍色系、加上資料標籤、換成堆疊柱狀圖..."
                className="flex-1 min-h-[56px] max-h-[120px] resize-none text-sm"
                disabled={isGenerating}
              />
              <div className="flex flex-col gap-1 items-center">
                {isGenerating ? (
                  <Button size="sm" variant="destructive" onClick={abort} className="w-14 h-10">
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleFollowUp} disabled={!prompt.trim()} className="w-14 h-10 bg-purple-600 hover:bg-purple-700">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                <span className="text-xs text-gray-300">⌘↵</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data preview dialog */}
      {fileData && (
        <Dialog open={showDataPreview} onOpenChange={setShowDataPreview}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2" />數據預覽與編輯
              </DialogTitle>
              <DialogDescription>
                您可以在此預覽和編輯上傳的數據，修改會即時反映在後續生成中。
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto max-h-[60vh]">
              <DataPreview data={fileData} onDataChange={setFileData} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LabChart;
