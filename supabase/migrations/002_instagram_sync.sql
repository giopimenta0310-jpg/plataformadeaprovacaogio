-- Sincronizacao oficial do Instagram para o grid da plataforma.
-- Aplicar primeiro em homologacao. Nao armazena token da Meta no banco.

begin;

alter table public.clientes
  add column if not exists instagram_business_account_id text,
  add column if not exists instagram_sync_ativo boolean not null default false,
  add column if not exists instagram_sincronizado_em timestamptz,
  add column if not exists instagram_sync_erro text;

alter table public.posts
  add column if not exists instagram_media_id text,
  add column if not exists instagram_permalink text,
  add column if not exists instagram_media_url text,
  add column if not exists instagram_thumbnail_url text,
  add column if not exists publicado_em timestamptz,
  add column if not exists origem text not null default 'plataforma',
  add column if not exists correspondencia_instagram text;

do $$ begin
  alter table public.posts add constraint posts_origem_check
    check (origem in ('plataforma','instagram'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.posts add constraint posts_correspondencia_instagram_check
    check (correspondencia_instagram is null or correspondencia_instagram in ('id','legenda','data','importado','manual'));
exception when duplicate_object then null;
end $$;

create unique index if not exists uq_posts_instagram_media_id
  on public.posts(instagram_media_id)
  where instagram_media_id is not null;

create index if not exists idx_posts_publicado_em
  on public.posts(cliente_id, publicado_em desc)
  where publicado_em is not null;

-- O portal publico precisa receber somente os metadados necessarios para montar o grid.
-- Se portal_dados() construir o JSON campo a campo, inclua nele:
-- instagram_media_id, instagram_permalink, instagram_media_url,
-- instagram_thumbnail_url, publicado_em, origem e correspondencia_instagram.

commit;

