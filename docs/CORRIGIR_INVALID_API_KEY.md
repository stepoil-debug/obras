# Correção: Invalid API key

Esse erro não é do mapa nem do botão salvar. Ele acontece quando a Netlify Function não consegue autenticar no Supabase.

## Variáveis obrigatórias no Netlify

Cadastre em Site settings > Environment variables:

```env
SUPABASE_URL=https://mensknlkroxdisnlvkor.supabase.co
SUPABASE_SERVICE_ROLE_KEY=COLE_A_SERVICE_ROLE_OU_SECRET_KEY_DO_SUPABASE_AQUI
SUPABASE_BUCKET=step-obras-evidencias
NODE_ENV=production
```

Não use `sb_publishable_...` dentro de `SUPABASE_SERVICE_ROLE_KEY`. A publishable key serve para frontend/leitura pública; para salvar mapa/imagens pela Function precisa ser service_role/secret key.

Depois de alterar variáveis no Netlify, faça Deploys > Trigger deploy > Clear cache and deploy site.

## Diagnóstico rápido

Abra no navegador:

```text
/.netlify/functions/obras?health=1
```

O endpoint mostra apenas se as variáveis existem e seus tamanhos/prefixos, sem expor a chave completa.
