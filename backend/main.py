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

# 設置 CORS - 僅允許特定的來源
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080", 
        "http://localhost:3000", 
        "http://localhost:5173",
        "http://192.168.1.109:8080",  # 你的網路IP地址
        # 如果需要其他IP，在這裡添加
    ],
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

# 新增：結構化的圖表建議響應模型
class ChartSuggestionResponse(BaseModel):
    description: str
    recommended_chart_type: str
    confidence: float

@app.get("/")
async def root():
    return {"message": "Chart Wizard API is running"}

@app.post("/api/analyze-data", response_model=ChartSuggestionResponse)
async def analyze_data(request: DataAnalysisRequest):
    """
    分析數據並生成圖表建議的端點 - 返回結構化數據
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
        "請幫我畫成[圖表類型]，圖表標題是[建議的標題]，x軸是[x軸欄位]，y軸是[y軸欄位/欄位們]，x軸標題[不顯示/x軸標題]，y軸標題是[y軸標題]，圖例[顯示/不顯示]，[其他特殊需求]"
        
        注意事項：
        1. 根據數據特性選擇最適合的圖表類型（折線圖、柱狀圖、散點圖、餅圖等）
        2. 自動判斷哪個欄位適合做 x 軸，哪些適合做 y 軸
        3. 如果有日期欄位，通常作為 x 軸
        4. 如果有多個數值欄位，建議使用堆疊圖或分組圖
        5. 為圖表建議一個有意義的標題
        6. 建議適當的軸標題
        
        **重要：請同時返回推薦的圖表類型代碼。**
        
        可選的圖表類型代碼：
        - "line" (折線圖) - 適合時間序列數據
        - "column" (柱狀圖) - 適合分類比較
        - "area" (面積圖) - 適合時間序列累積數據
        - "pie" (圓餅圖) - 適合比例分布
        - "scatter" (散佈圖) - 適合兩變量關係
        - "stacked_column" (堆疊柱狀圖) - 適合多層級分類數據
        - "spline" (平滑線圖) - 適合平滑趨勢展示
        - "donut" (環形圖) - 適合比例分布的變體
        
        請返回以下格式的JSON：
        {{
            "description": "完整的圖表描述建議",
            "recommended_chart_type": "推薦的圖表類型代碼",
            "confidence": 0.85
        }}
        
        其中 description 是完整的圖表描述句子，recommended_chart_type 是上述8種類型之一，confidence 是0-1之間的置信度。
        只返回JSON，不要包含任何額外文字。
    """
    
    # Gemini API 設置
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": analysis_prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
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
                
                # 解析 JSON 回應
                llm_response = result["candidates"][0]["content"]["parts"][0]["text"]
                try:
                    parsed_response = json.loads(llm_response)
                    
                    # 驗證回應格式
                    if not all(key in parsed_response for key in ["description", "recommended_chart_type", "confidence"]):
                        raise ValueError("回應格式不完整")
                    
                    # 驗證圖表類型
                    valid_types = ["line", "column", "area", "pie", "scatter", "stacked_column", "spline", "donut"]
                    if parsed_response["recommended_chart_type"] not in valid_types:
                        # 如果類型無效，使用預設值
                        parsed_response["recommended_chart_type"] = "column"
                        parsed_response["confidence"] = 0.5
                    
                    return ChartSuggestionResponse(
                        description=parsed_response["description"],
                        recommended_chart_type=parsed_response["recommended_chart_type"],
                        confidence=float(parsed_response["confidence"])
                    )
                    
                except (json.JSONDecodeError, ValueError, KeyError) as e:
                    # 如果解析失敗，返回預設值
                    return ChartSuggestionResponse(
                        description="請根據您的數據特性描述想要的圖表類型和樣式",
                        recommended_chart_type="column",
                        confidence=0.5
                    )
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