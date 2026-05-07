-- Add 'delegation' to the allowed message kinds so the delegate tool can
-- write a properly tagged row.
--
-- Existing kinds in production (verified via select distinct on 2026-05-07):
--   chat   — regular user/LLM chat message (column default)
--   join   — LLM joined the chat
--   leave  — user left the chat
-- NULL is also allowed defensively in case any historical row slipped in.

alter table public.messages
    drop constraint if exists messages_kind_check;

alter table public.messages
    add constraint messages_kind_check
    check (kind is null or kind in ('chat', 'join', 'leave', 'delegation'));
