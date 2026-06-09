# Versão v13 - Edição direta sem PIN

Esta versão remove a validação por PIN no painel.

## Como funciona

- O usuário clica em **Salvar mapa** e a posição dos marcadores é gravada no Supabase.
- O usuário clica em **Atualizar obra** e os dados são gravados no Supabase.
- O usuário inclui imagem e o upload é feito para o Supabase Storage.
- Não há prompt de PIN no navegador.

## Variáveis necessárias no Netlify

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_BUCKET=step-obras-evidencias
NODE_ENV=production
```

A variável `STEP_ADMIN_PIN` não é usada nesta versão.

## Segurança

A edição direta facilita o uso interno, mas qualquer pessoa com acesso ao link pode alterar dados. Para operação pública ou externa, recomenda-se adicionar login ou controle por usuário depois.
