-- RASCUNHO LOCAL — NÃO EXECUTAR EM PRODUÇÃO SEM REVISÃO E BACKUP.
-- Migração aditiva para transformar a plataforma atual em multi-cliente.
-- Nenhuma tabela, post, comentário ou arquivo existente é apagado.

begin;

create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  usuario_instagram text,
  cidade text,
  ativo boolean not null default true,
  token_publico uuid not null default gen_random_uuid() unique,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rodadas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  nome text not null,
  status text not null default 'rascunho'
    check (status in ('rascunho','em_aprovacao','concluida','arquivada')),
  inicio_em date,
  fim_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Cria o registro da Margô, caso ainda não exista.
insert into public.clientes (nome, slug, usuario_instagram, cidade)
values ('Margô Cafés Especiais', 'margo', 'margo', 'Joinville')
on conflict (slug) do update set
  nome = excluded.nome,
  usuario_instagram = coalesce(public.clientes.usuario_instagram, excluded.usuario_instagram),
  cidade = coalesce(public.clientes.cidade, excluded.cidade);

-- Amplia as tabelas atuais sem substituir sua estrutura.
alter table public.perfil
  add column if not exists cliente_id uuid references public.clientes(id) on delete restrict;

alter table public.posts
  add column if not exists cliente_id uuid references public.clientes(id) on delete restrict,
  add column if not exists rodada_id uuid references public.rodadas(id) on delete restrict;

-- Associa o perfil e os posts já existentes à Margô.
update public.perfil
set cliente_id = (select id from public.clientes where slug = 'margo')
where cliente_id is null;

update public.posts
set cliente_id = (select id from public.clientes where slug = 'margo')
where cliente_id is null;

-- Agrupa o conteúdo atual em uma rodada preservada.
insert into public.rodadas (cliente_id, nome, status)
select id, 'Conteúdo atual', 'em_aprovacao'
from public.clientes c
where c.slug = 'margo'
  and not exists (
    select 1 from public.rodadas r
    where r.cliente_id = c.id and r.nome = 'Conteúdo atual'
  );

update public.posts p
set rodada_id = r.id
from public.rodadas r
join public.clientes c on c.id = r.cliente_id
where c.slug = 'margo'
  and r.nome = 'Conteúdo atual'
  and p.rodada_id is null;

-- Índices para as novas telas e filtros.
create index if not exists idx_perfil_cliente on public.perfil(cliente_id);
create index if not exists idx_posts_cliente on public.posts(cliente_id);
create index if not exists idx_posts_rodada on public.posts(rodada_id);
create index if not exists idx_rodadas_cliente on public.rodadas(cliente_id, criado_em desc);

-- Um perfil por cliente. O índice parcial não interfere em registros ainda não migrados.
create unique index if not exists uq_perfil_cliente
  on public.perfil(cliente_id)
  where cliente_id is not null;

commit;

-- Antes de uma futura execução:
-- 1. Fazer backup do banco e do bucket "midias".
-- 2. Revisar as políticas RLS existentes.
-- 3. Criar RPCs com token_publico para leitura/aprovação isolada por cliente.
-- 4. Validar a Margô em ambiente de homologação.
-- 5. Somente depois tornar cliente_id e rodada_id obrigatórios.
