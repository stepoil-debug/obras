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
