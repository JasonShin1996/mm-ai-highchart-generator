# MM AI Highcharts圖表生成器
AI 智慧數據可視化生成器 - 上傳 CSV/Excel，用自然語言描述需求，AI 自動生成互動式圖表

## ✨ 核心功能
- 🔄 支援 CSV/Excel 檔案上傳與即時預覽
- 🤖 AI 自動分析數據結構並提供圖表建議  
- 💬 自然語言描述圖表需求
- 📊 自動生成 Highcharts 互動式圖表
- 🎨 支援 8 種圖表類型（折線圖、柱狀圖、餅圖等）
- ⚙️ 可視化設定調整面板
- 📋 一鍵複製圖表配置代碼

## 🛠️ 技術架構

### 架構圖
```
Frontend (React) → Backend (Python FastAPI) → Gemini API
        ↓                    ↓                    ↓
Highcharts 圖表渲染    安全 API 代理處理    AI 數據分析
```

### 技術棧
**Frontend:**
- Vite
- TypeScript  
- React
- shadcn-ui
- Tailwind CSS
- Highcharts
- Papa Parse (CSV), XLSX (Excel)

**Backend:**
- Python
- FastAPI
- Uvicorn
- httpx (for API requests)
- python-dotenv

**AI 服務:**
- Google Gemini 2.5 Flash API

## 🎯 支援的圖表類型
- 📈 折線圖 (line) - 時間序列趨勢
- 📊 柱狀圖 (column) - 分類比較  
- 📊 堆疊柱狀圖 (stacked_column) - 多層級數據
- 📈 面積圖 (area) - 累積數據展示
- 🥧 圓餅圖 (pie) - 比例分布
- 🍩 環形圖 (donut) - 比例分布變體
- 📈 平滑線圖 (spline) - 平滑趨勢
- 🔸 散佈圖 (scatter) - 變量關係

## 🚀 如何使用這個專案？

### 快速啟動
```bash
# 使用一鍵啟動腳本
chmod +x start.sh
./start.sh
```

### 多種開發方式

**使用 Lovable 平台**
直接前往 [Lovable 專案](https://lovable.dev/projects/7787b552-14b3-44ad-bf3c-fc4ff25a67c8) 並開始提示。
透過 Lovable 所做的更改會自動提交到此儲存庫。

**使用本地 IDE**
如果您想使用自己的 IDE 在本地工作，可以複製此儲存庫並推送更改。
推送的更改也會反映在 Lovable 中。

**直接在 GitHub 編輯**
- 導航到所需的檔案
- 點擊檔案檢視右上角的「編輯」按鈕（鉛筆圖標）
- 進行更改並提交

**使用 GitHub Codespaces**
- 導航到儲存庫的主頁面
- 點擊右上角附近的「Code」按鈕（綠色按鈕）
- 選擇「Codespaces」選項卡
- 點擊「New codespace」來啟動新的 Codespace 環境

## 🔧 本地開發設置

### 前置需求
- Node.js & npm ([使用 nvm 安裝](https://github.com/nvm-sh/nvm#installing-and-updating))
- Python 3.8+
- Google Gemini API Key

### 1. 後端設置 (Python FastAPI)

```bash
# 進入後端目錄
cd backend

# 安裝 Python 依賴
pip install -r requirements.txt

# 創建環境變數文件
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env

# 運行後端服務
python main.py
```

後端將在 http://localhost:8000 運行
API 文檔：http://localhost:8000/docs

### 2. 前端設置 (React)

```bash
# 在根目錄安裝依賴
npm i

# 創建前端環境變數文件（可選）
echo "VITE_BACKEND_URL=http://localhost:8000" > .env

# 運行前端
npm run dev
```

前端將在 http://localhost:8080 運行

### 3. 環境變數設置

**後端 (.env)**
```
GEMINI_API_KEY=your_gemini_api_key_here
```

**前端 (.env)** (可選)
```
VITE_BACKEND_URL=http://localhost:8000
```

## 🔒 安全性

### 已完成的安全性改進：
- ✅ API 密鑰已從前端移除
- ✅ 所有 API 請求通過後端代理
- ✅ 設置了 CORS 安全策略  
- ✅ 包含錯誤處理和超時設置
- ✅ 環境變數安全管理

### 安全架構
```
Frontend (React) → Backend (Python FastAPI) → Gemini API
```

- **前端**: 負責用戶界面和數據展示
- **後端**: 安全地處理 Gemini API 請求
- **Gemini API**: 提供 AI 圖表生成服務

## 📦 部署選項

### 🌟 推薦：Zeabur 部署
- 前後端自動分離部署
- 支援自定義域名
- 自動 SSL 憑證
- 環境變數管理
- **詳細指南**: [ZEABUR_DEPLOYMENT.md](./ZEABUR_DEPLOYMENT.md)

### 🎨 Lovable 部署
直接開啟 [Lovable](https://lovable.dev/projects/7787b552-14b3-44ad-bf3c-fc4ff25a67c8) 並點擊 Share → Publish。

### 🖥️ 本地開發
完整的本地開發環境，支援熱重載和即時預覽。

## 📸 使用範例

### 基本使用流程
1. **上傳檔案**: 拖拽 CSV/Excel 檔案到上傳區域
2. **數據預覽**: 查看並編輯數據內容
3. **AI 建議**: 系統自動分析並提供圖表建議
4. **描述需求**: 用自然語言描述想要的圖表
5. **生成圖表**: 查看生成的互動式 Highcharts 圖表
6. **調整設定**: 使用設定面板微調圖表樣式
7. **複製代碼**: 一鍵複製圖表配置代碼

### 範例描述語句
```
"請幫我畫出堆疊柱狀圖，X軸是Date、但不要顯示title text，Y軸分別使用A、B、C，顏色依序使用#84C3E0, #30617D, #D97871，Y軸 title 的text = 金額 (億元)，Title = 中國-歷年財政預算赤字總額，Legend放在最下面、不要有border"
```

## 🔧 問題排解

### 常見問題
- **CORS 錯誤**: 確保後端 `FRONTEND_URL` 環境變數正確設定
- **API 連接失敗**: 檢查 `VITE_BACKEND_URL` 和 `GEMINI_API_KEY` 設定
- **檔案上傳失敗**: 支援 CSV/Excel 格式，最大 10MB

### 支援的檔案格式
- CSV (.csv)
- Excel (.xlsx, .xls)
- 最大檔案大小：10MB
- 編碼：UTF-8

## 🌐 自定義域名

### Lovable 專案域名設定
是的，您可以連接自定義域名！
要連接域名，請導航到 Project > Settings > Domains 並點擊 Connect Domain。
更多詳情請參閱：[設定自定義域名](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 📋 專案資訊

**Lovable Project URL**: https://lovable.dev/projects/7787b552-14b3-44ad-bf3c-fc4ff25a67c8

**主要功能**:
- AI 驅動的圖表生成
- 多格式檔案支援
- 自然語言互動
- 即時圖表預覽

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發流程
1. Fork 專案
2. 建立功能分支
3. 遵循現有的代碼風格
4. 提交變更並建立 Pull Request

---

*這個專案使用 Google Gemini AI 技術，讓數據可視化變得簡單而智慧。*
