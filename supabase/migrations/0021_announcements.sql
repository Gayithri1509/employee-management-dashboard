-- ============================================================================
-- 0021_announcements.sql
-- Company Communications: Admin-authored announcements visible to a chosen
-- audience, plus per-user read tracking. Mirrors the exact conventions
-- established in 0012 (RLS) and 0013/0016/0019 (SECURITY DEFINER RPCs):
--
--   * announcements/announcement_reads get RLS enabled and minimal grants,
--     exactly like every other EMS table -- anon gets nothing.
--   * All privileged mutation (create/update/status change/delete) goes
--     through SECURITY DEFINER RPCs so created_by/updated_by are always
--     server-set from auth.uid(), the expiry > publish invariant and title/
--     message-required rules are enforced in one place (not just the
--     frontend), and each mutation writes its own activity_logs row (type
--     'announcement', added in 0020) -- the same audit-trail approach
--     0018/0019 use.
--   * Read-state (announcement_reads) needs no RPC: the only rule is "a
--     user may only write their own read row", which a plain RLS WITH CHECK
--     expresses completely -- the same reasoning 0012 used for departments
--     (no column-level nuance -> RLS alone is enough).
--
-- Audience model: an announcement's audience is either 'everyone' or one
-- specific application role ('employee' | 'hr_staff' | 'hr_manager' |
-- 'admin') -- deliberately the same value set as public.user_role, so a
-- plain equality check against private.get_my_role() expresses targeting
-- with no separate mapping table. Visibility is enforced entirely by RLS on
-- the announcements table itself (announcements_select below), never by
-- frontend filtering: a non-admin's SELECT can only ever return rows that
-- are published, currently within their publish/expiry window, and
-- targeted at 'everyone' or their own role. Admin additionally sees every
-- row regardless of status/audience, which is what the management UI
-- (drafts, scheduled-future, archived) needs.
--
-- Per the locked scope for this feature, only Admin may manage
-- announcements. hr_manager is deliberately NOT granted this capability --
-- the existing capability model has no precedent for extending hr_manager
-- into content/communications management, only into employee/department
-- operations -- and hr_staff/employee are read-only, exactly like every
-- other role boundary in this project.
--
-- Prerequisites: migrations 0001-0020 applied. Does not modify any earlier
-- migration or existing table/policy/function.
-- ============================================================================


-- ============================================================================
-- PART 1 -- ENUMS
-- ============================================================================

create type public.announcement_type as enum (
  'general', 'important', 'holiday', 'company_event',
  'hr_information', 'policy', 'appreciation', 'motivation'
);

create type public.announcement_priority as enum ('normal', 'important', 'urgent');

create type public.announcement_status as enum ('draft', 'published', 'archived');

create type public.announcement_audience as enum (
  'everyone', 'employee', 'hr_staff', 'hr_manager', 'admin'
);


-- ============================================================================
-- PART 2 -- TABLES
-- ============================================================================

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  message       text not null,
  type          public.announcement_type not null default 'general',
  priority      public.announcement_priority not null default 'normal',
  audience      public.announcement_audience not null default 'everyone',
  status        public.announcement_status not null default 'draft',
  publish_at    timestamptz not null default now(),
  expires_at    timestamptz,
  event_date    date,
  created_by    uuid references public.profiles (id),
  updated_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint announcements_expiry_after_publish
    check (expires_at is null or expires_at > publish_at)
);

comment on table public.announcements is
  'Admin-authored company communications (announcements/events), targeted at everyone or one application role. Visibility to non-admin readers is enforced entirely by RLS (announcements_select), never by frontend filtering.';
comment on column public.announcements.created_by is 'Always the caller''s auth.uid(), set only by the SECURITY DEFINER RPCs below -- never client-supplied.';
comment on column public.announcements.updated_by is 'Always the caller''s auth.uid(), set only by the SECURITY DEFINER RPCs below -- never client-supplied.';

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
  before update on public.announcements
  for each row
  execute function set_updated_at();

create index idx_announcements_status_publish on public.announcements (status, publish_at desc);
create index idx_announcements_audience        on public.announcements (audience);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);

