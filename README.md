# STEP | Painel Online de Obras e Melhorias

Versão preparada para hospedar no **GitHub** e visualizar pelo **Netlify**.

O painel é uma aplicação HTML estática com:

- mapa da planta STEP com marcadores móveis;
- zoom no mapa;
- clique no número para ver status e imagens da obra;
- edição de status, avanço, responsável, prazo, custo e próxima ação;
- anexos de imagens/evidências por obra;
- exportação e importação de dados em JSON;
- estrutura pronta para evolução com Supabase.

## Como publicar no Netlify

1. Crie um repositório no GitHub, por exemplo `step-painel-obras`.
2. Suba todos os arquivos desta pasta para o repositório.
3. No Netlify, escolha **Add new site > Import an existing project**.
4. Conecte o GitHub e selecione o repositório.
5. Configure:
   - **Build command:** deixe vazio
   - **Publish directory:** `.`
6. Clique em **Deploy**.

## Como atualizar as informações nesta versão

Esta versão salva as alterações no navegador de quem está usando, via `localStorage`.

Isso é bom para:

- apresentação;
- teste com diretoria;
- uso individual;
- validação do layout, status e fluxo de fotos.

Para levar os dados para outro computador, use:

- **Exportar dados**: baixa um JSON com status, posições e imagens;
- **Importar dados**: carrega esse JSON em outro navegador.

## Precisa de Supabase?

Para **visualização no Netlify**, não precisa.

Para **atualização centralizada por várias pessoas**, precisa ou é fortemente recomendado.

Sem Supabase:

- cada navegador terá seus próprios dados;
- fotos ficam salvas localmente no navegador;
- não existe login, histórico central ou uso multiusuário confiável.

Com Supabase:

- todos veem os mesmos status;
- fotos ficam salvas em nuvem;
- alterações podem ter histórico;
- dá para criar login e permissões;
- o painel vira um sistema real, não só uma apresentação.

A pasta `supabase/` contém um modelo inicial de banco para essa próxima etapa.

## Arquivos principais

- `index.html` — painel completo para Netlify.
- `netlify.toml` — configuração de publicação/headers.
- `_redirects` — fallback para página única.
- `data/obras_seed.json` — base inicial das obras em JSON.
- `supabase/schema_step_obras.sql` — modelo inicial do banco.
- `docs/PASSO_A_PASSO_CMD.md` — comandos para subir no GitHub.
- `docs/DECISAO_SUPABASE.md` — decisão técnica sobre banco de dados.



## Versão v8 - correção pop-up de imagens

- Corrigido clique nas miniaturas dentro do pop-up da obra.
- Agora a imagem principal troca ao clicar em qualquer miniatura.
- A miniatura ativa fica destacada.
- Mantidos zoom da planta, movimentação dos marcadores e atualização da obra.
