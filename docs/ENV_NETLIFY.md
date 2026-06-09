# Variáveis de ambiente no Netlify

Cadastre em **Site settings → Environment variables**:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_APENAS_NO_NETLIFY
SUPABASE_BUCKET=step-obras-evidencias
STEP_ADMIN_PIN=PIN_INTERNO_DA_STEP
NODE_ENV=production
```

A chave `SUPABASE_SERVICE_ROLE_KEY` é secreta. Não salve essa chave no GitHub.


## Correção v12 - PIN inválido

Se o painel informar PIN inválido, confira se a variável `STEP_ADMIN_PIN` está cadastrada no Netlify exatamente igual ao PIN digitado no painel. Depois de alterar variável no Netlify, faça redeploy. No painel, use o botão `Trocar PIN` para apagar o PIN antigo salvo no navegador.


## v13 sem PIN

`STEP_ADMIN_PIN` não é usado nesta versão. Pode remover do Netlify.
