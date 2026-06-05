# ── Backend configuration ─────────────────────────────────────────────────────

# Gemini model used across all endpoints
GEMINI_MODEL = "gemini-3-flash-preview"

# v2 code-execution sandbox
MAX_RETRIES = 3       # max self-correction attempts after first failure
SANDBOX_TIMEOUT = 30  # seconds per subprocess run
