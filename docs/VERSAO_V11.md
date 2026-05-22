# Versão v11 - Salvar mapa no Supabase

Esta versão adiciona sincronização real com Supabase via Netlify Functions.

## Novidades

- Botão **Salvar mapa** na tela da planta.
- Botão **Recarregar banco** para buscar as posições salvas no Supabase.
- Ao mover marcadores, o painel avisa que o mapa está pendente de salvamento.
- Ao abrir em janela anônima ou outro computador, o painel tenta carregar os dados do Supabase.
- Upload de imagens pode ser enviado ao Supabase Storage quando as variáveis de ambiente estiverem configuradas.
- Atualização de obra também tenta salvar no Supabase.

## Variáveis necessárias no Netlify

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_BUCKET=step-obras-evidencias
- STEP_ADMIN_PIN

Nunca coloque a `SUPABASE_SERVICE_ROLE_KEY` no GitHub ou no HTML.
