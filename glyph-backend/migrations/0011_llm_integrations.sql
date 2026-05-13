-- Per-LLM integration credentials
create table if not exists public.llm_integrations (
    id               uuid primary key default gen_random_uuid(),
    llm_id           uuid not null references public.invited_llms(id) on delete cascade,
    integration_type text not null,
    credentials      jsonb not null default '{}',
    status           text not null default 'active',
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    constraint llm_integrations_unique unique (llm_id, integration_type)
);

create index if not exists llm_integrations_llm_id_idx on public.llm_integrations(llm_id);

alter table public.llm_integrations enable row level security;

-- Users can manage integrations for LLMs in chats they participate in
drop policy if exists "chat_participant" on public.llm_integrations;
create policy "chat_participant" on public.llm_integrations for all
    using (
        exists (
            select 1 from public.invited_llms il
            join public.chat_participants cp on cp.chat_id = il.chat_id
            where il.id = llm_integrations.llm_id
              and cp.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.invited_llms il
            join public.chat_participants cp on cp.chat_id = il.chat_id
            where il.id = llm_integrations.llm_id
              and cp.user_id = auth.uid()
        )
    );

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger llm_integrations_updated_at
    before update on public.llm_integrations
    for each row execute function public.set_updated_at();
