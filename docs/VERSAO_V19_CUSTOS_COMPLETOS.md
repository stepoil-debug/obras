# STEP Painel Obras - v19 Custos completos

Fonte da atualização: `Melhorias base STEP 25-05-26.xlsx`.

## O que esta versão corrige

- Reprocessa a aba **Custos x Execução** inteira.
- Inclui **311 linhas detalhadas de custos** em `step_obras_costs`.
- Corrige status `Orçamento não Apravado` para `Orçamento não Aprovado`.
- Atualiza totais por item da planta a partir da tabela detalhada.
- Mantém fotos e posições do mapa.

## Arquivos importantes

- `index.html`: painel online.
- `functions/obras.js`: API do painel.
- `supabase/RODAR_ESTE_SQL_V19_CUSTOS_COMPLETOS.sql`: SQL para atualizar o banco.
- `data/custos_detalhados_311_linhas.csv`: conferência da importação.
- `data/resumo_custos_por_status.csv`: resumo financeiro por status.
- `data/resumo_custos_por_item.csv`: resumo financeiro por item.

## Publicação

Execute `PUBLICAR_V19_CORRIGIDO.cmd` para substituir a pasta local e enviar para o GitHub.
Depois faça um deploy limpo no Netlify.
