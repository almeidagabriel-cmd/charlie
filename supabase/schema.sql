-- =====================================================================
--  WORKFLOW / KANBAN / PRODUTIVIDADE — Schema Supabase (PostgreSQL)
--  Execute este arquivo inteiro no SQL Editor do Supabase.
--  É idempotente na medida do possível (pode ser reexecutado).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'manager', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum ('planejamento', 'em_andamento', 'pausado', 'concluido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_priority as enum ('baixa', 'media', 'alta', 'urgente');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. TABELAS
-- ---------------------------------------------------------------------

-- a) profiles ----------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        public.user_role not null default 'member',
  department  text,
  avatar_url  text,
  is_active   boolean not null default true,         -- desativação de conta
  created_at  timestamptz not null default now()
);

-- b) projects ----------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  description text,
  category    text,
  status      public.project_status not null default 'planejamento',
  start_date  date,
  end_date    date,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint projects_dates_chk check (end_date is null or start_date is null or end_date >= start_date)
);

-- c) tasks -------------------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 200),
  description  text,
  status       public.task_status not null default 'todo',
  priority     public.task_priority not null default 'media',
  assignee_id  uuid references public.profiles (id) on delete set null,
  weight       integer not null default 1 check (weight between 1 and 100),
  position     double precision not null default 0,   -- ordenação dentro da coluna do Kanban
  due_date     date,
  started_at   timestamptz,                           -- 1ª vez em 'in_progress' (cycle time)
  completed_at timestamptz,                           -- momento em que foi para 'done'
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- d) activity_logs -----------------------------------------------------
create table if not exists public.activity_logs (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references public.tasks (id) on delete cascade,
  user_id         uuid references public.profiles (id) on delete set null,
  action          text not null,
  previous_status text,
  new_status      text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. ÍNDICES
-- ---------------------------------------------------------------------
create index if not exists idx_projects_created_by   on public.projects (created_by);
create index if not exists idx_projects_status       on public.projects (status);
create index if not exists idx_tasks_project         on public.tasks (project_id);
create index if not exists idx_tasks_assignee        on public.tasks (assignee_id);
create index if not exists idx_tasks_status_position on public.tasks (status, position);
create index if not exists idx_tasks_completed_at    on public.tasks (completed_at);
create index if not exists idx_logs_task             on public.activity_logs (task_id, created_at desc);
create index if not exists idx_logs_user             on public.activity_logs (user_id);

-- ---------------------------------------------------------------------
-- 4. FUNÇÕES AUXILIARES DE RBAC
--    SECURITY DEFINER: leem profiles/projects sem disparar RLS
--    (evita recursão infinita nas políticas).
-- ---------------------------------------------------------------------
create or replace function public.get_my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.get_my_role() = 'admin', false)
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.get_my_role() in ('admin', 'manager'), false)
$$;

-- Admin gerencia qualquer projeto; Gestor gerencia os projetos que criou.
create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
      or exists (
           select 1 from public.projects pr
           where pr.id = p_project_id
             and pr.created_by = auth.uid()
             and public.get_my_role() = 'manager'
         )
$$;

-- O usuário possui ao menos uma tarefa atribuída no projeto?
create or replace function public.has_task_in_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.project_id = p_project_id and t.assignee_id = auth.uid()
  )
$$;

create or replace function public.task_status_label(s public.task_status)
returns text
language sql immutable set search_path = ''
as $$
  select case s
    when 'backlog'     then 'Backlog'
    when 'todo'        then 'A Fazer'
    when 'in_progress' then 'Em Andamento'
    when 'in_review'   then 'Em Revisão'
    when 'done'        then 'Concluído'
  end
$$;

-- ---------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------

-- 5.1 Cria o profile automaticamente ao cadastrar usuário no Auth.
--     O cargo NUNCA vem do metadata (evita auto-promoção): sempre 'member'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'department'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5.2 Mantém o e-mail do profile sincronizado com o Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- 5.3 Só Admin altera cargo, status de conta e e-mail de um profile.
--     (auth.uid() nulo = service role / SQL Editor → permitido)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email then
      raise exception 'Apenas administradores podem alterar cargo, e-mail ou status da conta.'
        using errcode = '42501';
    end if;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 5.4 Regras de edição de tarefas para Colaboradores:
--     só podem mexer em status/posição das PRÓPRIAS tarefas e não podem
--     devolvê-las ao Backlog.
create or replace function public.enforce_task_update_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.can_manage_project(old.project_id) then
    if new.project_id <> old.project_id and not public.can_manage_project(new.project_id) then
      raise exception 'Você não gerencia o projeto de destino.' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.assignee_id is distinct from auth.uid() then
    raise exception 'Você só pode alterar tarefas atribuídas a você.' using errcode = '42501';
  end if;

  if new.project_id  <> old.project_id
     or new.title    <> old.title
     or new.description is distinct from old.description
     or new.priority <> old.priority
     or new.assignee_id is distinct from old.assignee_id
     or new.weight   <> old.weight
     or new.due_date is distinct from old.due_date
     or new.created_by is distinct from old.created_by then
    raise exception 'Colaboradores podem alterar apenas o status das próprias tarefas.'
      using errcode = '42501';
  end if;

  if new.status = 'backlog' and old.status <> 'backlog' then
    raise exception 'Apenas gestores podem mover tarefas para o Backlog.' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists tasks_a_enforce_rules on public.tasks;
