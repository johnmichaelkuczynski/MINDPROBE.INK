---
name: LLM Model Fixes
description: Model names that are confirmed working vs broken on this account.
---

## ZHI 1 — OpenAI

Model: `gpt-4o-mini` (128k context window)
**Why:** gpt-3.5-turbo only has 16k context — too small for complete_instructions.txt + full document text.

## ZHI 2 — Anthropic

Model: `claude-3-5-sonnet-20241022`
**Why:** `claude-sonnet-4-20250514` returns 404 on this account. The constant `DEFAULT_ANTHROPIC_MODEL` in llmService.ts is set with a comment explaining this.

## ZHI 5 — Venice

Model: `llama-3.3-70b` via OpenAI-compatible API at `https://api.venice.ai/api/v1`
env: `VENICE_API_KEY`
