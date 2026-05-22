# STEP Obras Base — Painel Online

Painel executivo da base STEP para acompanhamento de obras e melhorias.

## Estrutura

- `index.html` — painel visual completo.
- `functions/obras.js` — rota segura de sincronização com Supabase.
- `supabase/schema_step_obras.sql` — estrutura inicial do banco.
- `_redirects` — cria a rota amigável `/api/obras`.

## Variáveis necessárias no ambiente do site

```env
SUPABASE_URL=https://mensknlkroxdisnlvkor.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY=SUA_SERVICE_ROLE_KEY
SUPABASE_BUCKET=step-obras-evidencias
NODE_ENV=production
```

## Funcionamento

O painel carrega as obras do Supabase, permite mover os marcadores da planta, salvar o mapa, atualizar status/avanço e anexar imagens de evidência.

A rota usada pelo frontend é:

```text
/api/obras
```

A versão v16 remove as referências visuais à plataforma de hospedagem e mantém o painel com identidade STEP.
