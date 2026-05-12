-- Remove tables and columns from the abandoned adaptive/My Model feature.
-- Run this BEFORE 0011_llm_integrations.sql.

drop table if exists public.adaptive_messages cascade;
drop table if exists public.user_integrations cascade;

alter table public.invited_llms
    drop column if exists model_type;
