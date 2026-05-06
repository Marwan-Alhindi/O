-- Per-user pinning of chats. pinned_at is NULL when unpinned; otherwise the
-- timestamp the user pinned the chat (used to order pinned items by recency).

alter table public.chat_participants
    add column if not exists pinned_at timestamptz;

-- Speeds up the per-user "pinned first, then by joined_at" ordering.
create index if not exists chat_participants_user_pinned_idx
    on public.chat_participants (user_id, pinned_at desc nulls last);

-- Allow a user to update their own participant row (covers pinning).
-- Idempotent: skip if a matching policy already exists.
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'chat_participants'
          and policyname = 'chat_participants_update_own'
    ) then
        execute $policy$
            create policy chat_participants_update_own
                on public.chat_participants
                for update
                using (user_id = auth.uid())
                with check (user_id = auth.uid())
        $policy$;
    end if;
end $$;
