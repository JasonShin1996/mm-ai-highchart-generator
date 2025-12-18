from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import json
import asyncio

# 載入環境變數
load_dotenv()

# 創建全局 HTTP 客戶端，避免連接池洩漏
http_client = httpx.AsyncClient(
    timeout=httpx.Timeout(30.0),  # 30秒超時，適應大數據量載入
    limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
)

app = FastAPI(title="Chart Wizard API", version="1.0.0")

# 原始開發環境 CORS 設定 (保持不變)
ORIGINAL_CORS_ORIGINS = [
    "http://localhost:8080", 
    "http://localhost:3000", 
    "http://localhost:5173",
    "http://192.168.1.109:8080",
    "https://mm-ai-highchart-generator.zeabur.app"  # 添加這一行
]

# 環境檢測函數
def is_zeabur_environment():
    """檢測是否在 Zeabur 環境中運行"""
    return os.getenv("ZEABUR_ENVIRONMENT") is not None

def get_zeabur_domains():
    """獲取 Zeabur 相關域名"""
    domains = []
    
    # 從環境變數獲取前端 URL
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        domains.append(frontend_url)
    
    # Zeabur 自動域名
    zeabur_url = os.getenv("ZEABUR_URL")
    if zeabur_url:
        domains.append(zeabur_url)
        # 添加 https 版本
        if zeabur_url.startswith("http://"):
            domains.append(zeabur_url.replace("http://", "https://"))
    
    return domains

def get_effective_cors_origins():
    """獲取有效的 CORS 來源列表"""
    origins = ORIGINAL_CORS_ORIGINS.copy()
    
    # 如果是 Zeabur 環境，添加 Zeabur 域名
    if is_zeabur_environment():
        zeabur_origins = get_zeabur_domains()
        origins.extend(zeabur_origins)
    
    # 移除重複項
    return list(set(origins))

# 設置 CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_effective_cors_origins(),
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

# 新增：資料庫搜尋相關模型
class DatabaseSearchRequest(BaseModel):
    query: str

class DatabaseItem(BaseModel):
    id: str
    name_tc: str
    name_en: str
    country: str
    min_date: str
    max_date: str
    frequency: str
    units: str
    currency: str
    score: float

class DatabaseSearchResponse(BaseModel):
    items: list[DatabaseItem]

class DatabaseLoadRequest(BaseModel):
    stat_ids: list[str]

class TimeSeriesData(BaseModel):
    id: str
    name_tc: str
    name_en: str
    data: list[dict]

