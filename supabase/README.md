# Supabase — Painel STEP Obras

Esta pasta é a base da próxima etapa, quando o painel deixar de salvar só no navegador e passar a salvar em nuvem.

## O que este schema cria

- `step_obras_items`: status, avanço, custo, responsável, prazo e posição dos marcadores no mapa.
- `step_obras_photos`: metadados das fotos/evidências.
- `step_obras_history`: histórico de alterações.
- bucket `step-obras-evidencias`: armazenamento das imagens.

## Como usar

1. Criar projeto no Supabase.
2. Ir em SQL Editor.
3. Colar e executar `schema_step_obras.sql`.
4. Habilitar Auth por e-mail, se for usar login.
5. Ajustar as policies antes de produção.

## Atenção

O `anon key` do Supabase pode ficar no frontend, desde que o RLS esteja correto.
Nunca coloque `service_role key` no HTML, GitHub ou Netlify público.
