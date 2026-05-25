# Versão v20 - Status de compra completo

Esta versão corrige a leitura dos custos. O painel passa a considerar a aba **Custos x Execução** completa, com **311 linhas**.

## Totais por status de compra

| Status | Linhas | Valor |
|---|---:|---:|
| Cancelado | 26 | R$ 14,395,357.05 |
| Orçamento não Aprovado | 71 | R$ 7,025,327.01 |
| Comprado | 195 | R$ 1,618,675.14 |
| Em Orçamento | 18 | R$ 242,003.05 |
| Em Processo de Compra | 1 | R$ 0.00 |

## Totais de conferência

- Total bruto da aba Custos x Execução: R$ 23,281,362.25
- Total vinculado aos itens da planta: R$ 23,125,805.25
- Total sem vínculo direto: R$ 155,557.00

## Observação

O SQL v20 preserva posições do mapa e fotos/evidências. Ele apaga e recarrega apenas a tabela `step_obras_costs`.