class DatabaseLoadResponse(BaseModel):
    time_series: list[TimeSeriesData]

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
    headers_str = ", ".join(str(header) for header in request.headers)
    data_sample_str = json.dumps(request.data_sample, ensure_ascii=False, indent=2)
    
    analysis_prompt = f"""
        你是一位數據分析專家，請根據提供的數據結構和樣本，生成一個完整的圖表描述建議。
        
        任務：分析數據並產生一個自然語言的圖表描述，用戶可以直接使用這個描述來生成圖表。
        
        數據欄位 (Headers): {headers_str}
        
        數據樣本 (前10筆): {data_sample_str}
        
        請根據以上數據，生成一個完整的圖表描述建議，格式如下：
        "請幫我畫成[圖表類型]，圖表標題是[建議的標題]，x軸是[x軸欄位]，y軸是[y軸欄位/欄位們]，x軸標題[不顯示/x軸標題]，y軸標題是[y軸標題]，圖例[顯示/不顯示]，[其他特殊需求]"
        
        注意事項：
        1. 根據數據特性選擇最適合的圖表類型（折線圖、柱狀圖、散佈圖、圓餅圖、瀑布圖、組合圖等）
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
        - "bubble" (泡泡圖) - 適合三維數據關係展示
        - "waterfall" (瀑布圖) - 適合累積變化分析
        - "combo" (組合圖) - 適合多種類型數據的綜合展示
        
        請返回以下格式的JSON：
        {{
            "description": "完整的圖表描述建議",
            "recommended_chart_type": "推薦的圖表類型代碼",
            "confidence": 0.85
        }}
        
        其中 description 是完整的圖表描述句子，recommended_chart_type 是上述11種類型之一，confidence 是0-1之間的置信度。
        只返回JSON，不要包含任何額外文字。
    """
    
    # Gemini API 設置
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": analysis_prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    
    try:
        response = await http_client.post(
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
                valid_types = ["line", "column", "area", "pie", "scatter", "stacked_column", "spline", "donut", "bubble", "waterfall", "combo"]
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
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": request.prompt}]}],
        "generationConfig": {"responseMimeType": "text/plain"}
    }
    
    try:
        response = await http_client.post(
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

@app.post("/api/search-database", response_model=DatabaseSearchResponse)
async def search_database(request: DatabaseSearchRequest):
    """
    搜尋資料庫數據
    """
    solr_url = os.getenv("SOLR_API_URL")
    if not solr_url:
        raise HTTPException(status_code=500, detail="Solr API URL not configured")
    
    query = request.query
    full_url = f"{solr_url}?q={query}"
    
    try:
        # 使用全局 HTTP 客戶端，帶重試機制
        for attempt in range(2):  # 最多重試1次
            try:
                response = await http_client.get(full_url)
                
                if not response.is_success:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Solr API request failed: {response.status_code}"
                    )
                
                data = response.json()
                
                # 提取並格式化搜尋結果
                items = []
                for doc in data.get('response', {}).get('docs', []):
                    # 返回所有公開的數據（包括免費和付費）
                    if doc.get('is_public') == 1:
                        items.append(DatabaseItem(
                            id=str(doc.get('id', '')),
                            name_tc=doc.get('name_tc', ''),
                            name_en=doc.get('name_en', ''),
                            country=doc.get('country', ''),
                            min_date=doc.get('min_date', ''),
                            max_date=doc.get('max_date', ''),
                            frequency=doc.get('frequency', ''),
                            units=doc.get('units', ''),
                            currency=doc.get('currency', ''),
                            score=float(doc.get('score', 0))
                        ))
                
                return DatabaseSearchResponse(items=items)
                
            except httpx.TimeoutException:
                if attempt == 1:  # 最後一次重試
                    raise HTTPException(status_code=504, detail="Request timeout after retry")
                continue  # 重試一次
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/api/load-database-data", response_model=DatabaseLoadResponse)
async def load_database_data(request: DatabaseLoadRequest):
    """
    載入選定的資料庫數據
    """
    biz_url = os.getenv("BIZ_API_URL")
    biz_api_key = os.getenv("BIZ_API_KEY")
    
    if not biz_url or not biz_api_key:
        raise HTTPException(status_code=500, detail="Biz API configuration not found")
    
    if len(request.stat_ids) > 15:
        raise HTTPException(status_code=400, detail="最多只能載入15筆資料")
    
    headers = {'X-Api-Key': biz_api_key}
    params = {'history': 'true'}
    
    results = []
    
    for stat_id in request.stat_ids:
        full_url = f"{biz_url}/{stat_id}"
        
        try:
            # 使用全局 HTTP 客戶端，帶重試機制
            for attempt in range(3):  # 最多重試2次（總共3次嘗試）
                try:
                    if attempt > 0:
                        # 重試前等待，避免立即重試
                        await asyncio.sleep(1.0 * attempt)  # 1秒、2秒延遲
                    
                    response = await http_client.get(full_url, headers=headers, params=params)
                    
                    if not response.is_success:
                        print(f"Failed to load data for stat_id {stat_id}: {response.status_code}")
                        if attempt == 2:  # 最後一次嘗試
                            break
                        continue  # 重試
                    
                    data = response.json()
                    
                    # 轉換為時間序列格式
                    time_series_data = []
                    for point in data.get('series', []):
                        time_series_data.append({
                            'date': point.get('date', ''),
                            'value': point.get('val', 0)
                        })
                    
                    # 排序數據（按日期升序）
                    time_series_data.sort(key=lambda x: x['date'])
                    
                    results.append(TimeSeriesData(
                        id=stat_id,
                        name_tc=f"數據系列 {stat_id}",  # 暫時使用，後續可以從搜尋結果中獲取
                        name_en=f"Data Series {stat_id}",
                        data=time_series_data
                    ))
                    break  # 成功後跳出重試循環
                    
                except httpx.TimeoutException:
                    if attempt == 2:  # 最後一次重試
                        print(f"Timeout loading data for stat_id {stat_id} after {attempt + 1} attempts")
                        break
                    print(f"Timeout on attempt {attempt + 1} for stat_id {stat_id}, retrying...")
                    continue  # 重試
                
        except httpx.TimeoutException:
            print(f"Timeout loading data for stat_id {stat_id}")
            continue
        except httpx.RequestError as e:
            print(f"Request error loading data for stat_id {stat_id}: {str(e)}")
            continue
        except Exception as e:
            print(f"Unexpected error loading data for stat_id {stat_id}: {str(e)}")
            continue
    
    return DatabaseLoadResponse(time_series=results)

# 應用程序關閉時清理資源
@app.on_event("shutdown")
async def shutdown_event():
    """應用程序關閉時清理HTTP客戶端"""
    await http_client.aclose()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 