# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7787b552-14b3-44ad-bf3c-fc4ff25a67c8

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7787b552-14b3-44ad-bf3c-fc4ff25a67c8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

### Frontend:
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### Backend:
- Python
- FastAPI
- Uvicorn
- httpx (for API requests)

## 🚀 完整運行指南

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

### 4. 安全性改進

✅ **已完成的安全性改進：**
- API 密鑰已從前端移除
- 所有 API 請求通過後端代理
- 設置了 CORS 安全策略
- 包含錯誤處理和超時設置

## 架構說明

```
Frontend (React) → Backend (Python FastAPI) → Gemini API
```

- **前端**: 負責用戶界面和數據展示
- **後端**: 安全地處理 Gemini API 請求
- **Gemini API**: 提供 AI 圖表生成服務

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7787b552-14b3-44ad-bf3c-fc4ff25a67c8) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
