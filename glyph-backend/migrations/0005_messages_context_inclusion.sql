-- Lets the UI keep side questions visible in chat history while excluding
-- them from future model context.

alter table public.messages
    add column if not exists included_in_context boolean not null default true;
