# 下一階段開發計劃（Phase 4 + Phase 5）

## 目前狀態（截至 2026-06-05）

### 已完成
- **Phase 1**：重構打底（themeMerge domain 層、ChartResultCard 元件、TypeScript strict、Highcharts npm 化）
- **Phase 2**：後端 code-execution 引擎（AI 寫 Python/pandas → subprocess 沙箱 → Highcharts JSON、SSE 串流、AST 白名單、自我修正重試）
- **Phase 3**：多輪對話 Chat UX（Lab 模式 `/lab`、TurnBubble、歷史側欄 localStorage）

### 主要分支
- `main`：已包含 Phase 1–3 全部內容，可直接在此開新 feature branch

### 重要檔案位置
| 檔案 | 說明 |
|------|------|
| `backend/config.py` | 後端設定（GEMINI_MODEL、MAX_RETRIES、SANDBOX_TIMEOUT） |
| `backend/main.py` | FastAPI 主程式，舊三路徑 API 端點 |
| `backend/v2_routes.py` | Lab 模式後端（`/api/v2/upload`、`/api/v2/generate` SSE） |
| `src/pages/LabChart.tsx` | Lab 模式前端（Chat UI、歷史側欄） |
| `src/hooks/useV2Generation.ts` | SSE 串流狀態機 |
| `src/lib/history.ts` | localStorage 歷史紀錄工具函式 |
| `src/domain/themeMerge.ts` | MM 品牌主題套用邏輯 |
| `src/components/ChartResultCard.tsx` | 共用圖表結果 Card（Settings + JSON 編輯器） |

---

## Phase 4 — Auth + Postgres + 持久化歷史

### 目標
讓 Lab 模式從 localStorage 升級為真正的後端持久化，並加上公司內部登入機制。

### 4-1 Google OAuth 登入

**後端（FastAPI）**
- 安裝 `Authlib`、`python-jose[cryptography]`
- 實作 `/auth/google/login` → redirect Google OAuth
- 實作 `/auth/google/callback` → 驗證 token，**二次確認 email 結尾為 `@macromicro.me`**（不能只靠 `hd` 參數，需驗證 token 內的 `email` 欄位）
- 成功後發 JWT（存 `httpOnly` cookie 或回傳給前端存 localStorage）
- 在 `backend/config.py` 新增：
  ```python
  GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
  GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
  JWT_SECRET = os.getenv("JWT_SECRET")
  ALLOWED_EMAIL_DOMAIN = "macromicro.me"
  ```

**前端**
- 新增 `src/pages/Login.tsx`：顯示「以 Google 登入」按鈕
- `src/hooks/useAuth.ts`：管理登入狀態（user info、token）
- `App.tsx` 加受保護路由：未登入 → redirect `/login`
- 登入後導向 `/lab`（或上次位置）

### 4-2 Postgres Schema

使用 Zeabur 管理式 Postgres（已支援，直接在 Zeabur console 開啟）。

