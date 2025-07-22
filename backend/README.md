# Chart Wizard Backend

Python FastAPI 後端服務，用於處理 Gemini API 請求。

## 設置步驟

1. **安裝依賴**
```bash
pip install -r requirements.txt
```

2. **設置環境變數**
創建 `.env` 文件：
```
GEMINI_API_KEY=your_gemini_api_key_here
```

3. **運行服務**
```bash
# 開發模式
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

4. **API 文檔**
運行後訪問：http://localhost:8000/docs

## 環境變數說明

- `GEMINI_API_KEY`：Google Gemini API 金鑰（必填，用於 AI 圖表生成）
- `SOLR_API_URL`：Solr 搜尋服務 API 端點（必填，用於資料查詢）
- `BIZ_API_URL`：M平方商業資料 API 端點（必填，用於取得金融數據）
- `BIZ_API_KEY`：M平方商業資料 API 金鑰（必填，授權存取 BIZ API）

## API 端點一覽

- `GET /`  
  健康檢查
- `POST /api/generate-chart`  
  根據用戶描述與數據，產生 Highcharts 圖表配置
- `GET /api/database-search`  
  查詢 M平方資料庫，取得可用的金融數據（請說明查詢參數）

## 安全性

- API 密鑰安全存儲在後端
- 設置了 CORS 只允許特定來源
- 包含錯誤處理和超時設置 