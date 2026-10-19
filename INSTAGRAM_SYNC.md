# Sincronização do Instagram da Margô

Esta integração usa a API oficial da Meta e mantém **aprovado** separado de **publicado**.

## Comportamento

- Busca até 50 publicações recentes de `@margocafesespeciais`.
- Atualiza uma peça já vinculada pelo `instagram_media_id`.
- Faz correspondência automática apenas quando legenda/tipo, ou data/tipo/legenda, dão confiança suficiente.
- Importa como `publicado` o conteúdo que existe no Instagram mas não estava planejado na plataforma.
- Nunca transforma uma peça aprovada em publicada só porque a data prevista passou.
- Salva link e horário reais da publicação.

## Configuração

1. Aplicar `supabase/migrations/002_instagram_sync.sql` primeiro em homologação.
2. Garantir que `portal_dados()` retorne os novos campos listados no comentário da migração.
3. Publicar a Edge Function `sync-instagram`.
4. Configurar os segredos da função:
   - `META_INSTAGRAM_ACCESS_TOKEN`: token de longa duração com acesso de leitura ao Instagram profissional.
   - `META_GRAPH_VERSION`: versão da Graph API habilitada no app da Meta (opcional; padrão `v24.0`).
   - `INSTAGRAM_SYNC_SECRET`: valor aleatório usado somente pelo agendador.
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: disponibilizados/configurados no projeto Supabase.
5. Configurar a Margô no banco:

```sql
update public.clientes
set instagram_business_account_id = 'ID_DA_CONTA_PROFISSIONAL',
    instagram_sync_ativo = true
where slug = 'margo';
```

6. Agendar um `POST` periódico para a função com o cabeçalho `x-sync-secret`. Uma execução a cada 15 minutos é suficiente para manter o grid atualizado sem prometer tempo real.

## Segurança

O token da Meta e a chave de serviço ficam apenas nos segredos do Supabase. Não coloque esses valores em `config.js`, no HTML, no banco público ou no GitHub.

