const KEY = "v2-chart-history";
const MAX_SESSIONS = 30;

export interface HistorySession {
  id: string;          // session_id from upload
  title: string;       // derived from first prompt
  filename: string;
  createdAt: number;   // Date.now()
  turns: HistoryTurn[];
}

export interface HistoryTurn {
  role: "user" | "assistant";
  prompt: string;
  code?: string;
  chartConfig?: string; // JSON string
}

export function loadHistory(): HistorySession[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSession(session: HistorySession): void {
  const all = loadHistory().filter(s => s.id !== session.id);
  all.unshift(session);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX_SESSIONS)));
}

export function deleteSession(id: string): void {
  const all = loadHistory().filter(s => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}
