from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import json

# 載入環境變數
load_dotenv()

app = FastAPI(title="Chart Wizard API", version="1.0.0")

# 設置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str

class DataAnalysisRequest(BaseModel):
    headers: list
    data_sample: list
    
class ChartResponse(BaseModel):
    result: str

@app.get("/")
async def root():
    return {"message": "Chart Wizard API is running"}

@app.post("/api/analyze-data", response_model=ChartResponse)
async def analyze_data(request: DataAnalysisRequest):
    """
    分析數據並生成圖表建議的端點
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured")
    
    # 構建數據分析 prompt
    headers_str = ", ".join(request.headers)
    data_sample_str = json.dumps(request.data_sample, ensure_ascii=False, indent=2)
    
    analysis_prompt = f"""
        你是一位數據分析專家，請根據提供的數據結構和樣本，生成一個完整的圖表描述建議。
        
        任務：分析數據並產生一個自然語言的圖表描述，用戶可以直接使用這個描述來生成圖表。
        
        數據欄位 (Headers): {headers_str}
        
        數據樣本 (前10筆): {data_sample_str}
        
        請根據以上數據，生成一個完整的圖表描述建議，格式如下：
        "請幫我畫成[圖表類型]，圖表標題是[建議的標題]，x軸是[x軸欄位]，y軸是[y軸欄位/欄位們]，x軸標題是[x軸標題]，y軸標題是[y軸標題]，圖例[顯示/不顯示]，[其他特殊需求]"
        
        注意事項：
        1. 根據數據特性選擇最適合的圖表類型（折線圖、柱狀圖、散點圖、餅圖等）
        2. 自動判斷哪個欄位適合做 x 軸，哪些適合做 y 軸
        3. 如果有日期欄位，通常作為 x 軸
        4. 如果有多個數值欄位，建議使用堆疊圖或分組圖
        5. 為圖表建議一個有意義的標題
        6. 建議適當的軸標題
        7. 只回傳一個完整的描述句子，不要包含額外的解釋
        
        請直接回傳圖表描述建議：
    """
    
    # Gemini API 設置
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": analysis_prompt}]}],
        "generationConfig": {"responseMimeType": "text/plain"}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                api_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=120.0
            )
            
            if not response.is_success:
                error_detail = response.json() if response.content else "Unknown error"
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"API request failed: {error_detail}"
                )
            
            result = response.json()
            
            # 解析回應
            if (result.get("candidates") and 
                result["candidates"][0].get("content") and 
                result["candidates"][0]["content"].get("parts") and 
                result["candidates"][0]["content"]["parts"][0].get("text")):
                
                return ChartResponse(result=result["candidates"][0]["content"]["parts"][0]["text"])
            else:
                raise HTTPException(status_code=500, detail="Invalid or empty response from API")
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/api/generate-chart", response_model=ChartResponse)
async def generate_chart(request: PromptRequest):
    """
    生成圖表配置的端點
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured")
    
    # Gemini API 設置
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": request.prompt}]}],
        "generationConfig": {"responseMimeType": "text/plain"}
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                api_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=120.0
            )
            
            if not response.is_success:
                error_detail = response.json() if response.content else "Unknown error"
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"API request failed: {error_detail}"
                )
            
            result = response.json()
            
            # 解析回應
            if (result.get("candidates") and 
                result["candidates"][0].get("content") and 
                result["candidates"][0]["content"].get("parts") and 
                result["candidates"][0]["content"]["parts"][0].get("text")):
                
                return ChartResponse(result=result["candidates"][0]["content"]["parts"][0]["text"])
            else:
                raise HTTPException(status_code=500, detail="Invalid or empty response from API")
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 