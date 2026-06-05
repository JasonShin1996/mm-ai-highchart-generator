v2 架構升級 Roadmap

決策定案





Code-execution: 後端自建沙箱（FastAPI 內 subprocess + 受限 pandas 環境）。執行當下用 transient workspace（Zeabur 重啟丟掉沒關係）；要能回看/重跑的原始檔則放持久化儲存（見下）。解決資料量大時內嵌 prompt 爆掉的問題。



SaaS: Postgres + Google OAuth 登入（限定 @macromicro.me 網域），左側歷史對話側欄。



多 LLM: Gemini + Claude 可切換，共用 provider 抽象層。



串流 + 多輪: SSE 串流 agent 步驟，聊天式多輪修改。



三路徑保留: local-file / database / fusion 三入口維持，新 workflow 推廣套用進這三條路徑（非收斂成一條）。



MVP 垂直切片 = Phase 1 + 2 + 3（本機檔路徑走通新架構）；Auth/歷史（Phase 4）與推廣到 database/fusion（Phase 5）可隨後。

儲存策略（回應 Zeabur ephemeral 疑慮）





執行 workspace（Phase 2）: transient 暫存，僅單次 agent 執行期間存在；Zeabur 重啟/重部署清空無妨（in-flight 失敗可重跑）。



持久化原始檔（Phase 4）: 為了「之後回看/重跑對話」，原始上傳檔放 Zeabur persistent volume（已定案，單實例即可；未來要水平擴展再考慮遷物件儲存）。



Postgres 本身為 Zeabur 管理式，資料持久不受容器重啟影響。

目標資料流（新架構）

flowchart TD
    user["使用者: 上傳 csv/excel + 自然語言需求"] --> fe["前端 Chat UI"]
    fe -->|"上傳檔 + prompt"| api["FastAPI /api/agent/stream (SSE)"]
    api --> llm["LLM Provider (Gemini | Claude)"]
    llm -->|"生成 Python(pandas) 程式碼"| sandbox["沙箱 subprocess: 讀取檔案路徑, 輸出 Highcharts JSON"]
    sandbox -->|"成功: config JSON"| api
    sandbox -->|"錯誤: traceback"| llm
    api -->|"SSE 串流步驟/結果"| fe
    fe --> chart["ChartDisplay 渲染"]
    api --> db["Postgres: 對話/訊息/圖表/檔案"]



Phase 1 — 重構打底（shared core）

建立乾淨地基，讓後續新功能不踩重複/型別債。對應評估報告 Phase 1-3。





新增 src/domain/（純函式，無 React 依賴）:





unitMapping.ts：單一來源，取代散落 4 份（base.converter.ts 第 81-92 行、useDatabaseChart.ts、DataFusion.tsx）。



jsonParser.ts（抽 useChartGeneration.ts 的解析/清洗）、themeMerge.ts（抽第 319-384 行的 MM_THEME merge）、chartConfig.ts。



src/services/apiClient.ts：統一 getBackendUrl，dev 走相對 /api + Vite proxy（取代 gemini.ts 第 13-40 行的多分支邏輯）。



src/types/：chart.ts（先以 Highcharts.Options 為基礎）、database.ts（統一 DatabaseItem 重複定義）；tsconfig.app.json 逐步開 strict。



Highcharts 改 npm 套件 + 型別 + React wrapper，移除 index.html CDN globals 與 mount race（ChartDisplay.tsx 加 load guard 已可移除）。



依賴清理：移除未用的 React Query / recharts / 未用 shadcn 元件；雙 Toast 二選一；清 gemini.ts 未使用 export。



抽 ChartWorkflowLayout + 讓 hooks 變薄層（state + 呼叫 domain/service）。



交付: 功能不變、程式碼乾淨、型別安全、可上線。

Phase 2 — 後端 code-execution 引擎 + 多 LLM + 串流（MVP 核心）





檔案上傳: POST /api/files，存 per-session 暫存 workspace，回傳 file_id + 欄位/sample 預覽（不再把全量資料塞進 prompt）。



LLM 抽象層 backend/llm/：Provider 介面 + GeminiProvider / ClaudeProvider（Anthropic），請求帶 model 參數。



Agent code-gen 迴圈: prompt 改為「檔案在路徑 X、欄位/型別/sample 如下，請寫 pandas 程式碼讀檔並 print 出 Highcharts config JSON」。



自建沙箱 backend/sandbox/：subprocess 跑受限 Python — AST 白名單（僅允許 pandas/numpy/json/math/datetime，禁 os/subprocess/open 越界/eval/import/網路）、RLIMIT_CPU/RLIMIT_AS + timeout、fs 限定 workspace、無網路。捕捉 stdout(config)/stderr(traceback)。



自我修正: 程式碼出錯 → 把 traceback 回灌 LLM 重試 N 次（agent 行為）。



串流: GET/POST /api/agent/stream（SSE），串流 agent 步驟（思考/程式碼/執行結果/最終 config）。



Formatter 安全化: 以「具名 formatter 白名單」取代 new Function()（useChartGeneration.ts 第 122-126 行）；Python 只輸出結構+資料，JS formatter 由前端 key 對應。



交付: 本機檔路徑透過 code-exec 生成圖表，大資料不爆，且即時串流。

Phase 3 — 多輪對話 + Chat UX（前端）





對話狀態: messages[]（user/assistant/tool 步驟），每輪可參照前一版 config 做修改或重生。



後端: 對話上下文（含前一版 config）傳入 agent；支援「在既有 config 上修改」。



Chat UX 設計（交付物之一）:





版面：左側歷史側欄（Phase 4 接上）｜中間圖表預覽 + JSON/設定面板｜右側或下方對話串。



首次生成後出現跟進輸入框（「再幫我把 Y 軸改成對數」「換成柱狀圖」）。



串流以聊天泡泡呈現 agent 步驟；可展開查看生成的程式碼。



交付: 第一輪生成後可多輪跟進修改，串流即時回饋。

Phase 4 — Auth + 持久化 + 歷史側欄（SaaS 外殼）





Postgres schema: users、conversations、messages、charts、uploaded_files。



Google OAuth（FastAPI，Authlib）+ JWT session；前端登入流程與受保護路由。





限定 @macromicro.me 網域: OAuth 帶 hd=macromicro.me 參數，並在後端二次驗證 email 網域（hd 可被偽造，須以 token 內 email 為準），非此網域一律拒絕。



左側歷史側欄: 列出歷史對話，點擊還原圖表 + 對話（類似 ChatGPT/Claude）。



檔案持久化: 原始上傳檔存物件儲存 / Zeabur volume（見「儲存策略」），對話可重跑。



交付: 登入後自動保存所有生成歷史，跨裝置可回看；僅限公司網域使用者。

Phase 5 — 新 workflow 推廣到三路徑（三路徑保留）





三入口維持: local-file / database / fusion 仍是三條獨立路徑與使用情境，不收斂成一條。



將 Phase 2-3 在 local-file 走通的新引擎（code-exec agent + 串流 + 多輪 + 歷史）推廣套進 database 與 fusion 路徑。



共用而非重寫：三路徑共用 domain/、apiClient、ChartWorkflowLayout、ConverterFactory（fusion 目前手動組 series，改走 converter）以降低重複，但各自保留特有邏輯（DB 搜尋、資料融合等）。



沙箱安全加固（可選 nsjail/容器化單次執行）、移除殘留 dead code。



交付: 三種使用情境都享有新 workflow，且共用底層降低維護成本。

風險與備註





自建沙箱無法 100% 阻擋惡意程式碼；但登入限定 @macromicro.me 內部使用者已大幅降低風險面。Phase 2 再用 AST 白名單 + 資源限制 + 無網路達到務實安全，Phase 5 可選擇性容器化加固。



持久化原始檔已定案用 Zeabur persistent volume。



Anthropic 需新增 API key（後端 env），與既有 GEMINI_API_KEY 並存。



各 Phase 結束皆可獨立上線；MVP = Phase 1+2+3。

