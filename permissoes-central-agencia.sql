-- SEGURANÇA DA CENTRAL DA AGÊNCIA
-- Mantém clientes e rodadas invisíveis para visitantes anônimos.
-- Apenas e-mails já cadastrados em public.admins poderão ler ou gerenciar.
-- Não altera nem apaga dados.

begin;

alter table public.clientes enable row level security;
alter table public.rodadas enable row level security;

drop policy if exists "admin gerencia clientes" on public.clientes;
create policy "admin gerencia clientes"
on public.clientes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin gerencia rodadas" on public.rodadas;
create policy "admin gerencia rodadas"
on public.rodadas
for all
using (public.is_admin())
with check (public.is_admin());

commit;

-- Conferência: logada como administradora, esta consulta retorna 2 clientes.
select nome, slug, ativo
from public.clientes
order by criado_em;
