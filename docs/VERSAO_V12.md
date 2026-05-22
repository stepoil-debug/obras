# Versão v12 - Correção de PIN

Esta versão corrige o problema de `PIN inválido` ao salvar mapa, obra ou imagens no Supabase.

Alterações:

- A Netlify Function agora compara o PIN com `trim()`, evitando erro por espaço no começo/fim da variável.
- O painel ganhou botão `Trocar PIN` no mapa e na configuração.
- Quando o Supabase retorna `PIN inválido`, o painel apaga o PIN salvo no navegador e pede novamente.
- Foi criada ação `check_pin` para validar o PIN antes de tentar salvar.

Variável obrigatória no Netlify:

```env
STEP_ADMIN_PIN=031036
```

Depois de alterar variáveis no Netlify, faça redeploy do site.
