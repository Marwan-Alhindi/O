-- Let chat participants update context inclusion on side messages, including
-- LLM replies. Existing client-side edit/delete controls still restrict user
-- message content changes in the app.

drop policy if exists messages_update_own on public.messages;

create policy messages_update_participant
    on public.messages
    for update
    using (
        exists (
            select 1
            from public.chat_participants cp
            where cp.chat_id = messages.chat_id
              and cp.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.chat_participants cp
            where cp.chat_id = messages.chat_id
              and cp.user_id = auth.uid()
        )
    );
