"""
Phase 2 v2 endpoints:
  POST /api/v2/upload   - upload file, create session workspace, return data context
  POST /api/v2/generate - SSE stream: AI writes Python code -> sandbox execution -> Highcharts JSON
"""
import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from typing import AsyncIterator

import httpx
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# ── Session storage ─────────────────────────────────────────────────────────
# Under /tmp so Zeabur ephemeral FS is fine; original uploaded file is transient per session
SESSION_DIR = Path(tempfile.gettempdir()) / "v2-sessions"
SESSION_DIR.mkdir(exist_ok=True)


def session_path(session_id: str) -> Path:
    return SESSION_DIR / session_id


# ── Models ───────────────────────────────────────────────────────────────────
class ColumnInfo(BaseModel):
    name: str
    dtype: str
    null_count: int
    unique_count: int
    sample_values: list  # first few distinct values


class UploadResponse(BaseModel):
    session_id: str
    filename: str
    row_count: int
    columns: list[ColumnInfo]
    preview_rows: list[dict]   # first 50 rows as plain dicts


class ConversationTurn(BaseModel):
    role: str            # "user" | "assistant"
    prompt: str
    code: str | None = None
    chart_config: str | None = None  # JSON string


class GenerateRequest(BaseModel):
    session_id: str
    prompt: str
    chart_type: str
    history: list[ConversationTurn] = []


