# Decisão: usar Supabase ou não?

## Para ver no Netlify

Não precisa de Supabase.

O painel abre no Netlify porque é HTML estático. Ele funciona como apresentação e protótipo.

## Para atualizar informações com vários usuários

Recomendo usar Supabase.

Motivo: o Netlify sozinho hospeda arquivos estáticos. Ele não é banco de dados. Se uma pessoa mudar um status no navegador, essa alteração não aparece automaticamente para as outras pessoas.

## Comparativo

| Cenário | Precisa Supabase? | Observação |
|---|---:|---|
| Apresentar para diretoria | Não | Abre pelo link do Netlify. |
| Uma pessoa atualizando e exportando JSON | Não | Serve para teste. |
| Várias pessoas atualizando status | Sim | Precisa banco central. |
| Upload real de fotos por obra | Sim | Usar Supabase Storage. |
| Histórico de alterações | Sim | Registrar quem mudou e quando. |
| Login/permissão por usuário | Sim | Usar Supabase Auth/RLS. |

## Recomendação

Publicar agora no Netlify sem Supabase para validar visual e fluxo.

Depois criar Supabase para virar sistema real com:

1. tabela `step_obras_items`;
2. tabela `step_obras_photos`;
3. tabela `step_obras_history`;
4. bucket `step-obras-evidencias`;
5. login e permissões;
6. sincronização dos dados no painel.
