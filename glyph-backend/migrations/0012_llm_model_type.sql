-- Add model_type to invited_llms so each LLM row can specify which
-- provider backs it (openai, anthropic, gemini).  Existing rows default
-- to 'openai' which preserves current behaviour.

ALTER TABLE invited_llms
  ADD COLUMN IF NOT EXISTS model_type text NOT NULL DEFAULT 'openai';
