from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

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

class ChartResponse(BaseModel):
    result: str

@app.get("/")
async def root():
    return {"message": "Chart Wizard API is running"}

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