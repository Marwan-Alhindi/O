-- Links a side reply back to the side user message that caused it.

alter table public.messages
    add column if not exists side_parent_message_id uuid references public.messages(id) on delete set null;

create index if not exists messages_side_parent_message_id_idx
    on public.messages(side_parent_message_id);
