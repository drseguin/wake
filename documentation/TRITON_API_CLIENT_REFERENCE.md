# Triton API Client Reference

**API version:** 1.32.0.20260326-154633
**Base URL:** configured via `translation.triton.host` in `config.json` (default: `http://localhost:8570`)
**Interactive docs:** `http://localhost:8570/docs`
**OpenAPI spec:** `http://localhost:8570/openapi.json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [System Endpoints](#system-endpoints)
3. [Inference Endpoints](#inference-endpoints)
4. [Admin Endpoints](#admin-endpoints)
5. [Deprecated Endpoints](#deprecated-endpoints)
6. [How This Codebase Uses the API](#how-this-codebase-uses-the-api)
7. [Available Models](#available-models)
8. [Calling Rules (Mandatory)](#calling-rules-mandatory)

---

## Authentication

Three security schemes are defined:

| Scheme | Type | Header | Used for |
|---|---|---|---|
| `Bearer` | HTTP Bearer | `Authorization: Bearer <token>` | All `/v1/*` endpoints |
| `APIKeyHeader` | API Key | `X-API-Key: <key>` | All `/api/*` endpoints |
| `AdminBearer` | HTTP Bearer | `Authorization: Bearer <jwt>` | `/admin/api/*` (Keycloak JWT) |

**Dev mode:** If no API keys are configured server-side, auth is bypassed entirely.

**In this codebase:** `triton_translator.py` sends both `X-API-Key` and `Authorization: Bearer` on every request so the same headers work regardless of endpoint type. Never put the key in the JSON body.

API key is loaded from:
```python
config.get('translation.triton.api_key', '')  # → env var TRITON_API_KEY overrides
```

---

## System Endpoints

No authentication required.

### `GET /health`

Returns service and Triton server health.

| Query param | Type | Description |
|---|---|---|
| `server_id` | string (optional) | Check a specific server by ID, docker_alias, host_ip, or display_name |

**Response:**
```json
{
  "status": "healthy",
  "api_healthy": true,
  "triton_healthy": true,
  "triton_ready": true,
  "inference_ready": false,
  "stream_state": "active",
  "message": "..."
}
```

Used in: `triton_translator.py` → `is_available()`, `test_connection()`, `get_model_info()`

---

### `GET /livez`

Pure liveness probe — zero I/O. Returns `{"status": "alive"}`. For Kubernetes `livenessProbe`.

### `GET /readyz`

Readiness probe — checks Triton connectivity. Returns `{"status": "ready" | "not_ready"}`. For Kubernetes `readinessProbe`.

### `GET /diagnostics`

Comprehensive diagnostics: Triton connection status, thread pool health, concurrency details, config.

Used in: `triton_translator.py` → `get_model_info()`, `get_diagnostics()`

### `GET /api/servers`

List all configured Triton servers. Response includes `server_id`, `display_name`, `host`, `grpc_port`, `http_port`, `is_default`, `healthy`, `ready`, `models_count`.

### `POST /api/servers/refresh`

Trigger a catalog/server refresh.

### `GET /api/catalog/status`

Returns catalog state: `status`, `last_refresh`, `next_refresh`, `refresh_interval_minutes`, `refresh_duration_ms`, `servers`, `models`.

### `GET /changelog`

Returns version history: `current_version` + `entries` array.

---

## Inference Endpoints

Authentication required (`Bearer` or `X-API-Key`).

---

### `POST /api/translate` — Simple Translation (Llama 3.3 70B)

High-quality translation using Llama-3.3-70B-Instruct. Best for short, standalone text with no surrounding context.

**Request:**
```json
{
  "text": "Hello, world.",
  "target_lang": "fr",
  "source_lang": "en",
  "system_prompt": "Optional extra instructions",
  "temperature": 0.1,
  "max_tokens": null
}
```

| Field | Required | Default | Notes |
|---|---|---|---|
| `text` | YES | — | Text to translate |
| `target_lang` | YES | — | Language code or name (`"fr"`, `"French"`) |
| `source_lang` | no | `"en"` | Source language |
| `system_prompt` | no | null | Prepended to the translation prompt |
| `temperature` | no | `0.1` | Lower = more deterministic |
| `max_tokens` | no | auto | Auto-calculated from input length |
| `top_p` | no | `0.7` | Nucleus sampling |
| `top_k` | no | `50` | Top-k sampling |
| `min_p` | no | — | Min probability threshold |
| `repetition_penalty` | no | — | Multiplicative; >1.0 penalises repeats |
| `presence_penalty` | no | — | Penalise already-appeared tokens |
| `frequency_penalty` | no | — | Penalise proportional to frequency |
| `seed` | no | — | Reproducible output |
| `stop` | no | — | Stop sequences (string or array) |

**Response:**
```json
{
  "translation": "Bonjour, monde.",
  "source_lang": "en",
  "target_lang": "fr",
  "status": "success"
}
```

Authentication: `X-API-Key: <key>` header.

---

### `POST /api/translate_m2m` — Fast M2M-100 Translation

Uses the M2M-100 model for high-throughput translation. Same request/response schema as `/api/translate`. Lower quality than Llama but faster. Not currently used by this codebase.

---

### `POST /v1/chat/completions` — Context-Aware Chat Completion

Primary endpoint for context-aware translation and quality analysis. OpenAI-compatible.

**Request:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a professional translator. Translate from English to French."},
    {"role": "user", "content": "Translate these segments:\n1. Hello\n2. Goodbye"}
  ],
  "temperature": 0.1,
  "max_tokens": 4096,
  "stream": false
}
```

| Field | Required | Default | Notes |
|---|---|---|---|
| `messages` | YES | — | Array of `{role, content}` objects |
| `model` | no | `"llama-3.3-70b"` | **Omit to use default.** See [Available Models](#available-models) |
| `temperature` | no | `0.3` | Higher = more random |
| `top_p` | no | `0.7` | Nucleus sampling |
| `top_k` | no | `50` | Top-k sampling |
| `max_tokens` | no | `4096` | Max output tokens |
| `max_completion_tokens` | no | — | Takes precedence over `max_tokens`; includes reasoning tokens |
| `presence_penalty` | no | — | Penalise already-appeared tokens |
| `frequency_penalty` | no | — | Penalise repetition |
| `repetition_penalty` | no | — | Multiplicative penalty |
| `stop` | no | — | Stop sequences (up to 4) |
| `seed` | no | — | Reproducible generation |
| `stream` | no | `false` | SSE streaming; ends with `data: [DONE]` |
| `n` | no | `1` | Number of completions (only 1 supported) |
| `include_reasoning` | no | — | Include chain-of-thought (for `gptoss` model) |
| `reasoning_effort` | no | — | `"low"`, `"medium"`, `"high"` (for `gptoss` model) |
| `logprobs` | no | — | Top logprobs per token |

**`ChatMessage` schema:**
```json
{"role": "system" | "developer" | "user" | "assistant" | "function" | "tool", "content": "..."}
```

**Response (non-streaming):**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1711234567,
  "model": "llama-3.3-70b",
  "choices": [
    {
      "index": 0,
      "message": {"role": "assistant", "content": "Bonjour\nAu revoir"},
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 10,
    "total_tokens": 52
  }
}
```

**Response (streaming):** SSE events — parse `choices[0].delta.content` from each `data: {...}` line; stream ends with `data: [DONE]`.

Authentication: `Authorization: Bearer <token>` header.

---

### `POST /v1/chat_vision/completions` — Vision Chat Completion

Multimodal chat with image support. Only `mistral-small-24b` supports vision. One image per request max.

**Request:** Same as `/v1/chat/completions` but `messages` content can be an array of parts:
```json
{
  "model": "mistral-small-24b",
  "messages": [
    {"role": "user", "content": [
      {"type": "text", "text": "What is in this image?"},
      {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,<base64data>"}}
    ]}
  ]
}
```

### `POST /v1/chat_vision/upload`

Alternative: upload image as multipart form data for vision chat.

---

### `GET /v1/models` — List Available Models

Returns OpenAI-compatible model list.

**Response:**
```json
{
  "object": "list",
  "data": [
    {"id": "llama-3.3-70b", "object": "model", "created": 1711234567, "owned_by": "meta"}
  ]
}
```

Used in: `triton_translator.py` → `get_supported_languages()`, `is_available()`, `test_connection()`, `get_model_info()`

### `GET /v1/models/{model_id}` — Get Model Details

Returns `{id, object, created, owned_by, display_name, task_type, max_context_length, modalities}`.

---

### `POST /v1/embeddings` — Embeddings (Instructor-XL)

```json
{
  "input": "Text to embed",
  "model": "text-embedding-instructor",
  "instruction": "Represent the document for retrieval:"
}
```

**Response:** `{object, data: [{object, embedding: [...], index}], model, usage: {prompt_tokens, total_tokens}}`

---

### `POST /v1/audio/transcriptions` — Audio Transcription (Whisper)

Multipart form upload.

| Field | Default | Notes |
|---|---|---|
| `file` (required) | — | Audio file (mp3, wav, flac, m4a, ogg, webm, etc.) |
| `model` | `"whisper"` | |
| `language` | auto-detected | ISO-639-1 code |
| `response_format` | `"json"` | `json`, `text`, `verbose_json`, `srt`, `vtt` |
| `prompt` | — | Context/spelling hints |
| `temperature` | — | 0–1 |
| `task` | `"transcribe"` | `"transcribe"` or `"translate"` (to English) |
| `beam_size` | `5` | |
| `word_timestamps` | — | Word-level timing |
| `vad_filter` | — | Silero VAD to filter silence |
| `hotwords` | — | Comma-separated priority words |

---

### `POST /v1/video/transcriptions` — Video Transcription

Same fields as audio transcriptions. Supports mp4, mkv, webm, avi, mov — audio extracted automatically.

---

### `POST /v1/rerank` — Cross-Encoder Reranking (bge-reranker-large)

```json
{"query": "search query", "passages": ["passage one", "passage two"]}
```

**Response:** `{results: [{index, passage, score}], model}` — sorted by score descending.

---

### `POST /api/ocr` — OCR (Tesseract)

Multipart form upload.

| Field | Notes |
|---|---|
| `image` (required) | PNG, JPEG, TIFF, BMP, etc. |
| `language` | Tesseract code (`eng`, `fra`, `chi_sim`, `jpn`, `kor`) |
| `psm` | Page Segmentation Mode 0–13 |
| `oem` | OCR Engine Mode (0=legacy, 1=LSTM, 2=both, 3=default) |

**Response:** `{text, confidence (0.0–1.0), status}`

---

### `POST /api/ner` — Named Entity Recognition

```json
{"text": "Barack Obama visited Paris in 2024."}
```

**Response:** `{entities: [{...}], text, entity_count, status}`

---

### Model Health Endpoints

| Endpoint | Notes |
|---|---|
| `GET /api/models/health` | Health of all models; supports SSE streaming |
| `GET /api/models/{model_name}/health` | Health of a specific model; supports SSE streaming |

---

## Admin Endpoints

`/admin/api/*` — requires `AdminBearer` (Keycloak JWT). Covers: applications, API keys, users, model catalog, service catalog, model groups, service groups, usage reports, audit log, invitations, database backup/restore.

Key endpoints:
- `GET/POST /admin/api/applications` — manage registered applications
- `GET/POST /admin/api/api-keys` — manage API keys
- `PUT /admin/api/api-keys/{key_id}/services` — restrict key to specific services
- `PUT /admin/api/api-keys/{key_id}/models` — restrict key to specific models
- `PUT /admin/api/api-keys/{key_id}/params` — set parameter caps (min/max/default per param)
- `GET /admin/api/reports/model-usage` — model usage statistics
- `GET /admin/api/reports/top-models` — top models by usage
- `POST /admin/api/database/backup` — create DB backup
- `POST /admin/api/database/restore/{filename}` — restore from backup

---

## Deprecated Endpoints

**Do not use these.**

| Deprecated | Use instead |
|---|---|
| `GET /api/models` | `GET /v1/models` |
| `POST /api/chat` | `POST /v1/chat/completions` |
| `POST /api/chat/stream` | `POST /v1/chat/completions` with `"stream": true` |
| `POST /api/chat/llama` | `POST /v1/chat/completions` |
| `POST /api/chat/llama/stream` | `POST /v1/chat/completions` with `"stream": true` |
| `POST /api/transcribe` | `POST /v1/audio/transcriptions` |
| `POST /api/embeddings` | `POST /v1/embeddings` |

---

## How This Codebase Uses the API

### `triton_translator.py`

All translation calls go through `POST /v1/chat/completions` — including both simple and context-aware translation. The `/api/translate` simple endpoint is not used; the context-aware path is preferred for quality reasons.

```python
# Headers — both keys sent so either endpoint type accepts them
headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': api_key,           # accepted by /api/* endpoints
    'Authorization': f'Bearer {api_key}'  # accepted by /v1/* endpoints
}

# Translation call
url = f"{self.host}/v1/chat/completions"
payload = {
    "model": current_config.get('model', 'llama-3.3-70b'),
    "messages": messages,
    "max_tokens": 4000,
    "temperature": 0.1,
    "top_k": 10,
    "seed": 42
}
```

Uses `requests.Session()` for connection pooling; session is refreshed every 50 requests. Retries on 429, 503, timeouts, and connection errors with exponential backoff.

Monitoring/diagnostic calls:
| Method | Endpoint | Used in |
|---|---|---|
| `GET` | `/health` | `is_available()`, `test_connection()`, `get_model_info()` |
| `GET` | `/v1/models` | `get_supported_languages()`, `is_available()`, `test_connection()`, `get_model_info()` |
| `GET` | `/diagnostics` | `get_model_info()`, `get_diagnostics()` |

### `translation_analyzer.py`

Quality analysis also uses `POST /v1/chat/completions` with streaming enabled:

```python
headers = {"Content-Type": "application/json"}
if api_key:
    headers["X-API-Key"] = api_key   # ⚠️ see note below

payload = {
    "model": configured_model,  # from translation_analysis.model, default llama-3.3-70b
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ],
    "max_tokens": 5500,    # 5500–8500 depending on sample_mode
    "temperature": 0.0,    # deterministic scoring
    "stream": True
}
```

> **Note:** `translation_analyzer.py` sends only `X-API-Key`, not `Authorization: Bearer`. The Triton API accepts `X-API-Key` on all endpoints including `/v1/*`, so this works. However, it is inconsistent with `triton_translator.py`, which sends both headers. If the server is ever configured to require Bearer on `/v1/*` endpoints, this will need updating.

---

## Available Models

| Model ID | Type | Notes |
|---|---|---|
| `llama-3.3-70b` | LLM | **Default.** Omit `model` field to use this. Best for translation and analysis. |
| `mistral-small-24b` | LLM + Vision | Use for vision tasks via `/v1/chat_vision/completions`. |
| `gptoss` | Reasoning LLM | Supports `include_reasoning` and `reasoning_effort` (`"low"`, `"medium"`, `"high"`). Avoid for analysis — times out on long outputs. |
| `text-embedding-instructor` | Embeddings | Instructor-XL via `/v1/embeddings`. |
| `whisper` | ASR | Audio/video transcription via `/v1/audio/transcriptions` and `/v1/video/transcriptions`. |
| `bge-reranker-large` | Reranking | Cross-encoder reranking via `/v1/rerank`. |
| `m2m-100` | MT | Fast machine translation via `/api/translate_m2m`. |

> `gptoss` is a reasoning model. Do **not** use it for translation analysis — it is tuned for short-batch translation and will time out on the 5000–8500 token responses that analysis requires.

---

## Calling Rules (Mandatory)

1. **Get host from config — never hardcode:**
   ```python
   host = config.get('translation.triton.host', 'http://localhost:8570')
   ```

2. **Auth via headers — never in JSON body:**
   ```python
   headers['X-API-Key'] = api_key
   headers['Authorization'] = f'Bearer {api_key}'
   ```

3. **Omit `model` to use the default** (`llama-3.3-70b`). Only specify when targeting a non-default model.

4. **Use `/v1/chat/completions` for translation and analysis** (context-aware, batch, quality scoring).

5. **Use `/api/translate` for simple, standalone translation** where no surrounding context is available and response schema `{translation, source_lang, target_lang}` is sufficient.

6. **Use `/api/translate_m2m` for high-throughput, lower-quality translation** where speed is the priority.

7. **Never call deprecated endpoints:** `/api/chat`, `/api/chat/stream`, `/api/chat/llama`, `GET /api/models`.

8. **For vision tasks**, use `/v1/chat_vision/completions` with `model: "mistral-small-24b"`.

9. **For reasoning tasks**, use `/v1/chat/completions` with `model: "gptoss"` + `reasoning_effort: "low" | "medium" | "high"`.
