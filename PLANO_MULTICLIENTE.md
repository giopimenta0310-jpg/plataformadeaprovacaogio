# Evolução multi-cliente — plano local

Este documento descreve a evolução sem apagar ou substituir a plataforma atual.

## Estado preservado

- `index.html` continua sendo a experiência de aprovação existente.
- Todos os registros atuais de `perfil`, `posts` e `comentarios` continuam intactos.
- Todos os caminhos do bucket `midias` permanecem iguais.
- Margô passa a ser o primeiro registro de `clientes`.
- Os posts atuais passam a integrar a rodada `Conteúdo atual`.

## Nova navegação

1. A agência entra pela Central da Agência.
2. Seleciona um cliente.
3. Visualiza as rodadas desse cliente.
4. Abre uma rodada e acessa a experiência de feed já existente.
5. O cliente recebe apenas o link público isolado de sua conta.

## Modelo proposto

- `clientes`: identidade, slug e token público de cada cliente.
- `rodadas`: agrupamento temporal dos posts de um cliente.
- `perfil`: recebe `cliente_id`, mantendo os campos atuais.
- `posts`: recebe `cliente_id` e `rodada_id`, mantendo arte, legenda, status e links.
- `comentarios`: continua ligado ao post; o cliente é determinado pelo post.
- `admins`: continua controlando o acesso da agência.

## Segurança necessária antes da publicação

O link público de aprovação não deve consultar livremente todas as tabelas. A versão
multi-cliente deve carregar e alterar conteúdo por funções RPC que exijam o
`token_publico` do cliente. As políticas RLS atuais precisam ser revisadas antes de
qualquer migração no Supabase.

## Fases

### 1. Interface local

- Central da Agência.
- Busca e filtros.
- Cards de clientes e indicadores.
- Acesso da Margô apontando para o fluxo atual.

### 2. Homologação

- Criar um projeto Supabase separado ou uma cópia do banco.
- Aplicar `supabase/migrations/001_multicliente_draft.sql` somente na homologação.
- Criar um cliente fictício e validar isolamento de dados.

### 3. Integração

- Adaptar o carregamento do `index.html` para cliente e rodada.
- Criar RPCs públicas com token.
- Adaptar uploads para pastas por cliente e rodada sem mover arquivos antigos.
- Testar aprovação, ajustes, comentários e login da agência.

### 4. Produção

- Backup completo.
- Revisão conjunta.
- Aprovação explícita para migração, commit e push.

O arquivo SQL deste repositório é apenas um rascunho local. Ele não foi executado.
