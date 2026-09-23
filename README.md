# Plataforma de aprovação

Plataforma para clientes aprovarem posts do Instagram antes da publicação. O cliente abre um link comum, sem login, e vê:

- a prévia do perfil com o grid do feed;
- cada arte no tamanho real do Instagram (post e carrossel com 390 px de largura; Reels em 9:16);
- a legenda.

Em cada post ele pode **aprovar**, **pedir ajuste** ou **comentar**, e tudo aparece em tempo real para a agência.

A agência entra pelo link **"Área da agência"**, no rodapé, com um link mágico enviado por e-mail. Lá ela envia artes e vídeos, edita legendas, muda a ordem do feed e edita o perfil.

Visual com a identidade do studio Gio.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | A plataforma (HTML, CSS e JS num arquivo só) |
| `config.js` | Endereço e chave pública do Supabase |
| `supabase.js` | Biblioteca `@supabase/supabase-js` 2.117.0 (build UMD, local) |
| `vercel.json` | Configuração da Vercel (não indexar no Google) |
| `margo-logo.png` | Logo da Margô, para enviar como foto do perfil |
| `versao-claude/` | Versão anterior, que roda como Artifact do Claude |

A chave em `config.js` é a **chave pública** (publishable). Ela pode ficar no código. Quem protege os dados são as regras do banco (RLS).

## Supabase

Projeto **Plataforma de aprovação** (`vbnsjwbqwldbvzuzmbbp`), região São Paulo.

- **`perfil`**: uma linha, com usuário, nome, bio, seguidores, seguindo e avatar.
- **`posts`**: ordem, tipo (`post` | `carrossel` | `reels`), status (`pendente` | `aprovado` | `ajuste` | `publicado`), legenda, `midias` (`[{id: caminho no storage, tipo}]`), capa e `decidido_em`.
- **`comentarios`**: `post_id`, autor (`cliente` | `agencia` | `sistema`) e texto.
- **`admins`**: e-mails que podem editar.
- **Storage `midias`**: bucket público para leitura; só admins enviam, trocam ou apagam arquivos. Limite de 50 MB por arquivo.

O cliente, sem login, só lê. Ele aprova, pede ajuste e comenta pelas funções `cliente_aprovar`, `cliente_pedir_ajuste` e `cliente_comentar`. Todas as outras escritas exigem estar logada com um e-mail da tabela `admins`.

### Adicionar alguém como admin

No SQL Editor do Supabase:

```sql
insert into public.admins (email) values ('email@exemplo.com');
```

## Publicar na Vercel

1. Na Vercel: **Add New → Project** → importe o repositório `clientespessoais`.
2. Em **Root Directory**, escolha a pasta `plataforma de aprovação`.
3. Framework Preset: **Other**. Não precisa de build. Clique em **Deploy**.
4. Copie o endereço gerado (ex.: `https://clientespessoais.vercel.app`).
5. No Supabase: **Authentication → URL Configuration**.
   - **Site URL**: cole o endereço da Vercel.
   - **Redirect URLs**: adicione o mesmo endereço.

   Sem isso, o link mágico de login não volta para a plataforma.

## Cliente atual

**Margô Cafés Especiais** (@margo), Joinville. Abertura em 10/10.
