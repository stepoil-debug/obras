# STEP | Painel de Obras e Melhorias v20

Versão corrigida para carregar a planilha **Melhorias base STEP 25-05-26.xlsx** com os custos completos.

## Correções principais

- Aba **Custos x Execução** lida completa: **311 linhas**.
- Painel de **Custos** agora mostra todos os **status de compra** com valores e quantidade de linhas.
- Mapa da planta mostra resumo por item + status de compra no clique 1x.
- Botão **Tabela de custo** permanece no mapa e no pop-up da obra.
- SQL não apaga fotos e não altera posições X/Y já salvas no mapa.
- Exportei todas as abas do Excel para CSV dentro da pasta `data/`.

## Status de compra extraídos

- Cancelado: 26 linhas | R$ 14,395,357.05
- Orçamento não Aprovado: 71 linhas | R$ 7,025,327.01
- Comprado: 195 linhas | R$ 1,618,675.14
- Em Orçamento: 18 linhas | R$ 242,003.05
- Em Processo de Compra: 1 linhas | R$ 0.00

## Como publicar

1. Execute `PUBLICAR_V20_STATUS_COMPRA.cmd`.
2. No painel online/Netlify, faça **Clear cache and deploy site**.
3. No Supabase, rode:
   `supabase/RODAR_ESTE_SQL_V20_STATUS_COMPRA_COMPLETO.sql`
4. No painel, clique em **Recarregar banco** ou use Ctrl+F5.
