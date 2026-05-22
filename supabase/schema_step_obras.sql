-- STEP | Painel de Obras e Melhorias
-- Modelo inicial para Supabase.
-- Execute no SQL Editor do Supabase quando for transformar o painel em sistema multiusuário.

create extension if not exists pgcrypto;

create table if not exists public.step_obras_items (
  id text primary key,
  area text,
  title text not null,
  status text not null default 'AG. PROJETO',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  owner text,
  priority text,
  cost numeric(14,2) default 0,
  due date,
  x numeric(6,2) default 50,
  y numeric(6,2) default 50,
  next_action text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.step_obras_photos (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.step_obras_items(id) on delete cascade,
  name text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.step_obras_history (
  id bigserial primary key,
  item_id text references public.step_obras_items(id) on delete set null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create or replace function public.set_step_obras_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_step_obras_items_updated_at on public.step_obras_items;
create trigger trg_step_obras_items_updated_at
before update on public.step_obras_items
for each row execute function public.set_step_obras_updated_at();

insert into storage.buckets (id, name, public)
values ('step-obras-evidencias', 'step-obras-evidencias', true)
on conflict (id) do nothing;

alter table public.step_obras_items enable row level security;
alter table public.step_obras_photos enable row level security;
alter table public.step_obras_history enable row level security;

drop policy if exists "step_obras_items_select_authenticated" on public.step_obras_items;
create policy "step_obras_items_select_authenticated"
on public.step_obras_items for select
to authenticated
using (true);

drop policy if exists "step_obras_items_modify_authenticated" on public.step_obras_items;
create policy "step_obras_items_modify_authenticated"
on public.step_obras_items for all
to authenticated
using (true)
with check (true);

drop policy if exists "step_obras_photos_select_authenticated" on public.step_obras_photos;
create policy "step_obras_photos_select_authenticated"
on public.step_obras_photos for select
to authenticated
using (true);

drop policy if exists "step_obras_photos_modify_authenticated" on public.step_obras_photos;
create policy "step_obras_photos_modify_authenticated"
on public.step_obras_photos for all
to authenticated
using (true)
with check (true);

drop policy if exists "step_obras_history_select_authenticated" on public.step_obras_history;
create policy "step_obras_history_select_authenticated"
on public.step_obras_history for select
to authenticated
using (true);

drop policy if exists "step_obras_history_insert_authenticated" on public.step_obras_history;
create policy "step_obras_history_insert_authenticated"
on public.step_obras_history for insert
to authenticated
with check (true);

drop policy if exists "step_obras_storage_select_authenticated" on storage.objects;
create policy "step_obras_storage_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'step-obras-evidencias');

drop policy if exists "step_obras_storage_insert_authenticated" on storage.objects;
create policy "step_obras_storage_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'step-obras-evidencias');

drop policy if exists "step_obras_storage_update_authenticated" on storage.objects;
create policy "step_obras_storage_update_authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'step-obras-evidencias')
with check (bucket_id = 'step-obras-evidencias');

drop policy if exists "step_obras_storage_delete_authenticated" on storage.objects;
create policy "step_obras_storage_delete_authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'step-obras-evidencias');

insert into public.step_obras_items
(id, area, title, status, progress, owner, priority, cost, due, x, y, next_action, notes)
values
  ('01A', 'Abastecimento / descarte', 'Realocar posto de abastecimento de diesel', 'DEMANDA CONCLUIDA', 100, 'Valter', 'Média', 19995.84, '2026-03-30', 21.0, 80.0, 'Manter registro como melhoria concluída e anexar fotos finais.', 'Item concluído.'),
  ('01', 'Matéria-prima', 'Área de armazenagem de matéria-prima', 'AG. MATERIAL', 30, 'Marcus Pereira', 'Alta', 56407.8, '2026-04-15', 17.5, 58.0, 'Confirmar chegada dos materiais pendentes.', ''),
  ('02', 'Corte / Usinagem', 'Central de corte / usinagem', 'EM ANDAMENTO', 35, 'Sorin Chirila', 'Alta', 244283.4, '2026-05-10', 52.0, 33.0, 'Atualizar avanço físico da execução e anexar evidência.', ''),
  ('03', 'Fabricação', 'Novo galpão de fabricação', 'EM ANDAMENTO', 40, 'Valter', 'Crítica', 635027.78, '2026-05-25', 55.0, 43.0, 'Consolidar cronograma de montagem e pendências de execução.', 'Avanço inicial identificado como 40%.'),
  ('04', 'Galpão 01', 'Nova ponte rolante no Galpão 01', 'AG. COTAÇÃO', 15, 'Sorin Chirila', 'Crítica', 17939423.21, '2026-06-10', 61.5, 58.0, 'Concluir cotação e submeter aprovação executiva.', 'Maior valor financeiro identificado.'),
  ('05', 'TH', 'Galpão do TH - pórtico / monorail', 'AG. APROVAÇÃO', 20, 'Paulo Davi / Ricardo', 'Alta', 0.0, '2026-04-30', 35.3, 42.7, 'Vincular orçamento/cotação ao item da planta.', 'Sem custo vinculado na base analisada.'),
  ('06', 'Jato', 'Ampliação da cabine de jato', 'AG. APROVAÇÃO', 20, 'Paulo Davi / Ricardo', 'Alta', 1735447.0, '2026-05-20', 42.0, 46.0, 'Validar aprovação e revisão de escopo.', ''),
  ('06A', 'Pintura / Risco', 'Galpão de pintura menor', 'DEMANDA CONCLUIDA', 100, 'Paulo Davi / Ricardo', 'Média', 1800.0, '2026-03-28', 48.5, 62.5, 'Anexar fotos finais e aceite.', 'Item concluído.'),
  ('07', 'Pintura', 'Galpão de pintura principal', 'AG. APROVAÇÃO', 20, 'Paulo Davi / Ricardo', 'Alta', 13915.66, '2026-05-05', 39.4, 57.3, 'Confirmar aprovação e atualizar cronograma.', ''),
  ('07A', 'Pintura / Paletização', 'Novo galpão de pintura / paletização', 'AG. PROJETO', 10, 'Paulo Davi / Ricardo', 'Média', 272982.42, '2026-06-15', 42.0, 65.6, 'Finalizar projeto para avanço para cotação.', ''),
  ('07B', 'Componentes jato/pintura', 'Nova área dos componentes de jato/pintura', 'EM ANDAMENTO', 45, 'Paulo Davi / Ricardo', 'Média', 0.0, '2026-05-05', 25.0, 42.5, 'Atualizar custo executado ou justificar custo zerado.', 'Custo lançado como zero.'),
  ('07C', 'Laboratório Pull-Off', 'Laboratório Pull-Off', 'AG. APROVAÇÃO', 20, 'Paulo Davi / Ricardo', 'Alta', 509271.55, '2026-05-30', 33.8, 58.7, 'Aguardar aprovação e registrar evidências do local.', ''),
  ('08', 'Materiais nobres', 'Galpão de ligas especiais', 'AG. COTAÇÃO', 15, 'Marcus Pereira', 'Alta', 0.0, '2026-05-18', 27.7, 48.3, 'Criar/vincular cotação ao item 08.', 'Sem custo vinculado.'),
  ('09', 'SMS / Treinamento', 'Escritório SMS / Treinamento', 'AG. APROVAÇÃO', 20, 'Valter', 'Média', 687522.0, '2026-05-22', 75.5, 74.0, 'Confirmar escopo final e decisão de aprovação.', ''),
  ('10', 'Refeitório / Escritório', 'Ampliação do refeitório', 'DEMANDA CONCLUIDA', 100, 'Valter', 'Média', 0.0, '2026-03-25', 84.0, 52.5, 'Anexar evidência final e custo real caso exista.', 'Concluído, porém sem custo vinculado.'),
  ('11', 'Logística', 'Novo escritório da logística', 'AG. COTAÇÃO', 15, 'Marcus Pereira', 'Média', 0.0, '2026-05-12', 71.5, 80.5, 'Solicitar cotação e definir orçamento preliminar.', 'Sem custo vinculado.'),
  ('12', 'Expedição', 'Tapagem da área de expedição', 'AG. COTAÇÃO', 15, 'Virgílio', 'Alta', 0.0, '2026-05-12', 20.2, 80.0, 'Orçar fechamento/tapagem e anexar croqui.', 'Sem custo vinculado.'),
  ('13', 'Almoxarifado / Recebimento', 'Ampliação do almoxarifado / mezanino', 'AG. PROJETO', 10, 'Marcus Pereira', 'Média', 27500.0, '2026-06-20', 78.0, 40.0, 'Concluir projeto e confirmar orçamento.', ''),
  ('14', 'Vestiário', 'Ampliação do vestiário', 'EM ANDAMENTO', 55, 'Valter', 'Média', 25000.0, '2026-05-18', 70.2, 44.0, 'Atualizar percentual real e anexar fotos de avanço.', 'Item do planejador não estava claramente marcado como 14 na planta.'),
  ('15', 'Suprimento', 'Prateleiras e paleteira elétrica / Suprimento', 'AG. APROVAÇÃO', 20, 'Marcus Pereira', 'Média', 12000.0, '2026-04-28', 76.8, 58.5, 'Formalizar aprovação de compra.', ''),
  ('16', 'Mecânica / Manutenção', 'Layout mecânica / manutenção', 'AG. PROJETO', 10, 'Virgílio', 'Baixa', 0.0, '2026-06-30', 71.8, 31.5, 'Definir marcação na planta e orçamento preliminar.', 'Item sem marcação clara e sem custo vinculado.')
on conflict (id) do update set
  area = excluded.area,
  title = excluded.title,
  status = excluded.status,
  progress = excluded.progress,
  owner = excluded.owner,
  priority = excluded.priority,
  cost = excluded.cost,
  due = excluded.due,
  x = excluded.x,
  y = excluded.y,
  next_action = excluded.next_action,
  notes = excluded.notes;
