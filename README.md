# FlowDesk — Workflow, Kanban e Produtividade de Equipe

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth + RLS + Realtime) · @hello-pangea/dnd · Recharts

---

## 1. Configuração rápida

```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase
npm run dev                  # http://localhost:3000
```

### Supabase

1. **SQL Editor** → cole e execute `supabase/schema.sql` (pode ser reexecutado).
2. **Authentication → Providers → Email**: desative *"Allow new users to sign up"*
   (contas são criadas pelo Admin no painel `/usuarios`).
3. **Authentication → URL Configuration**: `Site URL` = sua URL (ex.: `http://localhost:3000`)
   e adicione `http://localhost:3000/**` em *Redirect URLs*.
4. **Authentication → Email Templates → Reset Password**: troque o link por
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/atualizar-senha">Redefinir senha</a>
   ```
   (funciona mesmo quando o Admin dispara o reset a partir de outro navegador).
5. **Primeiro Admin**: crie um usuário em *Authentication → Users → Add user* e rode:
   ```sql
   update public.profiles set role = 'admin' where email = 'voce@empresa.com';
   ```
6. Realtime: o script já adiciona `tasks` à publicação `supabase_realtime`.

---

## 2. Estrutura de pastas

```
├── middleware.ts                    # Sessão + proteção de rotas + checagem de cargo
├── supabase/schema.sql              # DDL, enums, triggers, RLS, RPC de progresso
├── app/
│   ├── layout.tsx                   # Root (fonte, Toaster)
│   ├── login/                       # /login  (page + server actions login/logout)
│   ├── auth/confirm/route.ts        # Callback dos links de e-mail (token_hash / PKCE)
│   ├── atualizar-senha/             # Definição de nova senha
│   └── (app)/                       # Área autenticada (sidebar)
│       ├── layout.tsx
│       ├── dashboard/               # /dashboard  (page + actions de projetos)
│       ├── kanban/                  # /kanban     (page + actions de tarefas)
│       ├── relatorios/              # /relatorios
│       └── usuarios/                # /usuarios   (exclusivo admin; actions c/ service role)
├── components/
│   ├── ui/                          # shadcn/ui (button, dialog, select, table, ...)
│   ├── shared/                      # avatar, badges, page-header, confirm-dialog, empty-state
│   ├── layout/sidebar.tsx
│   ├── auth/  dashboard/  kanban/  reports/  users/
└── lib/
    ├── supabase/{client,server,middleware,admin}.ts
    ├── rbac.ts                      # Mapa rota→cargos + helpers `can.*` (espelho da RLS)
    ├── auth.ts                      # requireProfile / assertRole
    ├── reports.ts                   # Cálculo de métricas (taxa, cycle time, por colaborador)
    ├── constants.ts  types.ts  utils.ts
```

---

## 3. Modelo de segurança (RBAC em 3 camadas)

| Camada | O que faz |
|---|---|
| **Middleware** | Redireciona para `/login` sem sessão; bloqueia contas desativadas; nega `/usuarios` para não-admins. |
| **Server Components / Actions** | `requireProfile([...])` e `assertRole([...])` revalidam o cargo antes de qualquer mutação. |
| **Banco (RLS + triggers)** | Fonte da verdade — vale mesmo para chamadas diretas à API do Supabase. |

| Ação | Admin | Gestor | Colaborador |
|---|:-:|:-:|:-:|
| Ver projetos | todos | os que criou | onde tem tarefa |
| Criar/editar/excluir projeto | ✅ | os seus | ❌ |
| Criar/editar/atribuir/excluir tarefa | ✅ | nos seus projetos | ❌ |
| Mover tarefa no Kanban | ✅ | nos seus projetos | só as suas (exceto p/ Backlog) |
| Relatórios | organização | seus projetos | apenas os próprios dados |
| Gestão de usuários | ✅ | ❌ | ❌ |

Detalhes:
- O cargo **nunca** vem do metadata no cadastro (sempre `member`), evitando auto-promoção.
- Trigger `protect_profile_fields`: só Admin altera `role`, `is_active` e `email`.
- Trigger `enforce_task_update_rules`: Colaborador só altera `status`/`position` das próprias tarefas.
- `activity_logs` é preenchida **por trigger** (inclusive quando o status muda via API) e é somente leitura.
- Desativar conta = `ban` no Supabase Auth + `profiles.is_active = false`.

## 4. Regras de cálculo

- **Progresso do projeto** = Σ peso das tarefas `done` / Σ peso total × 100
  (RPC `get_projects_progress`, conta todas as tarefas do projeto). Cores: <40% vermelho, 40–75% amarelo, >75% verde.
- **Relatórios** (período: 7 dias, mês atual ou personalizado):
  - Tarefas *no escopo*: criadas até o fim do período e não concluídas antes do início.
  - *Finalizadas*: `completed_at` dentro do período.
  - *Taxa de conclusão* = finalizadas / no escopo.
  - *Cycle time* = `completed_at − started_at` (ou `created_at` se nunca passou por "Em Andamento").

## 5. Campos adicionais em relação à especificação

- `profiles.is_active` — desativação de conta.
- `tasks.position` — ordenação dos cards dentro da coluna.
- `tasks.started_at` / `tasks.completed_at` — preenchidos por trigger, base do cycle time.
- `tasks.created_by` — autoria da tarefa.