comment on table public.announcement_reads is
  'Per-user, append-only read markers. A user may only ever read or write the row where profile_id = their own auth.uid() -- see announcement_reads_select/insert below. There is no UPDATE/DELETE policy: a read marker cannot be "unread" through the API.';

create index idx_announcement_reads_profile on public.announcement_reads (profile_id);


-- ============================================================================
-- PART 3 -- GRANTS
-- ============================================================================

revoke all on public.announcements from anon;
revoke all on public.announcements from authenticated;
grant select on public.announcements to authenticated;

revoke all on public.announcement_reads from anon;
revoke all on public.announcement_reads from authenticated;
grant select, insert on public.announcement_reads to authenticated;


-- ============================================================================
-- PART 4 -- ENABLE RLS + POLICIES
-- ============================================================================

alter table public.announcements      enable row level security;
alter table public.announcement_reads enable row level security;

-- ---- announcements: SELECT --------------------------------------------------
-- No INSERT/UPDATE/DELETE policy exists -- every mutation goes through the
-- SECURITY DEFINER RPCs in Part 5, exactly like public.employees (0012/0013).

create policy "announcements_select"
  on public.announcements
  for select
  to authenticated
  using (
    (select private.get_my_role()) = 'admin'
    or (
      status = 'published'
      and publish_at <= now()
      and (expires_at is null or expires_at > now())
      and (
        audience = 'everyone'
        or audience::text = (select private.get_my_role())::text
      )
    )
  );

-- ---- announcement_reads: SELECT + INSERT ------------------------------------

create policy "announcement_reads_select"
  on public.announcement_reads
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "announcement_reads_insert"
  on public.announcement_reads
  for insert
  to authenticated
  with check (profile_id = (select auth.uid()));


-- ============================================================================
-- PART 5 -- SECURITY DEFINER RPCs
-- (the only way to create/edit/publish/archive/delete an announcement)
-- ============================================================================

create or replace function public.create_announcement(
  p_title       text,
  p_message     text,
  p_type        public.announcement_type,
  p_priority    public.announcement_priority,
  p_audience    public.announcement_audience,
  p_publish_at  timestamptz,
  p_expires_at  timestamptz,
  p_event_date  date,
  p_status      public.announcement_status
)
returns public.announcements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.announcements;
begin
  if v_role is distinct from 'admin' then
    raise exception 'insufficient_privilege: only Admin may create announcements';
  end if;

  if trim(p_title) = '' then
    raise exception 'Title is required.';
  end if;

  if trim(p_message) = '' then
    raise exception 'Message is required.';
  end if;

  if p_expires_at is not null and p_expires_at <= p_publish_at then
    raise exception 'Expiry date must be after the publish date.';
  end if;

  insert into public.announcements
    (title, message, type, priority, audience, status, publish_at, expires_at, event_date, created_by, updated_by)
  values
    (trim(p_title), trim(p_message), p_type, p_priority, p_audience, p_status, p_publish_at, p_expires_at, p_event_date,
     (select auth.uid()), (select auth.uid()))
  returning * into v_row;

  insert into public.activity_logs (type, actor_id, message, metadata)
  values (
    'announcement',
    (select auth.uid()),
    format('Announcement "%s" was %s.', v_row.title, case when p_status = 'published' then 'published' else 'saved as a draft' end),
    jsonb_build_object('event', 'created', 'announcement_id', v_row.id, 'status', p_status)
  );

  return v_row;
end;
$$;

comment on function public.create_announcement(text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date, public.announcement_status) is
  'Admin-only: creates a new announcement. created_by/updated_by are always the caller, never client-supplied. Writes one announcement activity_logs entry.';

revoke all on function public.create_announcement(text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date, public.announcement_status) from public;
revoke all on function public.create_announcement(text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date, public.announcement_status) from anon;
grant execute on function public.create_announcement(text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date, public.announcement_status) to authenticated;