create trigger tasks_a_enforce_rules
  before update on public.tasks
  for each row execute function public.enforce_task_update_rules();

-- 5.5 Timestamps de ciclo (started_at / completed_at) + updated_at.
create or replace function public.set_task_timestamps()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_at := old.created_at;
  end if;

  if new.status in ('in_progress', 'in_review', 'done') and new.started_at is null then
    new.started_at := now();
  end if;

  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status <> 'done' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end $$;

drop trigger if exists tasks_b_timestamps on public.tasks;
create trigger tasks_b_timestamps
  before insert or update on public.tasks
  for each row execute function public.set_task_timestamps();

-- 5.6 Audit trail automático em activity_logs.
create or replace function public.log_task_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs (task_id, user_id, action, previous_status, new_status)
    values (new.id, auth.uid(),
            format('Tarefa criada em %s', public.task_status_label(new.status)),
            null, new.status::text);
  elsif new.status is distinct from old.status then
    insert into public.activity_logs (task_id, user_id, action, previous_status, new_status)
    values (new.id, auth.uid(),
            format('Status alterado de %s para %s',
                   public.task_status_label(old.status),
                   public.task_status_label(new.status)),
            old.status::text, new.status::text);
  end if;
  return new;
end $$;

drop trigger if exists tasks_log_activity on public.tasks;
create trigger tasks_log_activity
  after insert or update of status on public.tasks
  for each row execute function public.log_task_activity();

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.tasks         enable row level security;
alter table public.activity_logs enable row level security;

-- PROFILES ------------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);  -- nomes/avatares visíveis para a equipe (atribuição e cards)

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated
  using (public.is_admin());
-- INSERT: apenas via trigger handle_new_user (sem policy = negado ao client).

-- PROJECTS ------------------------------------------------------------
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select to authenticated
  using (
    public.is_admin()
    or (public.get_my_role() = 'manager' and created_by = auth.uid())
    or public.has_task_in_project(id)
  );

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert to authenticated
  with check (public.is_manager_or_admin() and created_by = auth.uid());

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update to authenticated
  using (public.can_manage_project(id))
  with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete to authenticated
  using (public.can_manage_project(id));

-- TASKS ---------------------------------------------------------------
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated
  using (public.can_manage_project(project_id) or assignee_id = auth.uid());

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (public.can_manage_project(project_id));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated
  using (public.can_manage_project(project_id) or assignee_id = auth.uid())
  with check (public.can_manage_project(project_id) or assignee_id = auth.uid());

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (public.can_manage_project(project_id));

-- ACTIVITY LOGS (imutável: só leitura; escrita via trigger) -----------
drop policy if exists "logs_select" on public.activity_logs;
create policy "logs_select" on public.activity_logs
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_id)  -- RLS de tasks se aplica
  );

-- ---------------------------------------------------------------------
-- 7. PROGRESSO PONDERADO DOS PROJETOS
--    Agrega TODAS as tarefas do projeto (mesmo as que o colaborador não
--    vê individualmente), mas só retorna projetos visíveis ao usuário.
-- ---------------------------------------------------------------------
create or replace function public.get_projects_progress()
returns table (
  project_id   uuid,
  total_tasks  integer,
  done_tasks   integer,
  total_weight integer,
  done_weight  integer,
  progress     numeric
)
language sql stable security definer set search_path = ''
as $$
  select
    p.id,
    count(t.id)::int,
    (count(t.id) filter (where t.status = 'done'))::int,
    coalesce(sum(t.weight), 0)::int,
    coalesce(sum(t.weight) filter (where t.status = 'done'), 0)::int,
    case when coalesce(sum(t.weight), 0) = 0 then 0
         else round(100.0 * coalesce(sum(t.weight) filter (where t.status = 'done'), 0) / sum(t.weight), 1)
    end
  from public.projects p
  left join public.tasks t on t.project_id = p.id
  where public.is_admin()
     or (public.get_my_role() = 'manager' and p.created_by = auth.uid())
     or public.has_task_in_project(p.id)
  group by p.id
$$;

revoke execute on function public.get_projects_progress() from anon, public;
grant  execute on function public.get_projects_progress() to authenticated;

-- ---------------------------------------------------------------------
-- 8. REALTIME (Kanban ao vivo)
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ---------------------------------------------------------------------
-- 9. BOOTSTRAP DO PRIMEIRO ADMIN
--    Crie o usuário em Authentication > Users e depois rode:
--    update public.profiles set role = 'admin' where email = 'voce@empresa.com';
-- ---------------------------------------------------------------------
