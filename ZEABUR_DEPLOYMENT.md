# Zeabur 部署指南

## 📋 部署概述

此專案支援分離部署到 Zeabur 平台：
- **前端**: React + Vite 應用
- **後端**: FastAPI 應用

## 🚀 部署步驟

### 1. 準備 Zeabur 帳號
- 到 [zeabur.com](https://zeabur.com) 註冊帳號
- 連接您的 GitHub 帳號

### 2. 部署後端服務

#### 2.1 在 Zeabur 建立新專案
1. 點擊 "New Project"
2. 選擇您的 GitHub repository
3. 選擇 "Create Service"

#### 2.2 配置後端服務
1. 選擇 `backend` 資料夾作為根目錄
2. Zeabur 會自動識別為 Python 專案
3. 設定以下環境變數：

**必要環境變數：**
- `GEMINI_API_KEY`: 您的 Google Gemini API 金鑰
- `FRONTEND_URL`: 稍後前端部署的 URL (例如: `https://your-frontend.zeabur.app`)

**自動設定的環境變數：**
- `ZEABUR_ENVIRONMENT`: 由 Zeabur 自動設定
- `ZEABUR_URL`: 由 Zeabur 自動設定
- `PORT`: 由 Zeabur 自動設定

#### 2.3 部署後端
1. 點擊 "Deploy"
2. 等待部署完成
3. 記下後端的 URL (例如: `https://your-backend.zeabur.app`)

### 3. 部署前端服務

#### 3.1 在同一個 Zeabur 專案中建立新服務
1. 點擊 "Add Service"
2. 選擇相同的 GitHub repository
3. 選擇專案根目錄

#### 3.2 配置前端服務
1. Zeabur 會自動識別為 Node.js (Vite) 專案
2. 設定以下環境變數：

**必要環境變數：**
- `VITE_BACKEND_URL`: 後端服務的 URL (例如: `https://your-backend.zeabur.app`)

#### 3.3 部署前端
1. 點擊 "Deploy"
2. 等待部署完成
3. 記下前端的 URL

### 4. 更新後端 CORS 設定
1. 回到後端服務設定
2. 更新 `FRONTEND_URL` 環境變數為前端的實際 URL
3. 重新部署後端服務

## 🔧 環境變數設定

### 後端環境變數

```env
# 必要設定
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=https://your-frontend.zeabur.app

# Zeabur 自動設定 (無需手動設定)
ZEABUR_ENVIRONMENT=production
ZEABUR_URL=https://your-backend.zeabur.app
PORT=3000
```

### 前端環境變數

```env
# 必要設定
VITE_BACKEND_URL=https://your-backend.zeabur.app

# 可選設定
VITE_APP_NAME=MM AI Highcharts圖表生成器
```

## 🧪 測試部署

### 1. 檢查後端 API
訪問: `https://your-backend.zeabur.app/`
應該看到: `{"message": "Chart Wizard API is running"}`

### 2. 檢查前端應用
訪問: `https://your-frontend.zeabur.app/`
應該看到應用程式介面

### 3. 測試功能
1. 上傳 CSV 檔案
2. 生成圖表建議
3. 選擇圖表類型
4. 生成圖表

## 🛠️ 故障排除

### 常見問題

#### 1. CORS 錯誤
確保後端的 `FRONTEND_URL` 環境變數正確設定為前端的完整 URL。

#### 2. API 連接失敗
確保前端的 `VITE_BACKEND_URL` 環境變數正確設定為後端的完整 URL。

#### 3. Gemini API 錯誤
確保 `GEMINI_API_KEY` 環境變數正確設定且有效。

### 檢查環境變數
後端會自動檢測環境並調整 CORS 設定，您可以在後端 logs 中看到相關信息。

## 📝 本地開發

如果您想在本地測試修改後的程式碼：

1. 不需要設定任何環境變數
2. 原始的本地開發設定保持不變
3. 程式碼會自動檢測環境並使用適當的設定

## 🔄 更新部署

當您需要更新程式碼時：
1. 推送更改到 GitHub
2. Zeabur 會自動偵測更改並重新部署
3. 或者您可以手動觸發重新部署

## 🎯 優化建議

### 效能優化
- 前端建置時會自動優化
- 後端使用 uvicorn 的生產模式

### 監控
- 使用 Zeabur 的內建監控功能
- 查看 logs 以除錯問題

---

如果您遇到任何問題，請檢查：
1. 環境變數是否正確設定
2. 服務是否正常運行
3. 網路連接是否正常 

## 環境變數設置

請在 Zeabur 部署時，於「環境變數」區塊設定下列參數：

- `GEMINI_API_KEY`：Google Gemini API 金鑰
- `SOLR_API_URL`：Solr 搜尋服務 API 端點
- `BIZ_API_URL`：M平方商業資料 API 端點
- `BIZ_API_KEY`：M平方商業資料 API 金鑰

---

## 功能說明補充

- 本專案支援三大數據來源（本地端、M平方資料庫、融合數據），請依實際需求啟用相關 API 與設定。
- 「融合數據」功能目前尚在開發中，部署時可先忽略相關設定。 