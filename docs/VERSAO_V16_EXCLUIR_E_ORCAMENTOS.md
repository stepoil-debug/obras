# Versão v16 - Exclusão persistente e novos orçamentos

Correções aplicadas:

- O botão **Excluir item** agora chama a Netlify Function com `action: "delete_item"` e grava a exclusão no Supabase usando `ativo = false`.
- O `GET` da API continua carregando apenas itens com `ativo = true`, então a obra excluída não volta após atualizar a página.
- O salvamento de item agora envia `ativo = true`, permitindo reativar/cadastrar novamente um item quando necessário.
- A troca de ID de uma obra agora envia `oldId` para evitar duplicidade no banco.
- A aba **Custos** recebeu o botão **Novo orçamento** e a tabela **Orçamentos cadastrados**.
- Os orçamentos são salvos no Supabase na tabela `step_obras_config`, chave `budgets`, e também ficam no `localStorage` como contingência.
- Ao salvar um orçamento vinculado a uma obra, o painel pode atualizar automaticamente o custo da obra com a soma dos orçamentos ativos.

Se o banco for antigo, execute `supabase/patch_v16_excluir_e_orcamentos.sql` no SQL Editor do Supabase antes de publicar.
