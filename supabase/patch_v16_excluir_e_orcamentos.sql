-- STEP Painel Obras - Patch v16
-- Garante a estrutura usada pela exclusão persistente e pelos novos orçamentos da aba Custos.
-- Execute no SQL Editor do Supabase se o banco ainda não tiver estas colunas/tabela.

create extension if not exists pgcrypto;

create table if not exists public.step_obras_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.step_obras_items add column if not exists ordem integer;
alter table public.step_obras_items add column if not exists ativo boolean not null default true;
alter table public.step_obras_items add column if not exists x numeric(7,3) not null default 50;
alter table public.step_obras_items add column if not exists y numeric(7,3) not null default 50;
alter table public.step_obras_items add column if not exists next_action text;
alter table public.step_obras_items add column if not exists notes text;

alter table public.step_obras_photos add column if not exists public_url text;
alter table public.step_obras_photos add column if not exists ordem integer not null default 0;
alter table public.step_obras_photos add column if not exists tipo text not null default 'Evidência';

insert into storage.buckets (id, name, public)
values ('step-obras-evidencias', 'step-obras-evidencias', true)
on conflict (id) do update set public = true;
