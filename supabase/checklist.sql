-- =====================================================================
--  CHECKLIST DIÁRIO — tabelas, RLS e bucket de fotos
--  Execute DEPOIS do schema.sql. Pode ser reexecutado com segurança.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Rotinas (modelos)
-- ---------------------------------------------------------------------
create table if not exists public.daily_checklist_templates (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  category        text not null default 'Geral',
  assigned_to     uuid references public.profiles (id) on delete set null,  -- null = toda a equipe
  recurrence_type text not null default 'daily'
                  check (recurrence_type in ('daily', 'weekdays', 'weekends', 'monthly', 'custom')),
  recurrence_day  integer check (recurrence_day between 1 and 31),         -- usado em 'monthly'
  custom_days     integer[],                                                -- 0=Dom ... 6=Sáb (em 'custom')
  requires_input  boolean not null default false,
  input_label     text,
  requires_photo  boolean not null default false,
  is_one_time     boolean not null default false,                           -- tarefa extra (não se repete)
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now()
);

-- Garante as colunas caso a tabela já existisse numa versão anterior
alter table public.daily_checklist_templates add column if not exists recurrence_day integer;
alter table public.daily_checklist_templates add column if not exists custom_days integer[];
alter table public.daily_checklist_templates add column if not exists requires_input boolean not null default false;
alter table public.daily_checklist_templates add column if not exists input_label text;
alter table public.daily_checklist_templates add column if not exists requires_photo boolean not null default false;
alter table public.daily_checklist_templates add column if not exists is_one_time boolean not null default false;
alter table public.daily_checklist_templates add column if not exists created_by uuid references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------
-- 2. Registros de conclusão (um por rotina por dia)
-- ---------------------------------------------------------------------
create table if not exists public.daily_checklist_logs (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.daily_checklist_templates (id) on delete cascade,
  date         date not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  assigned_to  uuid references public.profiles (id) on delete set null,
  input_value  text,
  photo_url    text,
  created_at   timestamptz not null default now()
);

alter table public.daily_checklist_logs add column if not exists assigned_to uuid references public.profiles (id) on delete set null;
alter table public.daily_checklist_logs add column if not exists input_value text;
alter table public.daily_checklist_logs add column if not exists photo_url text;

create unique index if not exists uq_checklist_log_template_date on public.daily_checklist_logs (template_id, date);
create index if not exists idx_checklist_logs_date on public.daily_checklist_logs (date);
create index if not exists idx_checklist_templates_assigned on public.daily_checklist_templates (assigned_to);

-- ---------------------------------------------------------------------
-- 3. RLS
--    Admin/Gestor: tudo.
--    Colaborador: vê e conclui as rotinas atribuídas a ele ou à equipe (sem
--    responsável); pode criar tarefa extra apenas para si mesmo.
-- ---------------------------------------------------------------------
alter table public.daily_checklist_templates enable row level security;
alter table public.daily_checklist_logs      enable row level security;

drop policy if exists "checklist_templates_select" on public.daily_checklist_templates;
create policy "checklist_templates_select" on public.daily_checklist_templates
  for select to authenticated
  using (public.is_manager_or_admin() or assigned_to = auth.uid() or assigned_to is null);

drop policy if exists "checklist_templates_insert" on public.daily_checklist_templates;
create policy "checklist_templates_insert" on public.daily_checklist_templates
  for insert to authenticated
  with check (
    public.is_manager_or_admin()
    or (is_one_time and assigned_to = auth.uid() and created_by = auth.uid())
  );

drop policy if exists "checklist_templates_update" on public.daily_checklist_templates;
create policy "checklist_templates_update" on public.daily_checklist_templates
  for update to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

drop policy if exists "checklist_templates_delete" on public.daily_checklist_templates;
create policy "checklist_templates_delete" on public.daily_checklist_templates
  for delete to authenticated
  using (public.is_manager_or_admin());

-- Logs: visíveis/alteráveis se a rotina for visível ao usuário (RLS acima se aplica)
drop policy if exists "checklist_logs_select" on public.daily_checklist_logs;
create policy "checklist_logs_select" on public.daily_checklist_logs
  for select to authenticated
  using (exists (select 1 from public.daily_checklist_templates t where t.id = template_id));

drop policy if exists "checklist_logs_insert" on public.daily_checklist_logs;
create policy "checklist_logs_insert" on public.daily_checklist_logs
  for insert to authenticated
  with check (
    completed_by = auth.uid()
    and exists (select 1 from public.daily_checklist_templates t where t.id = template_id)
  );

drop policy if exists "checklist_logs_update" on public.daily_checklist_logs;
create policy "checklist_logs_update" on public.daily_checklist_logs
  for update to authenticated
  using (exists (select 1 from public.daily_checklist_templates t where t.id = template_id))
  with check (completed_by = auth.uid() or public.is_manager_or_admin());

drop policy if exists "checklist_logs_delete" on public.daily_checklist_logs;
create policy "checklist_logs_delete" on public.daily_checklist_logs
  for delete to authenticated
  using (public.is_manager_or_admin());

-- ---------------------------------------------------------------------
-- 4. Storage: bucket público para as fotos de comprovação
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('checklist-photos', 'checklist-photos', true)
on conflict (id) do nothing;

drop policy if exists "checklist_photos_upload" on storage.objects;
create policy "checklist_photos_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'checklist-photos');

drop policy if exists "checklist_photos_read" on storage.objects;
create policy "checklist_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'checklist-photos');
