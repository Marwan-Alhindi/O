-- Soft delete + edit for user messages.
-- deleted_at: when the sender deleted the message (UI shows a tombstone).
-- edited_at:  when the sender last edited the message (UI shows "edited").
-- Both NULL on insert. AI replies are never auto-cascaded — see app logic.

alter table public.messages
    add column if not exists deleted_at timestamptz,
    add column if not exists edited_at timestamptz;

-- Allow a user to update their own user-sent messages (covers edit/soft-delete).
-- Idempotent.
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'messages'
          and policyname = 'messages_update_own'
    ) then
        execute $policy$
            create policy messages_update_own
                on public.messages
                for update
                using (sender_type = 'user' and sender_user_id = auth.uid())
                with check (sender_type = 'user' and sender_user_id = auth.uid())
        $policy$;
    end if;
end $$;

-- Stream UPDATE events so co-members see edits/deletions live.
-- The publication already includes `messages` for INSERT; ensure UPDATE flows too.
alter table public.messages replica identity full;