# ── Helpers ───────────────────────────────────────────────────────────────────
def _read_file(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        # Try common encodings
        for enc in ("utf-8", "utf-8-sig", "big5", "gbk"):
            try:
                return pd.read_csv(path, encoding=enc)
            except (UnicodeDecodeError, Exception):
                continue
        raise ValueError("Cannot decode CSV file")
    elif suffix in (".xlsx", ".xls"):
        return pd.read_excel(path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def _build_column_info(df: pd.DataFrame) -> list[ColumnInfo]:
    cols = []
    for col in df.columns:
        series = df[col]
        sample = series.dropna().unique()[:5].tolist()
        # Make JSON-serialisable
        sample = [str(v) if not isinstance(v, (int, float, bool)) else v for v in sample]
        cols.append(ColumnInfo(
            name=col,
            dtype=str(series.dtype),
            null_count=int(series.isna().sum()),
            unique_count=int(series.nunique()),
            sample_values=sample,
        ))
    return cols


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to JSON-serialisable list of dicts."""
    records = []
    for row in df.to_dict(orient="records"):
        clean = {}
        for k, v in row.items():
            if pd.isna(v) if not isinstance(v, (list, dict)) else False:
                clean[k] = None
            elif hasattr(v, "item"):          # numpy scalar
                clean[k] = v.item()
            else:
                clean[k] = v
        records.append(clean)
    return records


def _build_data_context(session_id: str, df: pd.DataFrame, filename: str) -> str:
    """Build the data context string sent to the AI."""
    file_path = str(session_path(session_id) / filename)
    col_lines = []
    for col in df.columns:
        s = df[col]
        sample = s.dropna().unique()[:5].tolist()
        sample_str = ", ".join(repr(v) for v in sample)
        col_lines.append(
            f"  - {col!r}: dtype={s.dtype}, nulls={s.isna().sum()}, "
            f"unique={s.nunique()}, samples=[{sample_str}]"
        )
    preview_json = json.dumps(_df_to_records(df.head(50)), ensure_ascii=False, indent=2)
    return (
        f"檔案路徑: {file_path}\n"
        f"總行數: {len(df)}\n"
        f"欄位資訊:\n" + "\n".join(col_lines) + "\n\n"
        f"前 {min(50, len(df))} 筆資料預覽:\n{preview_json}"
    )


def _build_system_prompt(data_context: str, chart_type: str, history: list[ConversationTurn]) -> str:
    history_text = ""
    if history:
        parts = []
        for turn in history:
            if turn.role == "user":
                parts.append(f"[用戶] {turn.prompt}")
            else:
                code_block = f"\n```python\n{turn.code}\n```" if turn.code else ""
                parts.append(f"[AI]{code_block}")
        history_text = "\n\n前幾輪對話:\n" + "\n".join(parts) + "\n\n"

    return f"""你是一位專業的數據視覺化工程師，專門使用 Highcharts 生成互動式圖表。

你的任務：根據用戶需求，撰寫 Python 代碼讀取資料並輸出 Highcharts JSON 設定。

{history_text}資料摘要：
{data_context}

圖表類型：{chart_type}

## 規則

1. 輸出格式：先輸出一段 Python 代碼（用 ```python ... ``` 包住），再輸出一段說明文字。
2. Python 代碼必須：
   - 用 pandas 讀取上面的「檔案路徑」（不要 hard-code 其他路徑）
   - 將資料轉換為 Highcharts JSON 設定物件
   - 最後一行必須是 `print(json.dumps(result))` 且 result 是完整的 Highcharts options dict
   - import 只能用：pandas, json, datetime, re, math（不能用其他套件）
3. Highcharts JSON 規則：
   - xAxis type: 日期/時間序列 → "datetime"（data 用毫秒時間戳），分類資料 → "categories"
   - 圖例預設在圖表下方（legend.verticalAlign: "bottom"）
   - 不要包含 lang / credits / exporting / subtitle（後端會統一套用主題）
   - series[].data 的格式要符合圖表類型（折線/面積 datetime 用 [timestamp, value]，categories 用純數值陣列）
4. 如果這是修改請求（history 非空），以上一輪的代碼為基礎修改，保留已有的正確設定。
"""


async def _call_gemini_stream(prompt: str, system: str, api_key: str) -> AsyncIterator[str]:
    """Call Gemini streaming API and yield text chunks."""
    api_url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:streamGenerateContent?alt=sse&key={api_key}"
    )
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "text/plain"},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", api_url, json=payload) as response:
            if not response.is_success:
                body = await response.aread()
                raise HTTPException(status_code=response.status_code,
                                    detail=f"Gemini error: {body.decode()}")
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    raw = line[6:].strip()
                    if raw in ("", "[DONE]"):
                        continue
                    try:
                        chunk = json.loads(raw)
                        text = (chunk.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [{}])[0]
                                .get("text", ""))
                        if text:
                            yield text
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue


def _extract_code(text: str) -> str | None:
    """Extract the first ```python ... ``` block from AI response."""
    match = re.search(r"```python\s*\n(.*?)```", text, re.DOTALL)
    return match.group(1).strip() if match else None


def _run_sandbox(code: str, timeout: int = 30) -> tuple[str, str]:
    """Execute Python code in a subprocess. Returns (stdout, stderr)."""
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        timeout=timeout,
        env={
            **os.environ,
            "PYTHONPATH": "",
        },
    )
    return result.stdout, result.stderr


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/upload", response_model=UploadResponse)
async def v2_upload(file: UploadFile = File(...)):
    """Upload a CSV/Excel file, persist it for the session, return data context."""
    suffix = Path(file.filename or "data.csv").suffix.lower()
    if suffix not in (".csv", ".xlsx", ".xls"):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    session_id = str(uuid.uuid4())
    ws = session_path(session_id)
    ws.mkdir(parents=True, exist_ok=True)

    filename = f"data{suffix}"
    dest = ws / filename
    content = await file.read()
    dest.write_bytes(content)

    try:
        df = _read_file(dest)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Cannot parse file: {e}")

    return UploadResponse(
        session_id=session_id,
        filename=filename,
        row_count=len(df),
        columns=_build_column_info(df),
        preview_rows=_df_to_records(df.head(50)),
    )


@router.post("/generate")
async def v2_generate(req: GenerateRequest):
    """SSE endpoint: AI generates Python code -> sandbox execution -> Highcharts JSON stream."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    ws = session_path(req.session_id)
    if not ws.exists():
        raise HTTPException(status_code=404, detail="Session not found. Please upload a file first.")

    # Find the uploaded file
    data_files = list(ws.glob("data.*"))
    if not data_files:
        raise HTTPException(status_code=404, detail="No data file in session")
    data_file = data_files[0]

    try:
        df = _read_file(data_file)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Cannot read session file: {e}")

    data_context = _build_data_context(req.session_id, df, data_file.name)
    system_prompt = _build_system_prompt(data_context, req.chart_type, req.history)

    async def event_stream() -> AsyncIterator[bytes]:
        full_text = ""

        # 1. Thinking indicator
        yield _sse("thinking", {"text": "AI 正在分析資料結構..."}).encode()
        await asyncio.sleep(0)

        # 2. Stream AI response (code + explanation)
        yield _sse("thinking", {"text": "生成 Python 轉換代碼中..."}).encode()
        try:
            async for chunk in _call_gemini_stream(req.prompt, system_prompt, api_key):
                full_text += chunk
                yield _sse("token", {"text": chunk}).encode()
        except Exception as e:
            yield _sse("error", {"message": str(e)}).encode()
            return

        # 3. Extract and run code
        code = _extract_code(full_text)
        if not code:
            yield _sse("error", {"message": "AI 未生成可執行的 Python 代碼，請重試。"}).encode()
            return

        yield _sse("executing", {"text": "執行代碼中...", "code": code}).encode()
        await asyncio.sleep(0)

        try:
            stdout, stderr = await asyncio.to_thread(_run_sandbox, code, 30)
        except subprocess.TimeoutExpired:
            yield _sse("error", {"message": "代碼執行逾時（30 秒），請簡化需求或聯繫管理員。"}).encode()
            return
        except Exception as e:
            yield _sse("error", {"message": f"沙盒錯誤: {e}"}).encode()
            return

        if stderr and not stdout:
            yield _sse("error", {"message": f"代碼執行失敗:\n{stderr}"}).encode()
            return

        # 4. Parse Highcharts JSON from stdout
        try:
            chart_config = json.loads(stdout.strip())
        except json.JSONDecodeError:
            # Try to extract JSON object from stdout
            match = re.search(r"\{.*\}", stdout, re.DOTALL)
            if match:
                try:
                    chart_config = json.loads(match.group(0))
                except json.JSONDecodeError:
                    yield _sse("error", {"message": f"代碼輸出無法解析為 JSON:\n{stdout[:500]}"}).encode()
                    return
            else:
                yield _sse("error", {"message": f"代碼未輸出有效 JSON:\n{stdout[:500]}"}).encode()
                return

        yield _sse("chart", {"config": chart_config, "code": code}).encode()

        # 5. Extract explanation text (everything outside code blocks)
        explanation = re.sub(r"```python.*?```", "", full_text, flags=re.DOTALL).strip()
        if explanation:
            yield _sse("message", {"text": explanation}).encode()

        yield _sse("done", {}).encode()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
