# Versão v15 - Publicação forçada

Esta versão tem o mesmo painel sem PIN, com Netlify Function para salvar no Supabase e diagnóstico de chave de API.

Diferença principal: o pacote acompanha um CMD que copia os arquivos da versão v15 para a pasta oficial do projeto antes de executar o commit/push.

Depois de publicar, teste:

https://stepsolution-obras.netlify.app/.netlify/functions/obras?health=1

Se o site continuar mostrando versão antiga, confira o Deploy log no Netlify.
