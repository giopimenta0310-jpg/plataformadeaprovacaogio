# Como colocar esta versão no GitHub

## Conteúdo do pacote

- Tela atual de aprovação com melhorias de design e responsividade.
- Central da Agência com busca e filtros locais.
- Margô preservada como cliente atual.
- Giovanna · Portfólio como cliente de teste visual.
- Logos oficiais da Gio.
- Dependências locais existentes.
- Proposta de estrutura multi-cliente para Supabase.

## Publicar apenas o código

1. Extraia o ZIP.
2. Envie os arquivos para o repositório GitHub.
3. Não execute o arquivo em `supabase/migrations` no banco de produção.
4. Na Vercel, mantenha `index.html` como página inicial.
5. A Central fica disponível em `/central-agencia.html`.

## Próxima etapa técnica

1. Criar um projeto Supabase de homologação.
2. Fazer uma cópia segura da estrutura atual.
3. Revisar e aplicar a migração somente na homologação.
4. Criar Margô e Giovanna como clientes separados.
5. Implementar RPCs com `token_publico` e isolamento por cliente.
6. Testar aprovação, ajuste, comentários, upload e login.
7. Fazer backup e pedir aprovação antes da migração de produção.

## Segurança

`config.js` contém apenas a chave pública do Supabase. A proteção real depende das
políticas RLS. A estrutura multi-cliente não deve ser publicada com leitura aberta
das tabelas; use RPCs com token e políticas revisadas.
