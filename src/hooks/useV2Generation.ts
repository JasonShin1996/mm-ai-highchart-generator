import { useState, useCallback, useRef } from "react";
import { getBackendUrl } from "@/services/apiClient";
import { applyMMTheme } from "@/domain/themeMerge";

export type SseEvent =
  | { type: "thinking"; text: string }
  | { type: "token"; text: string }
  | { type: "executing"; text: string; code: string }
  | { type: "chart"; config: object; code: string }
  | { type: "message"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface Turn {
  role: "user" | "assistant";
  prompt: string;
  code?: string;
  chartConfig?: object;
  streamingText?: string;
  status?: "streaming" | "executing" | "done" | "error";
  errorMessage?: string;
}

export function useV2Generation() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateLastAssistantTurn = useCallback((updater: (t: Turn) => Turn) => {
    setTurns(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "assistant") {
          next[i] = updater(next[i]);
          return next;
        }
      }
      return next;
    });
  }, []);

  const generate = useCallback(async (
    sessionId: string,
    prompt: string,
    chartType: string,
  ) => {
    if (isGenerating) return;

    // Build history from existing turns (exclude streaming state)
    const history = turns.map(t => ({
      role: t.role,
      prompt: t.prompt,
      code: t.code ?? null,
      chart_config: t.chartConfig ? JSON.stringify(t.chartConfig) : null,
    }));

    // Append user turn immediately
    const userTurn: Turn = { role: "user", prompt };
    const assistantTurn: Turn = {
      role: "assistant",
      prompt: "",
      status: "streaming",
      streamingText: "",
    };
    setTurns(prev => [...prev, userTurn, assistantTurn]);
    setIsGenerating(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${getBackendUrl()}/api/v2/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, prompt, chart_type: chartType, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Generate failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Parse SSE frames
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";

        for (const frame of frames) {
          const lines = frame.split("\n");
          const eventLine = lines.find(l => l.startsWith("event: "));
          const dataLine = lines.find(l => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.slice(7).trim();
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }

          const ev = { type: eventType, ...data } as SseEvent;

          switch (ev.type) {
            case "thinking":
              updateLastAssistantTurn(t => ({ ...t, streamingText: (t.streamingText ?? "") + "\n💭 " + ev.text }));
              break;
            case "token":
              updateLastAssistantTurn(t => ({ ...t, streamingText: (t.streamingText ?? "") + ev.text }));
              break;
            case "executing":
              updateLastAssistantTurn(t => ({ ...t, status: "executing", code: ev.code }));
              break;
            case "chart": {
              const rawConfig = ev.config as object;
              const { base: themed } = applyMMTheme(rawConfig, "standard");
              updateLastAssistantTurn(t => ({
                ...t,
                status: "done",
                code: ev.code,
                chartConfig: themed,
              }));
              break;
            }
            case "message":
              updateLastAssistantTurn(t => ({ ...t, prompt: ev.text }));
              break;
            case "error":
              updateLastAssistantTurn(t => ({ ...t, status: "error", errorMessage: ev.message }));
              break;
            case "done":
              updateLastAssistantTurn(t => ({ ...t, status: t.status === "error" ? "error" : "done" }));
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      updateLastAssistantTurn(t => ({
        ...t,
        status: "error",
        errorMessage: (err as Error).message,
      }));
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, turns, updateLastAssistantTurn]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setTurns([]);
  }, [abort]);

  return { turns, setTurns, isGenerating, generate, abort, reset };
}