create or replace function public.update_announcement(
  p_id          uuid,
  p_title       text,
  p_message     text,
  p_type        public.announcement_type,
  p_priority    public.announcement_priority,
  p_audience    public.announcement_audience,
  p_publish_at  timestamptz,
  p_expires_at  timestamptz,
  p_event_date  date
)
returns public.announcements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.announcements;
begin
  if v_role is distinct from 'admin' then
    raise exception 'insufficient_privilege: only Admin may edit announcements';
  end if;

  if trim(p_title) = '' then
    raise exception 'Title is required.';
  end if;

  if trim(p_message) = '' then
    raise exception 'Message is required.';
  end if;

  if p_expires_at is not null and p_expires_at <= p_publish_at then
    raise exception 'Expiry date must be after the publish date.';
  end if;

  update public.announcements
     set title      = trim(p_title),
         message    = trim(p_message),
         type       = p_type,
         priority   = p_priority,
         audience   = p_audience,
         publish_at = p_publish_at,
         expires_at = p_expires_at,
         event_date = p_event_date,
         updated_by = (select auth.uid())
   where id = p_id
   returning * into v_row;

  if not found then
    raise exception 'Announcement not found.';
  end if;

  insert into public.activity_logs (type, actor_id, message, metadata)
  values (
    'announcement',
    (select auth.uid()),
    format('Announcement "%s" was updated.', v_row.title),
    jsonb_build_object('event', 'updated', 'announcement_id', v_row.id)
  );

  return v_row;
end;
$$;

comment on function public.update_announcement(uuid, text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date) is
  'Admin-only: edits an announcement''s content/targeting/scheduling. Does not change status -- use set_announcement_status for that. Writes one announcement activity_logs entry.';

revoke all on function public.update_announcement(uuid, text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date) from public;
revoke all on function public.update_announcement(uuid, text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date) from anon;
grant execute on function public.update_announcement(uuid, text, text, public.announcement_type, public.announcement_priority, public.announcement_audience, timestamptz, timestamptz, date) to authenticated;


create or replace function public.set_announcement_status(
  p_id     uuid,
  p_status public.announcement_status
)
returns public.announcements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.announcements;
begin
  if v_role is distinct from 'admin' then
    raise exception 'insufficient_privilege: only Admin may change an announcement''s status';
  end if;

  update public.announcements
     set status     = p_status,
         updated_by = (select auth.uid())
   where id = p_id
   returning * into v_row;

  if not found then
    raise exception 'Announcement not found.';
  end if;

  insert into public.activity_logs (type, actor_id, message, metadata)
  values (
    'announcement',
    (select auth.uid()),
    format('Announcement "%s" was %s.', v_row.title,
      case p_status when 'published' then 'published' when 'archived' then 'archived' else 'moved back to draft' end),
    jsonb_build_object('event', 'status_changed', 'announcement_id', v_row.id, 'status', p_status)
  );

  return v_row;
end;
$$;

comment on function public.set_announcement_status(uuid, public.announcement_status) is
  'Admin-only: publishes/archives/unpublishes an announcement. Writes one announcement activity_logs entry.';

revoke all on function public.set_announcement_status(uuid, public.announcement_status) from public;
revoke all on function public.set_announcement_status(uuid, public.announcement_status) from anon;
grant execute on function public.set_announcement_status(uuid, public.announcement_status) to authenticated;


create or replace function public.delete_announcement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (select private.get_my_role());
  v_row public.announcements;
begin
  if v_role is distinct from 'admin' then
    raise exception 'insufficient_privilege: only Admin may delete announcements';
  end if;

  select * into v_row from public.announcements where id = p_id;
  if not found then
    raise exception 'Announcement not found.';
  end if;

  if v_row.status = 'published' then
    raise exception 'A published announcement must be archived before it can be deleted.';
  end if;

  delete from public.announcements where id = p_id;

  insert into public.activity_logs (type, actor_id, message, metadata)
  values (
    'announcement',
    (select auth.uid()),
    format('Announcement "%s" was deleted.', v_row.title),
    jsonb_build_object('event', 'deleted', 'announcement_id', p_id, 'announcement_title', v_row.title)
  );
end;
$$;

comment on function public.delete_announcement(uuid) is
  'Admin-only: permanently deletes a draft or archived announcement. A published announcement must be archived first -- this avoids silently removing something the intended audience may have already seen. Writes one announcement activity_logs entry.';

revoke all on function public.delete_announcement(uuid) from public;
revoke all on function public.delete_announcement(uuid) from anon;
grant execute on function public.delete_announcement(uuid) to authenticated;
