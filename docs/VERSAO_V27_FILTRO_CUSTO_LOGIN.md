# Versão v27 - Filtro de custo e login de edição

## Filtro de custos
Na aba **Custos**, a busca agora filtra também os indicadores e gráficos.
Exemplo: ao digitar `01A`, o painel mostra somente os custos vinculados ao item `01A`.

## Login de edição
A visualização permanece liberada. As seguintes ações exigem login:

- Salvar mapa
- Ajustar posições
- Restaurar posições
- Editar obra/status/avanço
- Criar/excluir item
- Incluir/remover imagens
- Importar Excel/JSON
- Sincronizar custos

## Variáveis de ambiente recomendadas

```env
STEP_EDIT_USER=admin
STEP_EDIT_PASSWORD=troque_esta_senha
```

Se não configurar, o padrão temporário é `admin / 031036`.
