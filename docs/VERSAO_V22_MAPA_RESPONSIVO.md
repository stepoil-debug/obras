# Versão v22 - Mapa responsivo

Corrige o problema em que a planta aparecia cortada/metade no celular após uso de zoom/scroll antigo.

## Alterações
- `applyMapZoom()` agora calcula a largura com base no container visível.
- `map-inner` não usa mais largura fixa mínima no mobile.
- Botão `Ajustar tela` no mapa.
- Recalcula ao redimensionar a tela.
- Mantém clique 1x para painel lateral e 2x para pop-up.
