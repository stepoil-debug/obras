# Versão v17 - Mobile, importação Excel/JSON e custos

## Alterações

- Clique simples no marcador da planta passa a atualizar o painel lateral com resumo, imagens, próxima ação e observações.
- Clique duplo no marcador mantém o pop-up grande da obra.
- Importação aceita JSON, Excel (.xlsx/.xls) e CSV.
- A aba **Custos** ganhou uma tabela detalhada para as linhas da aba `Custos x Execução`.
- Upload de imagens melhorado para celular, com captura pela câmera quando suportado.
- Netlify Function `/api/obras` agora retorna e salva `step_obras_costs`.

## Banco

Rode o patch:

`supabase/patch_v17_custos_mobile_importacao.sql`

Ele cria `step_obras_costs`, importa a base de custos da planilha 25-05-26 e recalcula o campo `cost` dos itens vinculados.