```sql
-- 使用者
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 對話 session
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,                -- 取第一個 user prompt 的前 40 字
    filename TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每一輪對話訊息
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,        -- 'user' | 'assistant'
    prompt TEXT,
    code TEXT,
    chart_config JSONB,
    status TEXT,               -- 'done' | 'error'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 上傳的原始檔案（對應 v2 session）
CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,  -- Zeabur volume 路徑 or 物件儲存 URL
    row_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**後端依賴**
- `asyncpg` + `sqlalchemy[asyncio]`（或 `databases` 套件）
- 在 `backend/config.py` 新增 `DATABASE_URL = os.getenv("DATABASE_URL")`

### 4-3 API 端點更新

| 端點 | 變更 |
|------|------|
| `POST /api/v2/upload` | 新增：把上傳檔資訊寫入 `uploaded_files` 表 |
| `POST /api/v2/generate` | 新增：每輪結束後把 messages 寫入 DB |
| `GET /api/v2/conversations` | 新增：回傳當前用戶的 conversation 列表 |
| `GET /api/v2/conversations/{id}` | 新增：回傳特定 conversation 的所有 messages |
| `DELETE /api/v2/conversations/{id}` | 新增：刪除 conversation |

所有 v2 端點都需要驗證 JWT（middleware 或 dependency injection）。

### 4-4 前端更新

**`src/lib/history.ts`** → 改成呼叫後端 API，保留相同介面：
```typescript
// 現在用 localStorage，改成後端後介面不變
export async function loadHistory(): Promise<HistorySession[]>
export async function saveSession(session: HistorySession): Promise<void>
export async function deleteSession(id: string): Promise<void>
```

**`src/pages/LabChart.tsx`** HistorySidebar：
- 改成從 API 取資料（`useEffect` fetch `/api/v2/conversations`）
- 還原歷史 session 改成從 `/api/v2/conversations/{id}` 取 messages

### 4-5 檔案持久化

目前 session 檔案存在 `/tmp/v2-sessions/{uuid}/`，容器重啟就消失。

**方案：Zeabur Persistent Volume**
1. Zeabur console → Service → Volumes → 掛載 `/data`
2. 修改 `v2_routes.py`：`SESSION_DIR = Path(os.getenv("SESSION_DIR", "/tmp/v2-sessions"))`
3. Zeabur 設定環境變數 `SESSION_DIR=/data/v2-sessions`
4. 歷史對話「重跑」時能找到原始檔案

---

## Phase 5 — 新 workflow 推廣到三路徑

### 目標
把 Lab 模式的新引擎（code-exec + 串流 + 多輪）套進 `local-file`、`database`、`fusion` 三條原有路徑，但各路徑保留自己的特有邏輯。

### 目前三路徑的 hook
| 路徑 | Hook | 主要特色 |
|------|------|---------|
| `/local-file` | `useChartGeneration.ts` | 前端解析 CSV/Excel，Gemini 直接生成 Highcharts JSON |
| `/database` | `useDatabaseChart.ts` | 搜尋 M平方 Solr，載入時間序列，AI 建議 yAxis |
| `/fusion` | 同上 + DataFusion 邏輯 | 本地資料 + 資料庫資料融合 |

### 推廣方式

三路徑的 Step 4（圖表生成）改用 v2 code-execution 後端：
1. 上傳本地檔 → `/api/v2/upload` 拿 `session_id`
2. 原有的 prompt 建構邏輯不變
3. 生成改呼叫 `/api/v2/generate`（SSE）
4. 結果套用 `applyMMTheme()`（已在 `useV2Generation.ts` 實作）

**database / fusion 特殊處理**：
- 資料庫資料不是本地檔案，需先序列化成 CSV 再 upload，或在 system prompt 內嵌入資料（資料量小時可行）
- fusion 的多 series 組合邏輯可讓 AI code-exec 直接處理

---

## 環境變數清單（Phase 4 需新增）

| 變數 | 說明 | 必填 |
|------|------|------|
| `GEMINI_API_KEY` | 已存在 | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Phase 4 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Phase 4 |
| `JWT_SECRET` | JWT 簽名密鑰（隨機長字串） | Phase 4 |
| `DATABASE_URL` | Postgres 連線字串 | Phase 4 |
| `SESSION_DIR` | session 檔案根目錄（預設 /tmp/v2-sessions） | Phase 4 |
| `FRONTEND_URL` | 前端 URL（CORS 用） | 已存在 |

---

## 建議開發順序

1. **開新 branch** `feature/phase4` from `main`
2. 先做 **Postgres schema + DB 連線**（不需要 Auth 也能測試讀寫）
3. 再做 **Google OAuth**（本機可用 ngrok 測試 callback）
4. 接著改 **`history.ts`** 從 localStorage → API
5. 最後做 **檔案持久化**（Zeabur volume 設定）
6. Phase 5 另開 `feature/phase5`，逐一改三路徑的生成 hook
