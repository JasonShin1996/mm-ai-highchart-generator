#!/bin/bash

# Chart Wizard 快速啟動腳本
echo "🚀 Chart Wizard 快速啟動腳本"
echo "================================"

# 檢查是否存在 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 錯誤：需要安裝 Python 3"
    exit 1
fi

# 檢查是否存在 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤：需要安裝 Node.js"
    exit 1
fi

# 檢查後端依賴
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ 錯誤：找不到後端依賴文件"
    exit 1
fi

# 檢查前端依賴
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：找不到前端依賴文件"
    exit 1
fi

echo "📦 安裝依賴..."

# 安裝後端依賴
echo "安裝後端依賴..."
cd backend
pip install -r requirements.txt
cd ..

# 安裝前端依賴
echo "安裝前端依賴..."
npm install

echo "✅ 依賴安裝完成"

# 檢查環境變數
if [ ! -f "backend/.env" ]; then
    echo "⚠️  警告：未找到後端環境變數文件"
    echo "請在 backend/.env 中設置："
    echo "GEMINI_API_KEY=your_gemini_api_key_here"
    echo ""
    echo "按 Enter 繼續..."
    read
fi

echo "🚀 啟動服務..."

# 啟動後端 (背景執行)
echo "啟動後端服務 (Port 8000)..."
cd backend
python main.py &
BACKEND_PID=$!
cd ..

# 等待後端啟動
sleep 3

# 啟動前端
echo "啟動前端服務 (Port 8080)..."
npm run dev &
FRONTEND_PID=$!

echo "✅ 服務啟動完成！"
echo "前端：http://localhost:8080"
echo "後端：http://localhost:8000"
echo "API 文檔：http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 等待用戶中斷
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait 